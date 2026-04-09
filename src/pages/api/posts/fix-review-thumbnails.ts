import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

export const POST: APIRoute = async () => {
  try {
    // Find all review posts (with external_url) that have no image
    const result = await db.execute({
      sql: `SELECT id, external_url FROM posts WHERE external_url IS NOT NULL AND external_url != '' AND (image IS NULL OR image = '') AND deleted_at IS NULL`,
      args: [],
    });

    const posts = result.rows as any[];
    let updated = 0;
    const errors: string[] = [];

    for (const post of posts) {
      try {
        const res = await fetch(post.external_url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SimpleCubeBot/1.0)' },
        });

        if (!res.ok) {
          errors.push(`${post.id}: HTTP ${res.status}`);
          continue;
        }

        const html = await res.text();
        let image = '';

        // Try og:image
        const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
        if (ogMatch) {
          image = ogMatch[1];
        }

        // Fallback: first img
        if (!image) {
          const imgMatch = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
          if (imgMatch) {
            image = imgMatch[1];
          }
        }

        // Make relative URLs absolute
        if (image && !image.startsWith('http')) {
          const baseUrl = new URL(post.external_url);
          image = new URL(image, baseUrl.origin).href;
        }

        if (image) {
          await db.execute({
            sql: `UPDATE posts SET image = ? WHERE id = ?`,
            args: [image, post.id],
          });
          updated++;
        }
      } catch (e: any) {
        errors.push(`${post.id}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({
      total: posts.length,
      updated,
      errors,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
