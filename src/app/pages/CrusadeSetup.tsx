import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ChevronRight, ChevronLeft, Shield, Swords, Skull, Search, X } from 'lucide-react';
import { useCrusade } from '../../lib/CrusadeContext';
import {
  CRUSADE_FACTIONS,
  SW_OATHSWORN_CAMPAIGNS,
  type CrusadeFaction,
} from '../../data/crusadeRules';
import { getRulesForFaction } from '../../data';
import type { FactionId } from '../../types';

// ============================================================
// Step types
// ============================================================

type Step = 'faction' | 'detachment' | 'supply' | 'saga' | 'confirm';

const STEPS_BASIC: Step[] = ['faction', 'detachment', 'supply', 'confirm'];
const STEPS_SW: Step[] = ['faction', 'detachment', 'supply', 'saga', 'confirm'];

// ============================================================
// Faction icon helper
// ============================================================

function FactionIcon({ factionId }: { factionId: string }) {
  if (factionId === 'space_wolves' || factionId === 'space_marines') {
    return <Shield className="w-5 h-5" />;
  }
  if (factionId === 'world_eaters' || factionId === 'chaos_space_marines' || factionId === 'death_guard') {
    return <Skull className="w-5 h-5" />;
  }
  return <Swords className="w-5 h-5" />;
}

// ============================================================
// Mechanic badge color
// ============================================================

function mechanicColor(factionId: string): string {
  switch (factionId) {
    case 'space_wolves':      return 'border-blue-400/40 bg-blue-400/10 text-blue-300';
    case 'space_marines':     return 'border-blue-600/40 bg-blue-600/10 text-blue-400';
    case 'chaos_space_marines': return 'border-purple-500/40 bg-purple-500/10 text-purple-300';
    case 'death_guard':       return 'border-green-700/40 bg-green-700/10 text-green-400';
    case 'world_eaters':      return 'border-red-500/40 bg-red-500/10 text-red-400';
    case 'astra_militarum':   return 'border-yellow-600/40 bg-yellow-600/10 text-yellow-400';
    default:                  return 'border-[var(--border-color)] text-[var(--text-secondary)]';
  }
}

// ============================================================
// Detachment Step — extracted to avoid hooks-in-IIFE violation
// ============================================================

function DetachmentStep({
  faction,
  selectedDetachment,
  onSelect,
}: {
  faction: CrusadeFaction;
  selectedDetachment: string;
  onSelect: (det: string) => void;
}) {
  const [detSearch, setDetSearch] = useState('');
  const rulesData = getRulesForFaction(faction.id as FactionId);
  const detachmentNames: string[] = rulesData?.detachments.map(d => d.name) ?? faction.detachments;
  const filtered = detSearch.length >= 1
    ? detachmentNames.filter(d => d.toLowerCase().includes(detSearch.toLowerCase()))
    : detachmentNames;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-wider">Detachment</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-4">{faction.name} — choose your detachment</p>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
        <input
          type="text"
          value={detSearch}
          onChange={e => setDetSearch(e.target.value)}
          placeholder="Search detachments…"
          className="w-full pl-9 pr-9 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)]"
        />
        {detSearch && (
          <button onClick={() => setDetSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {filtered.map(det => (
          <button
            key={det}
            onClick={() => onSelect(det)}
            className={`w-full flex items-center gap-3 p-4 rounded-sm border transition-colors text-left ${
              selectedDetachment === det
                ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                : 'border-[var(--border-color)] bg-[var(--bg-card)]'
            }`}
          >
            <div className="flex-1">
              <p className={`text-sm font-medium ${det.startsWith('⚠️') ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
                {det}
              </p>
            </div>
            {selectedDetachment === det && (
              <div className="w-4 h-4 rounded-full bg-[var(--accent-gold)] flex-shrink-0" />
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)] text-center py-4">No detachments match "{detSearch}"</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function CrusadeSetup() {
  const navigate = useNavigate();
  const { createCampaign } = useCrusade();

  const [step, setStep] = useState<Step>('faction');
  const [selectedFaction, setSelectedFaction] = useState<CrusadeFaction | null>(null);
  const [selectedDetachment, setSelectedDetachment] = useState<string>('');
  const [supplyLimit, setSupplyLimit] = useState<number>(1000);
  const [startingRP, setStartingRP] = useState<number>(5);
  const [campaignName, setCampaignName] = useState<string>('');
  const [oathswornCampaignId, setOathswornCampaignId] = useState<string>('');

  const steps = selectedFaction?.hasOathswornCampaigns ? STEPS_SW : STEPS_BASIC;
  const stepIndex = steps.indexOf(step);

  const canGoNext = (): boolean => {
    switch (step) {
      case 'faction':     return selectedFaction !== null;
      case 'detachment':  return selectedDetachment !== '';
      case 'supply':      return supplyLimit >= 500 && supplyLimit <= 3000;
      case 'saga':        return true; // optional
      case 'confirm':     return campaignName.trim().length > 0;
      default:            return false;
    }
  };

  const goNext = () => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < steps.length) setStep(steps[nextIdx]);
  };

  const goBack = () => {
    if (stepIndex === 0) { navigate(-1); return; }
    setStep(steps[stepIndex - 1]);
  };

  const handleCreate = () => {
    if (!selectedFaction) return;
    const id = createCampaign({
      name: campaignName.trim() || `${selectedFaction.name} Crusade`,
      factionId: selectedFaction.id,
      detachmentName: selectedDetachment,
      supplyLimit,
      startingRP,
      oathswornCampaignId: oathswornCampaignId || undefined,
    });
    navigate(`/crusade/${id}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 pt-6 pb-24">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-6">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= stepIndex ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border-color)]'
              }`}
            />
          ))}
        </div>

        {/* Step: Faction */}
        {step === 'faction' && (
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-wider">Choose Faction</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Select your Crusade faction</p>
            <div className="space-y-2">
              {CRUSADE_FACTIONS.map(f => (
                <button
                  key={f.id}
                  onClick={() => { setSelectedFaction(f); setSelectedDetachment(''); }}
                  className={`w-full flex items-center gap-3 p-4 rounded-sm border transition-colors ${
                    selectedFaction?.id === f.id
                      ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                      : 'border-[var(--border-color)] bg-[var(--bg-card)]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${mechanicColor(f.id)}`}>
                    <FactionIcon factionId={f.id} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{f.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{f.mechanicLabel}</p>
                  </div>
                  {selectedFaction?.id === f.id && (
                    <div className="w-4 h-4 rounded-full bg-[var(--accent-gold)]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Detachment */}
        {step === 'detachment' && selectedFaction && (
          <DetachmentStep
            faction={selectedFaction}
            selectedDetachment={selectedDetachment}
            onSelect={setSelectedDetachment}
          />
        )}

        {/* Step: Supply & RP */}
        {step === 'supply' && (
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-wider">Supply Limit</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Set your starting Supply Limit and Requisition Points</p>

            <div className="space-y-6">
              <div className="rounded-sm border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Supply Limit (pts)</label>
                <div className="flex items-center gap-3 mt-3">
                  {[500, 750, 1000, 1250, 1500, 2000].map(v => (
                    <button
                      key={v}
                      onClick={() => setSupplyLimit(v)}
                      className={`flex-1 py-2 text-xs rounded border transition-colors ${
                        supplyLimit === v
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-bold'
                          : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  Recommended starting limit: 1000 pts. Can be increased with Increase Supply Limit requisition (+200 per 1 RP).
                </p>
              </div>

              <div className="rounded-sm border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Starting Requisition Points</label>
                <div className="flex items-center gap-3 mt-3">
                  {[3, 4, 5].map(v => (
                    <button
                      key={v}
                      onClick={() => setStartingRP(v)}
                      className={`flex-1 py-2.5 text-sm rounded border transition-colors ${
                        startingRP === v
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-bold'
                          : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {v} RP
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  Standard start: 5 RP. You gain +1 RP per battle (max 10).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step: Oathsworn Campaign / Saga (SW + SM) */}
        {step === 'saga' && selectedFaction && (
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-wider">Oathsworn Campaign</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Choose your Saga — this gives bonus Agendas throughout the campaign. Optional.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setOathswornCampaignId('')}
                className={`w-full p-4 rounded-sm border transition-colors text-left ${
                  oathswornCampaignId === ''
                    ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                    : 'border-[var(--border-color)] bg-[var(--bg-card)]'
                }`}
              >
                <p className="text-sm font-medium text-[var(--text-primary)]">No Saga</p>
                <p className="text-xs text-[var(--text-secondary)]">Standard Crusade without an Oathsworn Campaign</p>
              </button>
              {SW_OATHSWORN_CAMPAIGNS.map(saga => (
                <button
                  key={saga.id}
                  onClick={() => setOathswornCampaignId(saga.id)}
                  className={`w-full p-4 rounded-sm border transition-colors text-left ${
                    oathswornCampaignId === saga.id
                      ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                      : 'border-[var(--border-color)] bg-[var(--bg-card)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{saga.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{saga.description}</p>
                      {!saga.verified && (
                        <p className="text-xs text-amber-400 mt-1">⚠️ Verify bonus agendas with codex</p>
                      )}
                    </div>
                    {oathswornCampaignId === saga.id && (
                      <div className="w-4 h-4 rounded-full bg-[var(--accent-gold)] flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && selectedFaction && (
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-wider">Name Your Force</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Give your warband a name before marching to war</p>

            <div className="rounded-sm border border-[var(--border-color)] bg-[var(--bg-card)] p-4 mb-6">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Warband Name</label>
              <input
                type="text"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder={`${selectedFaction.name} Crusade`}
                className="w-full mt-2 px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
                autoFocus
              />
            </div>

            {/* Summary */}
            <div className="rounded-sm border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-2">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Summary</h3>
              {[
                ['Faction', selectedFaction.name],
                ['Detachment', selectedDetachment],
                ['Supply Limit', `${supplyLimit} pts`],
                ['Starting RP', `${startingRP} RP`],
                ...(oathswornCampaignId
                  ? [['Saga', SW_OATHSWORN_CAMPAIGNS.find(s => s.id === oathswornCampaignId)?.name ?? '']]
                  : []),
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">{label}</span>
                  <span className="text-[var(--text-primary)] font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-8">
          {step !== 'faction' && (
            <button
              onClick={goBack}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-sm border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          {step !== 'confirm' ? (
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-sm border border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-semibold hover:bg-[var(--accent-gold)]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={campaignName.trim().length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-sm border border-[var(--accent-gold)] bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Begin Crusade
              <Swords className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
