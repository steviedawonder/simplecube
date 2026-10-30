// Cloudinary 원본 URL 에 자동 포맷·품질·최대 폭 변환을 붙인다.
// 이미 변환이 들어 있거나 Cloudinary URL 이 아니면 그대로 돌려준다.
export function cdnImage(url: string | null | undefined, width = 1200): string {
  if (!url) return '';
  const marker = '/image/upload/';
  const i = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || i === -1) return url;
  const rest = url.slice(i + marker.length);
  // 첫 세그먼트가 버전(v123…)이 아니면 이미 변환이 붙은 URL
  if (!/^v\d+\//.test(rest)) return url;
  return `${url.slice(0, i + marker.length)}f_auto,q_auto,c_limit,w_${width}/${rest}`;
}

// Cloudinary 원본을 정확히 width×height 로 잘라낸 URL (g_auto: 피사체 중심).
// 구조화 데이터 image 처럼 실제 크기를 함께 적어야 할 때 사용 — Cloudinary 원본 URL 이 아니면 null.
export function cdnCrop(url: string | null | undefined, width: number, height: number): string | null {
  if (!url) return null;
  const marker = '/image/upload/';
  const i = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || i === -1) return null;
  const rest = url.slice(i + marker.length);
  if (!/^v\d+\//.test(rest)) return null;
  return `${url.slice(0, i + marker.length)}c_fill,g_auto,w_${width},h_${height},f_auto,q_auto/${rest}`;
}
