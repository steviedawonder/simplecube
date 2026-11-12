export interface PartnerHall { name: string; image: string }

/** 제휴 웨딩홀 기본 목록 — DB 초기 시드 + DB 장애 시 fallback */
export const DEFAULT_PARTNER_HALLS: PartnerHall[] = [
  { name: '더채플 청담', image: '/images/wedding/partners/partner-chaple-cheongdam-500x500.jpg' },
  { name: '더채플 논현', image: '/images/wedding/partners/partner-chaple-nonhyeon-500x500.jpg' },
  { name: '더채플앳대치', image: '/images/wedding/partners/partner-the-chapel-daechi.webp' },
  { name: '아펠가모 반포', image: '/images/wedding/partners/parnter-apelgamo-banpo-500x500.jpg' },
  { name: '아펠가모 잠실', image: '/images/wedding/partners/parnter-apelgamo-jamsil-500x500.jpg' },
  { name: '아펠가모 선릉', image: '/images/wedding/partners/parnter-apelgamo-seonreung-500x500.jpg' },
  { name: '아펠가모 광화문', image: '/images/wedding/partners/parnter-apelgamo-gwanghwamun-500x500.jpg' },
  { name: '더링크호텔', image: '/images/wedding/partners/partner-the-link-hotel.webp' },
  { name: '신도림라마다호텔', image: '/images/wedding/partners/partner-sindorim-ramada.webp' },
  { name: '루벨 강동', image: '/images/wedding/partners/parnter-luvel-500x500.jpg' },
  { name: '루나미엘레', image: '/images/wedding/partners/partner-lunamiele.webp' },
  { name: '라루체', image: '/images/wedding/partners/parnter-laluce-500x500.jpg' },
  { name: '로프트가든344', image: '/images/wedding/partners/parnter-loftgarden344-500x500.jpg' },
  { name: 'L65', image: '/images/wedding/partners/parnter-l65-500x500.jpg' },
  { name: '씨엘드포레', image: '/images/wedding/partners/parnter-cieldeforet-500x500.jpg' },
  { name: '호텔 선샤인', image: '/images/wedding/partners/parnter-hotel-sunshine-500x500.jpg' },
  { name: 'S가든', image: '/images/wedding/partners/partner-s-garden.webp' },
  { name: '라포르테', image: '/images/wedding/partners/partner-laporte.webp' },
  { name: '마리드엘 웨딩', image: '/images/wedding/partners/partner-maridel-wedding.webp' },
  { name: '메종드보네르', image: '/images/wedding/partners/partner-maison-de-bonheur.webp' },
  { name: '벨리스', image: '/images/wedding/partners/partner-bellis.webp' },
  { name: '비렌티', image: '/images/wedding/partners/partner-virenti.webp' },
];
