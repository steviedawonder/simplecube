import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';
import db from '@lib/db';

export const prerender = false;

// GET: List all portfolio items
export const GET: APIRoute = async ({ url }) => {
  const page = url.searchParams.get('page') || '';
  const tag = url.searchParams.get('tag') || '';

  let sql = 'SELECT * FROM portfolio WHERE visible = 1';
  const args: any[] = [];

  if (page) {
    sql += ' AND page = ?';
    args.push(page);
  }

  if (tag) {
    sql += " AND (',' || tags || ',') LIKE ?";
    args.push(`%,${tag},%`);
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
    const title = (formData.get('title') as string) || '';
    const description = (formData.get('description') as string) || '';
    const page = (formData.get('page') as string) || 'popup';
    const tags = (formData.get('tags') as string) || '';

    if (!file) {
      return new Response(JSON.stringify({ error: '파일이 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upload to Vercel Blob
    const token = import.meta.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Blob 토큰이 설정되지 않았습니다.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const blob = await put(`portfolio/${Date.now()}-${file.name}`, file, {
      access: 'public',
      token,
    });

    // Get max sort_order
    const maxOrder = await db.execute("SELECT COALESCE(MAX(sort_order), 0) as max_order FROM portfolio");
    const nextOrder = Number((maxOrder.rows[0] as any).max_order) + 1;

    await db.execute({
      sql: 'INSERT INTO portfolio (title, description, page, image_url, public_id, tags, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [title, description, page, blob.url, blob.url, tags, nextOrder],
    });

    const inserted = await db.execute('SELECT last_insert_rowid() as id');
    const id = (inserted.rows[0] as any).id;

    return new Response(
      JSON.stringify({
        id,
        title,
        description,
        page,
        image_url: blob.url,
        tags,
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
