import type { APIRoute } from 'astro';
import db from '@lib/db';
import { submitToIndexNow, recentlyEditedPagePaths, blogPath } from '@lib/indexnow';

export const prerender = false;

// Vercel Cron Job: Publish scheduled posts
// Runs every 5 minutes via vercel.json cron config
export const GET: APIRoute = async ({ request }) => {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;

  // In production, CRON_SECRET is required
  if (import.meta.env.PROD && !cronSecret) {
    console.error('[CRON] CRON_SECRET 환경변수가 설정되지 않았습니다.');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Find posts that are scheduled and their time has passed
    const result = await db.execute(`
      SELECT id, title, slug, scheduled_at, external_url
      FROM posts
      WHERE draft = 1
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= datetime('now')
        AND deleted_at IS NULL
    `);

    const publishedPosts: any[] = [];

    for (const post of result.rows as any[]) {
      await db.execute({
        sql: `UPDATE posts SET draft = 0, scheduled_at = NULL, updated_at = datetime('now') WHERE id = ?`,
        args: [post.id],
      });
      publishedPosts.push({ id: post.id, title: post.title, slug: post.slug, external_url: post.external_url });
    }

    // IndexNow: 방금 발행된 글 + 최근 25시간 안에 관리자에서 고친 SSR 페이지(FAQ·패키지·문구)를 한 번에 전송.
    // 크론 응답·발행 결과에는 영향 없음 (실패는 로그만).
    let indexnow: unknown = null;
    try {
      const postPaths = publishedPosts.filter((p) => !p.external_url).map((p) => blogPath(String(p.slug)));
      const pagePaths = await recentlyEditedPagePaths(db);
      const paths = [...postPaths, ...(postPaths.length > 0 ? ['/blog/'] : []), ...pagePaths];
      if (paths.length > 0) indexnow = await submitToIndexNow(paths);
    } catch (e) {
      console.warn('[IndexNow] 크론 전송 건너뜀', e);
    }

    return new Response(
      JSON.stringify({
        published: publishedPosts.length,
        posts: publishedPosts,
        indexnow,
        timestamp: new Date().toISOString(),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
