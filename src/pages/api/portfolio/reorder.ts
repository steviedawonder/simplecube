import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

// PUT: Reorder portfolio items
export const PUT: APIRoute = async ({ request }) => {
  try {
    const { items } = await request.json(); // [{ id, sort_order }]

    for (const item of items) {
      await db.execute({
        sql: 'UPDATE portfolio SET sort_order = ? WHERE id = ?',
        args: [item.sort_order, item.id],
      });
    }

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
