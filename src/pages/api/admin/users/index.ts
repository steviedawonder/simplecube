import type { APIRoute } from 'astro';
import db from '@lib/db';
import bcrypt from 'bcryptjs';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user || user.role !== 'owner') {
    return new Response(JSON.stringify({ error: '권한이 없습니다.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await db.execute(
    'SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC'
  );

  return new Response(JSON.stringify({ users: result.rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user || user.role !== 'owner') {
    return new Response(JSON.stringify({ error: '권한이 없습니다.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: '이름, 이메일, 비밀번호는 필수입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (role && !['owner', 'editor'].includes(role)) {
      return new Response(JSON.stringify({ error: '유효하지 않은 역할입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email],
    });
    if (existing.rows.length > 0) {
      return new Response(JSON.stringify({ error: '이미 등록된 이메일입니다.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.execute({
      sql: 'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      args: [name, email, passwordHash, role || 'editor'],
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
