import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Sun, Moon, Trash2, Info, Database, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { useArmy } from '../../lib/ArmyContext';
import { useCollection } from '../../lib/CollectionContext';
import { getActiveEdition } from '../../lib/editionManager';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { savedArmies } = useArmy();
  const { items: collectionItems } = useCollection();
  const edition = getActiveEdition();

  const [confirmClearArmies, setConfirmClearArmies] = useState(false);
  const [confirmClearCollection, setConfirmClearCollection] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  const clearArmiesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearCollectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetAllTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearArmiesTimer.current) clearTimeout(clearArmiesTimer.current);
      if (clearCollectionTimer.current) clearTimeout(clearCollectionTimer.current);
      if (resetAllTimer.current) clearTimeout(resetAllTimer.current);
    };
  }, []);

  const handleClearArmies = () => {
    if (!confirmClearArmies) {
      setConfirmClearArmies(true);
      clearArmiesTimer.current = setTimeout(() => setConfirmClearArmies(false), 3000);
      return;
    }
    // Clear all army-related keys directly so all saved armies are wiped
    const armyKeys = ['army_saved_lists', 'army_active_id', 'army_mode', 'army_faction', 'army_detachment', 'army_supply_limit', 'army_units'];
    for (const key of armyKeys) {
      try { localStorage.removeItem(key); } catch {}
    }
    toast.success('All army lists cleared — reloading...');
    setTimeout(() => window.location.reload(), 1000);
    setConfirmClearArmies(false);
  };

  const handleClearCollection = () => {
    if (!confirmClearCollection) {
      setConfirmClearCollection(true);
      clearCollectionTimer.current = setTimeout(() => setConfirmClearCollection(false), 3000);
      return;
    }
    try { localStorage.removeItem('warcaster_collection'); } catch {}
    toast.success('Collection cleared — reloading...');
    setTimeout(() => window.location.reload(), 1000);
    setConfirmClearCollection(false);
  };

  const handleResetAll = () => {
    if (!confirmResetAll) {
      setConfirmResetAll(true);
      resetAllTimer.current = setTimeout(() => setConfirmResetAll(false), 3000);
      return;
    }
    const keysToKeep = ['warcaster_theme'];
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('warcaster_') || k.startsWith('army_') || k.startsWith('crusade_'));
    for (const key of allKeys) {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    }
    toast.success('All data reset — reloading...');
    setTimeout(() => window.location.reload(), 1000);
  };

  // Estimate localStorage usage
  let storageUsed = 0;
  try {
    for (const key of Object.keys(localStorage)) {
      storageUsed += localStorage.getItem(key)?.length ?? 0;
    }
  } catch {}
  const storageKB = (storageUsed / 1024).toFixed(1);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 pt-6 pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-6"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-8 tracking-wider">Settings</h1>

        {/* Appearance */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Appearance</h2>
          <div className="rounded-sm border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-[var(--accent-gold)]" />
                ) : (
                  <Sun className="w-5 h-5 text-[var(--accent-gold)]" />
                )}
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {theme === 'dark' ? 'Grimdark aesthetic' : 'Parchment & cream'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border-color)]'
                }`}
                aria-label="Toggle theme"
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Data Management</h2>
          <div className="space-y-3">
            <button
              onClick={handleClearArmies}
              className={`w-full flex items-center gap-3 rounded-sm border p-4 transition-colors ${
                confirmClearArmies
                  ? 'border-red-500/50 bg-red-500/10 text-red-400'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)]'
              }`}
            >
              <Trash2 className="w-5 h-5 flex-shrink-0" />
              <div className="text-left flex-1">
                <p className="text-sm font-medium">
                  {confirmClearArmies ? 'Tap again to confirm' : 'Clear All Armies'}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{savedArmies.length} army list{savedArmies.length !== 1 ? 's' : ''} saved</p>
              </div>
            </button>

            <button
              onClick={handleClearCollection}
              className={`w-full flex items-center gap-3 rounded-sm border p-4 transition-colors ${
                confirmClearCollection
                  ? 'border-red-500/50 bg-red-500/10 text-red-400'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)]'
              }`}
            >
              <Trash2 className="w-5 h-5 flex-shrink-0" />
              <div className="text-left flex-1">
                <p className="text-sm font-medium">
                  {confirmClearCollection ? 'Tap again to confirm' : 'Clear Collection'}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{collectionItems.length} model{collectionItems.length !== 1 ? 's' : ''} tracked</p>
              </div>
            </button>

            <button
              onClick={handleResetAll}
              className={`w-full flex items-center gap-3 rounded-sm border p-4 transition-colors ${
                confirmResetAll
                  ? 'border-red-500/50 bg-red-500/10 text-red-400'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)]'
              }`}
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div className="text-left flex-1">
                <p className="text-sm font-medium">
                  {confirmResetAll ? 'Tap again — this cannot be undone' : 'Reset All Data'}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Clears everything except theme preference</p>
              </div>
            </button>
          </div>
        </section>

        {/* Storage */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Storage</h2>
          <div className="rounded-sm border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-[var(--accent-gold)]" />
              <div>
                <p className="text-sm text-[var(--text-primary)]">{storageKB} KB used</p>
                <p className="text-xs text-[var(--text-secondary)]">localStorage + IndexedDB backup</p>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">About</h2>
          <div className="rounded-sm border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center gap-3 mb-3">
              <Info className="w-5 h-5 text-[var(--accent-gold)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Warcaster</p>
                <p className="text-xs text-[var(--text-secondary)]">v1.0.0</p>
              </div>
            </div>
            <div className="space-y-1 text-xs text-[var(--text-secondary)]">
              <p>Warhammer 40K Army Builder & Battle Aid</p>
              <p>{edition.name} &middot; Data v{edition.dataVersion}</p>
              <p className="pt-2 text-[var(--accent-gold)]">Built by Obelus Labs</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
