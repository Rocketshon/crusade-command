import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Dices, Brain, Newspaper } from 'lucide-react';
import { useArmy } from '../../lib/ArmyContext';
import { getRulesForFaction, getUnitsForFaction } from '../../data';
import { getDataFactionId } from '../../lib/factions';
import type { FactionId, DetachmentStratagem, Datasheet } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GamePhase = 'command' | 'movement' | 'shooting' | 'charge' | 'fight';

interface CoreStratagem {
  name: string;
  cp: string;
  type: string;
  when: string;
  target: string;
  effect: string;
  phases: GamePhase[];
}

const PHASE_LIST: { key: GamePhase; label: string; color: string; activeColor: string }[] = [
  { key: 'command', label: 'Command', color: 'border-[var(--accent-gold)]/50 text-[var(--accent-gold)]', activeColor: 'bg-[var(--accent-gold)] text-[var(--bg-primary)] border-[var(--accent-gold)]' },
  { key: 'movement', label: 'Movement', color: 'border-blue-500/50 text-blue-400', activeColor: 'bg-blue-600 text-white border-blue-600' },
  { key: 'shooting', label: 'Shooting', color: 'border-red-500/50 text-red-400', activeColor: 'bg-red-600 text-white border-red-600' },
  { key: 'charge', label: 'Charge', color: 'border-orange-500/50 text-orange-400', activeColor: 'bg-orange-600 text-white border-orange-600' },
  { key: 'fight', label: 'Fight', color: 'border-purple-500/50 text-purple-400', activeColor: 'bg-purple-600 text-white border-purple-600' },
];

// Phase top border colors for stratagem cards
const PHASE_BORDER: Record<GamePhase, string> = {
  command: 'border-t-[var(--accent-gold)]',
  movement: 'border-t-blue-500',
  shooting: 'border-t-red-500',
  charge: 'border-t-orange-500',
  fight: 'border-t-purple-500',
};

// ---------------------------------------------------------------------------
// Core stratagems (10th edition universal stratagems)
// ---------------------------------------------------------------------------

const CORE_STRATAGEMS: CoreStratagem[] = [
  { name: 'Command Re-roll', cp: '1CP', type: 'Core Stratagem', when: 'Any phase, just after you have made a Hit roll, a Wound roll, a Damage roll, a saving throw, an Advance roll, a Charge roll, a Desperate Escape test, a Hazardous test, or just after you have rolled the dice to determine the number of attacks made with a weapon, for an attack, model or unit from your army.', target: 'N/A', effect: 'You re-roll that roll, test or saving throw.', phases: ['command', 'movement', 'shooting', 'charge', 'fight'] },
  { name: 'Counter-offensive', cp: '2CP', type: 'Core Stratagem', when: 'Fight phase, just after an enemy unit has fought.', target: 'One unit from your army that is within Engagement Range of one or more enemy units and that has not already been selected to fight this phase.', effect: 'Your unit fights next.', phases: ['fight'] },
  { name: 'Epic Challenge', cp: '1CP', type: 'Core Stratagem', when: 'Fight phase, when a CHARACTER unit from your army that is within Engagement Range of one or more Attached units is selected to fight.', target: 'One CHARACTER model in your unit.', effect: 'Until the end of the phase, all melee attacks made by that model have the [PRECISION] ability.', phases: ['fight'] },
  { name: 'Fire Overwatch', cp: '1CP', type: 'Core Stratagem', when: "Your opponent's Movement or Charge phase, just after an enemy unit is set up or when an enemy unit starts or ends a Normal, Advance, Fall Back or Charge move.", target: 'One unit from your army that is within 24" of that enemy unit and that would be eligible to shoot.', effect: 'Your unit can shoot that enemy unit as if it were your Shooting phase, but its models can only make Hit rolls on unmodified 6s.', phases: ['movement', 'charge'] },
  { name: 'Go to Ground', cp: '1CP', type: 'Core Stratagem', when: "Your opponent's Shooting phase, just after an enemy unit has selected its targets.", target: 'One INFANTRY unit from your army that was selected as the target of one or more of the attacking unit\'s attacks.', effect: 'Until the end of the phase, all models in your unit have a 6+ invulnerable save and have the Benefit of Cover.', phases: ['shooting'] },
  { name: 'Grenade', cp: '1CP', type: 'Core Stratagem', when: 'Your Shooting phase.', target: 'One GRENADES unit from your army that is not within Engagement Range of any enemy units and has not been selected to shoot this phase.', effect: 'Select one enemy unit that is not within Engagement Range of any units from your army and is within 8" of and visible to your GRENADES unit. Roll six D6: for each 4+, that enemy unit suffers 1 mortal wound.', phases: ['shooting'] },
  { name: 'Heroic Intervention', cp: '2CP', type: 'Core Stratagem', when: "Your opponent's Charge phase, just after an enemy unit ends a Charge move.", target: 'One unit from your army that is within 6" of that enemy unit and would be eligible to declare a charge in your turn.', effect: 'Your unit now declares a charge that targets only that enemy unit, and you resolve that charge as if it were your Charge phase.', phases: ['charge'] },
  { name: 'Insane Bravery', cp: '1CP', type: 'Core Stratagem', when: 'Any phase, just after you fail a Battle-shock test taken for a unit from your army.', target: 'The unit from your army that just failed that Battle-shock test.', effect: 'Your unit is treated as having passed that test instead, and is not Battle-shocked as a result.', phases: ['command', 'movement', 'shooting', 'charge', 'fight'] },
  { name: 'Rapid Ingress', cp: '1CP', type: 'Core Stratagem', when: "End of your opponent's Movement phase.", target: 'One unit from your army that is in Reserves.', effect: 'Your unit can be set up on the battlefield as described in the rules for the ability that placed it into Reserves.', phases: ['movement'] },
  { name: 'Smokescreen', cp: '1CP', type: 'Core Stratagem', when: "Your opponent's Shooting phase, just after an enemy unit has selected its targets.", target: 'One SMOKE unit from your army that was selected as the target of one or more of the attacking unit\'s attacks.', effect: 'Until the end of the phase, all models in your unit have the Benefit of Cover and the Stealth ability.', phases: ['shooting'] },
  { name: 'Tank Shock', cp: '1CP', type: 'Core Stratagem', when: 'Your Charge phase.', target: 'One VEHICLE unit from your army that has not declared a charge this phase.', effect: 'In this phase, after your unit ends a Charge move, select one enemy unit within Engagement Range of it, then roll a number of D6 equal to the Toughness characteristic of your VEHICLE model that is closest to that enemy unit. For each 5+, that enemy unit suffers 1 mortal wound.', phases: ['charge'] },
];

// ---------------------------------------------------------------------------
// Phase parsing helpers
// ---------------------------------------------------------------------------

function parseStratagemPhases(when: string): GamePhase[] {
  const text = when.toLowerCase();
  const phases: GamePhase[] = [];
  if (/any\s*phase/i.test(text)) return ['command', 'movement', 'shooting', 'charge', 'fight'];
  if (/command\s*phase/i.test(text)) phases.push('command');
  if (/movement\s*phase/i.test(text) || /advance/i.test(text) || /fall\s*back/i.test(text)) phases.push('movement');
  if (/shooting\s*phase/i.test(text) || /overwatch/i.test(text)) phases.push('shooting');
  if (/charge\s*phase/i.test(text)) phases.push('charge');
  if (/fight\s*phase/i.test(text) || /pile\s*in/i.test(text) || /consolidat/i.test(text)) phases.push('fight');
  return phases.length > 0 ? phases : ['command'];
}

function parseAbilityPhases(text: string): GamePhase[] {
  const lower = text.toLowerCase();
  const phases: GamePhase[] = [];
  if (/command\s*phase/i.test(lower)) phases.push('command');
  if (/movement\s*phase/i.test(lower) || /advance/i.test(lower) || /fall\s*back/i.test(lower)) phases.push('movement');
  if (/shooting\s*phase/i.test(lower) || /shoot/i.test(lower) || /ranged/i.test(lower)) phases.push('shooting');
  if (/charge\s*phase/i.test(lower) || /charge/i.test(lower)) phases.push('charge');
  if (/fight\s*phase/i.test(lower) || /melee/i.test(lower) || /pile\s*in/i.test(lower)) phases.push('fight');
  return phases;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StratagemCard({ strat, badge, phase }: {
  strat: { name: string; cp?: string; type?: string; when?: string; target?: string; effect?: string; restrictions?: string };
  badge?: string;
  phase: GamePhase;
}) {
  const [expanded, setExpanded] = useState(false);
  const borderClass = PHASE_BORDER[phase];

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={`w-full text-left p-4 bg-[var(--bg-card)] border-2 border-[var(--border-color)] border-t-4 ${borderClass} rounded-lg
                 hover:border-[var(--accent-gold)]/40 transition-all`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="text-sm font-bold text-[var(--text-primary)]">{strat.name}</h4>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[var(--border-color)]/40 text-[var(--text-secondary)] rounded font-semibold uppercase">
              {badge}
            </span>
          )}
          {strat.cp && (
            <span className="text-xs px-2 py-0.5 bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] font-bold rounded border border-[var(--accent-gold)]/30">
              {strat.cp}
            </span>
          )}
        </div>
      </div>
      {strat.type && (
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">{strat.type}</p>
      )}
      {expanded && (
        <div className="mt-2 space-y-1.5 text-xs text-[var(--text-tertiary)]">
          {strat.when && <div><span className="font-semibold text-[var(--text-secondary)]">When: </span>{strat.when}</div>}
          {strat.target && <div><span className="font-semibold text-[var(--text-secondary)]">Target: </span>{strat.target}</div>}
          {strat.effect && <div><span className="font-semibold text-[var(--text-secondary)]">Effect: </span>{strat.effect}</div>}
          {strat.restrictions && <div><span className="font-semibold text-[var(--text-secondary)]">Restrictions: </span>{strat.restrictions}</div>}
        </div>
      )}
      {!expanded && strat.effect && (
        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{strat.effect}</p>
      )}
    </button>
  );
}

function UnitAbilityRow({ unitName, abilityName, abilityText }: {
  unitName: string;
  abilityName: string;
  abilityText: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded
                 hover:border-[var(--accent-gold)]/40 transition-all"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--accent-gold)] shrink-0">{unitName}</span>
        <span className="text-xs text-[var(--text-primary)]">{abilityName}</span>
      </div>
      {expanded && (
        <p className="text-xs text-[var(--text-tertiary)] mt-1 leading-relaxed">{abilityText}</p>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PhaseNavigator() {
  const navigate = useNavigate();
  const { factionId, detachmentName, army } = useArmy();
  const [activePhase, setActivePhase] = useState<GamePhase>('command');

  const detachment = useMemo(() => {
    if (!factionId || !detachmentName) return null;
    const dataFactionId = getDataFactionId(factionId as FactionId);
    const factionRules = getRulesForFaction(dataFactionId);
    return factionRules?.detachments?.find(d => d.name === detachmentName) ?? null;
  }, [factionId, detachmentName]);

  const armyDatasheets = useMemo(() => {
    if (!factionId) return [];
    const dataFactionId = getDataFactionId(factionId as FactionId);
    const allUnits = getUnitsForFaction(dataFactionId);
    const datasheetMap = new Map<string, Datasheet>();
    for (const u of allUnits) datasheetMap.set(u.name, u);
    return army
      .map(unit => ({ armyUnit: unit, datasheet: datasheetMap.get(unit.datasheet_name) }))
      .filter((entry): entry is { armyUnit: typeof entry.armyUnit; datasheet: Datasheet } => !!entry.datasheet);
  }, [factionId, army]);

  const detachmentStratagems = useMemo(() => {
    if (!detachment) return [];
    return detachment.stratagems.filter((strat: DetachmentStratagem) => {
      const phases = parseStratagemPhases(strat.when);
      return phases.includes(activePhase);
    });
  }, [detachment, activePhase]);

  const coreStratagems = useMemo(() => CORE_STRATAGEMS.filter(s => s.phases.includes(activePhase)), [activePhase]);

  const unitAbilities = useMemo(() => {
    const results: { unitName: string; abilityName: string; abilityText: string }[] = [];
    for (const { armyUnit, datasheet } of armyDatasheets) {
      const unitName = armyUnit.custom_name || armyUnit.datasheet_name;
      for (const [abilName, abilText] of datasheet.abilities.other) {
        const phases = parseAbilityPhases(`${abilName} ${abilText}`);
        if (phases.includes(activePhase)) results.push({ unitName, abilityName: abilName, abilityText: abilText });
      }
    }
    return results;
  }, [armyDatasheets, activePhase]);

  if (!factionId) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center px-4">
        <p className="text-[var(--text-secondary)] mb-4">Set up your army first to use Battle Aid.</p>
        <button onClick={() => navigate('/army')} className="px-6 py-2 bg-[var(--accent-gold)] text-[var(--bg-primary)] rounded-lg hover:opacity-80 transition-opacity">Go to Army</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/army')} className="text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors" aria-label="Back to Army">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif text-xl font-bold text-[var(--text-primary)]">Battle Aid</h1>
            {detachmentName && <p className="text-xs text-[var(--text-secondary)]">{detachmentName}</p>}
          </div>
        </div>

        {/* Phase tabs - color coded */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {PHASE_LIST.map(phase => (
            <button
              key={phase.key}
              onClick={() => setActivePhase(phase.key)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-all shrink-0 ${
                activePhase === phase.key ? phase.activeColor : `bg-[var(--bg-card)] ${phase.color}`
              }`}
            >
              {phase.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 space-y-6 mt-4">
        {detachmentStratagems.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-[var(--accent-gold)] uppercase tracking-wider mb-2">Your Stratagems</h3>
            <div className="space-y-2">
              {detachmentStratagems.map((strat, idx) => <StratagemCard key={`det-${idx}`} strat={strat} phase={activePhase} />)}
            </div>
          </section>
        )}

        {coreStratagems.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Core Stratagems</h3>
            <div className="space-y-2">
              {coreStratagems.map((strat, idx) => <StratagemCard key={`core-${idx}`} strat={strat} badge="Core" phase={activePhase} />)}
            </div>
          </section>
        )}

        {unitAbilities.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Your Units' Abilities</h3>
            <div className="space-y-1.5">
              {unitAbilities.map((ability, idx) => <UnitAbilityRow key={`ability-${idx}`} unitName={ability.unitName} abilityName={ability.abilityName} abilityText={ability.abilityText} />)}
            </div>
          </section>
        )}

        {detachmentStratagems.length === 0 && coreStratagems.length === 0 && unitAbilities.length === 0 && (
          <div className="text-center py-12"><p className="text-[var(--text-secondary)] text-sm">No content for this phase.</p></div>
        )}

        {/* Tools navigation */}
        <section>
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Tools</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => navigate('/dice-calculator')}
              className="flex flex-col items-center gap-2 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:border-[var(--accent-gold)]/40 transition-all"
            >
              <Dices className="w-6 h-6 text-[var(--accent-gold)]" />
              <span className="text-xs font-medium text-[var(--text-primary)]">Dice Calc</span>
            </button>
            <button
              onClick={() => navigate('/lore-quiz')}
              className="flex flex-col items-center gap-2 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:border-[var(--accent-gold)]/40 transition-all"
            >
              <Brain className="w-6 h-6 text-[var(--accent-gold)]" />
              <span className="text-xs font-medium text-[var(--text-primary)]">Lore Quiz</span>
            </button>
            <button
              onClick={() => navigate('/news')}
              className="flex flex-col items-center gap-2 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:border-[var(--accent-gold)]/40 transition-all"
            >
              <Newspaper className="w-6 h-6 text-[var(--accent-gold)]" />
              <span className="text-xs font-medium text-[var(--text-primary)]">40K News</span>
            </button>
          </div>
        </section>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
