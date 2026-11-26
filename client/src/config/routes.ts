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
    label: 'Today',
    shortLabel: 'Today',
    documentTitle: 'Today | BreatheWise AI',
    subtitle: 'Live city air · Personalized AI copilot',
    to: APP_ROUTES.HOME,
    iconKey: 'dashboard',
  },
  {
    label: 'Plan & Home',
    shortLabel: 'Plan',
    documentTitle: 'Plan & Home | BreatheWise AI',
    subtitle: 'City-AQI routines & realistic indoor harm reduction',
    to: APP_ROUTES.PLANNER,
    iconKey: 'planner',
  },
  {
    label: 'Ask AI',
    shortLabel: 'Ask AI',
    documentTitle: 'Ask AI | BreatheWise AI',
    subtitle: 'Planning & reasoning clean-air copilot',
    to: APP_ROUTES.ASSISTANT,
    iconKey: 'assistant',
  },
  {
    label: 'Impact',
    shortLabel: 'Impact',
    documentTitle: 'Impact | BreatheWise AI',
    subtitle: 'Estimated CO₂ avoided & exposure protection',
    to: APP_ROUTES.IMPACT,
    iconKey: 'impact',
  },
] as const;

export const SECONDARY_NAV_ITEMS: readonly NavItemConfig[] = [
  {
    label: 'Family & Home',
    shortLabel: 'Family',
    documentTitle: 'Family & Home | BreatheWise AI',
    subtitle: 'AI household setup, members & home habits',
    to: APP_ROUTES.PROFILE,
    iconKey: 'profile',
  },
  {
    label: 'Settings',
    shortLabel: 'Settings',
    documentTitle: 'Settings | BreatheWise AI',
    subtitle: 'Appearance, language, AQI scale & privacy',
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
