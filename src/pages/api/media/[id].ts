import type { APIRoute } from 'astro';
import { deleteFromCloudinary } from '@lib/cloudinary';
import db from '@lib/db';

export const prerender = false;

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;

  try {
    // Get media record
    const result = await db.execute({
      sql: 'SELECT * FROM media WHERE id = ?',
      args: [Number(id)],
    });

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: '미디어를 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const media = result.rows[0] as any;

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(media.public_id);
    } catch {
      // Continue even if Cloudinary delete fails
    }

    // Delete from DB
    await db.execute({
      sql: 'DELETE FROM media WHERE id = ?',
      args: [Number(id)],
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
