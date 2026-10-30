import type { APIRoute } from 'astro';
import db from '@lib/db';
import { sanitizeSlug } from '@utils/slug';
import { notifyIndexNow, blogPath, isLivePost } from '@lib/indexnow';

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
      sql: `
        SELECT p.*, c.name as category_name
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `,
      args: [id],
    });

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: '게시글을 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch tags for the post
    const tagsResult = await db.execute({
      sql: `
        SELECT t.id, t.name, t.slug
        FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id = ?
        ORDER BY t.name
      `,
      args: [id],
    });

    const post = { ...result.rows[0], tags: tagsResult.rows };

    return new Response(JSON.stringify(post), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: '잘못된 게시글 ID입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if post exists (+ 수정 전 공개 상태·슬러그 — IndexNow 판단용)
    const existing = await db.execute({
      sql: 'SELECT id, slug, draft, scheduled_at, external_url, deleted_at FROM posts WHERE id = ?',
      args: [id],
    });
    if (existing.rows.length === 0) {
      return new Response(JSON.stringify({ error: '게시글을 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const {
      title,
      slug,
      description = '',
      content = '',
      category_id = null,
      image = '',
      focus_keyword = '',
      seo_title = '',
      seo_description = '',
      seo_score = 0,
      external_url = '',
      draft = 1,
      scheduled_at = null,
      tags = [],
    } = body;

    if (!title || !slug) {
      return new Response(JSON.stringify({ error: '제목과 슬러그는 필수입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanSlug = sanitizeSlug(slug);
    if (!cleanSlug) {
      return new Response(JSON.stringify({ error: '올바른 슬러그를 입력하세요.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create revision before updating
    await db.execute({
      sql: `INSERT INTO post_revisions (post_id, title, content, seo_title, seo_description, focus_keyword)
            SELECT id, title, content, seo_title, seo_description, focus_keyword
            FROM posts WHERE id = ?`,
      args: [id],
    });

    // Update the post
    await db.execute({
      sql: `UPDATE posts SET
              title = ?, slug = ?, description = ?, content = ?,
              category_id = ?, image = ?, focus_keyword = ?,
              seo_title = ?, seo_description = ?, seo_score = ?,
              external_url = ?, draft = ?, scheduled_at = ?,
              updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        title,
        cleanSlug,
        description,
        content,
        category_id,
        image,
        focus_keyword,
        seo_title,
        seo_description,
        seo_score,
        external_url,
        draft,
        scheduled_at,
        id,
      ],
    });

    // Update post_tags: delete existing, re-insert new ones
    await db.execute({
      sql: 'DELETE FROM post_tags WHERE post_id = ?',
      args: [id],
    });

    if (Array.isArray(tags) && tags.length > 0) {
      for (const tagId of tags) {
        await db.execute({
          sql: 'INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)',
          args: [id, Number(tagId)],
        });
      }
    }

    // 공개 상태가 바뀌었거나 공개 글이 수정됐으면 네이버·Bing 에 알림 (백그라운드)
    const before = existing.rows[0] as any;
    const wasLive = isLivePost(before);
    const nowLive = isLivePost({ draft, scheduled_at, external_url, deleted_at: before.deleted_at });
    const slugChanged = String(before.slug) !== cleanSlug;
    const paths: string[] = [];
    if (nowLive) paths.push(blogPath(cleanSlug)); // 새로 공개 or 공개 글 수정
    if (wasLive && (!nowLive || slugChanged)) paths.push(blogPath(String(before.slug))); // 비공개 전환·슬러그 변경 → 옛 URL
    if (wasLive !== nowLive || (wasLive && slugChanged)) paths.push('/blog/'); // 목록이 바뀜
    if (paths.length > 0) notifyIndexNow(paths);

    return new Response(JSON.stringify({ id, title, slug: cleanSlug }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return new Response(JSON.stringify({ error: '이미 존재하는 슬러그입니다.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: e.message || '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: '잘못된 게시글 ID입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existing = await db.execute({
      sql: 'SELECT id, slug, draft, scheduled_at, external_url, deleted_at FROM posts WHERE id = ? AND deleted_at IS NULL',
      args: [id],
    });
    if (existing.rows.length === 0) {
      return new Response(JSON.stringify({ error: '게시글을 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Soft delete
    await db.execute({
      sql: "UPDATE posts SET deleted_at = datetime('now') WHERE id = ?",
      args: [id],
    });

    // 공개 글을 지웠으면 URL 이 404 가 됐다고 알림 (백그라운드)
    const removed = existing.rows[0] as any;
    if (isLivePost(removed)) notifyIndexNow([blogPath(String(removed.slug)), '/blog/']);

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
