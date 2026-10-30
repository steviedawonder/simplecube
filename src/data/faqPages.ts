// FAQ 를 등록할 수 있는 페이지 — 관리자 FAQ 탭·API 검증이 모두 이 목록을 쓴다.
// key 는 각 공개 페이지가 FAQ 를 조회할 때 쓰는 page 값과 같다 (예: graduation.astro → 'graduation').
// 전용 FAQ 가 없는 rental·corporate·graduation 은 행사(popup) FAQ, pricing 은 렌탈 FAQ 로 대체 표시되고,
// 지역 페이지는 등록한 FAQ 가 자동 생성 FAQ(출장비·운영 시간·담당 지점) 위에 붙는다.
export const FAQ_PAGES = [
  { key: 'popup', label: '행사' },
  { key: 'wedding', label: '웨딩' },
  { key: 'rental', label: '렌탈' },
  { key: 'corporate', label: '기업행사' },
  { key: 'graduation', label: '졸업식' },
  { key: 'pricing', label: '가격' },
  { key: 'general', label: '공통' },
  { key: 'seoul', label: '서울' },
  { key: 'busan', label: '부산' },
  { key: 'daegu', label: '대구' },
  { key: 'daejeon', label: '대전' },
  { key: 'gwangju', label: '광주' },
  { key: 'ulsan', label: '울산' },
  { key: 'jeonju', label: '전주' },
  { key: 'cheonan', label: '천안' },
  { key: 'cheongju', label: '청주' },
  { key: 'chungju', label: '충주' },
] as const;

export type FaqPage = (typeof FAQ_PAGES)[number]['key'];

export function isFaqPage(page: unknown): page is FaqPage {
  return FAQ_PAGES.some((p) => p.key === page);
}
