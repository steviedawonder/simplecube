import type { APIRoute } from 'astro';
import { uploadToCloudinary, deleteFromCloudinary, diagnoseConfig } from '@lib/cloudinary';
import db from '@lib/db';

export const prerender = false;

// 허용 파일 타입
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. 환경변수 진단
    const diag = diagnoseConfig();
    if (!diag.ok) {
      console.error('[upload] Cloudinary 환경변수 누락:', diag.missing);
      return new Response(
        JSON.stringify({ error: `Cloudinary 설정 오류: ${diag.missing.join(', ')} 환경변수가 없습니다.` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. 파일 추출
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return new Response(
        JSON.stringify({ error: '요청 데이터를 읽을 수 없습니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const file = formData.get('file') as File | null;

    if (!file || !file.size) {
      return new Response(
        JSON.stringify({ error: '파일이 없거나 비어있습니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. 파일 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: `지원하지 않는 파일 형식입니다: ${file.type}. (jpg, png, gif, webp, svg, avif만 가능)` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      return new Response(
        JSON.stringify({ error: `파일이 너무 큽니다 (${sizeMB}MB). 최대 20MB까지 업로드 가능합니다.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Cloudinary 업로드
    let result;
    try {
      result = await uploadToCloudinary(file);
    } catch (uploadErr: any) {
      console.error('[upload] Cloudinary 업로드 실패:', uploadErr.message);
      return new Response(
        JSON.stringify({ error: `이미지 업로드 실패: ${uploadErr.message}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. DB 저장 (실패 시 Cloudinary 파일 정리)
    let id: number;
    try {
      await db.execute({
        sql: 'INSERT INTO media (public_id, url, filename, width, height) VALUES (?, ?, ?, ?, ?)',
        args: [result.public_id, result.secure_url, file.name, result.width || 0, result.height || 0],
      });

      const inserted = await db.execute('SELECT last_insert_rowid() as id');
      id = Number((inserted.rows[0] as any)?.id ?? 0);

      if (!id) {
        throw new Error('DB insert 후 ID를 가져올 수 없습니다');
      }
    } catch (dbErr: any) {
      // DB 실패 → Cloudinary에서 삭제 (고아 파일 방지)
      console.error('[upload] DB 저장 실패, Cloudinary 파일 정리 시도:', dbErr.message);
      try {
        await deleteFromCloudinary(result.public_id);
      } catch (cleanupErr: any) {
        console.error('[upload] Cloudinary 정리 실패 (고아 파일):', result.public_id, cleanupErr.message);
      }
      return new Response(
        JSON.stringify({ error: `DB 저장 실패: ${dbErr.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. 성공 응답
    return new Response(
      JSON.stringify({
        id,
        public_id: result.public_id,
        url: result.secure_url,
        filename: file.name,
        width: result.width || 0,
        height: result.height || 0,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('[upload] 예상치 못한 오류:', e);
    return new Response(
      JSON.stringify({ error: `서버 오류: ${e.message || '알 수 없는 오류'}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
