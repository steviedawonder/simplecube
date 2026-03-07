import { defineMiddleware } from 'astro:middleware';
import { verifyToken, getTokenFromCookies } from './lib/auth';
import { initDB, seedSEORules } from './lib/db';

let dbInitialized = false;

export const onRequest = defineMiddleware(async (context, next) => {
  // Initialize database on first request
  if (!dbInitialized) {
    try {
      await initDB();
      await seedSEORules();
      dbInitialized = true;
    } catch (e) {
      console.error('DB init error:', e);
    }
  }

  const { pathname } = context.url;

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
