import { defineMiddleware } from 'astro:middleware';
import { getActiveUser, getTokenFromCookies } from './lib/auth';
import { initDB, seedSEORules, seedOwnerAccount, seedFaqs, seedPackageItems, seedPageContents, seedCustomContents, migratePortfolioColumns, seedPhotostripCategories, migrateUsersEmailToUsername, migrateFaqsPageConstraint, migrateBadSlugs } from './lib/db';

let dbInitialized = false;

// 이전 워드프레스 URL → 현재 페이지 301 리다이렉트
const wpRedirects: Record<string, string> = {
  '/wedding-components': '/wedding/',
  '/wedding-venues': '/wedding/',
};
const wpPrefixRedirects: [string, string][] = [
  ['/wedding-components/', '/wedding/'],
  ['/wedding-venues/', '/wedding/'],
  ['/portfolio-category/', '/popup/'],
  ['/portfolio/', '/popup/'],
  ['/category/', '/'],
  ['/wp-content/', '/'],
  ['/wp-admin/', '/'],
  ['/wp-includes/', '/'],
  ['/feed/', '/'],
  ['/author/', '/'],
];

// Permanently removed WordPress paths — return 410 Gone so search engines
// drop them from the index quickly (instead of 301 → / which keeps them in
// the soft-noise pool). Naver's site diagnostic showed 144 stale /tag/* URLs
// from the WordPress era still flagged as noindex.
const wpGonePrefixes = ['/tag/'];

// 비로그인 GET 을 허용하는 API — 공개 페이지(포트폴리오 갤러리, 사이트 팝업)와 자체 인증하는 크론만
function isPublicGetApi(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '');
  return p === '/api/portfolio' || p === '/api/popups' || p.startsWith('/api/cron/');
}

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
  // Permanently removed WordPress paths — 410 Gone
  for (const prefix of wpGonePrefixes) {
    if (pathname.startsWith(prefix)) {
      return new Response('Gone', {
        status: 410,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  }
  if (pathname === '/wp-login.php') {
    return context.redirect('/', 301);
  }

  // SSR 블로그 경로는 슬래시로 끝나는 형태로 통일 (정적 페이지는 vercel.json 리다이렉트가 처리)
  if ((context.request.method === 'GET' || context.request.method === 'HEAD') && /^\/blog(\/[^/.]+)?$/.test(pathname)) {
    return context.redirect(`${pathname}/${context.url.search}`, 301);
  }

  // 정적 페이지는 DB 초기화 불필요 — admin/api/blog 경로만 DB 사용
  const needsDB = pathname.startsWith('/admin') || pathname.startsWith('/api/') || pathname.startsWith('/blog') || pathname.startsWith('/inquiry') || /^\/(popup|wedding|rental|corporate|pricing)?\/?$/.test(pathname);

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

  // Protect admin routes (except login page) + 미발행 초안 미리보기
  if ((pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) || pathname.startsWith('/blog-preview')) {
    const user = await getActiveUser(getTokenFromCookies(context.request.headers.get('cookie')));
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
    const user = await getActiveUser(getTokenFromCookies(context.request.headers.get('cookie')));
    if (!user) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    context.locals.user = user;
  }

  // GET API: 공개 페이지가 쓰는 엔드포인트만 열고 나머지(글 전문·초안·휴지통·미디어·계정·og-image 프록시)는 인증 필요
  if (pathname.startsWith('/api/') && context.request.method === 'GET') {
    const user = await getActiveUser(getTokenFromCookies(context.request.headers.get('cookie')));
    if (user) {
      context.locals.user = user;
    } else if (!isPublicGetApi(pathname)) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const response = await next();

  // 공개 HTML 은 Vercel CDN 에 60초 캐시 + 만료 후에도 백그라운드 갱신(stale-while-revalidate).
  // 관리자에서 수정하면 최대 약 1분 뒤 다음 방문부터 반영된다. (관리자·API·문의폼·미리보기·오류 응답은 캐시 안 함)
  const isPublicPage = !/^\/(admin|api|inquiry|blog-preview)(\/|$)/.test(pathname);
  const isHtml = (response.headers.get('Content-Type') || '').includes('text/html');
  if (context.request.method === 'GET' && isPublicPage && isHtml && response.status === 200 && !response.headers.has('Cache-Control')) {
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=86400');
  }

  return response;
});
