import type { APIRoute } from 'astro';
import db from '@lib/db';
import { isFaqPage } from '@data/faqPages';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const page = url.searchParams.get('page');

  // 관리자 전용 API (미들웨어가 로그인 확인) — 비활성 FAQ 도 보여야 관리자 화면에서 다시 켤 수 있다
  let sql = 'SELECT * FROM faqs';
  const args: any[] = [];

  if (page && isFaqPage(page)) {
    sql += ' WHERE page = ?';
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

    if (!isFaqPage(page)) {
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
