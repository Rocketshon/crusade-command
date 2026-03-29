import { useLocation, useNavigate } from 'react-router';
import { Swords, Crosshair, BookOpen, Package, Settings } from 'lucide-react';

const tabs = [
  { path: '/models', label: 'My Models', icon: Package },
  { path: '/army',   label: 'Army',      icon: Swords },
  { path: '/battle-aid', label: 'Battle Aid', icon: Crosshair },
  { path: '/codex',  label: 'Codex',     icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

function isActiveTab(pathname: string, tabPath: string): boolean {
  if (tabPath === '/army') {
    return pathname === '/army' || pathname.startsWith('/army/') || pathname.startsWith('/unit/');
  }
  if (tabPath === '/models') {
    return pathname === '/models';
  }
  if (tabPath === '/codex') {
    return pathname === '/codex' || pathname.startsWith('/codex/') || pathname.startsWith('/datasheet/') || pathname.startsWith('/space-marines-chapters');
  }
  return pathname.startsWith(tabPath);
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-md border-t border-[var(--border-color)]">
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
              className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
                active
                  ? 'text-[var(--accent-gold)]'
                  : 'text-[var(--text-secondary)] active:text-[var(--text-primary)]'
              }`}
            >
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--accent-gold)] rounded-full" />
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
