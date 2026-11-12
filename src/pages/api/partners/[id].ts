import type { APIRoute } from 'astro';
import { uploadToCloudinary, deleteFromCloudinary, isConfigured } from '@lib/cloudinary';
import db from '@lib/db';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function dropImage(publicId: unknown) {
  if (typeof publicId === 'string' && publicId) {
    try { await deleteFromCloudinary(publicId); } catch { /* Cloudinary 삭제 실패는 무시 */ }
  }
}

// PUT: 수정 — JSON(순서·표시 여부) 또는 multipart(이름, image, logo, remove_logo)
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;
    const cur = await db.execute({ sql: 'SELECT * FROM partner_halls WHERE id = ?', args: [id] });
    if (cur.rows.length === 0) return json({ error: '항목을 찾을 수 없습니다.' }, 404);
    const row = cur.rows[0] as any;

    const fields: string[] = [];
    const args: any[] = [];

    if ((request.headers.get('content-type') || '').includes('multipart/form-data')) {
      const form = await request.formData();
      const name = form.get('name') as string | null;
      const image = form.get('image') as File | null;
      const logo = form.get('logo') as File | null;
      const removeLogo = form.get('remove_logo') === '1';

      if (name !== null) {
        if (!name.trim()) return json({ error: '웨딩홀명을 입력해주세요.' }, 400);
        fields.push('name = ?'); args.push(name.trim());
      }
      if ((image && image.size) || (logo && logo.size)) {
        if (!isConfigured()) return json({ error: 'Cloudinary가 설정되지 않았습니다.' }, 500);
      }
      if (image && image.size) {
        const up = await uploadToCloudinary(image, 'simplecube/partners');
        fields.push('image_url = ?', 'public_id = ?'); args.push(up.secure_url, up.public_id);
        await dropImage(row.public_id);
      }
      if (logo && logo.size) {
        const lg = await uploadToCloudinary(logo, 'simplecube/partners/logo');
        fields.push('logo_url = ?', 'logo_public_id = ?'); args.push(lg.secure_url, lg.public_id);
        await dropImage(row.logo_public_id);
      } else if (removeLogo) {
        fields.push("logo_url = ''", "logo_public_id = ''");
        await dropImage(row.logo_public_id);
      }
    } else {
      const body = await request.json();
      if (body.name !== undefined) {
        if (!String(body.name).trim()) return json({ error: '웨딩홀명을 입력해주세요.' }, 400);
        fields.push('name = ?'); args.push(String(body.name).trim());
      }
      if (body.visible !== undefined) { fields.push('visible = ?'); args.push(body.visible ? 1 : 0); }
      if (body.sort_order !== undefined) { fields.push('sort_order = ?'); args.push(Number(body.sort_order)); }
    }

    if (fields.length === 0) return json({ error: '변경할 항목이 없습니다.' }, 400);

    args.push(id);
    await db.execute({ sql: `UPDATE partner_halls SET ${fields.join(', ')} WHERE id = ?`, args });
    const updated = await db.execute({ sql: 'SELECT * FROM partner_halls WHERE id = ?', args: [id] });
    return json({ success: true, item: updated.rows[0] });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
};

// DELETE: 삭제
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = params.id;
    const cur = await db.execute({ sql: 'SELECT public_id, logo_public_id FROM partner_halls WHERE id = ?', args: [id] });
    if (cur.rows.length === 0) return json({ error: '항목을 찾을 수 없습니다.' }, 404);
    const row = cur.rows[0] as any;
    await dropImage(row.public_id);
    await dropImage(row.logo_public_id);
    await db.execute({ sql: 'DELETE FROM partner_halls WHERE id = ?', args: [id] });
    return json({ success: true });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
};
