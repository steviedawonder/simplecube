import type { APIRoute } from 'astro';
import db from '@lib/db';
import { sanitizeSlug } from '@utils/slug';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const draft = url.searchParams.get('draft');
    const categoryId = url.searchParams.get('category_id');
    const search = url.searchParams.get('q');
    const deleted = url.searchParams.get('deleted');

    const conditions: string[] = [];
    const args: any[] = [];

    if (deleted === '1') {
      conditions.push('p.deleted_at IS NOT NULL');
    } else {
      conditions.push('p.deleted_at IS NULL');
    }

    if (draft !== null) {
      conditions.push('p.draft = ?');
      args.push(Number(draft));
    }

    if (categoryId) {
      conditions.push('p.category_id = ?');
      args.push(Number(categoryId));
    }

    if (search) {
      conditions.push('(p.title LIKE ? OR p.description LIKE ?)');
      const term = `%${search}%`;
      args.push(term, term);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.execute({
      sql: `
        SELECT p.*, c.name as category_name,
               (SELECT GROUP_CONCAT(t.name) FROM post_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.post_id = p.id) as tag_names
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.id
        ${where}
        ORDER BY p.created_at DESC
      `,
      args,
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

export const POST: APIRoute = async ({ request }) => {
  try {
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

    const result = await db.execute({
      sql: `INSERT INTO posts (title, slug, description, content, category_id, image, focus_keyword, seo_title, seo_description, seo_score, external_url, draft, scheduled_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ],
    });

    const postId = Number(result.lastInsertRowid);

    // Insert post_tags
    if (Array.isArray(tags) && tags.length > 0) {
      for (const tagId of tags) {
        await db.execute({
          sql: 'INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)',
          args: [postId, Number(tagId)],
        });
      }
    }

    return new Response(JSON.stringify({ id: postId, title, slug: cleanSlug }), {
      status: 201,
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
