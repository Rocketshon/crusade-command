import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus, Trash2, Search, X, ChevronRight, Star, Shield,
  Skull, Swords, AlertTriangle, Check, Edit2,
} from 'lucide-react';
import { useArmy, type ArmyUnit } from '../../lib/ArmyContext';
import { useCollection } from '../../lib/CollectionContext';
import { searchUnits } from '../../data';
import { getRank, getHonourSlots, getXPProgress } from '../../data/crusadeRules';
import type { Datasheet } from '../../types';

// ---------------------------------------------------------------------------
// XP progress bar (crusade)
// ---------------------------------------------------------------------------

function XPBar({ unit }: { unit: ArmyUnit }) {
  const progress = getXPProgress(unit.experience_points, unit.is_character, unit.legendary_veterans);
  const rank = getRank(unit.experience_points, unit.is_character, unit.legendary_veterans);
  return (
    <div className="h-1 bg-[var(--border-color)] rounded-full overflow-hidden mt-1.5">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: rank.color }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Crusade campaign dashboard
// ---------------------------------------------------------------------------

function CrusadeDashboard() {
  const { crusade, factionId, detachmentName, supplyLimit, army, spendRP, gainRP, updateFactionPoints, setCampaignRecord, setSupplyLimit } = useArmy();
  const [editingRecord, setEditingRecord] = useState(false);
  const [draftWins, setDraftWins] = useState(0);
  const [draftLosses, setDraftLosses] = useState(0);
  const [draftDraws, setDraftDraws] = useState(0);

  if (!crusade) return null;

  const supplyUsed = army.filter(u => !u.is_destroyed).reduce((s, u) => s + u.points_cost, 0);
  const supplyPct = Math.min(100, Math.round((supplyUsed / supplyLimit) * 100));

  const openEdit = () => {
    setDraftWins(crusade.wins);
    setDraftLosses(crusade.losses);
    setDraftDraws(crusade.draws);
    setEditingRecord(true);
  };
  const saveEdit = () => {
    setCampaignRecord(draftWins, draftLosses, draftDraws);
    setEditingRecord(false);
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 mb-4">
      {/* Faction + detachment */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-[var(--text-secondary)] capitalize">{factionId?.replace(/_/g, ' ')}</p>
          {detachmentName && <p className="text-[10px] text-[var(--text-secondary)]/70">{detachmentName}</p>}
        </div>
        {/* W/L/D with edit */}
        {editingRecord ? (
          <div className="flex items-center gap-2">
            {([
              ['W', draftWins, setDraftWins, 'text-green-400'],
              ['L', draftLosses, setDraftLosses, 'text-red-400'],
              ['D', draftDraws, setDraftDraws, 'text-gray-400'],
            ] as [string, number, (v: number) => void, string][]).map(([l, v, setter, c]) => (
              <div key={l} className="flex flex-col items-center gap-0.5">
                <p className={`text-[9px] ${c}`}>{l}</p>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setter(Math.max(0, v - 1))} className="w-4 h-4 rounded text-[var(--text-secondary)] flex items-center justify-center text-xs font-bold">−</button>
                  <span className={`text-xs font-bold w-4 text-center ${c}`}>{v}</span>
                  <button onClick={() => setter(v + 1)} className="w-4 h-4 rounded text-[var(--text-secondary)] flex items-center justify-center text-xs font-bold">+</button>
                </div>
              </div>
            ))}
            <button onClick={saveEdit} className="ml-1 w-6 h-6 rounded bg-[var(--accent-gold)]/20 border border-[var(--accent-gold)]/40 flex items-center justify-center">
              <Check className="w-3 h-3 text-[var(--accent-gold)]" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex gap-3 text-center">
              {[['W', crusade.wins, 'text-green-400'], ['L', crusade.losses, 'text-red-400'], ['D', crusade.draws, 'text-gray-400']].map(([l, v, c]) => (
                <div key={String(l)}>
                  <p className={`text-sm font-bold ${c}`}>{String(v)}</p>
                  <p className="text-[9px] text-[var(--text-secondary)]">{l}</p>
                </div>
              ))}
            </div>
            <button onClick={openEdit} className="text-[var(--text-secondary)] hover:text-[var(--accent-gold)]">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* RP pips */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Requisition Points</p>
          <div className="flex gap-2">
            <button onClick={() => spendRP(1)} className="text-[10px] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-red-400">−1</button>
            <span className="text-xs font-bold text-[var(--accent-gold)]">{crusade.rp} / 10</span>
            <button onClick={() => gainRP(1)} className="text-[10px] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-green-400">+1</button>
          </div>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className={`flex-1 h-2 rounded-sm transition-colors ${i < crusade.rp ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border-color)]'}`} />
          ))}
        </div>
      </div>

      {/* Supply gauge */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Supply</p>
          <div className="flex items-center gap-2">
            <p className={`text-xs font-bold ${supplyUsed > supplyLimit ? 'text-red-400' : 'text-[var(--accent-gold)]'}`}>
              {supplyUsed} / {supplyLimit} pts
            </p>
            <button onClick={() => setSupplyLimit(supplyLimit + 200)} className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-green-400" title="Increase Supply Limit +200 (costs 1 RP)">+200</button>
          </div>
        </div>
        <div className="h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${supplyUsed > supplyLimit ? 'bg-red-500' : 'bg-[var(--accent-gold)]'}`}
            style={{ width: `${supplyPct}%` }} />
        </div>
      </div>

      {/* Faction mechanic */}
      {crusade.factionPointsLabel !== 'Points' && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">{crusade.factionPointsLabel}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => updateFactionPoints(-1)} className="text-[10px] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-red-400">−1</button>
            <span className="text-sm font-bold text-[var(--text-primary)]">{crusade.factionPoints}</span>
            <button onClick={() => updateFactionPoints(1)} className="text-[10px] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-green-400">+1</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unit card — Normal mode
// ---------------------------------------------------------------------------

function NormalUnitCard({ unit, onRemove, onEdit }: { unit: ArmyUnit; onRemove: () => void; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg">
      <div className="flex-1 min-w-0" onClick={onEdit}>
        <div className="flex items-center gap-1.5">
          {unit.is_character && <Shield className="w-3 h-3 text-blue-400 flex-shrink-0" />}
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{unit.custom_name}</p>
        </div>
        {unit.wargear_notes && (
          <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{unit.wargear_notes}</p>
        )}
        {unit.faction_id !== '' && (
          <p className="text-[10px] text-[var(--text-secondary)]/60 mt-0.5">{unit.faction_id.replace(/_/g, ' ')}</p>
        )}
      </div>
      <span className="text-sm font-bold text-[var(--accent-gold)] flex-shrink-0">{unit.points_cost} pts</span>
      <button onClick={onRemove} className="text-[var(--text-secondary)] hover:text-red-400 transition-colors flex-shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unit card — Crusade mode
// ---------------------------------------------------------------------------

function CrusadeUnitCard({ unit, onClick }: { unit: ArmyUnit; onClick: () => void }) {
  const rank = getRank(unit.experience_points, unit.is_character, unit.legendary_veterans);
  const slots = getHonourSlots(unit.experience_points, unit.is_character, unit.legendary_veterans);

  return (
    <button
      onClick={onClick}
      disabled={unit.is_destroyed}
      className={`w-full flex items-center gap-3 p-3.5 rounded-lg border transition-colors text-left ${
        unit.is_destroyed
          ? 'border-[var(--border-color)] bg-[var(--bg-card)]/50 opacity-50'
          : unit.battle_scars.length > 0
          ? 'border-red-500/30 bg-[var(--bg-card)] hover:border-red-400/50'
          : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/40'
      }`}
    >
      {/* Rank dot */}
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: rank.color }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {unit.is_warlord && <Star className="w-3 h-3 text-[var(--accent-gold)] flex-shrink-0" />}
          {unit.is_character && <Shield className="w-3 h-3 text-blue-400 flex-shrink-0" />}
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{unit.custom_name}</p>
          {unit.is_destroyed && <Skull className="w-3 h-3 text-red-400 flex-shrink-0" />}
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          {rank.name} · {unit.experience_points} XP · {unit.points_cost} pts
        </p>
        <XPBar unit={unit} />
      </div>

      {/* Honour slots */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {slots > 0 && (
          <div className="flex gap-0.5">
            {Array.from({ length: slots }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full border ${i < unit.battle_honours.length ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)]' : 'bg-transparent border-[var(--border-color)]'}`} />
            ))}
          </div>
        )}
        {unit.battle_scars.length > 0 && (
          <div className="flex gap-0.5">
            {unit.battle_scars.map(s => <div key={s.id} className="w-2 h-2 rounded-full bg-red-500" />)}
          </div>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Add unit modal — pick from My Models, then configure
// ---------------------------------------------------------------------------

function AddUnitModal({ onClose, mode }: { onClose: () => void; mode: 'standard' | 'crusade' }) {
  const { addUnit } = useArmy();
  const { items: collectionItems } = useCollection();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Datasheet | null>(null);
  const [customName, setCustomName] = useState('');
  const [pointsOverride, setPointsOverride] = useState('');
  const [wargearNotes, setWargearNotes] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Search My Models first, fall back to all units
  const results = useMemo(() => {
    if (query.length < 2) return [];
    const allResults = searchUnits(query);
    // Mark which ones are in collection
    const collectionNames = new Set(collectionItems.map(i => i.name.toLowerCase()));
    return allResults.slice(0, 10).map(u => ({
      ...u,
      inCollection: collectionNames.has(u.name.toLowerCase()),
    }));
  }, [query, collectionItems]);

  const handleSelect = (unit: Datasheet) => {
    setSelected(unit);
    setQuery(unit.name);
    setCustomName('');
    setPointsOverride(unit.points[0]?.cost ?? '0');
    setShowDropdown(false);
  };

  const handleAdd = () => {
    if (!selected) return;
    addUnit({
      datasheetName: selected.name,
      customName: customName.trim(),
      pointsCost: parseInt(pointsOverride, 10) || 0,
      factionId: selected.faction_id,
      isCharacter: selected.keywords.includes('CHARACTER'),
      wargearNotes: wargearNotes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
      <div className="w-full bg-[var(--bg-primary)] rounded-t-xl border-t border-[var(--border-color)] p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Add Unit</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)]"><X className="w-5 h-5" /></button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search units from your collection…"
            className="w-full pl-9 pr-9 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)]"
          />
          {query && (
            <button onClick={() => { setQuery(''); setSelected(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              <X className="w-4 h-4" />
            </button>
          )}

          {showDropdown && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded shadow-xl z-10 max-h-52 overflow-y-auto">
              {results.map(u => (
                <button key={`${u.faction_id}-${u.name}`} onMouseDown={() => handleSelect(u)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[var(--accent-gold)]/10 border-b border-[var(--border-color)] last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-[var(--text-primary)]">{u.name}</p>
                      {u.inCollection && <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]">Owned</span>}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{u.faction}</p>
                  </div>
                  {u.points[0] && <span className="text-xs text-[var(--accent-gold)]">{u.points[0].cost} pts</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="rounded border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5 p-3 mb-4">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[var(--accent-gold)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{selected.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">{selected.faction}</p>
              </div>
            </div>
          </div>
        )}

        {selected && (
          <div className="space-y-3 mb-4">
            {/* Points */}
            <div>
              <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Points Cost</label>
              <div className="flex gap-2 mt-1">
                <input type="number" value={pointsOverride} onChange={e => setPointsOverride(e.target.value)} min={0}
                  className="flex-1 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]" />
                {selected.points.length > 1 && (
                  <div className="flex gap-1">
                    {selected.points.map(p => (
                      <button key={p.models} onClick={() => setPointsOverride(p.cost)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${pointsOverride === p.cost ? 'border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
                        {p.models}m
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Custom name (always shown in crusade) */}
            {mode === 'crusade' && (
              <div>
                <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  Custom Name <span className="normal-case">(optional)</span>
                </label>
                <input type="text" value={customName} onChange={e => setCustomName(e.target.value)}
                  placeholder={selected.name}
                  className="mt-1 w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)]" />
              </div>
            )}

            {/* Wargear notes */}
            <div>
              <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Wargear / Loadout Notes <span className="normal-case">(optional)</span></label>
              <textarea value={wargearNotes} onChange={e => setWargearNotes(e.target.value)}
                placeholder="e.g. Thunder hammer, Storm shield, 5 models…"
                rows={2}
                className="mt-1 w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)] resize-none" />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-[var(--border-color)] text-[var(--text-secondary)] rounded">Cancel</button>
          <button onClick={handleAdd} disabled={!selected}
            className="flex-1 py-2.5 text-sm border border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-semibold rounded disabled:opacity-40">
            Add to Army
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unit wargear edit modal (normal mode)
// ---------------------------------------------------------------------------

function EditUnitModal({ unit, onClose }: { unit: ArmyUnit; onClose: () => void }) {
  const { updateUnit, removeUnit } = useArmy();
  const [name, setName] = useState(unit.custom_name);
  const [pts, setPts] = useState(String(unit.points_cost));
  const [notes, setNotes] = useState(unit.wargear_notes);

  const save = () => {
    updateUnit(unit.id, {
      custom_name: name.trim() || unit.datasheet_name,
      points_cost: parseInt(pts, 10) || unit.points_cost,
      wargear_notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
      <div className="w-full bg-[var(--bg-primary)] rounded-t-xl border-t border-[var(--border-color)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--text-primary)]">{unit.datasheet_name}</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)]"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]" />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Points</label>
            <input type="number" value={pts} onChange={e => setPts(e.target.value)} min={0}
              className="mt-1 w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]" />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Wargear / Loadout</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="e.g. Thunder hammer, Storm shield…"
              className="mt-1 w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)] resize-none" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { removeUnit(unit.id); onClose(); }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm border border-red-500/30 text-red-400 rounded hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" />Remove
          </button>
          <button onClick={save} className="flex-1 py-2.5 text-sm border border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-semibold rounded">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Army Builder page
// ---------------------------------------------------------------------------

export default function ArmyBuilder() {
  const navigate = useNavigate();
  const {
    mode, army, supplyLimit, savedArmies, activeArmyId,
    removeUnit, switchArmy, createArmy, renameArmy,
  } = useArmy();

  const [showAdd, setShowAdd] = useState(false);
  const [editUnit, setEditUnit] = useState<ArmyUnit | null>(null);
  const [search, setSearch] = useState('');
  const [showArmySwitcher, setShowArmySwitcher] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const activeArmy = savedArmies.find(a => a.id === activeArmyId);
  const totalPoints = army.reduce((s, u) => s + u.points_cost, 0);

  // Must be above early returns — hooks cannot be called conditionally
  const filtered = useMemo(() => {
    if (!search.trim()) return army;
    const q = search.toLowerCase();
    return army.filter(u =>
      u.custom_name.toLowerCase().includes(q) ||
      u.datasheet_name.toLowerCase().includes(q),
    );
  }, [army, search]);

  // No mode → go to mode picker
  if (!mode) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center px-6">
        <Swords className="w-10 h-10 text-[var(--text-secondary)] mb-4" />
        <p className="text-[var(--text-secondary)] text-sm mb-4 text-center">No army selected yet.</p>
        <button onClick={() => navigate('/mode-select')}
          className="px-6 py-3 rounded-lg border border-[var(--accent-gold)] text-[var(--accent-gold)] text-sm font-semibold">
          Choose Mode
        </button>
      </div>
    );
  }

  // Crusade mode — need to set up campaign first
  if (mode === 'crusade' && !activeArmy?.crusade) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center px-6">
        <Shield className="w-10 h-10 text-[var(--accent-gold)]/60 mb-4" />
        <p className="text-sm text-[var(--text-secondary)] mb-4 text-center">Set up your Crusade campaign to start.</p>
        <button onClick={() => navigate('/army/crusade-setup')}
          className="px-6 py-3 rounded-lg border border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] text-sm font-semibold">
          Set Up Campaign
        </button>
      </div>
    );
  }

  const characters = filtered.filter(u => u.is_character);
  const nonCharacters = filtered.filter(u => !u.is_character);

  const handleSaveName = () => {
    if (activeArmyId && nameInput.trim()) renameArmy(activeArmyId, nameInput.trim());
    setEditingName(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-28">
      {/* Header */}
      <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-1">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveName()} autoFocus
                className="flex-1 text-lg font-bold bg-transparent border-b border-[var(--accent-gold)] text-[var(--text-primary)] outline-none" />
              <button onClick={handleSaveName} className="text-[var(--accent-gold)]"><Check className="w-4 h-4" /></button>
              <button onClick={() => setEditingName(false)} className="text-[var(--text-secondary)]"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button onClick={() => { setNameInput(activeArmy?.name ?? ''); setEditingName(true); setShowArmySwitcher(false); }}
              className="text-lg font-bold text-[var(--text-primary)] tracking-tight text-left">
              {activeArmy?.name ?? 'My Army'}
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded border ${mode === 'crusade' ? 'border-[var(--accent-gold)]/40 text-[var(--accent-gold)]' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
              {mode === 'crusade' ? 'Crusade' : 'Normal'}
            </span>
            <button onClick={() => setShowArmySwitcher(v => !v)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-xs border border-[var(--border-color)] px-2 py-1 rounded">
              Switch
            </button>
          </div>
        </div>

        <p className="text-xs text-[var(--text-secondary)]">
          {army.length} units ·{' '}
          <span className={totalPoints > supplyLimit ? 'text-red-400' : 'text-[var(--accent-gold)]'}>
            {totalPoints} pts
          </span>
          {mode === 'crusade' && ` / ${supplyLimit} pts supply`}
        </p>
      </div>

      {/* Army switcher dropdown */}
      {showArmySwitcher && (
        <div className="mx-4 mt-2 mb-0 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg overflow-hidden">
          {savedArmies.map(a => (
            <button key={a.id} onClick={() => { switchArmy(a.id); setShowArmySwitcher(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-left border-b border-[var(--border-color)] last:border-0 ${a.id === activeArmyId ? 'bg-[var(--accent-gold)]/10' : ''}`}>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{a.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">{a.mode === 'crusade' ? 'Crusade' : 'Normal'} · {a.units.length} units</p>
              </div>
              {a.id === activeArmyId && <Check className="w-4 h-4 text-[var(--accent-gold)]" />}
            </button>
          ))}
          <button onClick={() => { navigate('/mode-select'); setShowArmySwitcher(false); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10">
            <Plus className="w-4 h-4" />New Army
          </button>
        </div>
      )}

      <div className="px-4 pt-4">
        {/* Crusade dashboard */}
        {mode === 'crusade' && <CrusadeDashboard />}

        {/* Search */}
        {army.length > 4 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search units…"
              className="w-full pl-9 pr-9 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)]" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"><X className="w-4 h-4" /></button>}
          </div>
        )}

        {/* Unit lists */}
        {mode === 'crusade' ? (
          <>
            {characters.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Characters</p>
                <div className="space-y-2">
                  {characters.map(u => <CrusadeUnitCard key={u.id} unit={u} onClick={() => navigate(`/army/unit/${u.id}`)} />)}
                </div>
              </div>
            )}
            {nonCharacters.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Units</p>
                <div className="space-y-2">
                  {nonCharacters.map(u => <CrusadeUnitCard key={u.id} unit={u} onClick={() => navigate(`/army/unit/${u.id}`)} />)}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            {filtered.map(u => (
              <NormalUnitCard key={u.id} unit={u} onRemove={() => removeUnit(u.id)} onEdit={() => setEditUnit(u)} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {army.length === 0 && (
          <div className="text-center py-12 border border-dashed border-[var(--border-color)] rounded-xl">
            <AlertTriangle className="w-8 h-8 text-[var(--text-secondary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">No units yet</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Tap + to add from your collection</p>
          </div>
        )}

        {/* Crusade actions row */}
        {mode === 'crusade' && army.length > 0 && (
          <div className="flex gap-2 mt-4">
            <button onClick={() => navigate('/army/post-battle')}
              className="flex-1 py-2.5 text-xs border border-[var(--accent-gold)]/40 text-[var(--accent-gold)] rounded-lg font-medium">
              Record Battle
            </button>
            <button onClick={() => navigate('/army/history')}
              className="flex-1 py-2.5 text-xs border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg">
              Battle History
            </button>
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

      {showAdd && <AddUnitModal onClose={() => setShowAdd(false)} mode={mode} />}
      {editUnit && <EditUnitModal unit={editUnit} onClose={() => setEditUnit(null)} />}
    </div>
  );
}
