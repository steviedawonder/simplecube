import nodemailer from 'nodemailer';

// 행사 문의 알림 메일 — 신규 접수(/api/inquiry)와 관리자 재전송(/api/inquiry/resend)이 함께 쓴다.
const NOTIFY_TO = 'simple_cube@naver.com';

export interface InquiryMailData {
  booth_type?: string; wrapping?: string; region?: string; event_name?: string; venue?: string;
  event_schedule?: string; setup_schedule?: string; detail?: string; company?: string;
  contact_name?: string; phone?: string; email?: string; referral?: string;
}

/** 메일을 보내고 결과를 돌려준다. 실패해도 throw 하지 않는다. */
export async function sendInquiryMail(
  inquiryId: number,
  data: InquiryMailData,
  receivedAt: Date = new Date(),
): Promise<{ sent: 0 | 1; error: string }> {
  const emailUser = (import.meta.env.GMAIL_USER || 'simplecube2019@gmail.com').trim();
  // Google 은 앱 비밀번호를 'abcd efgh ijkl mnop' 처럼 띄어 보여주므로 공백·줄바꿈을 제거
  const emailPass = (import.meta.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  if (!emailPass) return { sent: 0, error: 'Email credentials not configured' };

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
접수 시간: ${receivedAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
`.trim();

    await transporter.sendMail({
      from: `심플큐브 <${emailUser}>`,
      to: NOTIFY_TO,
      subject: `[행사문의] ${data.company || '고객'} - ${data.event_name || '행사'}`,
      text: emailBody,
    });
    return { sent: 1, error: '' };
  } catch (err: any) {
    const error = err?.message || 'Unknown email error';
    console.error(`[inquiry #${inquiryId}] 메일 전송 실패:`, error);
    return { sent: 0, error };
  }
}
