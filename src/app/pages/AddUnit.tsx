import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Search, Plus, X, Users } from "lucide-react";
import { toast } from "sonner";
import { useCrusade } from "../../lib/CrusadeContext";
import { useCampaignGuard } from "../../lib/hooks/useCampaignGuard";
import { getFactionName, getDataFactionId } from "../../lib/factions";
import { getUnitsForFaction } from "../../data";
import { toTitleCase } from "../../lib/formatText";
import type { Datasheet } from "../../types";
import WeaponStatTable from "../components/WeaponStatTable";
import WargearOptionsPanel, { WargearAbilitiesPanel } from "../components/WargearOptionsPanel";

export default function AddUnit() {
  const { campaign, currentPlayer, ready } = useCampaignGuard();
  const navigate = useNavigate();
  const { addUnit } = useCrusade();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<Datasheet | null>(null);
  const [customName, setCustomName] = useState("");
  const [customPoints, setCustomPoints] = useState(0);
  const [selectedModelTier, setSelectedModelTier] = useState(0);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  if (!ready) return null;

  const factionId = currentPlayer.faction_id;
  const factionName = getFactionName(factionId);

  // Load real datasheets for this faction
  const allFactionUnits = useMemo(() => getUnitsForFaction(getDataFactionId(factionId)), [factionId]);

  // Filter units based on search (name + keywords)
  const filteredUnits = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allFactionUnits;
    return allFactionUnits.filter(
      (unit) =>
        unit.name.toLowerCase().includes(q) ||
        unit.keywords.some((kw) => kw.toLowerCase().includes(q))
    );
  }, [allFactionUnits, searchQuery]);

  const handleUnitSelect = (unit: Datasheet) => {
    setSelectedUnit(unit);
    setCustomName(unit.name);
    setSelectedModelTier(0);
    const baseCost = unit.points[0]?.cost ? parseInt(unit.points[0].cost, 10) : 0;
    setCustomPoints(baseCost);
    setSelectedEquipment([]);
  };

  const handleModelTierChange = (tierIndex: number) => {
    if (!selectedUnit) return;
    setSelectedModelTier(tierIndex);
    const cost = parseInt(selectedUnit.points[tierIndex]?.cost ?? '0', 10);
    setCustomPoints(cost);
  };

  /** Parse "5 models" → 5 from the points tier string */
  const parseModelCount = (modelsStr: string): number | undefined => {
    const match = modelsStr.match(/(\d+)\s*model/i);
    return match ? parseInt(match[1], 10) : undefined;
  };

  const handleEquipmentToggle = (option: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option]
    );
  };

  const handleSubmit = () => {
    if (!selectedUnit) {
      toast.error("Please select a unit");
      return;
    }

    if (!customName.trim()) {
      toast.error("Please enter a unit name");
      return;
    }

    const modelCount = parseModelCount(selectedUnit.points[selectedModelTier]?.models ?? '');
    addUnit(selectedUnit.name, customName, customPoints, selectedEquipment.join(", "), modelCount);

    toast.success(`${customName} added to roster!`, {
      duration: 3000,
    });

    navigate("/roster");
  };

  const handleCancel = () => {
    setSelectedUnit(null);
    setCustomName("");
    setCustomPoints(0);
    setSelectedEquipment([]);
  };

  // Wargear options from the selected datasheet
  const wargearOptions = selectedUnit?.wargear_options ?? [];

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden pb-24">
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back to Roster</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] mb-1">
            Add Unit
          </h1>
          <p className="text-stone-400 text-sm">{factionName}</p>
        </div>

        {!selectedUnit ? (
          <>
            {/* Search Bar */}
            <div className="mb-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search units or keywords..."
                  className="w-full bg-stone-900 border border-stone-600 rounded-lg pl-11 pr-4 py-3 text-stone-100 placeholder:text-stone-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            {/* Units List */}
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
              {filteredUnits.map((unit, idx) => {
                const baseCost = unit.points[0]?.cost ? parseInt(unit.points[0].cost, 10) : 0;
                // Show a few representative keywords (filter out faction-level/generic ones)
                const displayKeywords = unit.keywords.filter(
                  (k) => !["IMPERIUM", "CHAOS", "XENOS"].includes(k.toUpperCase())
                ).slice(0, 4);

                return (
                  <button
                    key={`${unit.name}-${idx}`}
                    onClick={() => handleUnitSelect(unit)}
                    className="w-full text-left relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 hover:border-emerald-500/50 transition-all group"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-stone-100 mb-1 group-hover:text-emerald-400 transition-colors">
                            {unit.name}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {displayKeywords.map((kw, kidx) => (
                              <span
                                key={kidx}
                                className="text-xs text-stone-500 bg-stone-950 px-2 py-0.5 rounded"
                              >
                                {toTitleCase(kw)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-emerald-500 font-mono">
                          {baseCost} pts
                        </div>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                  </button>
                );
              })}

              {filteredUnits.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-stone-400 text-sm">No units found</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Unit Configuration Form */}
            <div className="space-y-5">
              {/* Selected Unit Info */}
              <div className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 p-4">
                <div className="relative">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-base font-semibold text-stone-100 mb-1">
                        {selectedUnit.name}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedUnit.keywords
                          .filter((k) => !["IMPERIUM", "CHAOS", "XENOS"].includes(k.toUpperCase()))
                          .slice(0, 4)
                          .map((kw, idx) => (
                            <span
                              key={idx}
                              className="text-xs text-stone-500 bg-stone-950 px-2 py-0.5 rounded"
                            >
                              {toTitleCase(kw)}
                            </span>
                          ))}
                      </div>
                    </div>
                    <button
                      onClick={handleCancel}
                      className="text-stone-500 hover:text-stone-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Weapon Preview Section */}
              <WeaponStatTable weapons={selectedUnit.ranged_weapons} type="ranged" compact />
              <WeaponStatTable weapons={selectedUnit.melee_weapons} type="melee" compact />

              {/* Unit Composition */}
              {selectedUnit.unit_composition && (
                <div className="relative overflow-hidden rounded-sm border border-stone-700/40 bg-stone-900 p-3">
                  <div className="relative">
                    <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-stone-500" />
                      Unit Composition
                    </h4>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {selectedUnit.unit_composition}
                    </p>
                  </div>
                </div>
              )}

              {/* Model Count / Points Tier Selector */}
              {selectedUnit.points.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-2 tracking-wide flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-500/70" />
                    Unit Size
                  </label>
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(selectedUnit.points.length, 3)}, 1fr)` }}>
                    {selectedUnit.points.map((tier, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleModelTierChange(idx)}
                        className={`relative overflow-hidden rounded-sm border p-3 text-center transition-all ${
                          selectedModelTier === idx
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-stone-700/60 bg-stone-900 hover:border-emerald-500/50"
                        }`}
                      >
                        <div className="text-sm font-bold text-stone-100 font-mono mb-0.5">
                          {tier.models}
                        </div>
                        <div className={`text-xs font-mono ${selectedModelTier === idx ? "text-emerald-400" : "text-stone-500"}`}>
                          {tier.cost} pts
                        </div>
                        {selectedModelTier === idx && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Name */}
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-2 tracking-wide">
                  Custom Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter custom unit name"
                  className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-stone-100 placeholder:text-stone-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {/* Base Points */}
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-2 tracking-wide">
                  Base Points
                </label>
                <input
                  type="number"
                  value={customPoints}
                  onChange={(e) => setCustomPoints(Number(e.target.value))}
                  min="0"
                  className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-stone-100 placeholder:text-stone-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {/* Wargear Options (structured panel) */}
              {wargearOptions.length > 0 && (
                <WargearOptionsPanel
                  options={wargearOptions}
                  selectable
                  selectedOptions={selectedEquipment}
                  onToggleOption={handleEquipmentToggle}
                />
              )}

              {/* Wargear Abilities */}
              {selectedUnit.wargear_abilities.length > 0 && (
                <WargearAbilitiesPanel abilities={selectedUnit.wargear_abilities} />
              )}

              {/* Total Points Display */}
              <div className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 p-4">
                <div className="relative flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-300 uppercase tracking-wider">
                    Total Points
                  </span>
                  <span className="text-2xl font-bold text-amber-400 font-mono">
                    {customPoints}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2 py-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-6 py-3 rounded-lg border border-stone-700/60 bg-stone-900 text-stone-300 font-semibold hover:border-emerald-500/50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg transition-all duration-300 group-hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-700/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />

                  <div className="relative px-6 py-3 flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5 text-black" strokeWidth={2.5} />
                    <span className="text-base font-bold text-black tracking-wide">
                      Add to Roster
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.5);
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.3);
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.5);
        }
      `}</style>
    </div>
  );
}
