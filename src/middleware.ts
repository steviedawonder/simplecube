import { defineMiddleware } from 'astro:middleware';
import { verifyToken, getTokenFromCookies } from './lib/auth';
import { initDB, seedSEORules } from './lib/db';

let dbInitialized = false;

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // 정적 페이지는 DB 초기화 불필요 — admin/api/blog 경로만 DB 사용
  const needsDB = pathname.startsWith('/admin') || pathname.startsWith('/api/') || pathname.startsWith('/blog');

  if (needsDB && !dbInitialized) {
    try {
      await initDB();
      await seedSEORules();
      dbInitialized = true;
    } catch (e) {
      console.error('DB init error:', e);
    }
  }

  // Protect admin routes (except login page)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = getTokenFromCookies(context.request.headers.get('cookie'));
    if (!token || !(await verifyToken(token))) {
      return context.redirect('/admin/login');
    }
  }

  // Protect mutating API routes
  if (pathname.startsWith('/api/') && context.request.method !== 'GET') {
    // Allow login endpoint without auth
    if (pathname === '/api/auth/login') {
      return next();
    }
    const token = getTokenFromCookies(context.request.headers.get('cookie'));
    if (!token || !(await verifyToken(token))) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return next();
});
