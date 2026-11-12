import type { APIRoute } from 'astro';
import { uploadToCloudinary, isConfigured } from '@lib/cloudinary';
import db from '@lib/db';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// GET: 제휴 웨딩홀 전체 목록 (관리자용 — 숨김 포함)
export const GET: APIRoute = async () => {
  try {
    const result = await db.execute('SELECT * FROM partner_halls ORDER BY sort_order ASC, id ASC');
    return json(result.rows);
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
};

// POST: 웨딩홀 추가 (multipart: name, image(배경), logo(선택))
export const POST: APIRoute = async ({ request }) => {
  try {
    if (!isConfigured()) return json({ error: 'Cloudinary가 설정되지 않았습니다.' }, 500);

    const form = await request.formData();
    const name = ((form.get('name') as string) || '').trim();
    const image = form.get('image') as File | null;
    const logo = form.get('logo') as File | null;

    if (!name) return json({ error: '웨딩홀명을 입력해주세요.' }, 400);
    if (!image || !image.size) return json({ error: '배경 이미지를 선택해주세요.' }, 400);

    const up = await uploadToCloudinary(image, 'simplecube/partners');
    let logoUrl = '';
    let logoPublicId = '';
    if (logo && logo.size) {
      const lg = await uploadToCloudinary(logo, 'simplecube/partners/logo');
      logoUrl = lg.secure_url;
      logoPublicId = lg.public_id;
    }

    // 새 항목은 맨 뒤에 노출
    const max = await db.execute('SELECT COALESCE(MAX(sort_order), -1) AS m FROM partner_halls');
    const nextOrder = Number((max.rows[0] as any).m) + 1;

    await db.execute({
      sql: 'INSERT INTO partner_halls (name, image_url, public_id, logo_url, logo_public_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      args: [name, up.secure_url, up.public_id, logoUrl, logoPublicId, nextOrder],
    });
    const inserted = await db.execute('SELECT last_insert_rowid() as id');
    return json({ id: (inserted.rows[0] as any).id, name, image_url: up.secure_url, logo_url: logoUrl, sort_order: nextOrder });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
};
