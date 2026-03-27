import { useLocation, useNavigate } from 'react-router';
import { Swords, BookOpen, ScrollText } from 'lucide-react';

const tabs = [
  { path: '/army', label: 'Army', icon: Swords },
  { path: '/codex', label: 'Codex', icon: BookOpen },
  { path: '/rules', label: 'Rules', icon: ScrollText },
] as const;

function isActiveTab(pathname: string, tabPath: string): boolean {
  if (tabPath === '/army') {
    return pathname === '/army' || pathname.startsWith('/add-unit') || pathname.startsWith('/unit/') || pathname === '/';
  }
  return pathname.startsWith(tabPath);
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#f5efe6] border-t border-[#d4c5a9]">
      <div className="flex items-center justify-around px-2 pt-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const active = isActiveTab(location.pathname, tab.path);
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors ${
                active
                  ? 'text-[#b8860b]'
                  : 'text-[#8b7355] active:text-[#5c4a32]'
              }`}
            >
              {/* Active indicator bar */}
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#b8860b] rounded-full" />
              )}
              <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
              <span className={`text-[10px] tracking-wide ${active ? 'font-bold' : 'font-normal'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
