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
  Wind,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

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

/**
 * Minimalist AI-first portal shell:
 * - Obsidian/slate low-glare dark palette (#0B0E12 canvas, #12171E surface, hairline borders)
 * - Clean 4-item primary nav (`Today`, `Plan & Home`, `Ask AI`, `Impact`)
 * - Compact Family & Settings links tucked into secondary footer / mobile top bar
 */
export function PortalLayout() {
  const { pathname } = useLocation();
  const activeRoute = getNavItemByPath(pathname);
  const { user, signOut } = useAuth();
  const { selectedLocation, openPicker } = useSelectedLocation();

  useDocumentTitle(activeRoute.documentTitle);

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 transition-colors duration-200 md:flex dark:bg-[#0B0E12] dark:text-[#EEF2F6]">
      {/* Desktop Sidebar (fixed viewport height, minimal obsidian surface) */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:overflow-hidden md:border-r md:border-slate-200/80 md:bg-white dark:md:border-white/[0.07] dark:md:bg-[#0E1319]">
        <div className="flex shrink-0 items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white dark:bg-teal-400/15 dark:text-teal-300 dark:ring-1 dark:ring-teal-400/25">
            <Wind className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-[#EEF2F6]">
              BreatheWise AI
            </p>
            <p className="text-[11px] font-medium text-slate-400 dark:text-[#64748B]">
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
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-slate-900/[0.06] text-slate-950 dark:bg-white/[0.07] dark:text-[#EEF2F6]'
                      : 'text-slate-500 hover:bg-slate-900/[0.03] hover:text-slate-900 dark:text-[#8E9AA8] dark:hover:bg-white/[0.04] dark:hover:text-[#EEF2F6]',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="my-3 border-t border-slate-100 pt-3 dark:border-white/[0.06]">
            {SECONDARY_NAV_ITEMS.map((item) => {
              const Icon = NAV_ICONS[item.iconKey];
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all',
                      isActive
                        ? 'bg-slate-900/[0.06] text-slate-950 dark:bg-white/[0.07] dark:text-[#EEF2F6]'
                        : 'text-slate-500 hover:bg-slate-900/[0.03] hover:text-slate-900 dark:text-[#7C8999] dark:hover:bg-white/[0.04] dark:hover:text-[#EEF2F6]',
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

        <div className="space-y-2.5 border-t border-slate-100 p-3.5 dark:border-white/[0.06]">
          <ThemeToggle showLabel className="w-full justify-start px-3" />

          {user ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-2.5 dark:border-white/[0.07] dark:bg-[#12171E]">
              <Link
                to={APP_ROUTES.PROFILE}
                data-no-translate="true"
                className="min-w-0 flex-1 rounded-lg transition-opacity hover:opacity-80"
              >
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-[#EEF2F6]">
                  {user.displayName || 'Family Account'}
                </p>
                <p className="truncate text-[11px] text-slate-500 dark:text-[#7C8999]">
                  {user.email}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                title="Sign out"
                aria-label="Sign out"
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-900 dark:text-[#7C8999] dark:hover:bg-white/[0.08] dark:hover:text-[#EEF2F6]"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <Link
              to={APP_ROUTES.LOGIN}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-[#EEF2F6] dark:text-[#0B0E12] dark:hover:bg-white"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              Sign In · Free
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-200/70 bg-[#F7F8FA]/85 px-4 py-3 backdrop-blur-xl md:px-8 dark:border-white/[0.06] dark:bg-[#0B0E12]/80">
          <div className="flex min-w-0 items-center gap-2.5 md:hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white dark:bg-teal-400/15 dark:text-teal-300">
              <Wind className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-[#EEF2F6]">
              {activeRoute.label}
            </span>
          </div>

          <div className="hidden md:block">
            <p className="text-xs font-medium text-slate-400 dark:text-[#7C8999]">
              {activeRoute.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openPicker}
              data-no-translate="true"
              className="inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:border-slate-300 dark:border-white/[0.08] dark:bg-[#12171E] dark:text-[#D9E2EC] dark:hover:border-white/[0.16]"
            >
              <MapPin
                className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400"
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
                      'flex h-8 w-8 items-center justify-center rounded-xl border transition-all',
                      isActive
                        ? 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/15 dark:text-teal-300'
                        : 'border-slate-200/80 bg-white text-slate-500 dark:border-white/[0.08] dark:bg-[#12171E] dark:text-[#94A3B8]',
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
                      'flex h-8 w-8 items-center justify-center rounded-xl border transition-all',
                      isActive
                        ? 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/15 dark:text-teal-300'
                        : 'border-slate-200/80 bg-white text-slate-500 dark:border-white/[0.08] dark:bg-[#12171E] dark:text-[#94A3B8]',
                    )
                  }
                >
                  <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                </NavLink>
              </div>
            ) : (
              <Link
                to={APP_ROUTES.LOGIN}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white md:hidden dark:bg-[#EEF2F6] dark:text-[#0B0E12]"
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
        className="pb-safe fixed right-0 bottom-0 left-0 z-30 border-t border-slate-200/80 bg-white/90 px-2 pt-1.5 backdrop-blur-xl md:hidden dark:border-white/[0.07] dark:bg-[#0E1319]/92"
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
                    'group flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-all',
                    isActive
                      ? 'text-teal-700 dark:text-teal-300'
                      : 'text-slate-500 hover:text-slate-900 dark:text-[#7C8999] dark:hover:text-[#EEF2F6]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-7 w-11 items-center justify-center rounded-full transition-all',
                        isActive
                          ? 'bg-teal-500/12 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300'
                          : 'bg-transparent group-active:scale-95',
                      )}
                    >
                      <Icon
                        className="h-4.5 w-4.5"
                        strokeWidth={isActive ? 2.25 : 1.8}
                        aria-hidden="true"
                      />
                    </span>
                    <span className={cn(isActive && 'font-semibold')}>{item.shortLabel}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <LocationPickerModal />
    </div>
  );
}
