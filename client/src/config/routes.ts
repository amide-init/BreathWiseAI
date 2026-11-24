export const APP_ROUTES = {
  HOME: '/',
  PLANNER: '/planner',
  ASSISTANT: '/assistant',
  IMPACT: '/impact',
  PROFILE: '/profile',
  LOGIN: '/login',
  ONBOARDING: '/onboarding',
} as const;

export interface NavItemConfig {
  label: string;
  shortLabel: string;
  documentTitle: string;
  subtitle: string;
  to: string;
  iconKey: 'dashboard' | 'planner' | 'assistant' | 'impact' | 'profile';
}

export const PRIMARY_NAV_ITEMS: readonly NavItemConfig[] = [
  {
    label: 'Dashboard',
    shortLabel: 'Dashboard',
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
    shortLabel: 'Assistant',
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
    label: 'Family Profile',
    shortLabel: 'Family',
    documentTitle: 'Family Profile | BreatheWise AI',
    subtitle: 'Household members, commute habits & indoor equipment',
    to: APP_ROUTES.PROFILE,
    iconKey: 'profile',
  },
] as const;

export function getNavItemByPath(pathname: string): NavItemConfig {
  return (
    PRIMARY_NAV_ITEMS.find((item) => item.to === pathname) ?? PRIMARY_NAV_ITEMS[0]
  );
}
