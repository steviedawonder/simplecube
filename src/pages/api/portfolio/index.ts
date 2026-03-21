import type { APIRoute } from 'astro';
import { uploadToCloudinary, isConfigured } from '@lib/cloudinary';
import db from '@lib/db';

export const prerender = false;

// GET: List portfolio items with filtering
export const GET: APIRoute = async ({ url }) => {
  const page = url.searchParams.get('page') || '';
  const pageTag = url.searchParams.get('page_tag') || '';
  const tag = url.searchParams.get('tag') || '';
  const tags = url.searchParams.get('tags') || '';
  const cutType = url.searchParams.get('cut_type') || '';

  let sql = 'SELECT * FROM portfolio WHERE visible = 1';
  const args: any[] = [];

  // page_tag filter (new, preferred)
  if (pageTag) {
    sql += ' AND page_tag = ?';
    args.push(pageTag);
  }

  // Legacy page filter (backward compat)
  if (page && !pageTag) {
    sql += ' AND page = ?';
    args.push(page);
  }

  // Single tag filter (legacy)
  if (tag) {
    sql += " AND (',' || tags || ',') LIKE ?";
    args.push(`%,${tag},%`);
  }

  // Multi-tag OR filter: ?tags=랩핑,삼성 → any match
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagList.length > 0) {
      const tagConditions = tagList.map(() => "(',' || tags || ',') LIKE ?");
      sql += ` AND (${tagConditions.join(' OR ')})`;
      tagList.forEach(t => args.push(`%,${t},%`));
    }
  }

  // cut_type filter
  if (cutType) {
    sql += ' AND cut_type = ?';
    args.push(cutType);
  }

  sql += ' ORDER BY sort_order ASC, created_at DESC';

  const result = await db.execute({ sql, args });
  return new Response(JSON.stringify(result.rows), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST: Upload new portfolio item
export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    let title = (formData.get('title') as string) || '';
    if (!title && file) {
      title = file.name.replace(/\.[^.]+$/, '');
    }
    const description = (formData.get('description') as string) || '';
    const page = (formData.get('page') as string) || 'popup';
    const pageTag = (formData.get('page_tag') as string) || page;
    const tags = (formData.get('tags') as string) || '';
    const cutType = (formData.get('cut_type') as string) || null;

    if (!file) {
      return new Response(JSON.stringify({ error: '파일이 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upload to Cloudinary
    if (!isConfigured()) {
      return new Response(JSON.stringify({ error: 'Cloudinary가 설정되지 않았습니다.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await uploadToCloudinary(file, 'simplecube/portfolio');

    // Get max sort_order
    const maxOrder = await db.execute("SELECT COALESCE(MAX(sort_order), 0) as max_order FROM portfolio");
    const nextOrder = Number((maxOrder.rows[0] as any).max_order) + 1;

    await db.execute({
      sql: 'INSERT INTO portfolio (title, description, page, page_tag, image_url, public_id, tags, cut_type, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [title, description, page, pageTag, result.secure_url, result.public_id, tags, cutType, nextOrder],
    });

    const inserted = await db.execute('SELECT last_insert_rowid() as id');
    const id = (inserted.rows[0] as any).id;

    return new Response(
      JSON.stringify({
        id,
        title,
        description,
        page,
        page_tag: pageTag,
        image_url: result.secure_url,
        public_id: result.public_id,
        tags,
        cut_type: cutType,
        sort_order: nextOrder,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
