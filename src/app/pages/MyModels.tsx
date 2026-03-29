import { useState, useMemo } from 'react';
import { Search, Plus, X, ChevronDown, Trash2, Package } from 'lucide-react';
import { useCollection, PAINTING_STAGES } from '../../lib/CollectionContext';
import { searchUnits } from '../../data';
import { getFactionName } from '../../lib/factions';
import type { CollectionItem, PaintingStage } from '../../types';
import type { Datasheet } from '../../types';

// ---------------------------------------------------------------------------
// Painting stage config
// ---------------------------------------------------------------------------

const STAGE_CONFIG: Record<PaintingStage, { label: string; color: string; dot: string }> = {
  unassembled: { label: 'Unassembled',  color: 'text-gray-400',   dot: 'bg-gray-500' },
  assembled:   { label: 'Assembled',    color: 'text-blue-400',   dot: 'bg-blue-500' },
  primed:      { label: 'Primed',       color: 'text-purple-400', dot: 'bg-purple-500' },
  basecoated:  { label: 'Base Coated',  color: 'text-yellow-400', dot: 'bg-yellow-500' },
  painted:     { label: 'Painted',      color: 'text-orange-400', dot: 'bg-orange-500' },
  based:       { label: 'Based',        color: 'text-lime-400',   dot: 'bg-lime-500' },
  complete:    { label: 'Complete',     color: 'text-green-400',  dot: 'bg-green-500' },
};

// ---------------------------------------------------------------------------
// Add unit modal — searchable codex
// ---------------------------------------------------------------------------

function AddModelModal({ onClose }: { onClose: () => void }) {
  const { addItem } = useCollection();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Datasheet | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);

  const results = useMemo(
    () => (query.length >= 2 ? searchUnits(query).slice(0, 10) : []),
    [query],
  );

  const handleSelect = (unit: Datasheet) => {
    setSelected(unit);
    setQuery(unit.name);
    setShowDropdown(false);
  };

  const handleAdd = () => {
    if (!selected) return;
    addItem(selected.name, selected.faction_id, selected.name, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
      <div className="w-full bg-[var(--bg-primary)] rounded-t-xl border-t border-[var(--border-color)] p-5 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Add to Collection</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)]"><X className="w-5 h-5" /></button>
        </div>

        {/* Search */}
        <div className="relative mb-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search any unit…"
            className="w-full pl-9 pr-9 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)]"
          />
          {query && (
            <button onClick={() => { setQuery(''); setSelected(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {showDropdown && results.length > 0 && (
          <div className="mb-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded shadow-xl max-h-52 overflow-y-auto">
            {results.map(u => (
              <button key={`${u.faction_id}-${u.name}`} onClick={() => handleSelect(u)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[var(--accent-gold)]/10 border-b border-[var(--border-color)] last:border-0">
                <div>
                  <p className="text-sm text-[var(--text-primary)]">{u.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{u.faction}</p>
                </div>
                {u.points.length > 0 && <span className="text-xs text-[var(--accent-gold)]">{u.points[0].cost} pts</span>}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="rounded border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5 p-3 mb-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{selected.name}</p>
            <p className="text-xs text-[var(--text-secondary)]">{selected.faction}</p>
          </div>
        )}

        {selected && (
          <div className="mb-4">
            <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Quantity (units / squads)</label>
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded border border-[var(--border-color)] text-[var(--text-primary)] flex items-center justify-center text-lg font-bold">−</button>
              <span className="text-lg font-bold text-[var(--text-primary)] w-8 text-center">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)}
                className="w-8 h-8 rounded border border-[var(--border-color)] text-[var(--text-primary)] flex items-center justify-center text-lg font-bold">+</button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-[var(--border-color)] text-[var(--text-secondary)] rounded">Cancel</button>
          <button onClick={handleAdd} disabled={!selected}
            className="flex-1 py-2.5 text-sm border border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-semibold rounded disabled:opacity-40">
            Add to Collection
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Model card
// ---------------------------------------------------------------------------

function ModelCard({ item }: { item: CollectionItem }) {
  const { updateItem, updateStage, removeItem } = useCollection();
  const [showStage, setShowStage] = useState(false);
  const cfg = STAGE_CONFIG[item.stage] ?? STAGE_CONFIG.unassembled;
  const factionName = getFactionName(item.factionId as never) || item.factionId;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3">
      <div className="flex items-start gap-3">
        {/* Quantity badge */}
        <div className="w-10 h-10 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
          <div className="text-center">
            <p className="text-xs font-bold text-[var(--accent-gold)] leading-none">{item.quantity}</p>
            <p className="text-[9px] text-[var(--text-secondary)] leading-none mt-0.5">units</p>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.name}</p>
          <p className="text-xs text-[var(--text-secondary)]">{factionName}</p>

          {/* Stage pill */}
          <button
            onClick={() => setShowStage(v => !v)}
            className={`mt-1.5 flex items-center gap-1.5 text-xs ${cfg.color} hover:opacity-80 transition-opacity`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
            <ChevronDown className={`w-3 h-3 transition-transform ${showStage ? 'rotate-180' : ''}`} />
          </button>

          {showStage && (
            <div className="mt-2 flex flex-wrap gap-1">
              {PAINTING_STAGES.map(s => {
                const sc = STAGE_CONFIG[s];
                return (
                  <button key={s} onClick={() => { updateStage(item.id, s); setShowStage(false); }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] transition-colors ${item.stage === s ? `border-current ${sc.color} font-bold` : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Qty controls + remove */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
              className="w-6 h-6 rounded border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center justify-center text-sm font-bold">−</button>
            <button onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}
              className="w-6 h-6 rounded border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center justify-center text-sm font-bold">+</button>
          </div>
          <button onClick={() => removeItem(item.id)} className="text-[var(--text-secondary)] hover:text-red-400 transition-colors mt-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function MyModels() {
  const { items, totalModels, paintedCount } = useCollection();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.factionId.toLowerCase().includes(q),
    );
  }, [items, search]);

  const completePct = totalModels === 0 ? 0 : Math.round((paintedCount / totalModels) * 100);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-28">
      {/* Header */}
      <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">My Models</h1>
          <div className="text-right">
            <p className="text-xs text-[var(--text-secondary)]">{totalModels} units · {completePct}% painted</p>
          </div>
        </div>

        {/* Progress bar */}
        {totalModels > 0 && (
          <div className="h-1 bg-[var(--border-color)] rounded-full overflow-hidden mt-2 mb-3">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${completePct}%` }} />
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search models…"
            className="w-full pl-9 pr-9 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="px-4 pt-4 space-y-2">
        {filtered.map(item => <ModelCard key={item.id} item={item} />)}

        {filtered.length === 0 && items.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">No models yet</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Tap + to add units to your collection</p>
          </div>
        )}
        {filtered.length === 0 && items.length > 0 && (
          <p className="text-center text-sm text-[var(--text-secondary)] py-8">No models match "{search}"</p>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[var(--accent-gold)] text-[var(--bg-primary)] shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-10"
        aria-label="Add model"
      >
        <Plus className="w-6 h-6" />
      </button>

      {showAdd && <AddModelModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
