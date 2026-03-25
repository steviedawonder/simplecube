export const prerender = false;

import type { APIRoute } from 'astro';
import db from '@lib/db';
import nodemailer from 'nodemailer';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

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
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
