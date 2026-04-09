// Image sitemap for Google Image Search optimization
export const prerender = true;

const siteUrl = 'https://simplecube.net';

const pages = [
  {
    loc: '/',
    images: [
      { loc: '/images/common/og-image.jpg', title: '심플큐브 포토부스 — 팝업·웨딩·행사 포토부스 대여 전문' },
    ],
  },
  {
    loc: '/popup',
    images: [
      { loc: '/images/common/og-image.jpg', title: '심플큐브 행사 포토부스 — 팝업스토어·기업행사·페스티벌 포토부스 대여' },
    ],
  },
  {
    loc: '/wedding',
    images: [
      { loc: '/images/common/og-image.jpg', title: '심플큐브 웨딩 포토부스 — 결혼식 하객 포토 서비스' },
    ],
  },
  {
    loc: '/rental',
    images: [
      { loc: '/images/common/og-image.jpg', title: '포토부스 대여·렌탈 — 심플큐브 전국 출장 포토부스 렌탈' },
    ],
  },
  {
    loc: '/corporate',
    images: [
      { loc: '/images/common/og-image.jpg', title: '기업행사 포토부스 대여 — 컨퍼런스·전시회·세미나 포토부스' },
    ],
  },
  {
    loc: '/brand',
    images: [
      { loc: '/images/common/og-image.jpg', title: '심플큐브 브랜드 소개 — 포토부스 전문 기업' },
    ],
  },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET() {
  const urlEntries = pages
    .map(
      (page) => `  <url>
    <loc>${siteUrl}${page.loc}</loc>
${page.images
  .map(
    (img) => `    <image:image>
      <image:loc>${siteUrl}${escapeXml(img.loc)}</image:loc>
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
    },
  });
}
