export const prerender = false;

import type { APIRoute } from 'astro';
import db from '@lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, status } = await request.json();
    if (!id || !['new', 'read', 'done'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid params' }), { status: 400 });
    }
    await db.execute({ sql: 'UPDATE inquiries SET status = ? WHERE id = ?', args: [status, id] });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
