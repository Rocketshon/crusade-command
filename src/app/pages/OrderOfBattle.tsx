import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Plus,
  Search,
  ChevronRight,
  Shield,
  Skull,
  Star,
  AlertTriangle,
  X,
  Check,
} from 'lucide-react';
import { useCrusade } from '../../lib/CrusadeContext';
import { type CrusadeUnit } from '../../lib/CrusadeContext';
import { getRank, getHonourSlots, getXPProgress } from '../../data/crusadeRules';
import { searchUnits } from '../../data';
import type { Datasheet } from '../../types';

// ============================================================
// XP Progress bar
// ============================================================

function XPBar({ unit }: { unit: CrusadeUnit }) {
  const progress = getXPProgress(unit.xp, unit.isCharacter, unit.legendaryVeterans);
  const rank = getRank(unit.xp, unit.isCharacter, unit.legendaryVeterans);
  return (
    <div className="h-1 bg-[var(--border-color)] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: rank.color }}
      />
    </div>
  );
}

// ============================================================
// Unit card
// ============================================================

function UnitCard({ unit, onClick }: { unit: CrusadeUnit; onClick: () => void }) {
  const rank = getRank(unit.xp, unit.isCharacter, unit.legendaryVeterans);
  const slots = getHonourSlots(unit.xp, unit.isCharacter, unit.legendaryVeterans);

  return (
    <button
      onClick={onClick}
      disabled={unit.isDestroyed}
      className={`w-full flex items-center gap-3 p-3.5 rounded-sm border transition-colors text-left ${
        unit.isDestroyed
          ? 'border-[var(--border-color)] bg-[var(--bg-card)]/50 opacity-50'
          : unit.battleScars.length > 0
          ? 'border-red-500/30 bg-[var(--bg-card)] hover:border-red-400/50'
          : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/40'
      }`}
    >
      {/* Rank dot */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: rank.color }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {unit.isWarlord && <Star className="w-3 h-3 text-[var(--accent-gold)] flex-shrink-0" />}
          {unit.isCharacter && <Shield className="w-3 h-3 text-blue-400 flex-shrink-0" />}
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {unit.customName || unit.datasheetName}
          </p>
          {unit.isDestroyed && <Skull className="w-3 h-3 text-red-400 flex-shrink-0" />}
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-1.5">
          {rank.name} · {unit.xp} XP · {unit.pointsCost} pts
        </p>
        <XPBar unit={unit} />
      </div>

      {/* Honours / scars */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {slots > 0 && (
          <div className="flex gap-0.5">
            {Array.from({ length: slots }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full border ${
                  i < unit.battleHonours.length
                    ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)]'
                    : 'bg-transparent border-[var(--border-color)]'
                }`}
              />
            ))}
          </div>
        )}
        {unit.battleScars.length > 0 && (
          <div className="flex gap-0.5">
            {unit.battleScars.map(s => (
              <div key={s.id} className="w-2 h-2 rounded-full bg-red-500" />
            ))}
          </div>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
    </button>
  );
}

// ============================================================
// Add Unit Modal — searchable codex with pre-filled data
// ============================================================

function AddUnitModal({ onClose, factionId }: { onClose: () => void; factionId: string }) {
  const { addUnit } = useCrusade();
  const searchRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Datasheet | null>(null);
  const [customName, setCustomName] = useState('');
  const [pointsOverride, setPointsOverride] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => { searchRef.current?.focus(); }, []);

  // Search all factions (supports allied units); "Allied" badge shown for non-primary faction
  const results = query.length >= 2
    ? searchUnits(query).slice(0, 8)
    : [];

  const handleSelect = (unit: Datasheet) => {
    setSelected(unit);
    setQuery(unit.name);
    setCustomName('');
    const pts = unit.points.length > 0 ? unit.points[0].cost : '0';
    setPointsOverride(pts);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery('');
    setCustomName('');
    setPointsOverride('');
    setShowDropdown(false);
    searchRef.current?.focus();
  };

  const handleAdd = () => {
    if (!selected) return;
    addUnit({
      datasheetName: selected.name,
      customName: customName.trim() || selected.name,
      keywords: selected.keywords,
      isCharacter: selected.keywords.includes('CHARACTER'),
      isBattleline: selected.keywords.includes('BATTLELINE'),
      pointsCost: parseInt(pointsOverride, 10) || 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
      <div className="w-full bg-[var(--bg-primary)] rounded-t-xl border-t border-[var(--border-color)] p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Add Unit</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search any unit (e.g. Grey Hunters, Rhino…)"
            className="w-full pl-9 pr-9 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)]"
          />
          {query.length > 0 && (
            <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Dropdown results */}
          {showDropdown && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded shadow-xl z-10 max-h-52 overflow-y-auto">
              {results.map(u => (
                <button
                  key={`${u.faction_id}-${u.name}`}
                  onMouseDown={() => handleSelect(u)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[var(--accent-gold)]/10 transition-colors border-b border-[var(--border-color)] last:border-0"
                >
                  <div>
                    <p className="text-sm text-[var(--text-primary)]">{u.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {u.faction}
                      {u.keywords.includes('CHARACTER') && ' · Character'}
                      {u.keywords.includes('BATTLELINE') && ' · Battleline'}
                      {u.points.length > 0 && ` · ${u.points[0].cost} pts`}
                    </p>
                  </div>
                  {u.faction_id !== factionId && (
                    <span className="text-xs text-amber-400 flex-shrink-0 ml-2">Allied</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {showDropdown && query.length >= 2 && results.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded px-3 py-2.5 text-sm text-[var(--text-secondary)] z-10">
              No units found — try a different name
            </div>
          )}
        </div>

        {/* Selected unit details */}
        {selected && (
          <div className="rounded border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5 p-3 mb-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{selected.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">{selected.faction}</p>
              </div>
              <Check className="w-4 h-4 text-[var(--accent-gold)] flex-shrink-0 mt-0.5" />
            </div>
            <div className="flex flex-wrap gap-1">
              {selected.keywords.slice(0, 5).map(k => (
                <span key={k} className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)]">{k}</span>
              ))}
            </div>
          </div>
        )}

        {/* Points + custom name (shown after selection) */}
        {selected && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Points Cost</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  value={pointsOverride}
                  onChange={e => setPointsOverride(e.target.value)}
                  min={0}
                  className="flex-1 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                />
                {selected.points.length > 1 && (
                  <div className="flex gap-1">
                    {selected.points.map(p => (
                      <button
                        key={p.models}
                        onClick={() => setPointsOverride(p.cost)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          pointsOverride === p.cost
                            ? 'border-[var(--accent-gold)] text-[var(--accent-gold)]'
                            : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {p.models}m
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Custom Name <span className="normal-case text-[var(--text-secondary)]">(optional)</span></label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder={selected.name}
                className="mt-1 w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)]"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-[var(--border-color)] text-[var(--text-secondary)] rounded">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selected}
            className="flex-1 py-2.5 text-sm border border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-semibold rounded hover:bg-[var(--accent-gold)]/20 transition-colors disabled:opacity-40"
          >
            Add to Order of Battle
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function OrderOfBattle() {
  const navigate = useNavigate();
  const { campaign } = useCrusade();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showDestroyed, setShowDestroyed] = useState(false);

  if (!campaign) {
    navigate('/crusade', { replace: true });
    return null;
  }

  const supplyUsed = campaign.units.filter(u => !u.isDestroyed).reduce((s, u) => s + u.pointsCost, 0);

  const filtered = campaign.units.filter(u => {
    if (!showDestroyed && u.isDestroyed) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.datasheetName.toLowerCase().includes(q) ||
        u.customName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sort: warlord first, then by XP desc
  const sorted = [...filtered].sort((a, b) => {
    if (a.isWarlord !== b.isWarlord) return a.isWarlord ? -1 : 1;
    return b.xp - a.xp;
  });

  const characters = sorted.filter(u => u.isCharacter);
  const nonCharacters = sorted.filter(u => !u.isCharacter);

  const destroyedCount = campaign.units.filter(u => u.isDestroyed).length;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 pt-6 pb-28">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <button
          onClick={() => navigate('/crusade')}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-5"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Dashboard</span>
        </button>

        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-wider">Order of Battle</h1>
        </div>

        <p className="text-xs text-[var(--text-secondary)] mb-5">
          {campaign.units.filter(u => !u.isDestroyed).length} units ·{' '}
          <span className={supplyUsed > campaign.supplyLimit ? 'text-red-400' : 'text-[var(--accent-gold)]'}>
            {supplyUsed} / {campaign.supplyLimit} pts
          </span>
        </p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search units…"
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)]"
          />
        </div>

        {/* Characters */}
        {characters.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Characters
            </p>
            <div className="space-y-2">
              {characters.map(u => (
                <UnitCard key={u.id} unit={u} onClick={() => navigate(`/crusade/unit/${u.id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* Non-characters */}
        {nonCharacters.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Units
            </p>
            <div className="space-y-2">
              {nonCharacters.map(u => (
                <UnitCard key={u.id} unit={u} onClick={() => navigate(`/crusade/unit/${u.id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* Destroyed toggle */}
        {destroyedCount > 0 && (
          <button
            onClick={() => setShowDestroyed(!showDestroyed)}
            className="w-full flex items-center gap-2 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Skull className="w-4 h-4" />
            {showDestroyed ? 'Hide' : 'Show'} destroyed units ({destroyedCount})
          </button>
        )}

        {/* Empty state */}
        {campaign.units.length === 0 && (
          <div className="text-center py-12 border border-dashed border-[var(--border-color)] rounded-sm">
            <AlertTriangle className="w-8 h-8 text-[var(--text-secondary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">No units yet</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Add units to your Order of Battle</p>
          </div>
        )}

      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[var(--accent-gold)] text-[var(--bg-primary)] shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-10"
        aria-label="Add unit"
      >
        <Plus className="w-6 h-6" />
      </button>

      {showAdd && <AddUnitModal onClose={() => setShowAdd(false)} factionId={campaign.factionId} />}
    </div>
  );
}
