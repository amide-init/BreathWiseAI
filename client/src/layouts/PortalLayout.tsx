import {
  CalendarCheck2,
  LayoutDashboard,
  Leaf,
  LogIn,
  LogOut,
  MapPin,
  Settings,
  Sparkles,
  User,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import {
  BreatheWiseLogoMark,
  GoogleSparkleMark,
} from '@/components/illustrations/GoogleAirIllustrations';
import { LanguageSelector } from '@/components/shared/LanguageSelector';
import { LocationPickerModal } from '@/components/shared/LocationPickerModal';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import {
  APP_ROUTES,
  getNavItemByPath,
  PRIMARY_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  type NavItemConfig,
} from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { cn } from '@/lib/cn';

const NAV_ICONS: Record<NavItemConfig['iconKey'], typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  planner: CalendarCheck2,
  assistant: Sparkles,
  impact: Leaf,
  profile: User,
  settings: Settings,
};

const NAV_ACTIVE_COLORS: Record<NavItemConfig['iconKey'], string> = {
  dashboard:
    'bg-[#4285F4]/12 text-[#1A73E8] ring-1 ring-[#4285F4]/25 dark:bg-[#8AB4F8]/15 dark:text-[#8AB4F8] dark:ring-[#8AB4F8]/25',
  planner:
    'bg-[#34A853]/12 text-[#1E8E3E] ring-1 ring-[#34A853]/25 dark:bg-[#81C995]/15 dark:text-[#81C995] dark:ring-[#81C995]/25',
  assistant:
    'bg-[#FBBC05]/18 text-[#9A6700] ring-1 ring-[#FBBC05]/30 dark:bg-[#FDD663]/15 dark:text-[#FDD663] dark:ring-[#FDD663]/25',
  impact:
    'bg-[#EA4335]/12 text-[#C5221F] ring-1 ring-[#EA4335]/25 dark:bg-[#F28B82]/15 dark:text-[#F28B82] dark:ring-[#F28B82]/25',
  profile:
    'bg-[#4285F4]/12 text-[#1A73E8] dark:bg-[#8AB4F8]/15 dark:text-[#8AB4F8]',
  settings:
    'bg-[#F1F3F4] text-[#202124] dark:bg-white/[0.1] dark:text-[#E3E3E3]',
};

/**
 * Google RGB + Illustrated Material 3 portal shell:
 * - Signature 3px 4-color Google ribbon across the top
 * - Official Gemini Dark (#131314 canvas, #1E1F20 surfaces) & clean Google Light (#F8F9FA)
 * - Color-coded 4-item primary nav (`Today` Blue, `Plan` Green, `Ask AI` Yellow, `Impact` Red)
 * - Floating 4-color sparkle Ask AI FAB
 */
export function PortalLayout() {
  const { pathname } = useLocation();
  const activeRoute = getNavItemByPath(pathname);
  const { user, signOut } = useAuth();
  const { selectedLocation, openPicker } = useSelectedLocation();

  useDocumentTitle(activeRoute.documentTitle);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#202124] transition-colors duration-200 md:flex dark:bg-[#131314] dark:text-[#E3E3E3]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:overflow-hidden md:border-r md:border-[#DADCE0]/90 md:bg-white dark:md:border-white/[0.08] dark:md:bg-[#1E1F20]">
        <div className="google-ribbon h-[3px] w-full shrink-0" aria-hidden="true" />

        <div className="flex shrink-0 items-center gap-2.5 px-5 py-4">
          <BreatheWiseLogoMark className="h-9 w-9 shrink-0" />
          <div>
            <p className="font-display text-base font-bold tracking-tight text-[#202124] dark:text-[#E3E3E3]">
              BreatheWise AI
            </p>
            <p className="text-[11px] font-medium text-[#5F6368] dark:text-[#9AA0A6]">
              Clean-Air Copilot
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Primary navigation">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.iconKey];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-semibold transition-all',
                    isActive
                      ? NAV_ACTIVE_COLORS[item.iconKey]
                      : 'text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:bg-white/[0.06] dark:hover:text-[#E3E3E3]',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="my-3 border-t border-[#E8EAED] pt-3 dark:border-white/[0.08]">
            {SECONDARY_NAV_ITEMS.map((item) => {
              const Icon = NAV_ICONS[item.iconKey];
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-full px-3.5 py-2 text-xs font-semibold transition-all',
                      isActive
                        ? NAV_ACTIVE_COLORS[item.iconKey]
                        : 'text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:bg-white/[0.06] dark:hover:text-[#E3E3E3]',
                    )
                  }
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div className="space-y-2.5 border-t border-[#E8EAED] p-3.5 dark:border-white/[0.08]">
          <ThemeToggle showLabel className="w-full justify-start px-3" />

          {user ? (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#DADCE0]/80 bg-[#F8F9FA] p-2.5 dark:border-white/[0.08] dark:bg-[#131314]">
              <Link
                to={APP_ROUTES.PROFILE}
                data-no-translate="true"
                className="min-w-0 flex-1 rounded-lg transition-opacity hover:opacity-80"
              >
                <p className="truncate text-xs font-semibold text-[#202124] dark:text-[#E3E3E3]">
                  {user.displayName || 'Family Account'}
                </p>
                <p className="truncate text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                  {user.email}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                title="Sign out"
                aria-label="Sign out"
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#5F6368] hover:bg-[#E8EAED] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:bg-white/[0.08] dark:hover:text-[#E3E3E3]"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <Link
              to={APP_ROUTES.LOGIN}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#4285F4] px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#3367D6] dark:bg-[#8AB4F8] dark:text-[#131314] dark:hover:bg-[#A8C7FA]"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              Sign In · Free
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-1 flex-col">
        <div className="google-ribbon h-[3px] w-full shrink-0 md:hidden" aria-hidden="true" />

        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[#DADCE0]/80 bg-[#F8F9FA]/90 px-4 py-3 backdrop-blur-xl md:px-8 dark:border-white/[0.08] dark:bg-[#131314]/88">
          <div className="flex min-w-0 items-center gap-2.5 md:hidden">
            <BreatheWiseLogoMark className="h-8 w-8 shrink-0" />
            <span className="font-display truncate text-base font-bold tracking-tight text-[#202124] dark:text-[#E3E3E3]">
              {activeRoute.label}
            </span>
          </div>

          <div className="hidden md:block">
            <p className="text-xs font-medium text-[#5F6368] dark:text-[#9AA0A6]">
              {activeRoute.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openPicker}
              data-no-translate="true"
              className="inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-full border border-[#DADCE0] bg-white px-3 py-1.5 text-xs font-semibold text-[#3C4043] transition-all hover:border-[#4285F4]/60 dark:border-white/[0.12] dark:bg-[#1E1F20] dark:text-[#E3E3E3] dark:hover:border-[#8AB4F8]/50"
            >
              <MapPin
                className="h-3.5 w-3.5 text-[#EA4335] dark:text-[#F28B82]"
                aria-hidden="true"
              />
              <span className="max-w-[115px] truncate sm:max-w-[160px]">
                {selectedLocation.city}
              </span>
            </button>

            <LanguageSelector />

            <ThemeToggle className="md:hidden" />

            {user ? (
              <div className="flex items-center gap-1.5 md:hidden">
                <NavLink
                  to={APP_ROUTES.PROFILE}
                  aria-label="Family & Home"
                  title="Family & Home"
                  className={({ isActive }) =>
                    cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border transition-all',
                      isActive
                        ? 'border-[#4285F4]/40 bg-[#4285F4]/12 text-[#1A73E8] dark:border-[#8AB4F8]/35 dark:bg-[#8AB4F8]/15 dark:text-[#8AB4F8]'
                        : 'border-[#DADCE0] bg-white text-[#5F6368] dark:border-white/[0.1] dark:bg-[#1E1F20] dark:text-[#9AA0A6]',
                    )
                  }
                >
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                </NavLink>
                <NavLink
                  to={APP_ROUTES.SETTINGS}
                  aria-label="Settings"
                  title="Settings"
                  className={({ isActive }) =>
                    cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border transition-all',
                      isActive
                        ? 'border-[#4285F4]/40 bg-[#4285F4]/12 text-[#1A73E8] dark:border-[#8AB4F8]/35 dark:bg-[#8AB4F8]/15 dark:text-[#8AB4F8]'
                        : 'border-[#DADCE0] bg-white text-[#5F6368] dark:border-white/[0.1] dark:bg-[#1E1F20] dark:text-[#9AA0A6]',
                    )
                  }
                >
                  <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                </NavLink>
              </div>
            ) : (
              <Link
                to={APP_ROUTES.LOGIN}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#4285F4] px-3 text-xs font-semibold text-white md:hidden dark:bg-[#8AB4F8] dark:text-[#131314]"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                Sign In
              </Link>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      {/* Minimal 4-Tab Mobile Bottom Bar */}
      <nav
        className="pb-safe fixed right-0 bottom-0 left-0 z-30 border-t border-[#DADCE0]/90 bg-white/95 px-2 pt-1.5 backdrop-blur-xl md:hidden dark:border-white/[0.08] dark:bg-[#1E1F20]/95"
        aria-label="Mobile bottom navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.iconKey];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'group flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition-all',
                    isActive
                      ? 'text-[#1A73E8] dark:text-[#8AB4F8]'
                      : 'text-[#5F6368] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-[#E3E3E3]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-7 w-12 items-center justify-center rounded-full transition-all',
                        isActive
                          ? NAV_ACTIVE_COLORS[item.iconKey]
                          : 'bg-transparent group-active:scale-95',
                      )}
                    >
                      <Icon
                        className="h-4.5 w-4.5"
                        strokeWidth={isActive ? 2.25 : 1.8}
                        aria-hidden="true"
                      />
                    </span>
                    <span>{item.shortLabel}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Floating Google-Style Ask AI Button */}
      {pathname !== APP_ROUTES.ASSISTANT ? (
        <Link
          to={APP_ROUTES.ASSISTANT}
          aria-label="Ask BreatheWise AI"
          title="Ask BreatheWise AI"
          className="fixed right-4 bottom-20 z-30 inline-flex h-12 items-center gap-2 rounded-full border border-[#DADCE0] bg-white px-4 text-sm font-semibold text-[#202124] shadow-[0_6px_20px_rgba(66,133,244,0.22)] transition-all hover:scale-[1.03] hover:border-[#4285F4]/60 active:scale-[0.98] md:right-6 md:bottom-6 dark:border-white/[0.14] dark:bg-[#282A2C] dark:text-[#E3E3E3] dark:shadow-[0_6px_20px_rgba(0,0,0,0.45)] dark:hover:border-[#8AB4F8]/60"
        >
          <GoogleSparkleMark className="h-5 w-5 shrink-0" />
          <span className="hidden sm:inline">Ask AI</span>
        </Link>
      ) : null}

      <LocationPickerModal />
    </div>
  );
}
