import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Plus, Shield, Zap, ScrollText } from "lucide-react";
import { getUnitsForFaction } from '../../data';
import { getFaction, getDataFactionId } from '../../lib/factions';
import { useArmy } from '../../lib/ArmyContext';
import { useCrusade } from '../../lib/CrusadeContext';
import { toTitleCase, FormattedRuleText } from '../../lib/formatText';
import type { FactionId, Datasheet } from '../../types';
import WeaponStatTable from '../components/WeaponStatTable';

export default function DatasheetView() {
  const { factionId, datasheetName } = useParams<{ factionId: string; datasheetName: string }>();
  const navigate = useNavigate();
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [showAddCrusadeSuccess, setShowAddCrusadeSuccess] = useState(false);
  const { addUnit, mode } = useArmy();
  const { campaign, addUnit: addCrusadeUnit } = useCrusade();

  const units = factionId ? getUnitsForFaction(getDataFactionId(factionId as FactionId)) : [];
  const datasheet: Datasheet | undefined = datasheetName
    ? units.find((u) => u.name === decodeURIComponent(datasheetName))
    : undefined;
  const factionMeta = factionId ? getFaction(factionId as FactionId) : undefined;

  if (!datasheet) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col p-6 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-6">
            <ArrowLeft className="w-5 h-5" /><span className="text-sm">Back</span>
          </button>
          <div className="text-center"><h1 className="text-xl font-bold text-[var(--text-secondary)] mb-2">Datasheet Not Found</h1></div>
        </div>
      </div>
    );
  }

  const handleAddToArmy = () => {
    if (!mode) { toast.error("Start building an army first"); return; }
    if (datasheet) {
      const pointsCost = datasheet.points.length > 0 ? parseInt(datasheet.points[0].cost, 10) || 0 : 0;
      const role = datasheet.keywords.length > 0 ? datasheet.keywords[0] : '';
      addUnit(datasheet.name, pointsCost, role);
      setShowAddSuccess(true);
      toast.success(`${datasheet.name} added to army (${pointsCost} pts)`);
      setTimeout(() => setShowAddSuccess(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col p-6 relative overflow-hidden pb-24">
      <div className="relative z-10 w-full max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" /><span className="text-sm">Back to Codex</span>
        </button>

        {/* Unit Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-wider mb-2">{datasheet.name}</h1>
          <p className="text-[var(--accent-gold)] text-sm mb-3">{datasheet.faction}</p>

          {/* Points Costs */}
          {datasheet.points.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {datasheet.points.map((tier, idx) => (
                <div key={idx} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
                  <span className="text-[var(--text-secondary)] text-xs">{tier.models} models:</span>
                  <span className="text-[var(--accent-gold)] text-sm font-bold ml-2 font-mono">{tier.cost} pts</span>
                </div>
              ))}
            </div>
          )}

          {/* Stats - gold header row */}
          {datasheet.stats && Object.keys(datasheet.stats).length > 0 && (
            <div className="rounded-lg border border-[var(--accent-gold)]/30 overflow-hidden mb-2">
              <div className="grid gap-px bg-[var(--accent-gold)]/20" style={{ gridTemplateColumns: `repeat(${Object.keys(datasheet.stats).length}, 1fr)` }}>
                {Object.entries(datasheet.stats).map(([stat, value]) => (
                  <div key={stat} className="bg-[var(--bg-card)]">
                    <div className="text-center px-2 py-1 bg-[var(--accent-gold)]/10 border-b border-[var(--accent-gold)]/20">
                      <div className="text-[10px] text-[var(--accent-gold)] font-semibold uppercase">{stat}</div>
                    </div>
                    <div className="text-center px-2 py-2">
                      <div className="text-lg font-bold text-[var(--text-primary)]">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invulnerable Save */}
          {datasheet.invuln && (
            <div className="flex items-center gap-2 mt-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-[var(--text-secondary)]">Invulnerable Save:</span>
              <span className="text-base font-bold text-blue-400">{datasheet.invuln}</span>
            </div>
          )}
        </div>

        {datasheet.ranged_weapons.length > 0 && <div className="mb-6"><WeaponStatTable weapons={datasheet.ranged_weapons} type="ranged" /></div>}
        {datasheet.melee_weapons.length > 0 && <div className="mb-6"><WeaponStatTable weapons={datasheet.melee_weapons} type="melee" /></div>}

        {/* Abilities */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />Abilities
          </h2>

          {datasheet.abilities.core.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Core</h3>
              <div className="flex flex-wrap gap-2">
                {datasheet.abilities.core.map((ability: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 rounded-full border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] text-xs font-semibold">{ability}</span>
                ))}
              </div>
            </div>
          )}

          {datasheet.abilities.faction.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Faction</h3>
              <div className="flex flex-wrap gap-2">
                {datasheet.abilities.faction.map((factionAbility: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--accent-gold)] text-xs font-semibold">{factionAbility}</span>
                ))}
              </div>
            </div>
          )}

          {datasheet.abilities.other.map((ability: [string, string], idx: number) => (
            <div key={idx} className="mb-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <h3 className="text-sm font-bold text-[var(--accent-gold)] mb-2">{ability[0]}</h3>
              <FormattedRuleText text={ability[1]} className="text-xs" />
            </div>
          ))}
        </div>

        {datasheet.unit_composition && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Unit Composition</h2>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <p className="text-sm text-[var(--text-tertiary)] whitespace-pre-line">{datasheet.unit_composition}</p>
            </div>
          </div>
        )}

        {datasheet.wargear_options.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Wargear Options</h2>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text-tertiary)]">
                {datasheet.wargear_options.map((opt: string, idx: number) => <li key={idx}>{opt}</li>)}
              </ul>
            </div>
          </div>
        )}

        {datasheet.wargear_abilities.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Wargear Abilities</h2>
            <div className="space-y-2">
              {datasheet.wargear_abilities.map((ability, idx: number) => {
                if (typeof ability === 'string') return <p key={idx} className="text-xs text-[var(--text-tertiary)]">{ability}</p>;
                return (
                  <div key={idx} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                    <h3 className="text-sm font-bold text-[var(--accent-gold)] mb-1">{ability[0]}</h3>
                    <p className="text-xs text-[var(--text-tertiary)]">{ability[1]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {datasheet.damaged && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Damaged Profile</h2>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <FormattedRuleText text={datasheet.damaged} className="text-sm text-amber-400" />
            </div>
          </div>
        )}

        {/* Keywords */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {datasheet.keywords.map((keyword: string, idx: number) => (
              <span key={idx} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-tertiary)] text-xs font-semibold">{toTitleCase(keyword)}</span>
            ))}
          </div>
          {datasheet.faction_keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {datasheet.faction_keywords.map((keyword: string, idx: number) => (
                <span key={idx} className="px-3 py-1.5 rounded-lg border border-[var(--accent-gold)]/20 bg-[var(--accent-gold)]/5 text-[var(--accent-gold)] text-xs font-semibold">{toTitleCase(keyword)}</span>
              ))}
            </div>
          )}
        </div>

        {datasheet.leader && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Leader</h2>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <FormattedRuleText text={datasheet.leader} className="text-sm text-purple-400" />
            </div>
          </div>
        )}
      </div>

      {/* Add buttons */}
      <div className="relative z-10 w-full max-w-2xl mx-auto mt-6 space-y-3">
        <button
          onClick={handleAddToArmy}
          disabled={showAddSuccess || !mode}
          className={`w-full py-4 rounded-lg font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            showAddSuccess
              ? "bg-[var(--accent-gold)] text-[var(--bg-primary)]"
              : "bg-gradient-to-r from-[var(--accent-gold)] to-[#d4a017] text-[var(--bg-primary)] hover:from-[#d4a017] hover:to-[#c9a84c]"
          }`}
        >
          {showAddSuccess ? (
            <span className="flex items-center justify-center gap-2">Added to Army</span>
          ) : (
            <span className="flex items-center justify-center gap-2"><Plus className="w-5 h-5" />Add to Army</span>
          )}
        </button>

        {campaign && (
          <button
            onClick={() => {
              if (!datasheet) return;
              const pointsCost = datasheet.points.length > 0 ? parseInt(datasheet.points[0].cost, 10) || 0 : 0;
              const isCharacter = datasheet.keywords.includes('CHARACTER');
              const isBattleline = datasheet.keywords.includes('BATTLELINE');
              addCrusadeUnit({
                datasheetName: datasheet.name,
                customName: datasheet.name,
                keywords: datasheet.keywords,
                isCharacter,
                isBattleline,
                pointsCost,
              });
              setShowAddCrusadeSuccess(true);
              toast.success(`${datasheet.name} added to Order of Battle`);
              setTimeout(() => setShowAddCrusadeSuccess(false), 2000);
            }}
            disabled={showAddCrusadeSuccess}
            className="w-full py-4 rounded-lg font-bold text-base border border-[var(--accent-gold)]/50 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/20 transition-all disabled:opacity-50"
          >
            <span className="flex items-center justify-center gap-2">
              <ScrollText className="w-5 h-5" />
              {showAddCrusadeSuccess ? 'Added to Order of Battle' : `Add to Order of Battle (${campaign.name})`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
