import { useNavigate } from 'react-router';
import { Plus, ChevronRight, Trash2 } from 'lucide-react';
import { useArmy, type ArmyUnit } from '../../lib/ArmyContext';
import { FACTIONS } from '../../lib/factions';
import type { FactionId } from '../../types';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FactionGrid({ onSelect }: { onSelect: (id: string) => void }) {
  const categories = [
    { label: 'Imperium', factions: FACTIONS.filter(f => f.category === 'imperium') },
    { label: 'Chaos', factions: FACTIONS.filter(f => f.category === 'chaos') },
    { label: 'Xenos', factions: FACTIONS.filter(f => f.category === 'xenos') },
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-xl font-bold text-[#b8860b] text-center">Select Your Faction</h2>
      {categories.map(cat => (
        <div key={cat.label}>
          <h3 className="text-sm font-semibold text-[#8b7355] uppercase tracking-wider mb-2">{cat.label}</h3>
          <div className="grid grid-cols-2 gap-2">
            {cat.factions.map(f => (
              <button
                key={f.id}
                onClick={() => onSelect(f.id)}
                className="flex items-center gap-2 p-3 bg-[#f5efe6] border border-[#d4c5a9] rounded-lg
                           hover:border-[#b8860b] transition-colors text-left
                           focus:outline-none focus:ring-2 focus:ring-[#b8860b]"
              >
                <span className="text-lg">{f.icon}</span>
                <span className="text-sm font-medium text-[#2c2416] truncate">{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const POINTS_OPTIONS = [500, 1000, 1500, 2000, 2500, 3000];

function PointsSelector({ mode, onSelect }: { mode: 'standard' | 'crusade'; onSelect: (pts: number) => void }) {
  if (mode === 'crusade') {
    return (
      <div className="space-y-4 text-center">
        <h2 className="font-serif text-xl font-bold text-[#b8860b]">Set Supply Limit</h2>
        <p className="text-sm text-[#8b7355]">Enter your crusade supply limit in points</p>
        <input
          type="number"
          min={500}
          max={10000}
          step={250}
          defaultValue={1000}
          className="w-32 mx-auto block px-4 py-2 bg-[#f5efe6] border border-[#d4c5a9] rounded-lg text-center
                     text-[#2c2416] focus:outline-none focus:ring-2 focus:ring-[#b8860b]"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onSelect(Number((e.target as HTMLInputElement).value) || 1000);
            }
          }}
        />
        <button
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>('input[type="number"]');
            onSelect(Number(input?.value) || 1000);
          }}
          className="px-6 py-2 bg-[#b8860b] text-[#faf6f0] font-semibold rounded-lg hover:bg-[#9a7209] transition-colors"
        >
          Confirm
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <h2 className="font-serif text-xl font-bold text-[#b8860b]">Select Points Limit</h2>
      <div className="flex flex-wrap justify-center gap-2">
        {POINTS_OPTIONS.map(pts => (
          <button
            key={pts}
            onClick={() => onSelect(pts)}
            className="px-4 py-2 bg-[#f5efe6] border border-[#d4c5a9] rounded-full text-sm font-medium text-[#2c2416]
                       hover:border-[#b8860b] hover:bg-[#e8dfd3] transition-colors
                       focus:outline-none focus:ring-2 focus:ring-[#b8860b]"
          >
            {pts.toLocaleString()} pts
          </button>
        ))}
      </div>
    </div>
  );
}

function StandardUnitCard({ unit, onRemove }: { unit: ArmyUnit; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-[#f5efe6] border border-[#d4c5a9] rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#2c2416] truncate">{unit.custom_name}</span>
          {unit.role && (
            <span className="text-xs px-2 py-0.5 bg-[#e8dfd3] text-[#5c4a32] rounded-full">{unit.role}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[#b8860b]">{unit.points_cost} pts</span>
        <button onClick={onRemove} className="text-[#8b7355] hover:text-[#991b1b] transition-colors" aria-label="Remove unit">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CrusadeUnitCard({ unit, onRemove }: { unit: ArmyUnit; onRemove: () => void }) {
  const xpForNextRank = unit.rank === 'Legendary' ? 100 :
    unit.rank === 'Heroic' ? 51 :
    unit.rank === 'Battle-hardened' ? 31 :
    unit.rank === 'Blooded' ? 16 : 5;
  const xpProgress = Math.min((unit.experience_points / xpForNextRank) * 100, 100);

  return (
    <div className="p-4 bg-[#f5efe6] border border-[#d4c5a9] rounded-lg space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[#2c2416]">{unit.custom_name}</div>
          <div className="text-xs text-[#8b7355]">{unit.points_cost} pts</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-[#b8860b]/15 text-[#b8860b] font-semibold rounded-full border border-[#b8860b]/30">
            {unit.rank}
          </span>
          <button onClick={onRemove} className="text-[#8b7355] hover:text-[#991b1b] transition-colors" aria-label="Remove unit">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="w-full h-2 bg-[#e8dfd3] rounded-full overflow-hidden">
        <div
          className="h-full bg-green-600 rounded-full transition-all"
          style={{ width: `${xpProgress}%` }}
        />
      </div>
      <div className="text-xs text-[#8b7355]">{unit.experience_points} XP</div>

      {/* Battle honours & scars */}
      <div className="flex flex-wrap gap-1">
        {unit.battle_honours.map(h => (
          <span key={h.id} className="text-xs px-2 py-0.5 bg-[#b8860b]/15 text-[#b8860b] rounded-full">
            {h.name}
          </span>
        ))}
        {unit.battle_scars.map(s => (
          <span key={s.id} className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
            {s.name}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="text-xs text-[#8b7355]">
        {unit.battles_played} battles / {unit.battles_survived} survived
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Army() {
  const navigate = useNavigate();
  const {
    mode, factionId, pointsCap, supplyLimit, army,
    setFaction, setPointsCap, setSupplyLimit, removeUnit,
  } = useArmy();

  // If no mode selected, redirect to home
  if (!mode) {
    return (
      <div className="min-h-screen bg-[#faf6f0] flex flex-col items-center justify-center px-4">
        <p className="text-[#8b7355] mb-4">No mode selected yet.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-[#b8860b] text-[#faf6f0] rounded-lg hover:bg-[#9a7209] transition-colors"
        >
          Go to Home
        </button>
      </div>
    );
  }

  const factionMeta = factionId ? FACTIONS.find(f => f.id === factionId) : null;
  const cap = mode === 'crusade' ? supplyLimit : pointsCap;
  const hasCap = mode === 'crusade' ? supplyLimit > 0 : pointsCap > 0;
  const totalPoints = army.reduce((sum, u) => sum + u.points_cost, 0);
  const pointsRatio = cap > 0 ? totalPoints / cap : 0;
  const pointsColor = pointsRatio > 1 ? 'text-red-700' : pointsRatio > 0.9 ? 'text-amber-700' : 'text-green-700';

  // Step 1: Faction selection
  if (!factionId) {
    return (
      <div className="min-h-screen bg-[#faf6f0] px-4 pt-8 pb-24">
        <FactionGrid onSelect={(id) => setFaction(id)} />
      </div>
    );
  }

  // Step 2: Points cap selection
  if (!hasCap || (mode === 'standard' && pointsCap === 0)) {
    return (
      <div className="min-h-screen bg-[#faf6f0] px-4 pt-16 pb-24 flex items-start justify-center">
        <PointsSelector
          mode={mode}
          onSelect={(pts) => mode === 'crusade' ? setSupplyLimit(pts) : setPointsCap(pts)}
        />
      </div>
    );
  }

  // Step 3: Army builder
  return (
    <div className="min-h-screen bg-[#faf6f0] px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-xl font-bold text-[#2c2416] flex items-center gap-2">
            {factionMeta && <span>{factionMeta.icon}</span>}
            {factionMeta?.name ?? factionId}
          </h1>
          <p className="text-sm text-[#8b7355]">{mode === 'crusade' ? 'Crusade' : 'Matched Play'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFaction('')}
            className="text-xs text-[#8b7355] hover:text-[#5c4a32] underline"
          >
            Change Faction
          </button>
        </div>
      </div>

      {/* Unit list */}
      {army.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#8b7355] mb-4">No units yet — browse the Codex to add units</p>
          <button
            onClick={() => navigate(`/codex/${factionId as FactionId}`)}
            className="inline-flex items-center gap-1 text-[#b8860b] font-medium hover:underline"
          >
            Open Codex <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {army.map(unit => (
            mode === 'crusade' ? (
              <CrusadeUnitCard key={unit.id} unit={unit} onRemove={() => removeUnit(unit.id)} />
            ) : (
              <StandardUnitCard key={unit.id} unit={unit} onRemove={() => removeUnit(unit.id)} />
            )
          ))}
        </div>
      )}

      {/* Points footer */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2">
        <div className="max-w-md mx-auto bg-[#f5efe6] border border-[#d4c5a9] rounded-lg px-4 py-2 flex items-center justify-between shadow-sm">
          <span className="text-sm text-[#8b7355]">Total</span>
          <span className={`text-sm font-bold ${pointsColor}`}>
            {totalPoints.toLocaleString()} / {cap.toLocaleString()} pts
          </span>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/add-unit')}
        className="fixed bottom-28 right-4 w-14 h-14 bg-[#b8860b] text-[#faf6f0] rounded-full shadow-lg
                   flex items-center justify-center hover:bg-[#9a7209] transition-colors
                   focus:outline-none focus:ring-2 focus:ring-[#b8860b] focus:ring-offset-2"
        aria-label="Add unit"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
