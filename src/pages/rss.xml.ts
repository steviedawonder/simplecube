import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  const sortedPosts = posts.sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
  );

  return rss({
    title: '심플큐브 블로그',
    description: '포토부스 렌탈, 웨딩 포토부스, 팝업 이벤트 등 심플큐브의 최신 소식과 유용한 정보를 만나보세요.',
    site: context.site!,
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/blog/${post.id}/`,
      categories: [post.data.category],
    })),
    customData: '<language>ko-KR</language>',
  });
}
