import { useNavigate } from 'react-router';
import { Shield, Swords } from 'lucide-react';
import { useArmy } from '../../lib/ArmyContext';

export default function ModeSelect() {
  const navigate = useNavigate();
  const { createArmy, savedArmies, switchArmy } = useArmy();

  const handlePick = (mode: 'standard' | 'crusade') => {
    // If there's already a saved army of this mode, switch to it
    const existing = savedArmies.find(a => a.mode === mode);
    if (existing) {
      switchArmy(existing.id);
      navigate('/army');
      return;
    }
    // Otherwise create a new one
    createArmy(mode === 'standard' ? 'My Army' : 'My Crusade', mode);
    if (mode === 'crusade') {
      navigate('/army/crusade-setup');
    } else {
      navigate('/army');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-wider mb-2">Warcaster</h1>
          <p className="text-sm text-[var(--text-secondary)]">Choose how you want to play</p>
        </div>

        <div className="space-y-4">
          {/* Normal Mode */}
          <button
            onClick={() => handlePick('standard')}
            className="w-full relative overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-left hover:border-[var(--accent-gold)]/60 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-center flex-shrink-0 group-hover:border-[var(--accent-gold)]/40 transition-colors">
                <Swords className="w-6 h-6 text-[var(--text-secondary)]" />
              </div>
              <div>
                <p className="text-base font-bold text-[var(--text-primary)] mb-1">Normal Mode</p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Build an army list from your collection. Track points, wargear, and loadouts for a standard game.
                </p>
              </div>
            </div>
          </button>

          {/* Crusade Mode */}
          <button
            onClick={() => handlePick('crusade')}
            className="w-full relative overflow-hidden rounded-xl border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5 p-6 text-left hover:border-[var(--accent-gold)]/60 hover:bg-[var(--accent-gold)]/10 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-[var(--accent-gold)]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-base font-bold text-[var(--text-primary)]">Crusade Mode</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--accent-gold)]/40 text-[var(--accent-gold)]">Campaign</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Track XP, battle honours, scars, and faction mechanics across a full Crusade campaign. Units grow with every battle.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Existing armies */}
        {savedArmies.length > 0 && (
          <div className="mt-8">
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-3">Your Armies</p>
            <div className="space-y-2">
              {savedArmies.map(a => (
                <button
                  key={a.id}
                  onClick={() => { switchArmy(a.id); navigate('/army'); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/40 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{a.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {a.mode === 'crusade' ? 'Crusade' : 'Normal'} · {a.units.length} units · {a.units.reduce((s, u) => s + u.points_cost, 0)} pts
                    </p>
                  </div>
                  <Swords className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
