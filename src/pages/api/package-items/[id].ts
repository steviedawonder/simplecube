import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = Number(params.id);
    if (!id) {
      return new Response(JSON.stringify({ error: '유효하지 않은 ID입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const fields: string[] = [];
    const args: any[] = [];

    if (body.name !== undefined) { fields.push('name = ?'); args.push(body.name); }
    if (body.description !== undefined) { fields.push('description = ?'); args.push(body.description); }
    if (body.image_url !== undefined) { fields.push('image_url = ?'); args.push(body.image_url); }
    if (body.price !== undefined) { fields.push('price = ?'); args.push(body.price); }
    if (body.sort_order !== undefined) { fields.push('sort_order = ?'); args.push(body.sort_order); }
    if (body.page !== undefined) { fields.push('page = ?'); args.push(body.page); }

    if (fields.length === 0) {
      return new Response(JSON.stringify({ error: '수정할 항목이 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    fields.push("updated_at = datetime('now')");
    args.push(id);

    await db.execute({
      sql: `UPDATE package_items SET ${fields.join(', ')} WHERE id = ?`,
      args,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = Number(params.id);
    if (!id) {
      return new Response(JSON.stringify({ error: '유효하지 않은 ID입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.execute({
      sql: 'DELETE FROM package_items WHERE id = ?',
      args: [id],
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
