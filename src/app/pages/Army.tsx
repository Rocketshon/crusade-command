import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ChevronRight, Trash2, Pencil, Check, ChevronDown, Scale, Share2, AlertTriangle, Target, Users } from 'lucide-react';
import { useArmy, type ArmyUnit } from '../../lib/ArmyContext';
import { FACTIONS, getDataFactionId } from '../../lib/factions';
import { getRulesForFaction, getUnitsForFaction } from '../../data';
import { FormattedRuleText } from '../../lib/formatText';
import { getFactionArt } from '../../lib/artMap';
import type { FactionId, Datasheet } from '../../types';

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
      <h2 className="font-serif text-xl font-bold text-[var(--accent-gold)] text-center">Select Your Faction</h2>
      {categories.map(cat => (
        <div key={cat.label}>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">{cat.label}</h3>
          <div className="grid grid-cols-2 gap-2">
            {cat.factions.map(f => (
              <button
                key={f.id}
                onClick={() => onSelect(f.id)}
                className="flex items-center gap-2 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg
                           hover:border-[var(--accent-gold)] transition-colors text-left
                           focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              >
                <span className="text-lg">{f.icon}</span>
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">{f.name}</span>
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
  const [supplyValue, setSupplyValue] = useState(1000);

  if (mode === 'crusade') {
    return (
      <div className="space-y-4 text-center">
        <h2 className="font-serif text-xl font-bold text-[var(--accent-gold)]">Set Supply Limit</h2>
        <p className="text-sm text-[var(--text-secondary)]">Enter your crusade supply limit in points</p>
        <input
          type="number"
          min={500}
          max={10000}
          step={250}
          value={supplyValue}
          onChange={e => setSupplyValue(Number(e.target.value) || 0)}
          className="w-32 mx-auto block px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-center
                     text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onSelect(supplyValue || 1000);
            }
          }}
        />
        <button
          onClick={() => onSelect(supplyValue || 1000)}
          className="px-6 py-2 bg-[var(--accent-gold)] text-[var(--bg-primary)] font-semibold rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
        >
          Confirm
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <h2 className="font-serif text-xl font-bold text-[var(--accent-gold)]">Select Points Limit</h2>
      <div className="flex flex-wrap justify-center gap-2">
        {POINTS_OPTIONS.map(pts => (
          <button
            key={pts}
            onClick={() => onSelect(pts)}
            className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full text-sm font-medium text-[var(--text-primary)]
                       hover:border-[var(--accent-gold)] hover:bg-[var(--bg-card-hover)] transition-colors
                       focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
          >
            {pts.toLocaleString()} pts
          </button>
        ))}
      </div>
    </div>
  );
}

function DetachmentPicker({ factionId, onSelect }: { factionId: string; onSelect: (name: string) => void }) {
  const detachments = useMemo(() => {
    const dataFactionId = getDataFactionId(factionId as FactionId);
    const parentRules = getRulesForFaction(dataFactionId);
    const parentDetachments = parentRules?.detachments ?? [];

    if (dataFactionId !== factionId) {
      const chapterRules = getRulesForFaction(factionId as FactionId);
      const chapterDetachments = chapterRules?.detachments ?? [];
      const seen = new Set(chapterDetachments.map(d => d.name));
      return [...chapterDetachments, ...parentDetachments.filter(d => !seen.has(d.name))];
    }

    return parentDetachments;
  }, [factionId]);

  if (detachments.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="font-serif text-xl font-bold text-[var(--accent-gold)]">No Detachments Available</h2>
        <p className="text-sm text-[var(--text-secondary)]">This faction has no detachment data. You can continue without one.</p>
        <button
          onClick={() => onSelect('')}
          className="px-6 py-2 bg-[var(--accent-gold)] text-[var(--bg-primary)] font-semibold rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-bold text-[var(--accent-gold)] text-center">Select Detachment</h2>
      <div className="grid grid-cols-1 gap-3">
        {detachments.map((det) => {
          const ruleText = det.rule?.text ?? '';
          const truncated = ruleText.length > 100 ? ruleText.slice(0, 100) + '...' : ruleText;
          return (
            <button
              key={det.name}
              onClick={() => onSelect(det.name)}
              className="text-left p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg
                         hover:border-[var(--accent-gold)] transition-colors
                         focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
            >
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{det.name}</h3>
              {det.rule?.name && (
                <p className="text-xs font-medium text-[var(--accent-gold)] mb-1">{det.rule.name}</p>
              )}
              {truncated && (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{truncated}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const ROLE_BORDER_COLORS: Record<string, string> = {
  'CHARACTER': 'border-l-[var(--accent-gold)]',
  'EPIC HERO': 'border-l-[var(--accent-gold)]',
  'BATTLELINE': 'border-l-green-500',
  'DEDICATED TRANSPORT': 'border-l-blue-500',
  'FAST ATTACK': 'border-l-purple-500',
  'HEAVY SUPPORT': 'border-l-red-500',
  'ELITES': 'border-l-cyan-500',
  'LORD OF WAR': 'border-l-orange-500',
  'FORTIFICATION': 'border-l-gray-500',
  'Other': 'border-l-[var(--border-color)]',
};

function getUnitRoleBorder(keywords: string[]): string {
  const upper = keywords.map(k => k.toUpperCase());
  for (const [role, cls] of Object.entries(ROLE_BORDER_COLORS)) {
    if (upper.includes(role)) return cls;
  }
  return ROLE_BORDER_COLORS['Other'];
}

function StandardUnitCard({ unit, onRemove, wouldFixOver, datasheetLookup }: { unit: ArmyUnit; onRemove: () => void; wouldFixOver?: boolean; datasheetLookup: Map<string, Datasheet> }) {
  const ds = datasheetLookup.get(unit.datasheet_name);
  const borderCls = ds ? getUnitRoleBorder(ds.keywords) : 'border-l-[var(--border-color)]';

  return (
    <div className={`flex items-center justify-between p-3 bg-[var(--bg-card)] border border-[var(--border-color)] border-l-4 ${borderCls} rounded-lg ${wouldFixOver ? 'ring-1 ring-amber-400/50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--text-primary)] truncate">{unit.custom_name}</span>
          {unit.is_character && (
            <span className="text-xs px-2 py-0.5 bg-[var(--bg-primary)] text-[var(--text-tertiary)] rounded-full">Character</span>
          )}
          {wouldFixOver && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded font-medium">over</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[var(--accent-gold)]">{unit.points_cost} pts</span>
        <button onClick={onRemove} className="text-[var(--text-secondary)] hover:text-red-500 transition-colors" aria-label="Remove unit">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CrusadeUnitCard({ unit, onRemove, wouldFixOver }: { unit: ArmyUnit; onRemove: () => void; wouldFixOver?: boolean }) {
  const xpForNextRank = unit.rank === 'Legendary' ? 100 :
    unit.rank === 'Heroic' ? 51 :
    unit.rank === 'Battle-hardened' ? 31 :
    unit.rank === 'Blooded' ? 16 : 5;
  const xpProgress = Math.min((unit.experience_points / xpForNextRank) * 100, 100);

  return (
    <div className={`p-4 bg-[var(--bg-card)] border rounded-lg space-y-2 ${wouldFixOver ? 'border-amber-400/50' : 'border-[var(--border-color)]'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[var(--text-primary)] flex items-center gap-2">
            {unit.custom_name}
            {wouldFixOver && (
              <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded font-medium">over</span>
            )}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">{unit.points_cost} pts</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] font-semibold rounded-full border border-[var(--accent-gold)]/30">
            {unit.rank}
          </span>
          <button onClick={onRemove} className="text-[var(--text-secondary)] hover:text-red-500 transition-colors" aria-label="Remove unit">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="w-full h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
        <div
          className="h-full bg-green-600 rounded-full transition-all"
          style={{ width: `${xpProgress}%` }}
        />
      </div>
      <div className="text-xs text-[var(--text-secondary)]">{unit.experience_points} XP</div>

      {/* Battle honours & scars */}
      <div className="flex flex-wrap gap-1">
        {unit.battle_honours.map(h => (
          <span key={h.id} className="text-xs px-2 py-0.5 bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] rounded-full">
            {h.name}
          </span>
        ))}
        {unit.battle_scars.map(s => (
          <span key={s.id} className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">
            {s.name}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="text-xs text-[var(--text-secondary)]">
        {unit.battles_played} battles / {unit.battles_survived} survived
      </div>
    </div>
  );
}

function DetachmentRuleCard({ factionId, detachmentName }: { factionId: string; detachmentName: string | null }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const detachment = useMemo(() => {
    if (!factionId || !detachmentName) return null;
    const dataFactionId = getDataFactionId(factionId as FactionId);
    const rules = getRulesForFaction(dataFactionId);
    let found = rules?.detachments?.find(d => d.name === detachmentName) ?? null;
    if (!found && dataFactionId !== factionId) {
      const chapterRules = getRulesForFaction(factionId as FactionId);
      found = chapterRules?.detachments?.find(d => d.name === detachmentName) ?? null;
    }
    return found;
  }, [factionId, detachmentName]);

  if (!detachmentName) {
    return (
      <div className="mb-4 border border-[var(--accent-gold)]/30 bg-[var(--bg-card)] rounded-lg px-4 py-3">
        <p className="text-sm text-[var(--text-secondary)]">
          No detachment selected.{' '}
          <button
            onClick={() => navigate('/army')}
            className="text-[var(--accent-gold)] font-medium underline hover:opacity-70"
          >
            Pick a detachment
          </button>
        </p>
      </div>
    );
  }

  if (!detachment?.rule) {
    return (
      <div className="mb-4 border border-[var(--accent-gold)]/30 bg-[var(--bg-card)] rounded-lg px-4 py-3">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{detachmentName}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">No rule data available for this detachment.</p>
      </div>
    );
  }

  return (
    <div className="mb-4 border border-[var(--accent-gold)]/30 bg-[var(--bg-card)] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--bg-card-hover)] transition-colors"
      >
        <div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{detachmentName}</span>
          {detachment.rule.name && (
            <span className="ml-2 text-xs text-[var(--accent-gold)] font-medium">{detachment.rule.name}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--accent-gold)]/20">
          <FormattedRuleText text={detachment.rule.text} className="mt-3" />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Constants (static)
// ---------------------------------------------------------------------------

const ROLE_KEYWORDS = ['CHARACTER', 'EPIC HERO', 'BATTLELINE', 'DEDICATED TRANSPORT', 'FAST ATTACK', 'HEAVY SUPPORT', 'ELITES', 'LORD OF WAR', 'FORTIFICATION'] as const;
const ROLE_COLORS: Record<string, string> = {
  'CHARACTER': '#c9a84c',
  'EPIC HERO': '#c9a84c',
  'BATTLELINE': '#16a34a',
  'DEDICATED TRANSPORT': '#2563eb',
  'FAST ATTACK': '#9333ea',
  'HEAVY SUPPORT': '#dc2626',
  'ELITES': '#0891b2',
  'LORD OF WAR': '#ea580c',
  'FORTIFICATION': '#6b7280',
  'Other': '#9ca3af',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Army() {
  const navigate = useNavigate();
  const {
    mode, factionId, detachmentName, supplyLimit, army,
    savedArmies, activeArmyId,
    setFaction, setDetachment, setSupplyLimit, removeUnit, renameArmy,
  } = useArmy();
  const pointsCap = supplyLimit;

  const [editingName, setEditingName] = useState(false);
  const activeArmy = savedArmies.find(a => a.id === activeArmyId);
  const [nameInput, setNameInput] = useState(activeArmy?.name ?? '');

  const [compositionOpen, setCompositionOpen] = useState(false);

  const handleSaveName = () => {
    if (activeArmyId && nameInput.trim()) {
      renameArmy(activeArmyId, nameInput.trim());
    }
    setEditingName(false);
  };

  const datasheetLookup = useMemo(() => {
    if (!factionId) return new Map<string, Datasheet>();
    const units = getUnitsForFaction(getDataFactionId(factionId as FactionId));
    const map = new Map<string, Datasheet>();
    for (const u of units) map.set(u.name, u);
    return map;
  }, [factionId]);

  const roleBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>();
    for (const unit of army) {
      const ds = datasheetLookup.get(unit.datasheet_name);
      let role = 'Other';
      if (ds) {
        const upperKw = ds.keywords.map(k => k.toUpperCase());
        for (const r of ROLE_KEYWORDS) {
          if (upperKw.includes(r)) { role = r; break; }
        }
      }
      breakdown.set(role, (breakdown.get(role) ?? 0) + unit.points_cost);
    }
    return breakdown;
  }, [army, datasheetLookup]);

  if (!mode) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center px-4">
        <p className="text-[var(--text-secondary)] mb-4">No mode selected yet.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-[var(--accent-gold)] text-[var(--bg-primary)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
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
  const pointsColor = pointsRatio > 1 ? 'text-red-500' : pointsRatio > 0.9 ? 'text-amber-500' : 'text-green-500';

  if (!factionId) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-4 pt-8 pb-24">
        <FactionGrid onSelect={(id) => setFaction(id)} />
      </div>
    );
  }

  if (!detachmentName && detachmentName !== '') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-4 pt-8 pb-24">
        <DetachmentPicker factionId={factionId} onSelect={(name) => setDetachment(name)} />
      </div>
    );
  }

  if (!hasCap || (mode === 'standard' && pointsCap === 0)) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-4 pt-16 pb-24 flex items-start justify-center">
        <PointsSelector
          mode={mode}
          onSelect={(pts) => setSupplyLimit(pts)}
        />
      </div>
    );
  }

  const isOverBudget = totalPoints > cap;
  const overBy = totalPoints - cap;

  // Faction art header
  const factionArt = factionId ? getFactionArt(factionId) : '';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 pt-0 pb-24">
      {/* Faction header with art */}
      <div className="relative -mx-4 mb-6 overflow-hidden">
        {factionArt && (
          <>
            <img src={factionArt} alt="" className="w-full h-32 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg-primary)]/70 to-[var(--bg-primary)]" />
          </>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
          {/* Army name header */}
          {activeArmy && (
            <div className="flex items-center gap-2 mb-1">
              {editingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
                    className="flex-1 px-2 py-1 text-lg font-bold font-serif bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="text-[var(--accent-gold)] hover:opacity-70">
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="font-serif text-lg font-bold text-[var(--accent-gold)] tracking-wide">{activeArmy.name}</h2>
                  <button
                    onClick={() => { setEditingName(true); setNameInput(activeArmy.name); }}
                    className="text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
                    aria-label="Rename army"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Faction & mode */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                {factionMeta && <span>{factionMeta.icon}</span>}
                {factionMeta?.name ?? factionId}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                {mode === 'crusade' ? 'Crusade' : 'Matched Play'}
                {detachmentName ? ` \u2014 ${detachmentName}` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => setFaction(null)}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
              >
                Change Faction
              </button>
              <button
                onClick={() => setDetachment(null)}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
              >
                Change Detachment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detachment Rule Quick-Reference */}
      <DetachmentRuleCard factionId={factionId} detachmentName={detachmentName} />

      {/* Action buttons row */}
      {army.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/game-tracker')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg
                         text-sm font-medium text-[var(--accent-gold)] hover:border-[var(--accent-gold)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <Target className="w-4 h-4" />
              Track Game
            </button>
            <button
              onClick={() => navigate('/match-mode')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg
                         text-sm font-medium text-[var(--accent-gold)] hover:border-[var(--accent-gold)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <Users className="w-4 h-4" />
              Match Mode
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/weapon-compare')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg
                         text-sm font-medium text-[var(--accent-gold)] hover:border-[var(--accent-gold)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <Scale className="w-4 h-4" />
              Compare Weapons
            </button>
            <button
              onClick={() => navigate('/army-export')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg
                         text-sm font-medium text-[var(--accent-gold)] hover:border-[var(--accent-gold)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      )}

      {/* Army Composition Breakdown */}
      {army.length > 0 && (
        <div className="mb-4 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg overflow-hidden">
          <button
            onClick={() => setCompositionOpen(!compositionOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <span className="text-sm font-semibold text-[var(--text-primary)]">Army Composition</span>
            <ChevronDown
              className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${compositionOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {compositionOpen && (
            <div className="px-4 pb-4 border-t border-[var(--border-color)] pt-3 space-y-2">
              {[...roleBreakdown.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([role, pts]) => {
                  const pct = totalPoints > 0 ? Math.round((pts / totalPoints) * 100) : 0;
                  const color = ROLE_COLORS[role] ?? ROLE_COLORS['Other'];
                  const displayName = role === 'EPIC HERO' ? 'Epic Hero'
                    : role === 'DEDICATED TRANSPORT' ? 'Transport'
                    : role === 'FAST ATTACK' ? 'Fast Attack'
                    : role === 'HEAVY SUPPORT' ? 'Heavy Support'
                    : role === 'LORD OF WAR' ? 'Lord of War'
                    : role.charAt(0) + role.slice(1).toLowerCase();
                  return (
                    <div key={role}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-[var(--text-primary)]">{displayName}</span>
                        <span className="text-[var(--text-secondary)]">{pts}pts ({pct}%)</span>
                      </div>
                      <div className="w-full h-3 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Over budget banner */}
      {isOverBudget && army.length > 0 && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-red-400">
            Over budget by {overBy.toLocaleString()} pts
          </span>
        </div>
      )}

      {/* Unit list */}
      {army.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--text-secondary)] mb-4">No units yet — browse the Codex to add units</p>
          <button
            onClick={() => navigate(`/codex/${factionId as FactionId}`)}
            className="inline-flex items-center gap-1 text-[var(--accent-gold)] font-medium hover:underline"
          >
            Open Codex <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {army.map(unit => {
            const wouldFix = isOverBudget && (totalPoints - unit.points_cost) <= cap;
            return mode === 'crusade' ? (
              <CrusadeUnitCard key={unit.id} unit={unit} onRemove={() => removeUnit(unit.id)} wouldFixOver={wouldFix} />
            ) : (
              <StandardUnitCard key={unit.id} unit={unit} onRemove={() => removeUnit(unit.id)} wouldFixOver={wouldFix} datasheetLookup={datasheetLookup} />
            );
          })}
        </div>
      )}

      {/* Points footer */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2">
        <div className={`max-w-md mx-auto rounded-lg px-4 py-2 flex items-center justify-between shadow-lg ${isOverBudget ? 'bg-red-500/10 border border-red-500/30' : 'bg-[var(--bg-card)] border border-[var(--accent-gold)]/30'}`}>
          <span className={`text-sm ${isOverBudget ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>Total</span>
          <span className={`text-sm font-bold ${isOverBudget ? 'text-red-400' : pointsColor}`}>
            {totalPoints.toLocaleString()} / {cap.toLocaleString()} pts
          </span>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/add-unit')}
        className="fixed bottom-28 right-4 w-14 h-14 bg-[var(--accent-gold)] text-[var(--bg-primary)] rounded-full shadow-lg shadow-amber-900/30
                   flex items-center justify-center hover:bg-[var(--accent-gold-hover)] transition-colors
                   focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]"
        aria-label="Add unit"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
