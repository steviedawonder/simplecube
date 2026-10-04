import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import db from '@lib/db';

export const prerender = false;

export async function GET(context: APIContext) {
  // DB 글만 제공한다. src/content/blog 마크다운은 렌더링 라우트가 없어 링크가 죽고,
  // 외부(네이버 블로그) 연동 글은 /blog/{slug} 가 외부로 302 되므로 피드에서 제외한다.
  let dbPosts: any[] = [];
  try {
    const result = await db.execute({
      sql: `SELECT title, slug, description, seo_description, created_at
            FROM posts
            WHERE draft = 0 AND deleted_at IS NULL
              AND (scheduled_at IS NULL OR scheduled_at <= datetime('now'))
              AND (external_url IS NULL OR external_url = '')
            ORDER BY created_at DESC`,
      args: [],
    });
    dbPosts = result.rows as any[];
  } catch (_) {
    // DB unavailable — skip gracefully
  }

  const items = dbPosts.map((post) => ({
    title: String(post.title),
    pubDate: new Date(String(post.created_at)),
    description: cleanText(String(post.seo_description || post.description || '')),
    link: `/blog/${encodeURIComponent(String(post.slug))}/`,
  }));

  return rss({
    title: '심플큐브 블로그',
    description: '포토부스 렌탈, 웨딩 포토부스, 팝업 이벤트 등 심플큐브의 최신 소식과 유용한 정보를 만나보세요.',
    site: context.site!,
    items,
    customData: '<language>ko-KR</language>',
  });
}

// 줄바꿈·제로폭 문자 제거
function cleanText(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
}
