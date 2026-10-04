/**
 * Master sitemap index.
 *
 * @astrojs/sitemap only generates `sitemap-index.xml` → `sitemap-0.xml`,
 * which contains the statically prerendered pages. The DB-driven blog posts
 * (sitemap-blog.xml) and the image sitemap are NOT chained into that index,
 * so submitting only sitemap-index.xml to Search Console never delivers the
 * blog URLs to Google/Naver.
 *
 * This master index chains ALL sitemaps so a single submission of
 * https://simplecube.net/sitemap.xml covers static pages + blog posts + images.
 */
export const prerender = false;

import db from '@lib/db';

export async function GET() {
  const base = 'https://simplecube.net';

  // 블로그 사이트맵만 실제 최종 수정일을 알 수 있다. 나머지는 매번 '오늘'을 찍지 않도록 lastmod 생략.
  let blogLastmod = '';
  try {
    const r = await db.execute(
      `SELECT MAX(COALESCE(updated_at, created_at)) AS m FROM posts
       WHERE draft = 0 AND deleted_at IS NULL AND (external_url IS NULL OR external_url = '')`
    );
    const m = (r.rows[0] as any)?.m;
    if (m) blogLastmod = new Date(String(m)).toISOString().split('T')[0];
  } catch {
    // DB 오류 시 lastmod 없이 제출
  }

  const children: { file: string; lastmod?: string }[] = [
    { file: 'sitemap-0.xml' }, // 정적 페이지 (Astro 자동 생성)
    { file: 'sitemap-blog.xml', lastmod: blogLastmod }, // DB 기반 블로그 글
    { file: 'image-sitemap.xml' }, // 포트폴리오·블로그 이미지
  ];

  const body = children
    .map(
      ({ file, lastmod }) =>
        `  <sitemap>\n    <loc>${base}/${file}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </sitemap>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
    },
  });
}
