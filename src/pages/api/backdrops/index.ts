import type { APIRoute } from 'astro';
import { uploadToCloudinary, isConfigured } from '@lib/cloudinary';
import db from '@lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const result = await db.execute('SELECT * FROM backdrops WHERE visible = 1 ORDER BY sort_order ASC, id DESC');

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

    if (!file) {
      return new Response(JSON.stringify({ error: '파일이 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await uploadToCloudinary(file, 'simplecube/backdrops');

    await db.execute({
      sql: 'INSERT INTO backdrops (image_url, public_id, title) VALUES (?, ?, ?)',
      args: [result.secure_url, result.public_id, title],
    });

    const inserted = await db.execute('SELECT last_insert_rowid() as id');
    const id = (inserted.rows[0] as any).id;

    return new Response(JSON.stringify({
      id,
      image_url: result.secure_url,
      public_id: result.public_id,
      title,
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
