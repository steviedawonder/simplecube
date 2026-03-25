import type { APIRoute } from 'astro';
import { verifyToken, getTokenFromCookies } from '@lib/auth';
import db from '@lib/db';
import bcrypt from 'bcryptjs';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get('cookie'));
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return new Response(JSON.stringify({ error: '인증이 필요합니다.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: '현재 비밀번호와 새 비밀번호를 입력하세요.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (newPassword.length < 4) {
      return new Response(JSON.stringify({ error: '새 비밀번호는 4자 이상이어야 합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify current password
    const result = await db.execute({
      sql: 'SELECT password_hash FROM users WHERE id = ?',
      args: [user.userId],
    });

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: '사용자를 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const valid = await bcrypt.compare(currentPassword, (result.rows[0] as any).password_hash);
    if (!valid) {
      return new Response(JSON.stringify({ error: '현재 비밀번호가 올바르지 않습니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update password
    const newHash = await bcrypt.hash(newPassword, 10);
    await db.execute({
      sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
      args: [newHash, user.userId],
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
