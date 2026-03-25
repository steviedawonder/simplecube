import type { APIRoute } from 'astro';
import { authenticateUser, createToken, getSessionCookie } from '@lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({ error: '아이디와 비밀번호를 입력하세요.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await authenticateUser(username, password);
    if (!user) {
      return new Response(JSON.stringify({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = await createToken(user);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': getSessionCookie(token),
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
