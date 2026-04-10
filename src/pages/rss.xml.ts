import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import db from '@lib/db';

export const prerender = false;

export async function GET(context: APIContext) {
  // Static content-collection posts
  const staticPosts = await getCollection('blog', ({ data }) => !data.draft);

  // DB-driven posts
  let dbPosts: any[] = [];
  try {
    const result = await db.execute({
      sql: `SELECT title, slug, description, seo_description, image, created_at
            FROM posts
            WHERE draft = 0 AND deleted_at IS NULL
              AND (scheduled_at IS NULL OR scheduled_at <= datetime('now'))
            ORDER BY created_at DESC`,
      args: [],
    });
    dbPosts = result.rows as any[];
  } catch (_) {
    // DB unavailable at build time — skip gracefully
  }

  const staticItems = staticPosts
    .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())
    .map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/blog-preview/${post.id}/`,
      categories: [post.data.category],
    }));

  const dbItems = dbPosts.map((post) => ({
    title: String(post.title),
    pubDate: new Date(String(post.created_at)),
    description: String(post.seo_description || post.description || ''),
    link: `/blog/${encodeURIComponent(String(post.slug))}/`,
  }));

  // Merge and sort newest-first
  const allItems = [...staticItems, ...dbItems].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  return rss({
    title: '심플큐브 블로그',
    description: '포토부스 렌탈, 웨딩 포토부스, 팝업 이벤트 등 심플큐브의 최신 소식과 유용한 정보를 만나보세요.',
    site: context.site!,
    items: allItems,
    customData: '<language>ko-KR</language>',
  });
}
