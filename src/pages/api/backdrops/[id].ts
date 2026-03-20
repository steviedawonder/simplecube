import type { APIRoute } from 'astro';
import { deleteFromCloudinary } from '@lib/cloudinary';
import db from '@lib/db';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;
    const body = await request.json();
    const fields: string[] = [];
    const args: any[] = [];

    if (body.title !== undefined) { fields.push('title = ?'); args.push(body.title); }
    if (body.visible !== undefined) { fields.push('visible = ?'); args.push(body.visible ? 1 : 0); }
    if (body.sort_order !== undefined) { fields.push('sort_order = ?'); args.push(body.sort_order); }

    if (fields.length === 0) {
      return new Response(JSON.stringify({ error: '변경할 항목이 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    args.push(id);
    await db.execute({ sql: `UPDATE backdrops SET ${fields.join(', ')} WHERE id = ?`, args });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = params.id;
    const result = await db.execute({ sql: 'SELECT public_id FROM backdrops WHERE id = ?', args: [id] });

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: '항목을 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const publicId = (result.rows[0] as any).public_id;
    if (publicId) {
      try { await deleteFromCloudinary(publicId); } catch { /* ignore */ }
    }

    await db.execute({ sql: 'DELETE FROM backdrops WHERE id = ?', args: [id] });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
