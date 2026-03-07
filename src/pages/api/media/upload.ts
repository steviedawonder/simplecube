import type { APIRoute } from 'astro';
import { uploadToCloudinary, isConfigured } from '@lib/cloudinary';
import db from '@lib/db';

export const prerender = false;

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

    if (!file) {
      return new Response(JSON.stringify({ error: '파일이 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await uploadToCloudinary(file);

    // Save to DB
    await db.execute({
      sql: 'INSERT INTO media (public_id, url, filename, width, height) VALUES (?, ?, ?, ?, ?)',
      args: [result.public_id, result.secure_url, file.name, result.width, result.height],
    });

    const inserted = await db.execute('SELECT last_insert_rowid() as id');
    const id = (inserted.rows[0] as any).id;

    return new Response(
      JSON.stringify({
        id,
        public_id: result.public_id,
        url: result.secure_url,
        filename: file.name,
        width: result.width,
        height: result.height,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
