const CLOUD_NAME = import.meta.env.CLOUDINARY_CLOUD_NAME || '';
const API_KEY = import.meta.env.CLOUDINARY_API_KEY || '';
const API_SECRET = import.meta.env.CLOUDINARY_API_SECRET || '';

export interface UploadResult {
  public_id: string;
  url: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export async function sha1(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 환경변수 상태를 상세하게 진단
 */
export function diagnoseConfig(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!API_KEY) missing.push('CLOUDINARY_API_KEY');
  if (!API_SECRET) missing.push('CLOUDINARY_API_SECRET');
  return { ok: missing.length === 0, missing };
}

export function isConfigured(): boolean {
  return !!(CLOUD_NAME && API_KEY && API_SECRET);
}

export async function uploadToCloudinary(
  file: File | Blob,
  folder: string = 'simplecube'
): Promise<UploadResult> {
  // 환경변수 재확인
  const diag = diagnoseConfig();
  if (!diag.ok) {
    throw new Error(`Cloudinary 환경변수 누락: ${diag.missing.join(', ')}`);
  }

  const timestamp = Math.round(Date.now() / 1000).toString();
  const signatureString = `folder=${folder}&timestamp=${timestamp}`;
  const signature = await sha1(signatureString + API_SECRET);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('timestamp', timestamp);
  formData.append('api_key', API_KEY);
  formData.append('signature', signature);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });
  } catch (networkErr: any) {
    throw new Error(`Cloudinary 네트워크 오류: ${networkErr.message}`);
  }

  if (!res.ok) {
    let errMsg = `Cloudinary 업로드 실패 (HTTP ${res.status})`;
    try {
      const err = await res.json();
      errMsg = err.error?.message || errMsg;
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }
    throw new Error(errMsg);
  }

  let result: any;
  try {
    result = await res.json();
  } catch {
    throw new Error('Cloudinary 응답 파싱 실패');
  }

  // 응답 검증
  if (!result.public_id || !result.secure_url) {
    throw new Error('Cloudinary 응답에 필수 필드(public_id, secure_url)가 없습니다');
  }

  return result as UploadResult;
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  if (!isConfigured()) {
    throw new Error('Cloudinary가 설정되지 않았습니다');
  }

  const timestamp = Math.round(Date.now() / 1000).toString();
  const signatureString = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = await sha1(signatureString + API_SECRET);

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp);
  formData.append('api_key', API_KEY);
  formData.append('signature', signature);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: 'POST',
      body: formData,
    });
  } catch (networkErr: any) {
    throw new Error(`Cloudinary 삭제 네트워크 오류: ${networkErr.message}`);
  }

  if (!res.ok) {
    let errMsg = `Cloudinary 삭제 실패 (HTTP ${res.status})`;
    try {
      const err = await res.json();
      errMsg = err.error?.message || errMsg;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }
}

export function getCloudinaryUrl(publicId: string, transforms: string = ''): string {
  if (!CLOUD_NAME) return '';
  const base = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;
  return transforms ? `${base}/${transforms}/${publicId}` : `${base}/${publicId}`;
}
