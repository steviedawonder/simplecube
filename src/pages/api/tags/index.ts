import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  const result = await db.execute(`
    SELECT t.*, (SELECT COUNT(*) FROM post_tags WHERE tag_id = t.id) as post_count
    FROM tags t ORDER BY t.name
  `);
  return new Response(JSON.stringify(result.rows), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const { name, slug } = await request.json();
  if (!name || !slug) {
    return new Response(JSON.stringify({ error: '이름과 슬러그는 필수입니다.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const result = await db.execute({
      sql: 'INSERT INTO tags (name, slug) VALUES (?, ?)',
      args: [name, slug],
    });
    return new Response(JSON.stringify({ id: Number(result.lastInsertRowid), name, slug }), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return new Response(JSON.stringify({ error: '이미 존재하는 태그입니다.' }), {
        status: 409, headers: { 'Content-Type': 'application/json' },
      });
    }
    throw e;
  }
};
