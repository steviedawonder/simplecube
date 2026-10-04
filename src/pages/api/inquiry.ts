export const prerender = false;

import type { APIRoute } from 'astro';
import db from '@lib/db';
import nodemailer from 'nodemailer';

const FIELD_LIMITS: Record<string, number> = {
  booth_type: 200, wrapping: 50, region: 100, event_name: 200, venue: 200,
  event_schedule: 200, setup_schedule: 200, detail: 5000, company: 200,
  contact_name: 100, phone: 40, email: 200, referral: 300,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  try {
    let raw: any;
    try {
      raw = await request.json();
    } catch {
      return json({ success: false, error: '잘못된 요청입니다.' }, 400);
    }
    if (!raw || typeof raw !== 'object') return json({ success: false, error: '잘못된 요청입니다.' }, 400);

    // 허니팟: 사람에게는 보이지 않는 필드가 채워졌으면 봇 — 저장·메일 없이 성공처럼 응답
    if (typeof raw.website === 'string' && raw.website.trim() !== '') {
      return json({ success: true, id: 0, emailSent: 0 });
    }

    // 문자열로 정규화 + 길이 제한 (배열은 쉼표로 합침)
    const data: Record<string, string> = {};
    for (const [key, limit] of Object.entries(FIELD_LIMITS)) {
      const v = raw[key];
      const str = Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v);
      data[key] = str.trim().slice(0, limit);
    }

    if (!data.phone) {
      return json({ success: false, error: '연락처는 필수입니다.' }, 400);
    }
    if (data.phone.replace(/\D/g, '').length < 9) {
      return json({ success: false, error: '연락처를 정확히 입력해주세요.' }, 400);
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return json({ success: false, error: '이메일 형식을 확인해주세요.' }, 400);
    }

    // Save to DB first (always succeeds regardless of email)
    const result = await db.execute({
      sql: `INSERT INTO inquiries (type, booth_type, wrapping, region, event_name, venue, event_schedule, setup_schedule, detail, company, contact_name, phone, email, referral)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'popup',
        data.booth_type || '',
        data.wrapping || '',
        data.region || '',
        data.event_name || '',
        data.venue || '',
        data.event_schedule || '',
        data.setup_schedule || '',
        data.detail || '',
        data.company || '',
        data.contact_name || '',
        data.phone || '',
        data.email || '',
        data.referral || '',
      ],
    });

    const inquiryId = Number(result.lastInsertRowid);

    // Try sending email notification
    let emailSent = 0;
    let emailError = '';

    const emailUser = import.meta.env.GMAIL_USER || 'simplecube2019@gmail.com';
    const emailPass = import.meta.env.GMAIL_APP_PASSWORD;

    if (emailUser && emailPass) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: emailUser, pass: emailPass },
        });

        const emailBody = `
[심플큐브 행사 문의 #${inquiryId}]

━━━ 행사 정보 ━━━
포토부스 기기: ${data.booth_type || '-'}
랩핑 진행 여부: ${data.wrapping || '-'}
행사 지역: ${data.region || '-'}
행사명: ${data.event_name || '-'}
설치 장소: ${data.venue || '-'}
행사 일정: ${data.event_schedule || '-'}
설치/철거 일정: ${data.setup_schedule || '-'}
상세 문의: ${data.detail || '-'}

━━━ 고객 정보 ━━━
고객사명: ${data.company || '-'}
담당자: ${data.contact_name || '-'}
연락처: ${data.phone || '-'}
이메일: ${data.email || '-'}
인지 경로: ${data.referral || '-'}

━━━━━━━━━━━━━━━━
접수 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
`.trim();

        await transporter.sendMail({
          from: `심플큐브 <${emailUser}>`,
          to: 'simple_cube@naver.com',
          subject: `[행사문의] ${data.company || '고객'} - ${data.event_name || '행사'}`,
          text: emailBody,
        });

        emailSent = 1;
      } catch (err: any) {
        emailError = err.message || 'Unknown email error';
      }
    } else {
      emailError = 'Email credentials not configured';
    }

    // Update email status in DB
    await db.execute({
      sql: 'UPDATE inquiries SET email_sent = ?, email_error = ? WHERE id = ?',
      args: [emailSent, emailError || null, inquiryId],
    });

    return new Response(JSON.stringify({ success: true, id: inquiryId, emailSent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[inquiry] 저장 실패:', err);
    return json({ success: false, error: '문의 접수 중 오류가 발생했습니다.' }, 500);
  }
};
