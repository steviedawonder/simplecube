import type { APIRoute } from 'astro';
import { analyzeSEO } from '@lib/seo-analyzer';
import type { SEORule } from '@lib/seo-analyzer';
import db from '@lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const input = await request.json();

    // Fetch active SEO rules from DB
    const rulesResult = await db.execute('SELECT * FROM seo_rules WHERE enabled = 1');
    const rules: SEORule[] = rulesResult.rows.map((r: any) => ({
      id: r.id,
      category: r.category,
      label: r.label,
      max_score: r.max_score,
      enabled: Boolean(r.enabled),
      config: JSON.parse(r.config || '{}'),
    }));

    // Get all existing post keywords for uniqueness check
    const kwResult = await db.execute({
      sql: "SELECT focus_keyword FROM posts WHERE focus_keyword != '' AND id != ? AND deleted_at IS NULL",
      args: [input.postId || 0],
    });
    input.allPostKeywords = kwResult.rows.map((r: any) => r.focus_keyword.toLowerCase());

    const result = analyzeSEO(input, rules);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
