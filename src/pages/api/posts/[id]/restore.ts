import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: '잘못된 게시글 ID입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existing = await db.execute({
      sql: 'SELECT id FROM posts WHERE id = ? AND deleted_at IS NOT NULL',
      args: [id],
    });

    if (existing.rows.length === 0) {
      return new Response(JSON.stringify({ error: '삭제된 게시글을 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.execute({
      sql: 'UPDATE posts SET deleted_at = NULL WHERE id = ?',
      args: [id],
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
