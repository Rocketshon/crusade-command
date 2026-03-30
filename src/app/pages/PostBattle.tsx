import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Trophy, Skull, Minus, Plus, Check, Zap, Dices, ExternalLink, Loader2,
} from 'lucide-react';
import { useArmy, type ArmyUnit } from '../../lib/ArmyContext';
import { OFFICIAL_BATTLE_SCARS } from '../../data/crusadeRules';
import { bggSearchGame, bggGameUrl } from '../../lib/apiServices';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BattleResult = 'win' | 'loss' | 'draw';

interface UnitResult {
  unitId: string;
  survived: boolean;
  kills: number;
  xpGained: number;
  markedForGreatness: boolean;
}

// ---------------------------------------------------------------------------
// Unit row
// ---------------------------------------------------------------------------

function UnitResultRow({
  unit,
  result,
  isMFG,
  onToggleMFG,
  onChange,
}: {
  unit: ArmyUnit;
  result: UnitResult;
  isMFG: boolean;
  onToggleMFG: () => void;
  onChange: (updates: Partial<UnitResult>) => void;
}) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {unit.custom_name || unit.datasheet_name}
          </p>
          {unit.custom_name && (
            <p className="text-[10px] text-[var(--text-secondary)]">{unit.datasheet_name}</p>
          )}
        </div>
        {/* MFG star — blocked for Disgraced / Mark of Shame */}
        {(() => {
          const blockedScars = ['Disgraced', 'Mark of Shame'];
          const blocked = unit.battle_scars.some(s => blockedScars.includes(s.name));
          return (
            <button
              onClick={blocked ? undefined : onToggleMFG}
              title={blocked ? 'Cannot be Marked for Greatness (Disgraced or Mark of Shame)' : 'Marked for Greatness (+3 XP)'}
              disabled={blocked}
              className={`flex-shrink-0 w-7 h-7 rounded border flex items-center justify-center transition-colors ${
                blocked
                  ? 'border-[var(--border-color)] text-[var(--border-color)] opacity-30 cursor-not-allowed'
                  : isMFG
                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]'
                  : 'border-[var(--border-color)] text-[var(--text-secondary)]'
              }`}
            >
              ★
            </button>
          );
        })()}
      </div>

      <div className="flex items-center gap-3">
        {/* Survived toggle */}
        <button
          onClick={() => onChange({ survived: !result.survived })}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-medium transition-colors ${
            result.survived
              ? 'border-green-500/40 bg-green-500/10 text-green-400'
              : 'border-red-500/40 bg-red-500/10 text-red-400'
          }`}
        >
          {result.survived ? <Check className="w-3 h-3" /> : <Skull className="w-3 h-3" />}
          {result.survived ? 'Survived' : 'Destroyed'}
        </button>

        {/* Kills */}
        <div className="flex items-center gap-1.5 ml-auto">
          <Skull className="w-3 h-3 text-[var(--text-secondary)]" />
          <button
            onClick={() => onChange({ kills: Math.max(0, result.kills - 1) })}
            className="w-6 h-6 rounded border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center justify-center text-sm font-bold"
          >−</button>
          <span className="w-5 text-center text-sm font-bold text-[var(--text-primary)]">{result.kills}</span>
          <button
            onClick={() => onChange({ kills: result.kills + 1 })}
            className="w-6 h-6 rounded border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center justify-center text-sm font-bold"
          >+</button>
        </div>

        {/* XP */}
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-[var(--accent-gold)]" />
          <button
            onClick={() => onChange({ xpGained: Math.max(0, result.xpGained - 1) })}
            className="w-6 h-6 rounded border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center justify-center text-sm font-bold"
          >−</button>
          <span className="w-5 text-center text-sm font-bold text-[var(--accent-gold)]">{result.xpGained}</span>
          <button
            onClick={() => onChange({ xpGained: result.xpGained + 1 })}
            className="w-6 h-6 rounded border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center justify-center text-sm font-bold"
          >+</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Out of Action test section
// ---------------------------------------------------------------------------

type OATOutcome = 'pass' | 'devastating_blow' | 'battle_scar' | null;

interface OATState {
  unitId: string;
  roll: number | null; // d6 result
  outcome: OATOutcome;
  selectedScar: string | null; // id from OFFICIAL_BATTLE_SCARS
}

function OutOfActionSection({
  destroyedUnits,
  oatStates,
  onRoll,
  onChooseOutcome,
  onChooseScar,
}: {
  destroyedUnits: ArmyUnit[];
  oatStates: OATState[];
  onRoll: (unitId: string) => void;
  onChooseOutcome: (unitId: string, outcome: 'devastating_blow' | 'battle_scar') => void;
  onChooseScar: (unitId: string, scarId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Dices className="w-4 h-4 text-red-400" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Out of Action Tests</p>
      </div>
      <p className="text-xs text-[var(--text-secondary)]">Roll D6 for each destroyed unit. On a 1: choose Devastating Blow or Battle Scar. On 2+: no effect.</p>
      {destroyedUnits.map(unit => {
        const state = oatStates.find(s => s.unitId === unit.id);
        if (!state) return null;
        return (
          <div key={unit.id} className="bg-[var(--bg-card)] border border-red-500/30 rounded-lg p-3">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">{unit.custom_name || unit.datasheet_name}</p>
            {state.roll === null ? (
              <button onClick={() => onRoll(unit.id)}
                className="w-full py-2 text-xs rounded border border-red-500/40 bg-red-500/10 text-red-400 font-semibold flex items-center justify-center gap-1.5">
                <Dices className="w-3.5 h-3.5" /> Roll D6
              </button>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded border-2 flex items-center justify-center font-bold text-sm ${state.roll === 1 ? 'border-red-500 text-red-400 bg-red-500/10' : 'border-green-500 text-green-400 bg-green-500/10'}`}>
                    {state.roll}
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">{state.roll === 1 ? 'Failed — choose consequence' : 'Passed — no effect'}</span>
                </div>
                {state.roll === 1 && state.outcome === null && (() => {
                  const mustDevBlow = unit.battle_scars.length >= 3;
                  return mustDevBlow ? (
                    <div>
                      <p className="text-[10px] text-amber-400 mb-1.5">Unit already has 3 scars — must take Devastating Blow.</p>
                      <button onClick={() => onChooseOutcome(unit.id, 'devastating_blow')}
                        className="w-full py-2 text-xs rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 font-semibold">
                        Devastating Blow — Lose a Battle Honour
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => onChooseOutcome(unit.id, 'devastating_blow')}
                        className="flex-1 py-2 text-xs rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 font-semibold">
                        Devastating Blow<br/><span className="font-normal">Lose a Battle Honour</span>
                      </button>
                      <button onClick={() => onChooseOutcome(unit.id, 'battle_scar')}
                        className="flex-1 py-2 text-xs rounded border border-red-500/40 bg-red-500/10 text-red-400 font-semibold">
                        Battle Scar<br/><span className="font-normal">Gain a Battle Scar</span>
                      </button>
                    </div>
                  );
                })()}
                {state.roll === 1 && state.outcome === 'battle_scar' && state.selectedScar === null && (
                  <div className="space-y-1.5 mt-1">
                    <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Choose Battle Scar</p>
                    {OFFICIAL_BATTLE_SCARS.filter(s => !unit.battle_scars.some(us => us.name === s.name)).map(scar => (
                      <button key={scar.id} onClick={() => onChooseScar(unit.id, scar.id)}
                        className="w-full text-left px-3 py-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-red-500/40 transition-colors">
                        <p className="text-xs font-semibold text-red-300">{scar.name}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">{scar.effect}</p>
                      </button>
                    ))}
                  </div>
                )}
                {state.roll === 1 && state.outcome !== null && (state.outcome !== 'battle_scar' || state.selectedScar !== null) && (
                  <div className="flex items-center gap-1.5 text-xs text-green-400">
                    <Check className="w-3 h-3" />
                    {state.outcome === 'devastating_blow' ? 'Devastating Blow noted' : `Battle Scar: ${OFFICIAL_BATTLE_SCARS.find(s => s.id === state.selectedScar)?.name ?? 'Unknown'}`}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PostBattle() {
  const navigate = useNavigate();
  const { army, crusade, recordBattle, addBattleScar, removeBattleHonour } = useArmy();

  const [battleResult, setBattleResult] = useState<BattleResult>('win');
  const [opponent, setOpponent] = useState('');
  const [missionName, setMissionName] = useState('');
  const [rpGained, setRpGained] = useState(1);
  const [mfgUnitId, setMfgUnitId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'battle' | 'oat'>('battle');
  const [oatStates, setOatStates] = useState<OATState[]>([]);
  const [bggLoading, setBggLoading] = useState(false);

  // Only living (non-destroyed) units can be in the post-battle flow
  const activeUnits = army.filter(u => !u.is_destroyed);

  const [unitResults, setUnitResults] = useState<UnitResult[]>(() =>
    activeUnits.map(u => ({
      unitId: u.id,
      survived: true,
      kills: 0,
      xpGained: 1,
      markedForGreatness: false,
    }))
  );

  if (!crusade) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-4">No active Crusade campaign.</p>
          <button onClick={() => navigate('/army')} className="text-[var(--accent-gold)] text-sm">
            ← Back to Army
          </button>
        </div>
      </div>
    );
  }

  const updateUnitResult = (unitId: string, updates: Partial<UnitResult>) => {
    setUnitResults(prev => prev.map(r => r.unitId === unitId ? { ...r, ...updates } : r));
  };

  // Destroyed units = those that survived:false in results
  const destroyedUnits = activeUnits.filter(u => {
    const r = unitResults.find(rr => rr.unitId === u.id);
    return r && !r.survived;
  });

  const handleSave = () => {
    recordBattle({
      result: battleResult,
      opponent: opponent.trim() || undefined,
      missionName: missionName.trim() || undefined,
      rpGained,
      unitResults: unitResults.map(r => ({
        ...r,
        markedForGreatness: r.unitId === mfgUnitId,
      })),
    });
    toast.success('Battle recorded!');
    if (destroyedUnits.length > 0) {
      // Proceed to Out of Action tests
      setOatStates(destroyedUnits.map(u => ({ unitId: u.id, roll: null, outcome: null, selectedScar: null })));
      setPhase('oat');
    } else {
      navigate('/army');
    }
  };

  const handleOATRoll = (unitId: string) => {
    const roll = Math.ceil(Math.random() * 6);
    setOatStates(prev => prev.map(s => s.unitId === unitId ? { ...s, roll, outcome: roll === 1 ? null : 'pass' } : s));
  };

  const handleOATOutcome = (unitId: string, outcome: 'devastating_blow' | 'battle_scar') => {
    if (outcome === 'devastating_blow') {
      // Remove the last battle honour if any
      const unit = army.find(u => u.id === unitId);
      if (unit && unit.battle_honours.length > 0) {
        removeBattleHonour(unitId, unit.battle_honours[unit.battle_honours.length - 1].id);
      }
    }
    setOatStates(prev => prev.map(s => s.unitId === unitId ? { ...s, outcome } : s));
  };

  const handleOATScar = (unitId: string, scarId: string) => {
    const scar = OFFICIAL_BATTLE_SCARS.find(s => s.id === scarId);
    if (scar) addBattleScar(unitId, { name: scar.name, effect: scar.effect });
    setOatStates(prev => prev.map(s => s.unitId === unitId ? { ...s, selectedScar: scarId } : s));
  };

  const allOATResolved = oatStates.every(s =>
    s.roll !== null && (s.outcome === 'pass' || s.outcome === 'devastating_blow' || (s.outcome === 'battle_scar' && s.selectedScar !== null))
  );

  const handleBGGLog = async () => {
    setBggLoading(true);
    try {
      const game = await bggSearchGame('warhammer 40000');
      if (game) {
        window.open(bggGameUrl(game.id), '_blank');
      } else {
        toast.error('Could not find game on BoardGameGeek');
      }
    } catch {
      toast.error('BoardGameGeek search failed');
    } finally {
      setBggLoading(false);
    }
  };

  // OAT phase
  if (phase === 'oat') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] pb-10">
        <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-[var(--border-color)]">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Out of Action</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{destroyedUnits.length} unit{destroyedUnits.length !== 1 ? 's' : ''} destroyed</p>
        </div>
        <div className="px-4 pt-4 space-y-4">
          <OutOfActionSection
            destroyedUnits={destroyedUnits}
            oatStates={oatStates}
            onRoll={handleOATRoll}
            onChooseOutcome={handleOATOutcome}
            onChooseScar={handleOATScar}
          />
          <button
            onClick={() => navigate('/army')}
            disabled={!allOATResolved}
            className="w-full py-3 rounded-lg border border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
            Done
          </button>
          {/* BGG Log button */}
          <button
            onClick={handleBGGLog}
            disabled={bggLoading}
            className="w-full py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] text-sm font-medium hover:border-[var(--accent-gold)]/40 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {bggLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Searching BGG...</>
            ) : (
              <><ExternalLink className="w-4 h-4" /> Log to BoardGameGeek</>
            )}
          </button>
          <button onClick={() => navigate('/army')} className="w-full py-2 text-xs text-[var(--text-secondary)]">
            Skip OAT Tests
          </button>
        </div>
      </div>
    );
  }

  const resultOptions: { value: BattleResult; label: string; icon: ReactNode; style: string }[] = [
    { value: 'win',  label: 'Victory', icon: <Trophy className="w-5 h-5" />, style: 'border-green-500/50 bg-green-500/10 text-green-400' },
    { value: 'draw', label: 'Draw',    icon: <Minus className="w-5 h-5" />,  style: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' },
    { value: 'loss', label: 'Defeat',  icon: <Skull className="w-5 h-5" />,  style: 'border-red-500/50 bg-red-500/10 text-red-400' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-10">
      {/* Header */}
      <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/army')} className="text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Record Battle</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Battle result */}
        <div>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">Result</p>
          <div className="grid grid-cols-3 gap-2">
            {resultOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setBattleResult(opt.value)}
                className={`flex flex-col items-center gap-1 py-3 rounded-lg border transition-colors ${
                  battleResult === opt.value ? opt.style : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                }`}
              >
                {opt.icon}
                <span className="text-xs font-semibold">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Opponent + Mission */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Opponent (optional)</label>
            <input
              type="text"
              value={opponent}
              onChange={e => setOpponent(e.target.value)}
              placeholder="Who did you fight?"
              className="mt-1 w-full px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Mission (optional)</label>
            <input
              type="text"
              value={missionName}
              onChange={e => setMissionName(e.target.value)}
              placeholder="Mission name"
              className="mt-1 w-full px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)]"
            />
          </div>
        </div>

        {/* RP Gained */}
        <div>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">Requisition Points Gained</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRpGained(v => Math.max(0, v - 1))}
              className="w-8 h-8 rounded border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center justify-center text-lg font-bold"
            >−</button>
            <span className="text-lg font-bold text-[var(--accent-gold)] w-6 text-center">{rpGained}</span>
            <button
              onClick={() => setRpGained(v => Math.min(10, v + 1))}
              className="w-8 h-8 rounded border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center justify-center text-lg font-bold"
            >+</button>
            <span className="text-xs text-[var(--text-secondary)]">RP</span>
          </div>
        </div>

        {/* Unit results */}
        {activeUnits.length > 0 && (
          <div>
            <div className="flex items-end justify-between mb-2">
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Units</p>
              <p className="text-[10px] text-[var(--text-secondary)]">★ = Marked for Greatness (+3 XP)</p>
            </div>
            <div className="space-y-2">
              {activeUnits.map(unit => {
                const result = unitResults.find(r => r.unitId === unit.id);
                if (!result) return null;
                return (
                  <UnitResultRow
                    key={unit.id}
                    unit={unit}
                    result={result}
                    isMFG={mfgUnitId === unit.id}
                    onToggleMFG={() => setMfgUnitId(prev => prev === unit.id ? null : unit.id)}
                    onChange={updates => updateUnitResult(unit.id, updates)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-lg border border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Save Battle Record
        </button>

      </div>
    </div>
  );
}
