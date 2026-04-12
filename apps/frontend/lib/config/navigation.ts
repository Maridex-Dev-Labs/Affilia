import {
  ChartBar,
  ChatsCircle,
  CheckSquare,
  FileText,
  Gear,
  GraduationCap,
  House,
  Link,
  ShoppingBag,
  Star,
  Trophy,
  Users,
  Wallet,
} from '@phosphor-icons/react';

export type NavItem = {
  label: string;
  href: string;
  icon: any;
  shortLabel?: string;
};

export const merchantNav: NavItem[] = [
  { label: 'Overview', href: '/merchant/overview', icon: House, shortLabel: 'Home' },
  { label: 'Products', href: '/merchant/products', icon: ShoppingBag, shortLabel: 'Products' },
  { label: 'Orders', href: '/merchant/orders', icon: CheckSquare, shortLabel: 'Orders' },
  { label: 'Affiliates', href: '/merchant/affiliates', icon: Users, shortLabel: 'Affiliates' },
  { label: 'Vault / Escrow', href: '/merchant/escrow', icon: Wallet, shortLabel: 'Vault' },
  { label: 'Community', href: '/merchant/community', icon: ChatsCircle, shortLabel: 'Community' },
  { label: 'Analytics', href: '/merchant/analytics', icon: ChartBar, shortLabel: 'Analytics' },
  { label: 'Receipts', href: '/merchant/receipts', icon: FileText, shortLabel: 'Receipts' },
  { label: 'Settings', href: '/merchant/settings', icon: Gear, shortLabel: 'Settings' },
];

export const affiliateNav: NavItem[] = [
  { label: 'Hub Overview', href: '/affiliate/overview', icon: House, shortLabel: 'Home' },
  { label: 'Marketplace', href: '/affiliate/marketplace', icon: ShoppingBag, shortLabel: 'Market' },
  { label: 'Academy', href: '/affiliate/academy', icon: GraduationCap, shortLabel: 'Academy' },
  { label: 'Community', href: '/affiliate/community', icon: ChatsCircle, shortLabel: 'Community' },
  { label: 'My Links', href: '/affiliate/my-links', icon: Link, shortLabel: 'Links' },
  { label: 'Earnings', href: '/affiliate/earnings', icon: Wallet, shortLabel: 'Earnings' },
  { label: 'Leaderboard', href: '/affiliate/leaderboard', icon: Trophy, shortLabel: 'Ranks' },
  { label: 'Receipts', href: '/affiliate/receipts', icon: FileText, shortLabel: 'Receipts' },
  { label: 'Achievements', href: '/affiliate/achievements', icon: Star, shortLabel: 'Trophies' },
  { label: 'Settings', href: '/affiliate/settings', icon: Gear, shortLabel: 'Settings' },
];
