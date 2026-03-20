import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const activeOnly = url.searchParams.get('active') === '1';
  const sql = activeOnly
    ? 'SELECT * FROM popups WHERE active = 1 ORDER BY sort_order ASC LIMIT 2'
    : 'SELECT * FROM popups ORDER BY sort_order ASC, created_at DESC';
  const result = await db.execute(sql);
  return new Response(JSON.stringify(result.rows), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // Check active popup count if trying to activate
    if (data.active) {
      const activeCount = await db.execute('SELECT COUNT(*) as count FROM popups WHERE active = 1');
      if ((activeCount.rows[0] as any).count >= 2) {
        return new Response(JSON.stringify({ error: '활성 팝업은 최대 2개까지만 가능합니다.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    await db.execute({
      sql: `INSERT INTO popups (title, subtitle, body, image_url, link_url, link_text, bg_color, text_color, active, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.title || '',
        data.subtitle || '',
        data.body || '',
        data.image_url || '',
        data.link_url || '',
        data.link_text || '',
        data.bg_color || '#1d1d1f',
        data.text_color || '#ffffff',
        data.active ? 1 : 0,
        data.sort_order || 0,
      ],
    });

    const inserted = await db.execute('SELECT last_insert_rowid() as id');
    const id = (inserted.rows[0] as any).id;

    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
