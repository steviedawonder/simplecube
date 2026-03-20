import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const result = await db.execute({ sql: 'SELECT * FROM popups WHERE id = ?', args: [params.id!] });
  if (result.rows.length === 0) {
    return new Response(JSON.stringify({ error: '팝업을 찾을 수 없습니다.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify(result.rows[0]), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const data = await request.json();

    // Check active popup count if trying to activate
    if (data.active) {
      const activeCount = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM popups WHERE active = 1 AND id != ?',
        args: [params.id!],
      });
      if ((activeCount.rows[0] as any).count >= 2) {
        return new Response(JSON.stringify({ error: '활성 팝업은 최대 2개까지만 가능합니다.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    await db.execute({
      sql: `UPDATE popups SET title=?, subtitle=?, body=?, image_url=?, link_url=?, link_text=?, bg_color=?, text_color=?, active=?, sort_order=?, updated_at=datetime('now')
            WHERE id=?`,
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
        params.id!,
      ],
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    await db.execute({ sql: 'DELETE FROM popups WHERE id = ?', args: [params.id!] });
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
