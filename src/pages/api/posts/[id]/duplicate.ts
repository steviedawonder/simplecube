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

    // Get the original post
    const result = await db.execute({
      sql: 'SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL',
      args: [id],
    });

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: '게시글을 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const original = result.rows[0] as any;

    // Generate unique slug
    let newSlug = `${original.slug}-copy`;
    let slugCounter = 1;
    while (true) {
      const check = await db.execute({
        sql: 'SELECT id FROM posts WHERE slug = ?',
        args: [newSlug],
      });
      if (check.rows.length === 0) break;
      slugCounter++;
      newSlug = `${original.slug}-copy-${slugCounter}`;
    }

    // Create the duplicate as draft
    const insertResult = await db.execute({
      sql: `INSERT INTO posts (title, slug, description, content, category_id, image, focus_keyword, seo_title, seo_description, seo_score, external_url, draft)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [
        `${original.title} (복사본)`,
        newSlug,
        original.description || '',
        original.content || '',
        original.category_id,
        original.image || '',
        original.focus_keyword || '',
        original.seo_title || '',
        original.seo_description || '',
        original.seo_score || 0,
        original.external_url || '',
      ],
    });

    const newPostId = Number(insertResult.lastInsertRowid);

    // Copy tags
    const tagsResult = await db.execute({
      sql: 'SELECT tag_id FROM post_tags WHERE post_id = ?',
      args: [id],
    });

    for (const row of tagsResult.rows) {
      await db.execute({
        sql: 'INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)',
        args: [newPostId, (row as any).tag_id],
      });
    }

    return new Response(JSON.stringify({ id: newPostId, slug: newSlug }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
