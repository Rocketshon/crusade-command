import { useLocation, useNavigate } from 'react-router';
import { Swords, BookOpen, ScrollText, Target, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/home', label: 'Campaign', icon: Swords },
  { path: '/codex', label: 'Codex', icon: BookOpen },
  { path: '/rules', label: 'Rules', icon: ScrollText },
  { path: '/tracker', label: 'Tracker', icon: Target },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide nav on auth pages
  const authPaths = ['/sign-in', '/sign-up'];
  if (authPaths.includes(location.pathname)) {
    return null;
  }

  // Determine which tab is active based on current path
  const activeTab = NAV_ITEMS.find((item) => {
    if (item.path === '/home') {
      // "Campaign" tab covers: /home, /campaign/*, /create-campaign, /join-campaign,
      // /player/*, /log-battle, /post-battle, /battle/*, /requisition, /roster, /add-unit, /unit/*
      return (
        location.pathname === '/home' ||
        location.pathname.startsWith('/campaign') ||
        location.pathname.startsWith('/create') ||
        location.pathname.startsWith('/join') ||
        location.pathname.startsWith('/player') ||
        location.pathname.startsWith('/log-battle') ||
        location.pathname.startsWith('/post-battle') ||
        location.pathname.startsWith('/battle') ||
        location.pathname.startsWith('/requisition') ||
        location.pathname.startsWith('/roster') ||
        location.pathname.startsWith('/add-unit') ||
        location.pathname.startsWith('/unit') ||
        location.pathname === '/cheat-sheet' ||
        location.pathname.startsWith('/cheat-sheet/')
      );
    }
    if (item.path === '/codex') {
      return (
        location.pathname === '/codex' ||
        location.pathname.startsWith('/codex/') ||
        location.pathname.startsWith('/datasheet') ||
        location.pathname.startsWith('/space-marines')
      );
    }
    if (item.path === '/rules') {
      return (
        location.pathname === '/rules' ||
        location.pathname.startsWith('/rule/')
      );
    }
    if (item.path === '/tracker') {
      return location.pathname === '/tracker';
    }
    return location.pathname === item.path;
  })?.path ?? '/home';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-stone-950 border-t border-stone-800">
      {/* Safe area padding for iOS */}
      <div className="flex items-center justify-around px-2 pt-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-emerald-400'
                  : 'text-stone-500 active:text-stone-300'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber-500 rounded-full" />
              )}
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
              <span className={`text-[10px] tracking-wide ${isActive ? 'font-bold' : 'font-normal'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}