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

export async function GET() {
  const base = 'https://simplecube.net';
  const lastmod = new Date().toISOString().split('T')[0];

  const children = [
    'sitemap-0.xml', // 정적 페이지 (Astro 자동 생성)
    'sitemap-blog.xml', // DB 기반 블로그 글
    'image-sitemap.xml', // 이미지
  ];

  const body = children
    .map(
      (file) =>
        `  <sitemap>\n    <loc>${base}/${file}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`
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
