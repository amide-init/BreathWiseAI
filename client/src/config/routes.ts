export const APP_ROUTES = {
  HOME: '/',
  PLANNER: '/planner',
  ASSISTANT: '/assistant',
  IMPACT: '/impact',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  LOGIN: '/login',
  ONBOARDING: '/onboarding',
} as const;

export interface NavItemConfig {
  label: string;
  shortLabel: string;
  documentTitle: string;
  subtitle: string;
  to: string;
  iconKey: 'dashboard' | 'planner' | 'assistant' | 'impact' | 'profile' | 'settings';
}

export const PRIMARY_NAV_ITEMS: readonly NavItemConfig[] = [
  {
    label: 'Dashboard',
    shortLabel: 'Home',
    documentTitle: 'Dashboard | BreatheWise AI',
    subtitle: 'India CPCB NAQI · Grounded Environmental Intelligence',
    to: APP_ROUTES.HOME,
    iconKey: 'dashboard',
  },
  {
    label: 'Daily Plan',
    shortLabel: 'Plan',
    documentTitle: 'Daily Plan | BreatheWise AI',
    subtitle: 'Personalized clean-air routines & Indoor Air Advisor',
    to: APP_ROUTES.PLANNER,
    iconKey: 'planner',
  },
  {
    label: 'AI Assistant',
    shortLabel: 'Ask AI',
    documentTitle: 'AI Assistant | BreatheWise AI',
    subtitle: 'Grounded environmental guidance with verified sources',
    to: APP_ROUTES.ASSISTANT,
    iconKey: 'assistant',
  },
  {
    label: 'My Impact',
    shortLabel: 'Impact',
    documentTitle: 'My Impact | BreatheWise AI',
    subtitle: 'Estimated emissions avoided & exposure protection',
    to: APP_ROUTES.IMPACT,
    iconKey: 'impact',
  },
  {
    label: 'Profile',
    shortLabel: 'Profile',
    documentTitle: 'Profile | BreatheWise AI',
    subtitle: 'Account identity, household members, commute & indoor gear',
    to: APP_ROUTES.PROFILE,
    iconKey: 'profile',
  },
] as const;

export const SECONDARY_NAV_ITEMS: readonly NavItemConfig[] = [
  {
    label: 'Settings',
    shortLabel: 'Settings',
    documentTitle: 'Settings | BreatheWise AI',
    subtitle: 'Appearance, AQI scale, default location & privacy preferences',
    to: APP_ROUTES.SETTINGS,
    iconKey: 'settings',
  },
] as const;

export const ALL_NAV_ITEMS: readonly NavItemConfig[] = [
  ...PRIMARY_NAV_ITEMS,
  ...SECONDARY_NAV_ITEMS,
] as const;

export function getNavItemByPath(pathname: string): NavItemConfig {
  return ALL_NAV_ITEMS.find((item) => item.to === pathname) ?? PRIMARY_NAV_ITEMS[0];
}
