import { defineMiddleware } from 'astro:middleware';
import { verifyToken, getTokenFromCookies } from './lib/auth';
import { initDB, seedSEORules, seedOwnerAccount, seedFaqs, seedPackageItems, seedPageContents, seedCustomContents, migratePortfolioColumns, seedPhotostripCategories, migrateUsersEmailToUsername, migrateFaqsPageConstraint, migrateBadSlugs } from './lib/db';

let dbInitialized = false;

// 이전 워드프레스 URL → 현재 페이지 301 리다이렉트
const wpRedirects: Record<string, string> = {
  '/wedding-components': '/wedding',
  '/wedding-venues': '/wedding',
};
const wpPrefixRedirects: [string, string][] = [
  ['/portfolio-category/', '/popup'],
  ['/portfolio/', '/popup'],
  ['/category/', '/'],
  ['/tag/', '/'],
  ['/wp-content/', '/'],
  ['/wp-admin/', '/'],
  ['/wp-includes/', '/'],
  ['/feed/', '/'],
  ['/author/', '/'],
];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // 워드프레스 이전 URL 리다이렉트 (301)
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  if (wpRedirects[cleanPath]) {
    return context.redirect(wpRedirects[cleanPath], 301);
  }
  for (const [prefix, dest] of wpPrefixRedirects) {
    if (pathname.startsWith(prefix)) {
      return context.redirect(dest, 301);
    }
  }
  if (pathname === '/wp-login.php') {
    return context.redirect('/', 301);
  }

  // 정적 페이지는 DB 초기화 불필요 — admin/api/blog 경로만 DB 사용
  const needsDB = pathname.startsWith('/admin') || pathname.startsWith('/api/') || pathname.startsWith('/blog') || pathname.startsWith('/inquiry') || pathname === '/popup' || pathname === '/wedding' || pathname === '/rental' || pathname === '/corporate' || pathname === '/pricing' || pathname === '/';

  if (needsDB && !dbInitialized) {
    try {
      await initDB();
      await migrateUsersEmailToUsername();
      await seedSEORules();
      await seedOwnerAccount();
      await seedFaqs();
      await seedPackageItems();
      await seedPageContents();
      await seedCustomContents();
      await migrateFaqsPageConstraint();
      await migratePortfolioColumns();
      await seedPhotostripCategories();
      await migrateBadSlugs();
      dbInitialized = true;
    } catch (e) {
      console.error('DB init error:', e);
    }
  }

  // Protect admin routes (except login page)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = getTokenFromCookies(context.request.headers.get('cookie'));
    const user = token ? await verifyToken(token) : null;
    if (!user) {
      return context.redirect('/admin/login');
    }
    context.locals.user = user;
  }

  // Protect mutating API routes
  if (pathname.startsWith('/api/') && context.request.method !== 'GET') {
    // Allow public endpoints without auth
    if (pathname === '/api/auth/login' || pathname === '/api/inquiry') {
      return next();
    }
    const token = getTokenFromCookies(context.request.headers.get('cookie'));
    const user = token ? await verifyToken(token) : null;
    if (!user) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    context.locals.user = user;
  }

  // For GET API requests that need user context
  if (pathname.startsWith('/api/') && context.request.method === 'GET') {
    const token = getTokenFromCookies(context.request.headers.get('cookie'));
    const user = token ? await verifyToken(token) : null;
    if (user) {
      context.locals.user = user;
    }
  }

  const response = await next();

  // CDN cache for public SSR pages — first request hits DB, subsequent served from Vercel edge
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/') && !pathname.startsWith('/inquiry')) {
    if (/^\/(wedding|popup|rental|corporate|pricing|faq|qna|brand|contact)$/.test(pathname)) {
      response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=30');
    } else if (pathname.startsWith('/blog')) {
      // Blog content may be updated more frequently
      response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    }
  }

  return response;
});
