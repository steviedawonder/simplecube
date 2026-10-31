// 심플큐브 사업자·지점 정보(NAP)와 JSON-LD 엔티티 @id 의 단일 출처.
// - 값은 사이트에 보이는 표기와 같아야 한다: contact 페이지·푸터·BranchOffices·지역 페이지.
// - 상세 주소(streetAddress)·우편번호·좌표는 사이트에 공개돼 있지 않고 네이버 플레이스·카카오맵과
//   표기도 통일되지 않았으므로 넣지 않는다. 주소를 /contact/ 에 공개한 뒤 branchNode() 의 address 에 추가할 것.

export const SITE_URL = 'https://simplecube.net';
export const ORG_ID = `${SITE_URL}/#org`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const ORG_NAME = '심플큐브';

// public/images/common/logo.png — 512×512 PNG (Google: 112×112 이상)
export const ORG_LOGO = {
  '@type': 'ImageObject',
  '@id': `${SITE_URL}/#logo`,
  url: `${SITE_URL}/images/common/logo.png`,
  width: 512,
  height: 512,
};

/** 다른 노드에서 회사를 가리킬 때 쓰는 참조 — 이름·URL·로고를 함께 넣어 그 페이지만 읽어도 뜻이 통하게 */
export const ORG_REF = { '@type': 'Organization', '@id': ORG_ID, name: ORG_NAME, url: `${SITE_URL}/`, logo: ORG_LOGO };
export const WEBSITE_REF = { '@type': 'WebSite', '@id': WEBSITE_ID, name: ORG_NAME, url: `${SITE_URL}/` };

/** 경로 → 절대 URL. 한글 경로는 canonical 과 같은 퍼센트 인코딩 형태가 된다 */
export function absUrl(path: string): string {
  return new URL(path, SITE_URL).href;
}

/** '02-338-9180' → '+82-2-338-9180' (Google: 국가번호 포함) */
export function toIntlPhone(phone: string): string {
  return `+82-${phone.replace(/^0/, '')}`;
}

// 가격 — /pricing/ 가격 카드와 같은 값. 가격을 바꾸면 가격 카드(pricing.astro)·rental·corporate 카드,
// 각 페이지 ServiceSchema offers 의 minPrice, 그리고 이 값을 함께 바꿀 것.
export const PRICES = {
  wedding: 500000, // 웨딩 포토부스 ~부터
  weddingMaxDiscount: 420000, // 웨딩 최대 할인가
  event: 550000, // 행사 포토부스(팝업·기업행사·페스티벌) ~부터
};
export const PRICE_LABELS = { wedding: '50만원', weddingMaxDiscount: '42만원', event: '55만원' };

// 상담(영업) 시간: 매일 10:00–18:30 — 2026-10-31 확정, 네이버 플레이스와 같은 값.
// 바꿀 때는 /contact/ 지점 카드·푸터·홈 '한눈에 보기'·llms.txt·네이버/카카오 플레이스를 함께 바꿀 것.
export const HOURS_LABEL = '매일 10:00–18:30';
const OPENING_HOURS = [
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '10:00',
    closes: '18:30',
  },
];

export type BranchKey = 'seoul' | 'busan' | 'daejeon' | 'jeonju';

interface Branch {
  id: string;
  name: string;         // 사이트 표기 (지역 페이지 "심플큐브 부산 지점에서 직접 응대")
  placeName: string;    // docs/NAVER_PLACE_BRAND_UNIFICATION.md 표준 플레이스 업체명
  phone: string;        // 사이트 표기 그대로
  locality: string;
  region: string;
  areaServed: string[]; // contact 페이지 담당 권역 + 이 지점이 응대하는 지역 페이지
  url: string;          // 지점이 담당하는 대표 지역 페이지
  sameAs?: string[];    // 지점 전용 채널만 (본점 채널은 회사 sameAs 와 같아 생략)
}

export const BRANCHES: Record<BranchKey, Branch> = {
  seoul: {
    id: `${SITE_URL}/#hq`,
    name: '심플큐브 서울 본점',
    placeName: '심플큐브 포토부스 서울본점',
    phone: '02-338-9180',
    locality: '서울',
    region: '서울특별시',
    areaServed: ['서울특별시', '경기도', '강원특별자치도'],
    url: `${SITE_URL}/seoul/`,
  },
  busan: {
    id: `${SITE_URL}/#branch-busan`,
    name: '심플큐브 부산 지점',
    placeName: '심플큐브 포토부스 부산점',
    phone: '010-3122-4746',
    locality: '부산',
    region: '부산광역시',
    areaServed: ['부산광역시', '경상남도', '울산광역시', '대구광역시'],
    url: `${SITE_URL}/busan/`,
    sameAs: ['https://www.instagram.com/simplecube_busan', 'https://pf.kakao.com/_RxgxkPb'],
  },
  daejeon: {
    id: `${SITE_URL}/#branch-daejeon`,
    name: '심플큐브 대전 지점',
    placeName: '심플큐브 포토부스 대전점',
    phone: '010-8838-8122',
    locality: '대전',
    region: '대전광역시',
    areaServed: ['대전광역시', '세종특별자치시', '충청남도', '충청북도'],
    url: `${SITE_URL}/daejeon/`,
    sameAs: ['https://www.instagram.com/simplecube_daejeon', 'https://pf.kakao.com/_xgqgyb'],
  },
  jeonju: {
    id: `${SITE_URL}/#branch-jeonju`,
    name: '심플큐브 전주 지점',
    placeName: '심플큐브 포토부스 전주점',
    phone: '010-5743-8122',
    locality: '전주',
    region: '전북특별자치도',
    areaServed: ['전북특별자치도', '광주광역시', '전라남도'],
    url: `${SITE_URL}/jeonju/`,
    sameAs: ['https://www.instagram.com/simplecube_jeonju', 'https://pf.kakao.com/_TPxjxoG'],
  },
};

/** 지점 LocalBusiness 노드 — 주소는 시·도 단위까지만 (상세 주소 미공개) */
export function branchNode(key: BranchKey) {
  const b = BRANCHES[key];
  return {
    '@type': 'LocalBusiness',
    '@id': b.id,
    name: b.name,
    alternateName: b.placeName,
    url: b.url,
    telephone: toIntlPhone(b.phone),
    address: {
      '@type': 'PostalAddress',
      addressLocality: b.locality,
      addressRegion: b.region,
      addressCountry: 'KR',
    },
    areaServed: b.areaServed.map((name) => ({ '@type': 'AdministrativeArea', name })),
    openingHoursSpecification: OPENING_HOURS,
    priceRange: '₩₩',
    ...(b.sameAs && { sameAs: b.sameAs }),
    parentOrganization: ORG_REF,
  };
}
