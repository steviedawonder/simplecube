import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  const { name, slug } = await request.json();
  await db.execute({
    sql: 'UPDATE tags SET name = ?, slug = ? WHERE id = ?',
    args: [name, slug, params.id],
  });
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  await db.execute({ sql: 'DELETE FROM post_tags WHERE tag_id = ?', args: [params.id] });
  await db.execute({ sql: 'DELETE FROM tags WHERE id = ?', args: [params.id] });
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
