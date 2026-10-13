export const prerender = false;

import type { APIRoute } from 'astro';
import db from '@lib/db';
import { sendInquiryMail } from '@lib/inquiry-mail';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// 관리자: 문의 알림 메일 재전송 (미들웨어가 로그인 확인)
export const POST: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json().catch(() => ({}));
    const inquiryId = Number(id);
    if (!Number.isInteger(inquiryId) || inquiryId <= 0) return json({ error: 'Invalid params' }, 400);

    const { rows } = await db.execute({ sql: 'SELECT * FROM inquiries WHERE id = ?', args: [inquiryId] });
    const row = rows[0] as any;
    if (!row) return json({ error: '문의를 찾을 수 없습니다.' }, 404);

    const receivedAt = new Date(String(row.created_at).replace(' ', 'T') + 'Z');
    const { sent, error } = await sendInquiryMail(inquiryId, row, isNaN(receivedAt.getTime()) ? new Date() : receivedAt);

    await db.execute({
      sql: 'UPDATE inquiries SET email_sent = ?, email_error = ? WHERE id = ?',
      args: [sent, error || null, inquiryId],
    });
    return json({ success: sent === 1, emailSent: sent, error: error || undefined });
  } catch (err: any) {
    console.error('[inquiry/resend] 실패:', err);
    return json({ error: err?.message || '재전송 중 오류가 발생했습니다.' }, 500);
  }
};
