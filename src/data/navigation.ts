export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
  children?: NavItem[];
}

export const navItems: NavItem[] = [
  {
    label: '브랜드소개',
    href: '/#brand-story',
    children: [
      { label: '브랜드 소개', href: '/#brand-story' },
      { label: '지점안내', href: '/#branches' },
    ],
  },
  {
    label: '행사 포토부스',
    href: '/popup',
    children: [
      { label: '모델 소개', href: '/popup#machines' },
      { label: '포트폴리오', href: '/popup#portfolio' },
      { label: '커스텀', href: '/popup#custom' },
      { label: '기업행사', href: '/corporate' },
      { label: 'FAQ', href: '/popup#qna' },
    ],
  },
  {
    label: '웨딩 포토부스',
    href: '/wedding',
    children: [
      { label: '패키지 구성 안내', href: '/wedding#packages' },
      { label: '현장사진', href: '/wedding#gallery' },
      { label: '포토스트립', href: '/wedding#photostrip' },
      { label: '백드롭 종류', href: '/wedding#backdrop' },
      { label: '제휴 웨딩홀', href: '/wedding#partner-halls' },
      { label: 'FAQ', href: '/wedding#qna' },
    ],
  },
  {
    label: '가격안내',
    href: '/pricing',
  },
  { label: 'BLOG', href: '/blog' },
];
