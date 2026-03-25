import type { APIRoute } from 'astro';
import { uploadToCloudinary, isConfigured } from '@lib/cloudinary';
import db from '@lib/db';
import sharp from 'sharp';

export const prerender = false;

// PNG 투명 여백 자동 제거
async function trimTransparent(file: File): Promise<File> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const trimmed = await sharp(buffer).trim().png().toBuffer();
    return new File([trimmed], file.name, { type: 'image/png' });
  } catch {
    return file; // 트리밍 실패 시 원본 반환
  }
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const modelId = url.searchParams.get('model_id');
    let sql = 'SELECT * FROM model_photos';
    const args: any[] = [];

    if (modelId) {
      sql += ' WHERE model_id = ?';
      args.push(modelId);
    }

    sql += ' ORDER BY sort_order ASC, id DESC';
    const result = await db.execute({ sql, args });

    return new Response(JSON.stringify(result.rows), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!isConfigured()) {
      return new Response(JSON.stringify({ error: 'Cloudinary가 설정되지 않았습니다.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const modelId = formData.get('model_id') as string;

    if (!file) {
      return new Response(JSON.stringify({ error: '파일이 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validModels = ['popup', 'module', 'wood-edge', 'wood-round'];
    if (!modelId || !validModels.includes(modelId)) {
      return new Response(JSON.stringify({ error: '유효하지 않은 모델 ID입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // PNG 파일이면 투명 여백 자동 제거
    const uploadFile = file.type === 'image/png' ? await trimTransparent(file) : file;
    const result = await uploadToCloudinary(uploadFile, `simplecube/models/${modelId}`);

    await db.execute({
      sql: 'INSERT INTO model_photos (model_id, image_url, public_id) VALUES (?, ?, ?)',
      args: [modelId, result.secure_url, result.public_id],
    });

    const inserted = await db.execute('SELECT last_insert_rowid() as id');
    const id = (inserted.rows[0] as any).id;

    return new Response(JSON.stringify({
      id,
      model_id: modelId,
      image_url: result.secure_url,
      public_id: result.public_id,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
