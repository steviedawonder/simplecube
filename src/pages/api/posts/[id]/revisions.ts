import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: '잘못된 게시글 ID입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await db.execute({
      sql: `SELECT id, post_id, title, seo_title, seo_description, focus_keyword, created_at
            FROM post_revisions
            WHERE post_id = ?
            ORDER BY created_at DESC
            LIMIT 20`,
      args: [id],
    });

    return new Response(JSON.stringify(result.rows), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Restore a specific revision
export const POST: APIRoute = async ({ params, request }) => {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: '잘못된 게시글 ID입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const revisionId = body.revisionId;

    if (!revisionId) {
      return new Response(JSON.stringify({ error: '리비전 ID가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the revision
    const revision = await db.execute({
      sql: 'SELECT * FROM post_revisions WHERE id = ? AND post_id = ?',
      args: [revisionId, id],
    });

    if (revision.rows.length === 0) {
      return new Response(JSON.stringify({ error: '리비전을 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rev = revision.rows[0] as any;

    // Save current state as a new revision before restoring
    await db.execute({
      sql: `INSERT INTO post_revisions (post_id, title, content, seo_title, seo_description, focus_keyword)
            SELECT id, title, content, seo_title, seo_description, focus_keyword
            FROM posts WHERE id = ?`,
      args: [id],
    });

    // Restore the revision
    await db.execute({
      sql: `UPDATE posts SET
              title = ?, content = ?, seo_title = ?,
              seo_description = ?, focus_keyword = ?,
              updated_at = datetime('now')
            WHERE id = ?`,
      args: [rev.title, rev.content, rev.seo_title || '', rev.seo_description || '', rev.focus_keyword || '', id],
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
