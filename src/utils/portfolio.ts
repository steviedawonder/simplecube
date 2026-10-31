// 포트폴리오(갤러리) 사진 제목 다루기 — 관리자에서 올린 사진 제목이 'IMG_3432', 'KakaoTalk_Photo_…', '20240512_1.jpg'
// 같은 파일명인 경우가 많아(전체 531장 중 71장), 그대로 대체텍스트·이미지 사이트맵 제목으로 쓰면 검색엔진에 의미가 없다.

const GENERIC_TAGS = ['현장사진', '포토스트립'];

/** 사람이 붙인 설명이 아니라 파일명·숫자뿐인 제목인지 */
export function isFilenameTitle(title: unknown): boolean {
  const s = String(title ?? '').trim();
  return (
    !s ||
    /^(IMG|DSC|DSCF|KakaoTalk|Screenshot|PXL|photo)[_\-\s]/i.test(s) ||
    /^[\d_\-\s.()]+$/.test(s) ||
    /\.(jpe?g|png|webp|heic|gif)$/i.test(s)
  );
}

/** 대체텍스트: 사람이 붙인 제목이면 그대로, 파일명이면 '심플큐브 {종류} — {태그}' (분류용 태그는 뺌) */
export function portfolioAlt(title: unknown, tags: unknown, label: string): string {
  if (!isFilenameTitle(title)) return String(title).trim();
  const tagText = String(tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t && !GENERIC_TAGS.includes(t))
    .join(', ');
  return `심플큐브 ${label}${tagText ? ` — ${tagText}` : ''}`;
}
