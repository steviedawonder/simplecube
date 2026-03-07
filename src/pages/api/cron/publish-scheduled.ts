import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

// Vercel Cron Job: Publish scheduled posts
// Runs every 5 minutes via vercel.json cron config
export const GET: APIRoute = async ({ request }) => {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;

  // Allow if cron secret matches or if no secret is configured (dev mode)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Find posts that are scheduled and their time has passed
    const result = await db.execute(`
      SELECT id, title, slug, scheduled_at
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
      publishedPosts.push({ id: post.id, title: post.title, slug: post.slug });
    }

    return new Response(
      JSON.stringify({
        published: publishedPosts.length,
        posts: publishedPosts,
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
