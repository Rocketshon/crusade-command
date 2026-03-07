import { useLocation, useNavigate } from 'react-router';
import { Swords, BookOpen, ScrollText, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/home', label: 'Campaign', icon: Swords },
  { path: '/codex', label: 'Codex', icon: BookOpen },
  { path: '/rules', label: 'Rules', icon: ScrollText },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

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
        location.pathname.startsWith('/unit')
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
    return location.pathname === item.path;
  })?.path ?? '/home';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-stone-950/95 backdrop-blur-sm border-t border-stone-800/60">
      {/* Safe area padding for iOS */}
      <div className="flex items-center justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-emerald-400'
                  : 'text-stone-500 active:text-stone-300'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
              <span className={`text-[10px] tracking-wide ${isActive ? 'font-semibold' : 'font-normal'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
