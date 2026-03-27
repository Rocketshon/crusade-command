import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Plus, Shield, Zap } from "lucide-react";
import { getUnitsForFaction } from '../../data';
import { getFaction, getDataFactionId } from '../../lib/factions';
import { useArmy } from '../../lib/ArmyContext';
import { toTitleCase, FormattedRuleText } from '../../lib/formatText';
import type { FactionId, Datasheet } from '../../types';
import WeaponStatTable from '../components/WeaponStatTable';

export default function DatasheetView() {
  const { factionId, datasheetName } = useParams<{ factionId: string; datasheetName: string }>();
  const navigate = useNavigate();
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const { addUnit, mode } = useArmy();

  // Look up real datasheet
  const units = factionId ? getUnitsForFaction(getDataFactionId(factionId as FactionId)) : [];
  const datasheet: Datasheet | undefined = datasheetName
    ? units.find((u) => u.name === decodeURIComponent(datasheetName))
    : undefined;
  const factionMeta = factionId ? getFaction(factionId as FactionId) : undefined;

  if (!datasheet) {
    return (
      <div className="min-h-screen bg-[#faf6f0] flex flex-col p-6 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#8b7355] hover:text-[#b8860b] transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>

          <div className="text-center">
            <h1 className="text-xl font-bold text-[#8b7355] mb-2">
              Datasheet Not Found
            </h1>
          </div>
        </div>
      </div>
    );
  }

  const handleAddToArmy = () => {
    if (!mode) {
      toast.error("Start building an army first");
      return;
    }
    if (datasheet) {
      const pointsCost = datasheet.points.length > 0 ? parseInt(datasheet.points[0].cost, 10) || 0 : 0;
      const role = datasheet.keywords.length > 0 ? datasheet.keywords[0] : '';
      addUnit(datasheet.name, pointsCost, role);
      setShowAddSuccess(true);
      toast.success(`${datasheet.name} added to army (${pointsCost} pts)`);
      setTimeout(() => {
        setShowAddSuccess(false);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf6f0] flex flex-col p-6 relative overflow-hidden pb-24">

      <div className="relative z-10 w-full max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#8b7355] hover:text-[#b8860b] transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back to Codex</span>
        </button>

        {/* Unit Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#2c2416] tracking-wider mb-2">
            {datasheet.name}
          </h1>
          <p className="text-[#b8860b] text-sm mb-3">{datasheet.faction}</p>

          {/* Points Costs */}
          {datasheet.points.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {datasheet.points.map((tier, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-sm border border-[#d4c5a9] bg-[#f5efe6]"
                >
                  <span className="text-[#8b7355] text-xs">{tier.models} models:</span>
                  <span className="text-[#b8860b] text-sm font-bold ml-2 font-mono">{tier.cost} pts</span>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          {datasheet.stats && Object.keys(datasheet.stats).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.entries(datasheet.stats).map(([stat, value]) => (
                <div
                  key={stat}
                  className="flex-1 min-w-[70px] px-3 py-2 rounded-sm border border-[#d4c5a9] bg-[#f5efe6]"
                >
                  <div className="text-xs text-[#8b7355] font-semibold">{stat}</div>
                  <div className="text-lg font-bold text-[#2c2416]">{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Invulnerable Save */}
          {datasheet.invuln && (
            <div className="flex items-center gap-2 mt-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-[#8b7355]">Invulnerable Save:</span>
              <span className="text-base font-bold text-blue-400">{datasheet.invuln}</span>
            </div>
          )}
        </div>

        {/* Ranged Weapons */}
        {datasheet.ranged_weapons.length > 0 && (
          <div className="mb-6">
            <WeaponStatTable weapons={datasheet.ranged_weapons} type="ranged" />
          </div>
        )}

        {/* Melee Weapons */}
        {datasheet.melee_weapons.length > 0 && (
          <div className="mb-6">
            <WeaponStatTable weapons={datasheet.melee_weapons} type="melee" />
          </div>
        )}

        {/* Abilities */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#2c2416] mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Abilities
          </h2>

          {/* Core Abilities */}
          {datasheet.abilities.core.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#8b7355] mb-2 uppercase tracking-wider">Core</h3>
              <div className="flex flex-wrap gap-2">
                {datasheet.abilities.core.map((ability: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full border border-[#d4c5a9] bg-[#f5efe6] text-amber-600 text-xs font-semibold"
                  >
                    {ability}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Faction Abilities */}
          {datasheet.abilities.faction.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#8b7355] mb-2 uppercase tracking-wider">Faction</h3>
              <div className="flex flex-wrap gap-2">
                {datasheet.abilities.faction.map((factionAbility: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full border border-[#d4c5a9] bg-[#f5efe6] text-[#b8860b] text-xs font-semibold"
                  >
                    {factionAbility}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Other (Datasheet) Abilities */}
          {datasheet.abilities.other.map((ability: [string, string], idx: number) => (
            <div
              key={idx}
              className="mb-3 rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-4"
            >
              <h3 className="text-sm font-bold text-[#b8860b] mb-2">{ability[0]}</h3>
              <FormattedRuleText text={ability[1]} className="text-xs" />
            </div>
          ))}
        </div>

        {/* Unit Composition */}
        {datasheet.unit_composition && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#2c2416] mb-3">Unit Composition</h2>
            <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-4">
              <p className="text-sm text-[#5c4a32] whitespace-pre-line">{datasheet.unit_composition}</p>
            </div>
          </div>
        )}

        {/* Wargear Options */}
        {datasheet.wargear_options.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#2c2416] mb-3">Wargear Options</h2>
            <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-4">
              <ul className="list-disc list-inside space-y-1 text-sm text-[#5c4a32]">
                {datasheet.wargear_options.map((opt: string, idx: number) => (
                  <li key={idx}>{opt}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Wargear Abilities */}
        {datasheet.wargear_abilities.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#2c2416] mb-3">Wargear Abilities</h2>
            <div className="space-y-2">
              {datasheet.wargear_abilities.map((ability, idx: number) => {
                if (typeof ability === 'string') return <p key={idx} className="text-xs text-[#5c4a32]">{ability}</p>;
                return (
                  <div key={idx} className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3">
                    <h3 className="text-sm font-bold text-[#b8860b] mb-1">{ability[0]}</h3>
                    <p className="text-xs text-[#5c4a32]">{ability[1]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Damaged */}
        {datasheet.damaged && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#2c2416] mb-3">Damaged Profile</h2>
            <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-4">
              <FormattedRuleText text={datasheet.damaged} className="text-sm text-amber-700" />
            </div>
          </div>
        )}

        {/* Keywords */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#2c2416] mb-3">Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {datasheet.keywords.map((keyword: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-sm border border-[#d4c5a9] bg-[#f5efe6] text-[#5c4a32] text-xs font-semibold"
              >
                {toTitleCase(keyword)}
              </span>
            ))}
          </div>
          {datasheet.faction_keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {datasheet.faction_keywords.map((keyword: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-sm border border-[#d4c5a9] bg-[#f5efe6] text-[#b8860b] text-xs font-semibold"
                >
                  {toTitleCase(keyword)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Leader Info */}
        {datasheet.leader && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#2c2416] mb-3">Leader</h2>
            <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-4">
              <FormattedRuleText text={datasheet.leader} className="text-sm text-purple-700" />
            </div>
          </div>
        )}
      </div>

      {/* Add to Army Button — flows with content, above footer */}
      <div className="relative z-10 w-full max-w-2xl mx-auto mt-6">
          <button
            onClick={handleAddToArmy}
            disabled={showAddSuccess || !mode}
            className={`w-full py-4 rounded-lg font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              showAddSuccess
                ? "bg-[#b8860b] text-white"
                : "bg-gradient-to-r from-[#b8860b] to-[#d4a017] text-white hover:from-[#d4a017] hover:to-[#b8860b]"
            }`}
          >
            {showAddSuccess ? (
              <span className="flex items-center justify-center gap-2">
                ✓ Added to Army
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                Add to Army
              </span>
            )}
          </button>
      </div>
    </div>
  );
}
