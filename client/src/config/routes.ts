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
  to: string;
  iconKey: 'home' | 'planner' | 'assistant' | 'impact' | 'profile';
}

export const PRIMARY_NAV_ITEMS: readonly NavItemConfig[] = [
  { label: 'Home Dashboard', shortLabel: 'Home', to: APP_ROUTES.HOME, iconKey: 'home' },
  { label: 'Daily Planner', shortLabel: 'Planner', to: APP_ROUTES.PLANNER, iconKey: 'planner' },
  { label: 'AI Assistant', shortLabel: 'Assistant', to: APP_ROUTES.ASSISTANT, iconKey: 'assistant' },
  { label: 'My Impact', shortLabel: 'Impact', to: APP_ROUTES.IMPACT, iconKey: 'impact' },
  { label: 'Family Profile', shortLabel: 'Family', to: APP_ROUTES.PROFILE, iconKey: 'profile' },
] as const;
