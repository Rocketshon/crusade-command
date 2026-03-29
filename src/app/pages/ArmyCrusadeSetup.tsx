import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ChevronRight, ChevronLeft, Shield, Swords, Skull, Search, X } from 'lucide-react';
import { useArmy } from '../../lib/ArmyContext';
import {
  CRUSADE_FACTIONS,
  SW_OATHSWORN_CAMPAIGNS,
  type CrusadeFaction,
} from '../../data/crusadeRules';
import { getRulesForFaction } from '../../data';
import type { FactionId } from '../../types';

type Step = 'faction' | 'detachment' | 'supply' | 'saga' | 'name';

function FactionIcon({ id }: { id: string }) {
  if (id === 'space_wolves' || id === 'space_marines') return <Shield className="w-5 h-5" />;
  if (['world_eaters', 'chaos_space_marines', 'death_guard'].includes(id)) return <Skull className="w-5 h-5" />;
  return <Swords className="w-5 h-5" />;
}

function mechanicColor(id: string) {
  const map: Record<string, string> = {
    space_wolves: 'border-blue-400/40 bg-blue-400/10 text-blue-300',
    space_marines: 'border-blue-600/40 bg-blue-600/10 text-blue-400',
    chaos_space_marines: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    death_guard: 'border-green-700/40 bg-green-700/10 text-green-400',
    world_eaters: 'border-red-500/40 bg-red-500/10 text-red-400',
    astra_militarum: 'border-yellow-600/40 bg-yellow-600/10 text-yellow-400',
  };
  return map[id] ?? 'border-[var(--border-color)] text-[var(--text-secondary)]';
}

function DetachmentStep({ faction, selected, onSelect }: {
  faction: CrusadeFaction;
  selected: string;
  onSelect: (d: string) => void;
}) {
  const [q, setQ] = useState('');
  const rulesData = getRulesForFaction(faction.id as FactionId);
  const names: string[] = rulesData?.detachments.map(d => d.name) ?? faction.detachments;
  const filtered = q ? names.filter(n => n.toLowerCase().includes(q.toLowerCase())) : names;
  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-wider">Detachment</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-4">{faction.name}</p>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
          className="w-full pl-9 pr-9 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)]" />
        {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"><X className="w-4 h-4" /></button>}
      </div>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {filtered.map(det => (
          <button key={det} onClick={() => onSelect(det)}
            className={`w-full flex items-center gap-3 p-4 rounded-sm border transition-colors text-left ${selected === det ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10' : 'border-[var(--border-color)] bg-[var(--bg-card)]'}`}>
            <div className="flex-1">
              <p className={`text-sm font-medium ${det.startsWith('⚠️') ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>{det}</p>
            </div>
            {selected === det && <div className="w-4 h-4 rounded-full bg-[var(--accent-gold)] flex-shrink-0" />}
          </button>
        ))}
        {filtered.length === 0 && <p className="text-sm text-[var(--text-secondary)] text-center py-4">No results for "{q}"</p>}
      </div>
    </div>
  );
}

export default function ArmyCrusadeSetup() {
  const navigate = useNavigate();
  const { initCrusadeCampaign, renameArmy, activeArmyId } = useArmy();

  const [step, setStep] = useState<Step>('faction');
  const [faction, setFaction] = useState<CrusadeFaction | null>(null);
  const [detachment, setDetachment] = useState('');
  const [supplyLimit, setSupplyLimitLocal] = useState(1000);
  const [startingRP, setStartingRP] = useState(5);
  const [oathswornId, setOathswornId] = useState('');
  const [armyName, setArmyName] = useState('');

  const steps: Step[] = faction?.hasOathswornCampaigns
    ? ['faction', 'detachment', 'supply', 'saga', 'name']
    : ['faction', 'detachment', 'supply', 'name'];
  const idx = steps.indexOf(step);

  const canNext = () => {
    if (step === 'faction') return faction !== null;
    if (step === 'detachment') return detachment !== '';
    if (step === 'supply') return supplyLimit >= 500;
    return true;
  };

  const goNext = () => {
    const ni = idx + 1;
    if (ni < steps.length) setStep(steps[ni]);
  };
  const goBack = () => {
    if (idx === 0) { navigate(-1); return; }
    setStep(steps[idx - 1]);
  };

  const handleFinish = () => {
    if (!faction) return;
    initCrusadeCampaign({
      factionId: faction.id,
      detachmentName: detachment,
      supplyLimit,
      startingRP,
      oathswornCampaignId: oathswornId || undefined,
      factionPointsLabel: faction.mechanic === 'honour_points' ? 'Honour Points'
        : faction.mechanic === 'skulls' ? 'Skull Points'
        : faction.mechanic === 'virulence' ? 'Virulence Points'
        : faction.mechanic === 'glory' ? 'Glory Points'
        : faction.mechanic === 'commendations' ? 'Commendations'
        : 'Points',
    });
    const name = armyName.trim() || `${faction.name} Crusade`;
    if (activeArmyId) renameArmy(activeArmyId, name);
    navigate('/army');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 pt-6 pb-24">
      <div className="max-w-md mx-auto">
        <button onClick={goBack} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" /><span className="text-sm">Back</span>
        </button>

        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {steps.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all ${i <= idx ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border-color)]'}`} />
          ))}
        </div>

        {/* Faction */}
        {step === 'faction' && (
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-wider">Choose Faction</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Select your Crusade faction</p>
            <div className="space-y-2">
              {CRUSADE_FACTIONS.map(f => (
                <button key={f.id} onClick={() => { setFaction(f); setDetachment(''); }}
                  className={`w-full flex items-center gap-3 p-4 rounded-sm border transition-colors ${faction?.id === f.id ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10' : 'border-[var(--border-color)] bg-[var(--bg-card)]'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${mechanicColor(f.id)}`}>
                    <FactionIcon id={f.id} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{f.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{f.mechanicLabel}</p>
                  </div>
                  {faction?.id === f.id && <div className="w-4 h-4 rounded-full bg-[var(--accent-gold)]" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Detachment */}
        {step === 'detachment' && faction && (
          <DetachmentStep faction={faction} selected={detachment} onSelect={setDetachment} />
        )}

        {/* Supply + RP */}
        {step === 'supply' && (
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-wider">Supply Limit</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Set your starting Supply Limit and Requisition Points</p>
            <div className="space-y-6">
              <div className="rounded-sm border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Supply Limit (pts)</label>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {[500, 750, 1000, 1250, 1500, 2000].map(v => (
                    <button key={v} onClick={() => setSupplyLimitLocal(v)}
                      className={`flex-1 min-w-[60px] py-2 text-xs rounded border transition-colors ${supplyLimit === v ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-bold' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
                      {v}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">Recommended: 1000 pts</p>
              </div>
              <div className="rounded-sm border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Starting Requisition Points</label>
                <div className="flex gap-3 mt-3">
                  {[3, 4, 5].map(v => (
                    <button key={v} onClick={() => setStartingRP(v)}
                      className={`flex-1 py-2.5 text-sm rounded border transition-colors ${startingRP === v ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-bold' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
                      {v} RP
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">Standard start: 5 RP. Max 10 RP.</p>
              </div>
            </div>
          </div>
        )}

        {/* Saga / Oathsworn */}
        {step === 'saga' && (
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-wider">Oathsworn Campaign</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Choose your Saga — optional bonus agendas throughout the campaign.</p>
            <div className="space-y-2">
              <button onClick={() => setOathswornId('')}
                className={`w-full p-4 rounded-sm border transition-colors text-left ${oathswornId === '' ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10' : 'border-[var(--border-color)] bg-[var(--bg-card)]'}`}>
                <p className="text-sm font-medium text-[var(--text-primary)]">No Saga</p>
                <p className="text-xs text-[var(--text-secondary)]">Standard Crusade</p>
              </button>
              {SW_OATHSWORN_CAMPAIGNS.map(saga => (
                <button key={saga.id} onClick={() => setOathswornId(saga.id)}
                  className={`w-full p-4 rounded-sm border transition-colors text-left ${oathswornId === saga.id ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10' : 'border-[var(--border-color)] bg-[var(--bg-card)]'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{saga.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{saga.description}</p>
                      {!saga.verified && <p className="text-xs text-amber-400 mt-1">⚠️ Verify with codex</p>}
                    </div>
                    {oathswornId === saga.id && <div className="w-4 h-4 rounded-full bg-[var(--accent-gold)] flex-shrink-0 mt-0.5" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Name */}
        {step === 'name' && faction && (
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-wider">Name Your Force</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Give your warband a name</p>
            <div className="rounded-sm border border-[var(--border-color)] bg-[var(--bg-card)] p-4 mb-6">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Warband Name</label>
              <input value={armyName} onChange={e => setArmyName(e.target.value)}
                placeholder={`${faction.name} Crusade`} autoFocus
                className="w-full mt-2 px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)]" />
            </div>
            <div className="rounded-sm border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-2">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Summary</h3>
              {[
                ['Faction', faction.name],
                ['Detachment', detachment],
                ['Supply Limit', `${supplyLimit} pts`],
                ['Starting RP', `${startingRP} RP`],
                ...(oathswornId ? [['Saga', SW_OATHSWORN_CAMPAIGNS.find(s => s.id === oathswornId)?.name ?? '']] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">{label}</span>
                  <span className="text-[var(--text-primary)] font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex gap-3 mt-8">
          {step !== 'faction' && (
            <button onClick={goBack} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-sm border border-[var(--border-color)] text-[var(--text-secondary)]">
              <ChevronLeft className="w-4 h-4" />Back
            </button>
          )}
          {step !== 'name' ? (
            <button onClick={goNext} disabled={!canNext()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-sm border border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-semibold disabled:opacity-40">
              Continue<ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleFinish}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-sm border border-[var(--accent-gold)] bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold">
              Begin Crusade<Swords className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
