import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const page = url.searchParams.get('page');
  const section = url.searchParams.get('section');

  let sql = 'SELECT * FROM page_contents WHERE 1=1';
  const args: any[] = [];

  if (page) {
    sql += ' AND page = ?';
    args.push(page);
  }
  if (section) {
    sql += ' AND section = ?';
    args.push(section);
  }

  sql += ' ORDER BY section, key';

  const result = await db.execute({ sql, args });

  return new Response(JSON.stringify({ items: result.rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    const body = await request.json();
    const { page, section, key, value, type } = body;

    if (!page || !section || !key || value === undefined) {
      return new Response(JSON.stringify({ error: '필수 항목이 누락되었습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.execute({
      sql: `INSERT INTO page_contents (page, section, key, value, type, updated_by, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(page, section, key)
            DO UPDATE SET value = excluded.value, type = excluded.type, updated_by = excluded.updated_by, updated_at = datetime('now')`,
      args: [page, section, key, value, type || 'text', user?.userId || null],
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
