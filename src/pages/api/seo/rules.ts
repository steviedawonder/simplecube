import type { APIRoute } from 'astro';
import db from '@lib/db';
import { seedSEORules } from '@lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  await seedSEORules();
  const result = await db.execute('SELECT * FROM seo_rules ORDER BY category, id');
  return new Response(JSON.stringify(result.rows), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request }) => {
  const { rules } = await request.json();
  for (const rule of rules) {
    await db.execute({
      sql: 'UPDATE seo_rules SET enabled = ?, max_score = ?, updated_at = datetime("now") WHERE id = ?',
      args: [rule.enabled ? 1 : 0, rule.max_score, rule.id],
    });
  }
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async () => {
  await db.execute('DELETE FROM seo_rules');
  await seedSEORules();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
