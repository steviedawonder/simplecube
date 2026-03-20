import type { APIRoute } from 'astro';
import { uploadToCloudinary, isConfigured } from '@lib/cloudinary';
import db from '@lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const category = url.searchParams.get('category');
    let sql = 'SELECT * FROM backgrounds WHERE visible = 1';
    const args: any[] = [];

    if (category) {
      sql += ' AND category = ?';
      args.push(category);
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
    const title = (formData.get('title') as string) || '';
    const category = (formData.get('category') as string) || '기본';

    if (!file) {
      return new Response(JSON.stringify({ error: '파일이 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await uploadToCloudinary(file, 'simplecube/backgrounds');

    await db.execute({
      sql: 'INSERT INTO backgrounds (image_url, public_id, title, category) VALUES (?, ?, ?, ?)',
      args: [result.secure_url, result.public_id, title, category],
    });

    const inserted = await db.execute('SELECT last_insert_rowid() as id');
    const id = (inserted.rows[0] as any).id;

    return new Response(JSON.stringify({
      id,
      image_url: result.secure_url,
      public_id: result.public_id,
      title,
      category,
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
