// Image sitemap — 포트폴리오 갤러리는 클라이언트 fetch 로 그려져 크롤러가 이미지를 못 찾으므로
// 실제 현장 사진(포트폴리오)과 블로그 대표 이미지를 페이지별로 제출한다.
export const prerender = false;

import db from '@lib/db';

const siteUrl = 'https://simplecube.net';
const MAX_IMAGES_PER_PAGE = 1000; // 구글 제한

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absolute(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function GET() {
  const pages = new Map<string, { loc: string; title: string }[]>();
  const add = (page: string, loc: string, title: string) => {
    if (!loc) return;
    const list = pages.get(page) ?? [];
    if (list.length < MAX_IMAGES_PER_PAGE) list.push({ loc: absolute(loc), title });
    pages.set(page, list);
  };

  try {
    const portfolio = await db.execute(
      `SELECT image_url, title, tags, page, page_tag FROM portfolio WHERE visible = 1 ORDER BY sort_order ASC, created_at DESC`
    );
    for (const row of portfolio.rows as any[]) {
      const tag = String(row.page_tag || row.page || 'popup');
      const page = tag === 'wedding' ? '/wedding/' : '/popup/';
      const label = tag === 'wedding' ? '웨딩 포토부스 현장' : '팝업·행사 포토부스 현장';
      const title = String(row.title || '').trim() || `심플큐브 ${label}${row.tags ? ` — ${String(row.tags)}` : ''}`;
      add(page, String(row.image_url), title);
    }

    const posts = await db.execute(
      `SELECT slug, title, image FROM posts
       WHERE draft = 0 AND deleted_at IS NULL
         AND (scheduled_at IS NULL OR scheduled_at <= datetime('now'))
         AND (external_url IS NULL OR external_url = '')
         AND image IS NOT NULL AND image != ''`
    );
    for (const row of posts.rows as any[]) {
      add(`/blog/${encodeURIComponent(String(row.slug))}/`, String(row.image), String(row.title));
    }
  } catch (err) {
    console.error('image-sitemap error:', err);
  }

  // DB 를 못 읽어도 대표 이미지는 제출
  if (!pages.has('/')) add('/', '/images/common/og-image.jpg', '심플큐브 포토부스 대여 — 웨딩·팝업·기업행사');

  const urlEntries = [...pages.entries()]
    .map(
      ([page, images]) => `  <url>
    <loc>${siteUrl}${escapeXml(page)}</loc>
${images
  .map(
    (img) => `    <image:image>
      <image:loc>${escapeXml(img.loc)}</image:loc>
      <image:title>${escapeXml(img.title)}</image:title>
    </image:image>`
  )
  .join('\n')}
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
    },
  });
}
