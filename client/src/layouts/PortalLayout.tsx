import {
  CalendarCheck2,
  LayoutDashboard,
  Leaf,
  LogOut,
  MapPin,
  Sparkles,
  Users,
  Wind,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { LocationPickerModal } from '@/components/shared/LocationPickerModal';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { getNavItemByPath, PRIMARY_NAV_ITEMS, type NavItemConfig } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { cn } from '@/lib/cn';

const NAV_ICONS: Record<NavItemConfig['iconKey'], typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  planner: CalendarCheck2,
  assistant: Sparkles,
  impact: Leaf,
  profile: Users,
};

/**
 * YC-grade responsive portal shell:
 * - Desktop (md+): Refined Zinc sidebar + Light/Dark switch + contextual header
 * - Mobile (<md): Frosted-glass header + Icon-first bottom tab bar with active pill indicator & safe-area insets
 */
export function PortalLayout() {
  const { pathname } = useLocation();
  const activeRoute = getNavItemByPath(pathname);
  const { user, signOut } = useAuth();
  const { selectedLocation, openPicker } = useSelectedLocation();

  useDocumentTitle(activeRoute.documentTitle);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors duration-200 md:flex dark:bg-zinc-950 dark:text-zinc-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-zinc-200/80 md:bg-white dark:md:border-zinc-800/90 dark:md:bg-zinc-950">
        <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-4 dark:border-zinc-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs dark:bg-emerald-500 dark:text-zinc-950">
            <Wind className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              BreatheWise AI
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Clean-Air Intelligence</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Primary navigation">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.iconKey];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-emerald-500/12 text-emerald-800 ring-1 ring-emerald-500/20 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/25'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-zinc-100 p-4 dark:border-zinc-900">
          <ThemeToggle showLabel className="w-full justify-start px-3" />

          {user ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/70">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {user.displayName || 'Family Account'}
                </p>
                <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                title="Sign out"
                aria-label="Sign out"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-zinc-200/80 bg-white/85 px-4 py-3 backdrop-blur-xl md:px-8 dark:border-zinc-800/90 dark:bg-zinc-950/85">
          <div className="flex min-w-0 items-center gap-2.5 md:hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950">
              <Wind className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="truncate text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {activeRoute.label}
            </span>
          </div>

          <div className="hidden md:block">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {activeRoute.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openPicker}
              className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-2xs transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-emerald-400/40"
            >
              <MapPin
                className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <span className="max-w-[115px] truncate sm:max-w-[160px]">
                {selectedLocation.city}
              </span>
            </button>

            <ThemeToggle className="md:hidden" />

            {user ? (
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label="Sign out"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-200/90 bg-white text-zinc-600 hover:bg-zinc-100 md:hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 md:px-8 md:py-7">
          <Outlet />
        </main>
      </div>

      {/* Mobile Icon-First Bottom Navigation Bar */}
      <nav
        className="pb-safe fixed right-0 bottom-0 left-0 z-30 border-t border-zinc-200/80 bg-white/90 px-2 pt-1.5 backdrop-blur-xl md:hidden dark:border-zinc-800/90 dark:bg-zinc-950/90"
        aria-label="Mobile bottom navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.iconKey];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'group flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-all',
                    isActive
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-8 w-12 items-center justify-center rounded-full transition-all',
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300'
                          : 'bg-transparent group-active:scale-95',
                      )}
                    >
                      <Icon
                        className="h-5 w-5"
                        strokeWidth={isActive ? 2.25 : 1.85}
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
