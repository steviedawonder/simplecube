import type { APIRoute } from 'astro';
import db from '@lib/db';
import bcrypt from 'bcryptjs';

export const prerender = false;

export const PUT: APIRoute = async ({ locals, request, params }) => {
  const user = locals.user;
  if (!user || user.role !== 'owner') {
    return new Response(JSON.stringify({ error: '권한이 없습니다.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const id = Number(params.id);
    const body = await request.json();
    const { name, email, password, role, active } = body;

    if (role && !['owner', 'editor'].includes(role)) {
      return new Response(JSON.stringify({ error: '유효하지 않은 역할입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (email) {
      const existing = await db.execute({
        sql: 'SELECT id FROM users WHERE email = ? AND id != ?',
        args: [email, id],
      });
      if (existing.rows.length > 0) {
        return new Response(JSON.stringify({ error: '이미 등록된 이메일입니다.' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const updates: string[] = [];
    const args: any[] = [];

    if (name) { updates.push('name = ?'); args.push(name); }
    if (email) { updates.push('email = ?'); args.push(email); }
    if (role) { updates.push('role = ?'); args.push(role); }
    if (typeof active === 'boolean') { updates.push('active = ?'); args.push(active ? 1 : 0); }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      args.push(passwordHash);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: '수정할 내용이 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    args.push(id);
    await db.execute({
      sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
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

export const DELETE: APIRoute = async ({ locals, params }) => {
  const user = locals.user;
  if (!user || user.role !== 'owner') {
    return new Response(JSON.stringify({ error: '권한이 없습니다.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const id = Number(params.id);

    // 자기 자신은 비활성화 불가
    if (id === user.userId) {
      return new Response(JSON.stringify({ error: '자기 자신은 비활성화할 수 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.execute({
      sql: 'UPDATE users SET active = 0 WHERE id = ?',
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
