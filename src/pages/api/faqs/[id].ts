import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

export const PUT: APIRoute = async ({ request, params }) => {
  try {
    const id = Number(params.id);
    const body = await request.json();
    const { page, question, answer, sort_order, active } = body;

    const updates: string[] = [];
    const args: any[] = [];

    if (page) {
      if (!['wedding', 'popup'].includes(page)) {
        return new Response(JSON.stringify({ error: '유효하지 않은 페이지입니다.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      updates.push('page = ?');
      args.push(page);
    }
    if (question) { updates.push('question = ?'); args.push(question); }
    if (answer) { updates.push('answer = ?'); args.push(answer); }
    if (typeof sort_order === 'number') { updates.push('sort_order = ?'); args.push(sort_order); }
    if (typeof active === 'number') { updates.push('active = ?'); args.push(active); }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: '수정할 내용이 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    updates.push("updated_at = datetime('now')");
    args.push(id);

    await db.execute({
      sql: `UPDATE faqs SET ${updates.join(', ')} WHERE id = ?`,
      args,
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

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = Number(params.id);

    await db.execute({
      sql: "UPDATE faqs SET active = 0, updated_at = datetime('now') WHERE id = ?",
      args: [id],
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
