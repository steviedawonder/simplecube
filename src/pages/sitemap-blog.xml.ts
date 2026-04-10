/**
 * Dynamic sitemap for DB-driven blog posts.
 * @astrojs/sitemap cannot auto-detect SSR (prerender=false) pages,
 * so we generate this separately and register it in robots.txt.
 */
export const prerender = false;

import db from '@lib/db';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  const siteUrl = 'https://simplecube.net';

  try {
    const result = await db.execute({
      sql: `SELECT slug, updated_at, created_at
            FROM posts
            WHERE draft = 0
              AND deleted_at IS NULL
              AND (scheduled_at IS NULL OR scheduled_at <= datetime('now'))
            ORDER BY updated_at DESC`,
      args: [],
    });

    const urlEntries = result.rows
      .map((post: any) => {
        const slug = encodeURIComponent(String(post.slug));
        const dateRaw = post.updated_at || post.created_at;
        const lastmod = dateRaw
          ? new Date(dateRaw).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        return `  <url>
    <loc>${siteUrl}/blog/${escapeXml(slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('sitemap-blog error:', err);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
    );
  }
}
