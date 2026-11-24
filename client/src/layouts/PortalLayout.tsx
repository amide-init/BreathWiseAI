import {
  CalendarCheck2,
  LayoutDashboard,
  Leaf,
  LogOut,
  MapPin,
  MessageSquareText,
  Users,
  Wind,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { LocationPickerModal } from '@/components/shared/LocationPickerModal';
import { getNavItemByPath, PRIMARY_NAV_ITEMS, type NavItemConfig } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { cn } from '@/lib/cn';

const NAV_ICONS: Record<NavItemConfig['iconKey'], typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  planner: CalendarCheck2,
  assistant: MessageSquareText,
  impact: Leaf,
  profile: Users,
};

/**
 * Responsive portal shell:
 * - Desktop (md+): Left sidebar + top contextual header + sign out
 * - Mobile (<md): Compact top header + fixed 5-tab bottom navigation bar
 */
export function PortalLayout() {
  const { pathname } = useLocation();
  const activeRoute = getNavItemByPath(pathname);
  const { user, signOut } = useAuth();
  const { selectedLocation, openPicker } = useSelectedLocation();

  useDocumentTitle(activeRoute.documentTitle);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-slate-200 md:bg-white">
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white">
            <Wind className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900">BreatheWise AI</p>
            <p className="text-[11px] text-slate-500">Clean-Air Family Assistant</p>
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
                    'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          {user ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {user.displayName || 'Family Account'}
                </p>
                <p className="truncate text-[11px] text-slate-500">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                title="Sign out"
                aria-label="Sign out"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-xs md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Wind className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-sm font-bold text-slate-900">{activeRoute.label}</span>
          </div>

          <div className="hidden md:block">
            <p className="text-xs font-medium text-slate-500">{activeRoute.subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openPicker}
              className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50/50"
            >
              <MapPin className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
              <span className="max-w-[140px] truncate">{selectedLocation.city}</span>
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label="Sign out"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 md:hidden"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-24 md:px-8 md:py-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="fixed right-0 bottom-0 left-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur-xs md:hidden"
        aria-label="Mobile navigation"
      >
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.iconKey];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-teal-700' : 'text-slate-500',
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.shortLabel}</span>
            </NavLink>
          );
        })}
      </nav>

      <LocationPickerModal />
    </div>
  );
}
