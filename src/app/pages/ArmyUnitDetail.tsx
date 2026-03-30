import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, Star, Shield, Skull, X, Check, ChevronDown, ChevronUp, Plus, Trash2,
} from 'lucide-react';
import { useArmy, type BattleHonour } from '../../lib/ArmyContext';
import {
  getRank, getHonourSlots, getXPProgress, getNextRankXP,
  getWeaponEnhancements, BATTLE_HONOUR_TYPES,
  OFFICIAL_BATTLE_SCARS,
} from '../../data/crusadeRules';
import { searchUnits } from '../../data';

// ---------------------------------------------------------------------------
// XP bar
// ---------------------------------------------------------------------------

function XPBar({ xp, isChar, lv }: { xp: number; isChar: boolean; lv: boolean }) {
  const progress = getXPProgress(xp, isChar, lv);
  const rank = getRank(xp, isChar, lv);
  const next = getNextRankXP(xp, isChar, lv);
  return (
    <div>
      <div className="h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: rank.color }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: rank.color }}>{rank.name}</span>
        {next !== null && <span className="text-[10px] text-[var(--text-secondary)]">{xp} / {next} XP</span>}
        {next === null && <span className="text-[10px] text-[var(--accent-gold)]">Max Rank</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weapon enhancement picker — shown when adding a weapon enhancement honour
// ---------------------------------------------------------------------------

function WeaponEnhancementPicker({
  unitDatasheetName,
  factionId,
  onSelect,
  onCancel,
}: {
  unitDatasheetName: string;
  factionId: string;
  onSelect: (data: Omit<BattleHonour, 'id' | 'type' | 'name'> & { name: string }) => void;
  onCancel: () => void;
}) {
  // Look up the unit's weapons from the datasheet
  const datasheet = useMemo(() => {
    const results = searchUnits(unitDatasheetName);
    return results.find(u => u.name.toLowerCase() === unitDatasheetName.toLowerCase()) ?? null;
  }, [unitDatasheetName]);

  const [weaponType, setWeaponType] = useState<'ranged' | 'melee'>('melee');
  const [selectedWeapon, setSelectedWeapon] = useState('');
  const [selectedEnhancement, setSelectedEnhancement] = useState('');

  const weapons = useMemo(() => {
    if (!datasheet) return [];
    if (weaponType === 'ranged') return datasheet.ranged_weapons.map(w => w.name);
    return datasheet.melee_weapons.map(w => w.name);
  }, [datasheet, weaponType]);

  const enhancements = useMemo(
    () => getWeaponEnhancements(factionId, weaponType),
    [factionId, weaponType],
  );

  const selectedEnh = enhancements.find(e => e.id === selectedEnhancement);

  const hasRanged = (datasheet?.ranged_weapons.length ?? 0) > 0;
  const hasMelee = (datasheet?.melee_weapons.length ?? 0) > 0;

  const canConfirm = selectedWeapon !== '' && selectedEnhancement !== '';

  const handleConfirm = () => {
    if (!canConfirm || !selectedEnh) return;
    onSelect({
      name: `${selectedEnh.name} (${selectedWeapon})`,
      weaponName: selectedWeapon,
      weaponType,
      enhancementId: selectedEnh.id,
      enhancementEffect: selectedEnh.effect,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end">
      <div className="w-full bg-[var(--bg-primary)] rounded-t-xl border-t border-[var(--border-color)] flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Weapon Enhancement</h2>
          <button onClick={onCancel} className="text-[var(--text-secondary)]"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-3">

        {/* Weapon type toggle */}
        <div className="flex gap-2 mb-4">
          {hasRanged && (
            <button onClick={() => { setWeaponType('ranged'); setSelectedWeapon(''); setSelectedEnhancement(''); }}
              className={`flex-1 py-2 text-sm rounded border transition-colors ${weaponType === 'ranged' ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
              Ranged
            </button>
          )}
          {hasMelee && (
            <button onClick={() => { setWeaponType('melee'); setSelectedWeapon(''); setSelectedEnhancement(''); }}
              className={`flex-1 py-2 text-sm rounded border transition-colors ${weaponType === 'melee' ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
              Melee
            </button>
          )}
        </div>

        {/* Weapon picker */}
        <div className="mb-4">
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">Select Weapon</p>
          {weapons.length > 0 ? (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {weapons.map(w => (
                <button key={w} onClick={() => setSelectedWeapon(w)}
                  className={`w-full text-left px-3 py-2 rounded border text-sm transition-colors ${selectedWeapon === w ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--text-primary)]' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
                  {w}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)] italic">
              {datasheet ? `No ${weaponType} weapons found on datasheet` : 'Datasheet not found — enter weapon name manually'}
            </p>
          )}
          {/* Manual entry if no datasheet */}
          {!datasheet || weapons.length === 0 ? (
            <input value={selectedWeapon} onChange={e => setSelectedWeapon(e.target.value)}
              placeholder="Enter weapon name…"
              className="mt-2 w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)]" />
          ) : null}
        </div>

        {/* Enhancement picker */}
        <div className="mb-4">
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">Select Enhancement</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {enhancements.map(e => (
              <button key={e.id} onClick={() => setSelectedEnhancement(e.id)}
                className={`w-full text-left px-3 py-2.5 rounded border transition-colors ${selectedEnhancement === e.id ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10' : 'border-[var(--border-color)]'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{e.name}</p>
                  {!e.verified && <span className="text-[9px] text-amber-400 flex-shrink-0 ml-2">⚠️ verify</span>}
                </div>
                <p className="text-xs text-[var(--accent-gold)] mt-0.5">{e.effect}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{e.rules}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {selectedWeapon && selectedEnh && (
          <div className="rounded border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5 p-3 mb-4">
            <p className="text-xs text-[var(--text-secondary)] mb-0.5">Enhancement</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedEnh.name} ({selectedWeapon})</p>
            <p className="text-xs text-[var(--accent-gold)] mt-0.5">{selectedEnh.effect}</p>
          </div>
        )}

        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border-color)]">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm border border-[var(--border-color)] text-[var(--text-secondary)] rounded">Cancel</button>
          <button onClick={handleConfirm} disabled={!canConfirm}
            className="flex-1 py-2.5 text-sm border border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-semibold rounded disabled:opacity-40">
            Add Enhancement
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add honour modal (non-weapon-enhancement types)
// ---------------------------------------------------------------------------

function AddHonourModal({ onAdd, onClose, isCharacter, existingHonourNames }: {
  onAdd: (h: Omit<BattleHonour, 'id'>) => void;
  onClose: () => void;
  isCharacter: boolean;
  existingHonourNames: string[];
}) {
  const [type, setType] = useState<string>('battle_trait');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  // Crusade Relics are character-only
  const availableTypes = BATTLE_HONOUR_TYPES.filter(t =>
    t.id !== 'weapon_enhancement' && (t.id !== 'crusade_relic' || isCharacter)
  );
  const isDuplicate = existingHonourNames.includes(name.trim());
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end">
      <div className="w-full bg-[var(--bg-primary)] rounded-t-xl border-t border-[var(--border-color)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Add Battle Honour</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)]"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3 mb-4">
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">Type</p>
            <div className="flex flex-wrap gap-2">
              {availableTypes.map(t => (
                <button key={t.id} onClick={() => setType(t.id)}
                  className={`px-3 py-1.5 rounded border text-xs transition-colors ${type === t.id ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {type === 'crusade_relic' && (
              <p className="text-xs text-amber-400 mt-1.5">⚠️ Crusade Relics require the Renowned Heroes Requisition (1–3 RP). Character units only.</p>
            )}
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Never Give Ground"
              className={`mt-1 w-full px-3 py-2 bg-[var(--bg-card)] border rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none transition-colors ${isDuplicate ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-color)] focus:border-[var(--accent-gold)]'}`} />
            {isDuplicate && <p className="text-xs text-red-400 mt-1">This unit already has a Battle Honour with that name.</p>}
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Effect / Notes <span className="normal-case">(optional)</span></label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              className="mt-1 w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] resize-none" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-[var(--border-color)] text-[var(--text-secondary)] rounded">Cancel</button>
          <button onClick={() => { if (name.trim() && !isDuplicate) { onAdd({ type, name: name.trim(), description: desc.trim() }); onClose(); } }}
            disabled={!name.trim() || isDuplicate}
            className="flex-1 py-2.5 text-sm border border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-semibold rounded disabled:opacity-40">
            Add Honour
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ArmyUnitDetail() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const {
    army, factionId, crusade,
    awardXP, addBattleHonour, removeBattleHonour, addBattleScar, removeBattleScar,
    setWarlord, buyLegendaryVeterans, updateUnit, removeUnit, spendRP,
  } = useArmy();

  const unit = army.find(u => u.id === unitId);

  const [awardingXP, setAwardingXP] = useState(false);
  const [xpAmount, setXPAmount] = useState(1);
  const [honoursOpen, setHonoursOpen] = useState(true);
  const [scarsOpen, setScarsOpen] = useState(true);
  const [showAddHonour, setShowAddHonour] = useState(false);
  const [showWeaponEnhancement, setShowWeaponEnhancement] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [editingWargear, setEditingWargear] = useState(false);
  const [wargearInput, setWargearInput] = useState('');
  const [addScarName, setAddScarName] = useState('');
  const [addScarEffect, setAddScarEffect] = useState('');
  const [showAddScar, setShowAddScar] = useState(false);

  if (!unit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">Unit not found.</p>
      </div>
    );
  }

  const rank = getRank(unit.experience_points, unit.is_character, unit.legendary_veterans);
  const slots = getHonourSlots(unit.experience_points, unit.is_character, unit.legendary_veterans);
  const slotsUsed = unit.battle_honours.length;
  const slotsLeft = Math.max(0, slots - slotsUsed);
  const canAddHonour = slotsLeft > 0;

  const handleAddWeaponEnhancement = (data: Omit<BattleHonour, 'id' | 'type' | 'name'> & { name: string }) => {
    addBattleHonour(unit.id, { ...data, type: 'weapon_enhancement' });
    setShowWeaponEnhancement(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 pt-6 pb-28">
      <div className="max-w-md mx-auto">

        {/* Back */}
        <button onClick={() => navigate('/army')} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-5">
          <ArrowLeft className="w-5 h-5" /><span className="text-sm">Army</span>
        </button>

        {/* Unit header */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 mb-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus
                    className="flex-1 text-base font-bold bg-transparent border-b border-[var(--accent-gold)] text-[var(--text-primary)] outline-none" />
                  <button onClick={() => { updateUnit(unit.id, { custom_name: nameInput.trim() || unit.datasheet_name }); setEditingName(false); }} className="text-[var(--accent-gold)]"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingName(false)} className="text-[var(--text-secondary)]"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <button onClick={() => { setNameInput(unit.custom_name); setEditingName(true); }} className="text-left">
                  <p className="text-base font-bold text-[var(--text-primary)]">{unit.custom_name}</p>
                  {unit.custom_name !== unit.datasheet_name && <p className="text-xs text-[var(--text-secondary)]">{unit.datasheet_name}</p>}
                </button>
              )}
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{unit.faction_id.replace(/_/g, ' ')} · {unit.points_cost} pts</p>
            </div>
            <div className="flex items-center gap-2">
              {unit.is_character && <Shield className="w-4 h-4 text-blue-400" />}
              {unit.is_warlord && <Star className="w-4 h-4 text-[var(--accent-gold)]" />}
              {unit.is_destroyed && <Skull className="w-4 h-4 text-red-400" />}
            </div>
          </div>

          {/* Wargear notes */}
          {editingWargear ? (
            <div className="mb-3">
              <textarea value={wargearInput} onChange={e => setWargearInput(e.target.value)} rows={2}
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--accent-gold)] rounded text-sm text-[var(--text-primary)] resize-none focus:outline-none" />
              {crusade && (
                <p className="text-[10px] text-amber-400 mt-1">Rearm &amp; Resupply — costs 1 RP ({crusade.rp} available)</p>
              )}
              <div className="flex gap-2 mt-1">
                <button onClick={() => {
                  const changed = wargearInput.trim() !== unit.wargear_notes;
                  updateUnit(unit.id, { wargear_notes: wargearInput.trim() });
                  if (crusade && changed) spendRP(1);
                  setEditingWargear(false);
                }} className="text-xs text-[var(--accent-gold)]">{crusade ? 'Save (−1 RP)' : 'Save'}</button>
                <button onClick={() => setEditingWargear(false)} className="text-xs text-[var(--text-secondary)]">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setWargearInput(unit.wargear_notes); setEditingWargear(true); }}
              className="text-left w-full mb-3">
              {unit.wargear_notes
                ? <p className="text-xs text-[var(--text-secondary)] italic">{unit.wargear_notes}</p>
                : <p className="text-xs text-[var(--text-secondary)]/50 italic">+ Add wargear notes</p>}
            </button>
          )}

          {/* XP */}
          <XPBar xp={unit.experience_points} isChar={unit.is_character} lv={unit.legendary_veterans} />

          {/* Battle stats */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[['Battles', unit.battles_played], ['Survived', unit.battles_survived], ['Kills', unit.total_kills]].map(([l, v]) => (
              <div key={String(l)} className="text-center bg-[var(--bg-primary)] rounded p-2">
                <p className="text-sm font-bold text-[var(--text-primary)]">{String(v)}</p>
                <p className="text-[9px] text-[var(--text-secondary)]">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* XP panel */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Award XP</p>
            <span className="text-sm font-bold" style={{ color: rank.color }}>{unit.experience_points} XP</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => awardXP(unit.id, n)}
                className="flex-1 py-2 text-sm rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-colors font-medium">
                +{n}
              </button>
            ))}
          </div>
        </div>

        {/* Battle Honours */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl mb-4 overflow-hidden">
          <button onClick={() => setHonoursOpen(v => !v)}
            className="w-full flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Battle Honours</p>
              <span className="text-xs text-[var(--accent-gold)]">{slotsUsed} / {slots}</span>
            </div>
            {honoursOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />}
          </button>

          {honoursOpen && (
            <div className="px-4 pb-4">
              {unit.battle_honours.map(h => (
                <div key={h.id} className="flex items-start justify-between gap-2 py-2 border-t border-[var(--border-color)]">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)]">
                        {BATTLE_HONOUR_TYPES.find(t => t.id === h.type)?.label ?? h.type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{h.name}</p>
                    {h.description && <p className="text-xs text-[var(--text-secondary)]">{h.description}</p>}
                    {h.enhancementEffect && <p className="text-xs text-[var(--accent-gold)]">{h.enhancementEffect}</p>}
                    {h.weaponName && <p className="text-xs text-[var(--text-secondary)]">on {h.weaponName}</p>}
                  </div>
                  <button onClick={() => removeBattleHonour(unit.id, h.id)} className="text-[var(--text-secondary)] hover:text-red-400 transition-colors flex-shrink-0 mt-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {canAddHonour ? (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setShowAddHonour(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs border border-[var(--border-color)] text-[var(--text-secondary)] rounded hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-colors">
                    <Plus className="w-3.5 h-3.5" />Battle Trait / Relic
                  </button>
                  <button onClick={() => setShowWeaponEnhancement(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs border border-[var(--border-color)] text-[var(--text-secondary)] rounded hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-colors">
                    <Plus className="w-3.5 h-3.5" />Weapon Enhancement
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] mt-3 text-center">
                  {slots === 0 ? 'No honour slots yet — earn XP to rank up' : 'All honour slots filled'}
                </p>
              )}

              {/* Legendary Veterans */}
              {!unit.is_character && !unit.legendary_veterans && unit.experience_points >= 16 && (
                <button
                  onClick={() => { buyLegendaryVeterans(unit.id); }}
                  className="w-full mt-3 py-2 text-xs border border-purple-500/40 text-purple-400 rounded hover:bg-purple-500/10 transition-colors">
                  Legendary Veterans — 3 RP (unlock Heroic/Legendary ranks)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Battle Scars */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl mb-4 overflow-hidden">
          <button onClick={() => setScarsOpen(v => !v)} className="w-full flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Battle Scars</p>
              {unit.battle_scars.length > 0 && <span className="text-xs text-red-400">{unit.battle_scars.length}</span>}
            </div>
            {scarsOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />}
          </button>

          {scarsOpen && (
            <div className="px-4 pb-4">
              {unit.battle_scars.map(s => (
                <div key={s.id} className="flex items-start justify-between gap-2 py-2 border-t border-[var(--border-color)]">
                  <div>
                    <p className="text-sm font-medium text-red-300">{s.name}</p>
                    {s.effect && <p className="text-xs text-[var(--text-secondary)]">{s.effect}</p>}
                  </div>
                  <button onClick={() => removeBattleScar(unit.id, s.id)} className="text-[var(--text-secondary)] hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {showAddScar ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Official Scars</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {OFFICIAL_BATTLE_SCARS.filter(s => !unit.battle_scars.some(us => us.name === s.name)).map(scar => (
                      <button key={scar.id} onClick={() => { addBattleScar(unit.id, { name: scar.name, effect: scar.effect }); setShowAddScar(false); }}
                        className="w-full text-left px-3 py-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-red-500/40 transition-colors">
                        <p className="text-xs font-semibold text-red-300">{scar.name}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{scar.effect}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mt-2">Custom Scar</p>
                  <input value={addScarName} onChange={e => setAddScarName(e.target.value)} placeholder="Scar name"
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-red-500" />
                  <input value={addScarEffect} onChange={e => setAddScarEffect(e.target.value)} placeholder="Effect (optional)"
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-red-500" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddScar(false)} className="flex-1 py-2 text-xs border border-[var(--border-color)] text-[var(--text-secondary)] rounded">Cancel</button>
                    <button onClick={() => { if (addScarName.trim()) { addBattleScar(unit.id, { name: addScarName.trim(), effect: addScarEffect.trim() }); setAddScarName(''); setAddScarEffect(''); setShowAddScar(false); } }}
                      disabled={!addScarName.trim()}
                      className="flex-1 py-2 text-xs border border-red-500/40 bg-red-500/10 text-red-400 rounded disabled:opacity-40">
                      Add Custom
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddScar(true)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-xs border border-[var(--border-color)] text-[var(--text-secondary)] rounded hover:border-red-500/40 hover:text-red-400 transition-colors">
                  <Plus className="w-3.5 h-3.5" />Add Battle Scar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button onClick={() => setWarlord(unit.id)}
            className={`w-full py-3 text-sm rounded-xl border transition-colors ${unit.is_warlord ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
            {unit.is_warlord ? '★ Warlord' : 'Set as Warlord'}
          </button>
          <button
            onClick={() => updateUnit(unit.id, { is_destroyed: !unit.is_destroyed })}
            className={`w-full py-3 text-sm rounded-xl border transition-colors ${unit.is_destroyed ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
            {unit.is_destroyed ? 'Restore Unit' : 'Mark as Destroyed'}
          </button>
          <button onClick={() => { removeUnit(unit.id); navigate('/army'); }}
            className="w-full py-3 text-sm rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
            Remove from Army
          </button>
        </div>

      </div>

      {showAddHonour && (
        <AddHonourModal onAdd={h => addBattleHonour(unit.id, h)} onClose={() => setShowAddHonour(false)} isCharacter={unit.is_character} existingHonourNames={unit.battle_honours.map(h => h.name)} />
      )}
      {showWeaponEnhancement && (
        <WeaponEnhancementPicker
          unitDatasheetName={unit.datasheet_name}
          factionId={factionId ?? unit.faction_id}
          onSelect={handleAddWeaponEnhancement}
          onCancel={() => setShowWeaponEnhancement(false)}
        />
      )}
    </div>
  );
}
