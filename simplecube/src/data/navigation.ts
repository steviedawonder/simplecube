export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

export const navItems: NavItem[] = [
  { label: 'BRAND', href: '/brand' },
  { label: 'POP-UP', href: '/popup' },
  { label: 'WEDDING', href: '/wedding' },
  { label: 'FAQ', href: '/faq' },
  { label: 'BLOG', href: '/blog' },
];
