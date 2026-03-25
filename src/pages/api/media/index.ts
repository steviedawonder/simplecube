import type { APIRoute } from 'astro';
import db from '@lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const result = await db.execute('SELECT * FROM media ORDER BY created_at DESC');
    return new Response(JSON.stringify(result.rows), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[media] 미디어 목록 조회 실패:', e.message);
    return new Response(
      JSON.stringify({ error: `미디어 목록 로드 실패: ${e.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
