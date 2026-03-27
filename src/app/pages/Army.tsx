import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ChevronRight, Trash2, Pencil, Check, ChevronDown, Scale, Share2, AlertTriangle } from 'lucide-react';
import { useArmy, type ArmyUnit } from '../../lib/ArmyContext';
import { FACTIONS, getDataFactionId } from '../../lib/factions';
import { getRulesForFaction, getUnitsForFaction } from '../../data';
import { FormattedRuleText } from '../../lib/formatText';
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
  const [supplyValue, setSupplyValue] = useState(1000);

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
          value={supplyValue}
          onChange={e => setSupplyValue(Number(e.target.value) || 0)}
          className="w-32 mx-auto block px-4 py-2 bg-[#f5efe6] border border-[#d4c5a9] rounded-lg text-center
                     text-[#2c2416] focus:outline-none focus:ring-2 focus:ring-[#b8860b]"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onSelect(supplyValue || 1000);
            }
          }}
        />
        <button
          onClick={() => onSelect(supplyValue || 1000)}
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

function DetachmentPicker({ factionId, onSelect }: { factionId: string; onSelect: (name: string) => void }) {
  const detachments = useMemo(() => {
    const dataFactionId = getDataFactionId(factionId as FactionId);
    const parentRules = getRulesForFaction(dataFactionId);
    const parentDetachments = parentRules?.detachments ?? [];

    // If this is a chapter (e.g. space_wolves), also get chapter-specific detachments
    if (dataFactionId !== factionId) {
      const chapterRules = getRulesForFaction(factionId as FactionId);
      const chapterDetachments = chapterRules?.detachments ?? [];
      // Merge: chapter-specific first, then parent, deduped by name
      const seen = new Set(chapterDetachments.map(d => d.name));
      return [...chapterDetachments, ...parentDetachments.filter(d => !seen.has(d.name))];
    }

    return parentDetachments;
  }, [factionId]);

  if (detachments.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="font-serif text-xl font-bold text-[#b8860b]">No Detachments Available</h2>
        <p className="text-sm text-[#8b7355]">This faction has no detachment data. You can continue without one.</p>
        <button
          onClick={() => onSelect('')}
          className="px-6 py-2 bg-[#b8860b] text-[#faf6f0] font-semibold rounded-lg hover:bg-[#9a7209] transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-bold text-[#b8860b] text-center">Select Detachment</h2>
      <div className="grid grid-cols-1 gap-3">
        {detachments.map((det) => {
          const ruleText = det.rule?.text ?? '';
          const truncated = ruleText.length > 100 ? ruleText.slice(0, 100) + '...' : ruleText;
          return (
            <button
              key={det.name}
              onClick={() => onSelect(det.name)}
              className="text-left p-4 bg-[#f5efe6] border border-[#d4c5a9] rounded-lg
                         hover:border-[#b8860b] transition-colors
                         focus:outline-none focus:ring-2 focus:ring-[#b8860b]"
            >
              <h3 className="text-sm font-semibold text-[#2c2416] mb-1">{det.name}</h3>
              {det.rule?.name && (
                <p className="text-xs font-medium text-[#b8860b] mb-1">{det.rule.name}</p>
              )}
              {truncated && (
                <p className="text-xs text-[#8b7355] leading-relaxed">{truncated}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StandardUnitCard({ unit, onRemove, wouldFixOver }: { unit: ArmyUnit; onRemove: () => void; wouldFixOver?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-3 bg-[#f5efe6] border rounded-lg ${wouldFixOver ? 'border-amber-400' : 'border-[#d4c5a9]'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#2c2416] truncate">{unit.custom_name}</span>
          {unit.role && (
            <span className="text-xs px-2 py-0.5 bg-[#e8dfd3] text-[#5c4a32] rounded-full">{unit.role}</span>
          )}
          {wouldFixOver && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">over</span>
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

function CrusadeUnitCard({ unit, onRemove, wouldFixOver }: { unit: ArmyUnit; onRemove: () => void; wouldFixOver?: boolean }) {
  const xpForNextRank = unit.rank === 'Legendary' ? 100 :
    unit.rank === 'Heroic' ? 51 :
    unit.rank === 'Battle-hardened' ? 31 :
    unit.rank === 'Blooded' ? 16 : 5;
  const xpProgress = Math.min((unit.experience_points / xpForNextRank) * 100, 100);

  return (
    <div className={`p-4 bg-[#f5efe6] border rounded-lg space-y-2 ${wouldFixOver ? 'border-amber-400' : 'border-[#d4c5a9]'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[#2c2416] flex items-center gap-2">
            {unit.custom_name}
            {wouldFixOver && (
              <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">over</span>
            )}
          </div>
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
      <div className="mb-4 border border-[#b8860b]/30 bg-[#f5f0e8] rounded-lg px-4 py-3">
        <p className="text-sm text-[#8b7355]">
          No detachment selected.{' '}
          <button
            onClick={() => navigate('/army')}
            className="text-[#b8860b] font-medium underline hover:text-[#9a7209]"
          >
            Pick a detachment
          </button>
        </p>
      </div>
    );
  }

  if (!detachment?.rule) {
    return (
      <div className="mb-4 border border-[#b8860b]/30 bg-[#f5f0e8] rounded-lg px-4 py-3">
        <p className="text-sm font-semibold text-[#2c2416]">{detachmentName}</p>
        <p className="text-xs text-[#8b7355] mt-1">No rule data available for this detachment.</p>
      </div>
    );
  }

  return (
    <div className="mb-4 border border-[#b8860b]/30 bg-[#f5f0e8] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#efe9de] transition-colors"
      >
        <div>
          <span className="text-sm font-semibold text-[#2c2416]">{detachmentName}</span>
          {detachment.rule.name && (
            <span className="ml-2 text-xs text-[#b8860b] font-medium">{detachment.rule.name}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#8b7355] transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#b8860b]/20">
          <FormattedRuleText text={detachment.rule.text} className="mt-3 [&_h3]:text-[#b8860b] [&_h4]:text-[#b8860b] [&_p]:text-[#5c4a32] [&_li]:text-[#5c4a32] [&_.text-emerald-400]:text-[#b8860b] [&_.text-stone-300]:text-[#5c4a32]" />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Constants (static — no reason to be inside the component)
// ---------------------------------------------------------------------------

const ROLE_KEYWORDS = ['CHARACTER', 'EPIC HERO', 'BATTLELINE', 'DEDICATED TRANSPORT', 'FAST ATTACK', 'HEAVY SUPPORT', 'ELITES', 'LORD OF WAR', 'FORTIFICATION'] as const;
const ROLE_COLORS: Record<string, string> = {
  'CHARACTER': '#b8860b',
  'EPIC HERO': '#b8860b',
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
    mode, factionId, detachmentName, pointsCap, supplyLimit, army,
    savedArmies, activeArmyId,
    setFaction, setDetachment, setPointsCap, setSupplyLimit, removeUnit, renameArmy,
  } = useArmy();

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

  // Build datasheet lookup for keywords (must be before early returns to avoid hooks violation)
  const datasheetLookup = useMemo(() => {
    if (!factionId) return new Map<string, Datasheet>();
    const units = getUnitsForFaction(getDataFactionId(factionId as FactionId));
    const map = new Map<string, Datasheet>();
    for (const u of units) map.set(u.name, u);
    return map;
  }, [factionId]);

  // Compute role breakdown (must be before early returns to avoid hooks violation)
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

  // Step 2: Detachment selection
  if (!detachmentName && detachmentName !== '') {
    return (
      <div className="min-h-screen bg-[#faf6f0] px-4 pt-8 pb-24">
        <DetachmentPicker factionId={factionId} onSelect={(name) => setDetachment(name)} />
      </div>
    );
  }

  // Step 3: Points cap selection
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

  const isOverBudget = totalPoints > cap;
  const overBy = totalPoints - cap;

  // Step 4: Army builder
  return (
    <div className="min-h-screen bg-[#faf6f0] px-4 pt-6 pb-24">
      {/* Army name header */}
      {activeArmy && (
        <div className="flex items-center gap-2 mb-2">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
                className="flex-1 px-2 py-1 text-lg font-bold font-serif bg-[#faf6f0] border border-[#d4c5a9] rounded text-[#2c2416] focus:outline-none focus:border-[#b8860b]"
                autoFocus
              />
              <button onClick={handleSaveName} className="text-[#b8860b] hover:text-[#9a7209]">
                <Check className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-lg font-bold text-[#b8860b] tracking-wide">{activeArmy.name}</h2>
              <button
                onClick={() => { setEditingName(true); setNameInput(activeArmy.name); }}
                className="text-[#8b7355] hover:text-[#b8860b] transition-colors"
                aria-label="Rename army"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Faction & mode header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-xl font-bold text-[#2c2416] flex items-center gap-2">
            {factionMeta && <span>{factionMeta.icon}</span>}
            {factionMeta?.name ?? factionId}
          </h1>
          <p className="text-sm text-[#8b7355]">
            {mode === 'crusade' ? 'Crusade' : 'Matched Play'}
            {detachmentName ? ` \u2014 ${detachmentName}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => setFaction(null)}
            className="text-xs text-[#8b7355] hover:text-[#5c4a32] underline"
          >
            Change Faction
          </button>
          <button
            onClick={() => setDetachment(null)}
            className="text-xs text-[#8b7355] hover:text-[#5c4a32] underline"
          >
            Change Detachment
          </button>
        </div>
      </div>

      {/* Detachment Rule Quick-Reference */}
      <DetachmentRuleCard factionId={factionId} detachmentName={detachmentName} />

      {/* Action buttons row */}
      {army.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => navigate('/weapon-compare')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#f5efe6] border border-[#d4c5a9] rounded-lg
                       text-sm font-medium text-[#b8860b] hover:border-[#b8860b] hover:bg-[#e8dfd3] transition-colors"
          >
            <Scale className="w-4 h-4" />
            Compare Weapons
          </button>
          <button
            onClick={() => navigate('/army-export')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#f5efe6] border border-[#d4c5a9] rounded-lg
                       text-sm font-medium text-[#b8860b] hover:border-[#b8860b] hover:bg-[#e8dfd3] transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Export
          </button>
        </div>
      )}

      {/* Army Composition Breakdown */}
      {army.length > 0 && (
        <div className="mb-4 border border-[#d4c5a9] bg-[#f5efe6] rounded-lg overflow-hidden">
          <button
            onClick={() => setCompositionOpen(!compositionOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#efe9de] transition-colors"
          >
            <span className="text-sm font-semibold text-[#2c2416]">Army Composition</span>
            <ChevronDown
              className={`w-4 h-4 text-[#8b7355] transition-transform ${compositionOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {compositionOpen && (
            <div className="px-4 pb-4 border-t border-[#d4c5a9] pt-3 space-y-2">
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
                        <span className="font-medium text-[#2c2416]">{displayName}</span>
                        <span className="text-[#8b7355]">{pts}pts ({pct}%)</span>
                      </div>
                      <div className="w-full h-3 bg-[#e8dfd3] rounded-full overflow-hidden">
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
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-300 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-red-700">
            Over budget by {overBy.toLocaleString()} pts
          </span>
        </div>
      )}

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
          {army.map(unit => {
            // Show "over" indicator if removing this unit would bring total under cap
            const wouldFix = isOverBudget && (totalPoints - unit.points_cost) <= cap;
            return mode === 'crusade' ? (
              <CrusadeUnitCard key={unit.id} unit={unit} onRemove={() => removeUnit(unit.id)} wouldFixOver={wouldFix} />
            ) : (
              <StandardUnitCard key={unit.id} unit={unit} onRemove={() => removeUnit(unit.id)} wouldFixOver={wouldFix} />
            );
          })}
        </div>
      )}

      {/* Points footer */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2">
        <div className={`max-w-md mx-auto rounded-lg px-4 py-2 flex items-center justify-between shadow-sm ${isOverBudget ? 'bg-red-50 border border-red-300' : 'bg-[#f5efe6] border border-[#d4c5a9]'}`}>
          <span className={`text-sm ${isOverBudget ? 'text-red-600' : 'text-[#8b7355]'}`}>Total</span>
          <span className={`text-sm font-bold ${isOverBudget ? 'text-red-700' : pointsColor}`}>
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
