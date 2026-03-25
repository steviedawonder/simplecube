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
    label: '행사',
    href: '/popup',
    children: [
      { label: '행사 포토부스', href: '/popup' },
      { label: '모델 소개', href: '/popup#machines' },
      { label: '브랜드 커스텀', href: '/popup#custom' },
      { label: '포트폴리오', href: '/popup#portfolio' },
      { label: 'FAQ', href: '/popup#qna' },
    ],
  },
  {
    label: '웨딩',
    href: '/wedding',
    children: [
      { label: '웨딩 포토부스', href: '/wedding' },
      { label: '그레이 포토부스', href: '/gray' },
      { label: '패키지안내', href: '/wedding#packages' },
      { label: '제휴 웨딩홀', href: '/wedding#partner-halls' },
      { label: '포트폴리오', href: '/wedding#gallery' },
      { label: 'FAQ', href: '/wedding#qna' },
    ],
  },
  { label: 'BLOG', href: '/blog' },
];
