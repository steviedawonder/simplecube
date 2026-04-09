import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const page = url.searchParams.get('page');

  let sql = 'SELECT * FROM faqs WHERE active = 1';
  const args: any[] = [];

  if (page && ['wedding', 'popup', 'rental', 'corporate', 'general', 'pricing'].includes(page)) {
    sql += ' AND page = ?';
    args.push(page);
  }

  sql += ' ORDER BY sort_order ASC, id ASC';

  const result = await db.execute({ sql, args });

  return new Response(JSON.stringify({ faqs: result.rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { page, question, answer, sort_order } = body;

    if (!page || !question || !answer) {
      return new Response(JSON.stringify({ error: '페이지, 질문, 답변은 필수입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!['wedding', 'popup', 'rental', 'corporate', 'general', 'pricing'].includes(page)) {
      return new Response(JSON.stringify({ error: '유효하지 않은 페이지입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await db.execute({
      sql: 'INSERT INTO faqs (page, question, answer, sort_order) VALUES (?, ?, ?, ?)',
      args: [page, question, answer, sort_order ?? 0],
    });

    return new Response(JSON.stringify({ success: true, id: Number(result.lastInsertRowid) }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
