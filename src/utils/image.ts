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
