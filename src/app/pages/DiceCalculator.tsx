import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Dices, ChevronDown, ExternalLink, Loader2 } from 'lucide-react';
import { calculateAttack, type AttackInput, type AttackResult } from '../../lib/dicemath';
import { queryWolfram, getConfiguredApis } from '../../lib/apiServices';
import { toast } from 'sonner';

type RerollOption = 'none' | 'ones' | 'all';

export default function DiceCalculator() {
  const navigate = useNavigate();

  // Form state
  const [attacks, setAttacks] = useState(10);
  const [skill, setSkill] = useState(3);
  const [strength, setStrength] = useState(4);
  const [toughness, setToughness] = useState(4);
  const [ap, setAp] = useState(1);
  const [save, setSave] = useState(3);
  const [invuln, setInvuln] = useState<number | ''>('');
  const [damage, setDamage] = useState(1);
  const [fnp, setFnp] = useState<number | ''>('');

  // Special rules
  const [rerollHits, setRerollHits] = useState<RerollOption>('none');
  const [rerollWounds, setRerollWounds] = useState<RerollOption>('none');
  const [lethalHits, setLethalHits] = useState(false);
  const [sustainedHits, setSustainedHits] = useState(false);
  const [sustainedHitsN, setSustainedHitsN] = useState(1);
  const [devWounds, setDevWounds] = useState(false);

  // Results
  const [result, setResult] = useState<AttackResult | null>(null);
  const [wolframLoading, setWolframLoading] = useState(false);
  const [wolframResult, setWolframResult] = useState<string | null>(null);

  const handleCalculate = () => {
    const input: AttackInput = {
      attacks,
      skill,
      strength,
      toughness,
      ap,
      save,
      invuln: invuln === '' ? undefined : invuln,
      damage,
      fnp: fnp === '' ? undefined : fnp,
      rerollHits: rerollHits === 'none' ? undefined : rerollHits,
      rerollWounds: rerollWounds === 'none' ? undefined : rerollWounds,
      lethalHits,
      sustainedHits: sustainedHits ? sustainedHitsN : undefined,
      devWounds,
    };
    setResult(calculateAttack(input));
    setWolframResult(null);
  };

  const handleWolfram = async () => {
    if (!getConfiguredApis().wolfram) {
      toast.error('Add a WolframAlpha API key in Settings first');
      return;
    }
    setWolframLoading(true);
    try {
      const query = `probability of hitting on ${skill}+ on d6, ${attacks} attacks, wounding on strength ${strength} vs toughness ${toughness}`;
      const answer = await queryWolfram(query);
      setWolframResult(answer ?? 'No result from WolframAlpha');
    } catch {
      toast.error('WolframAlpha query failed');
    } finally {
      setWolframLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 pt-6 pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-6"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6 tracking-wider flex items-center gap-3">
          <Dices className="w-6 h-6 text-[var(--accent-gold)]" />
          Dice Calculator
        </h1>

        {/* Form */}
        <div className="space-y-4">
          {/* Core Stats */}
          <section>
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Attack Profile</h2>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Attacks" value={attacks} onChange={setAttacks} min={1} max={100} />
              <NumberField label="BS/WS (e.g. 3 for 3+)" value={skill} onChange={setSkill} min={2} max={6} />
              <NumberField label="Strength" value={strength} onChange={setStrength} min={1} max={20} />
              <NumberField label="Toughness" value={toughness} onChange={setToughness} min={1} max={20} />
              <NumberField label="AP (positive, e.g. 2)" value={ap} onChange={setAp} min={0} max={6} />
              <NumberField label="Save (e.g. 3 for 3+)" value={save} onChange={setSave} min={2} max={7} />
              <NumberField label="Invuln (optional)" value={invuln} onChange={(v) => setInvuln(v === 0 ? '' : v)} min={0} max={6} placeholder="None" />
              <NumberField label="Damage per wound" value={damage} onChange={setDamage} min={1} max={20} />
              <NumberField label="FNP (optional, e.g. 5)" value={fnp} onChange={(v) => setFnp(v === 0 ? '' : v)} min={0} max={6} placeholder="None" />
            </div>
          </section>

          {/* Special Rules */}
          <section>
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Special Rules</h2>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-3">
              <SelectField label="Reroll Hits" value={rerollHits} onChange={(v) => setRerollHits(v as RerollOption)} options={[{ value: 'none', label: 'None' }, { value: 'ones', label: 'Reroll 1s' }, { value: 'all', label: 'Reroll All' }]} />
              <SelectField label="Reroll Wounds" value={rerollWounds} onChange={(v) => setRerollWounds(v as RerollOption)} options={[{ value: 'none', label: 'None' }, { value: 'ones', label: 'Reroll 1s' }, { value: 'all', label: 'Reroll All' }]} />

              <Checkbox label="Lethal Hits" checked={lethalHits} onChange={setLethalHits} />
              <div className="flex items-center gap-3">
                <Checkbox label="Sustained Hits" checked={sustainedHits} onChange={setSustainedHits} />
                {sustainedHits && (
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={sustainedHitsN}
                    onChange={e => setSustainedHitsN(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] text-center focus:outline-none focus:border-[var(--accent-gold)]"
                  />
                )}
              </div>
              <Checkbox label="Devastating Wounds" checked={devWounds} onChange={setDevWounds} />
            </div>
          </section>

          {/* Calculate button */}
          <button
            onClick={handleCalculate}
            className="w-full py-3 rounded-lg bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Dices className="w-4 h-4" />
            Calculate
          </button>

          {/* Results */}
          {result && (
            <section>
              <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Results</h2>
              <div className="rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--bg-card)] overflow-hidden">
                <div className="grid grid-cols-3 gap-px bg-[var(--border-color)]">
                  <ResultCell label="Hit %" value={`${result.hitProb}%`} />
                  <ResultCell label="Wound %" value={`${result.woundProb}%`} />
                  <ResultCell label="Fail Save %" value={`${result.saveProb}%`} />
                </div>
                <div className="border-t border-[var(--border-color)]">
                  <div className="grid grid-cols-2 gap-px bg-[var(--border-color)]">
                    <ResultCell label="Expected Hits" value={result.expectedHits.toString()} highlight />
                    <ResultCell label="Expected Wounds" value={result.expectedWounds.toString()} highlight />
                    <ResultCell label="Unsaved Wounds" value={result.expectedUnsaved.toString()} highlight />
                    <ResultCell label="Total Damage" value={result.expectedDamage.toString()} highlight />
                  </div>
                </div>
                <div className="border-t-2 border-[var(--accent-gold)]/30 p-4 text-center">
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Expected Models Killed</p>
                  <p className="text-3xl font-bold text-[var(--accent-gold)]">{result.expectedModelsKilled}</p>
                </div>
              </div>

              {/* WolframAlpha button */}
              <button
                onClick={handleWolfram}
                disabled={wolframLoading}
                className="w-full mt-3 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] text-sm font-medium hover:border-[var(--accent-gold)]/40 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {wolframLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Querying WolframAlpha...</>
                ) : (
                  <><ExternalLink className="w-4 h-4" /> Ask WolframAlpha</>
                )}
              </button>

              {wolframResult && (
                <div className="mt-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">WolframAlpha</p>
                  <p className="text-sm text-[var(--text-primary)]">{wolframResult}</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NumberField({ label, value, onChange, min, max, placeholder }: {
  label: string; value: number | ''; onChange: (v: number) => void; min: number; max: number; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || min)))}
        className="mt-1 w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)] text-center"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-1.5 pr-7 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-secondary)] pointer-events-none" />
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
          checked
            ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)]'
            : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
        }`}
      >
        {checked && <span className="text-[10px] text-[var(--bg-primary)] font-bold leading-none">&#10003;</span>}
      </div>
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
    </label>
  );
}

function ResultCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-[var(--bg-card)] p-3 text-center">
      <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-[var(--text-primary)]' : 'text-[var(--accent-gold)]'}`}>{value}</p>
    </div>
  );
}
