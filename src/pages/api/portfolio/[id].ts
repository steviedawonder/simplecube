import type { APIRoute } from 'astro';
import { deleteFromCloudinary } from '@lib/cloudinary';
import db from '@lib/db';

export const prerender = false;

// PUT: Update portfolio item
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;
    const body = await request.json();

    const fields: string[] = [];
    const args: any[] = [];

    if (body.title !== undefined) {
      fields.push('title = ?');
      args.push(body.title);
    }
    if (body.description !== undefined) {
      fields.push('description = ?');
      args.push(body.description);
    }
    if (body.tags !== undefined) {
      fields.push('tags = ?');
      args.push(body.tags);
    }
    if (body.page !== undefined) {
      fields.push('page = ?');
      args.push(body.page);
    }
    if (body.visible !== undefined) {
      fields.push('visible = ?');
      args.push(body.visible ? 1 : 0);
    }
    if (body.sort_order !== undefined) {
      fields.push('sort_order = ?');
      args.push(body.sort_order);
    }
    if (body.page_tag !== undefined) {
      fields.push('page_tag = ?');
      args.push(body.page_tag);
    }
    if (body.cut_type !== undefined) {
      fields.push('cut_type = ?');
      args.push(body.cut_type || null);
    }

    if (fields.length === 0) {
      return new Response(JSON.stringify({ error: '변경할 항목이 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    args.push(id);
    await db.execute({
      sql: `UPDATE portfolio SET ${fields.join(', ')} WHERE id = ?`,
      args,
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

// DELETE: Remove portfolio item
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = params.id;

    // Get the item first to delete from Cloudinary
    const result = await db.execute({
      sql: 'SELECT public_id FROM portfolio WHERE id = ?',
      args: [id],
    });

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: '항목을 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const publicId = (result.rows[0] as any).public_id;
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId);
      } catch {
        // Cloudinary delete failure shouldn't block DB delete
      }
    }

    await db.execute({
      sql: 'DELETE FROM portfolio WHERE id = ?',
      args: [id],
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
