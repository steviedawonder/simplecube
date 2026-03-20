import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return new Response(JSON.stringify({ error: '유효하지 않은 데이터입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    for (const item of items) {
      await db.execute({
        sql: 'UPDATE faqs SET sort_order = ? WHERE id = ?',
        args: [item.sort_order, item.id],
      });
    }

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
