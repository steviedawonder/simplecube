import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  const { name, slug, description } = await request.json();
  await db.execute({
    sql: 'UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?',
    args: [name, slug, description || '', params.id],
  });
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  // Check if category has posts
  const posts = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM posts WHERE category_id = ? AND deleted_at IS NULL',
    args: [params.id],
  });
  if ((posts.rows[0] as any).count > 0) {
    return new Response(JSON.stringify({ error: '이 카테고리에 속한 글이 있어 삭제할 수 없습니다.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  await db.execute({ sql: 'DELETE FROM categories WHERE id = ?', args: [params.id] });
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
