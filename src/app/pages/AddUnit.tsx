import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Search, Plus, X, Users } from "lucide-react";
import { toast } from "sonner";
// TODO: wire to ArmyContext
// import { useArmy } from "../../lib/ArmyContext";
import { getFactionName, getDataFactionId } from "../../lib/factions";
import { getUnitsForFaction } from "../../data";
import { toTitleCase } from "../../lib/formatText";
import type { Datasheet, FactionId } from "../../types";
import WeaponStatTable from "../components/WeaponStatTable";

export default function AddUnit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // TODO: wire to ArmyContext - const { addUnit, factionId } = useArmy();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<Datasheet | null>(null);
  const [customName, setCustomName] = useState("");
  const [customPoints, setCustomPoints] = useState(0);
  const [selectedModelTier, setSelectedModelTier] = useState(0);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  // Get factionId from URL params or ArmyContext (TODO)
  const factionId: FactionId | null = (searchParams.get('faction') as FactionId) ?? null;

  // Load real datasheets for this faction
  const allFactionUnits = useMemo(() => {
    if (!factionId) return [];
    return getUnitsForFaction(getDataFactionId(factionId as FactionId));
  }, [factionId]);

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

  const factionName = factionId ? getFactionName(factionId) : 'Select a faction';

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

  /** Parse "5 models" -> 5 from the points tier string */
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
    // TODO: wire to ArmyContext - addUnit(selectedUnit.name, customName, customPoints, selectedEquipment.join(", "), modelCount);

    toast.success(`${customName} added to army!`, {
      duration: 3000,
    });

    navigate("/army");
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
    <div className="min-h-screen bg-[#faf6f0] flex flex-col p-6 relative overflow-hidden pb-24">
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#8b7355] hover:text-[#b8860b] transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back to Army</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#2c2416] tracking-wider mb-1">
            Add Unit
          </h1>
          <p className="text-[#8b7355] text-sm">{factionName}</p>
        </div>

        {!selectedUnit ? (
          <>
            {/* Search Bar */}
            <div className="mb-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#b8860b]/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search units or keywords..."
                  className="w-full bg-[#f5efe6] border border-[#d4c5a9] rounded-lg pl-11 pr-4 py-3 text-[#2c2416] placeholder:text-[#8b7355] focus:border-[#b8860b]/40 focus:outline-none focus:ring-2 focus:ring-[#b8860b]/20 transition-all"
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
                    className="w-full text-left relative overflow-hidden rounded-sm border border-[#d4c5a9] bg-[#f5efe6] hover:border-[#b8860b] transition-all group"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-[#2c2416] mb-1 group-hover:text-[#b8860b] transition-colors">
                            {unit.name}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {displayKeywords.map((kw, kidx) => (
                              <span
                                key={kidx}
                                className="text-xs text-[#8b7355] bg-[#e8dcc8] px-2 py-0.5 rounded"
                              >
                                {toTitleCase(kw)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-[#b8860b] font-mono">
                          {baseCost} pts
                        </div>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#b8860b]/20 to-transparent" />
                  </button>
                );
              })}

              {filteredUnits.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[#8b7355] text-sm">No units found</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Unit Configuration Form */}
            <div className="space-y-5">
              {/* Selected Unit Info */}
              <div className="relative overflow-hidden rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-4">
                <div className="relative">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-base font-semibold text-[#2c2416] mb-1">
                        {selectedUnit.name}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedUnit.keywords
                          .filter((k) => !["IMPERIUM", "CHAOS", "XENOS"].includes(k.toUpperCase()))
                          .slice(0, 4)
                          .map((kw, idx) => (
                            <span
                              key={idx}
                              className="text-xs text-[#8b7355] bg-[#e8dcc8] px-2 py-0.5 rounded"
                            >
                              {toTitleCase(kw)}
                            </span>
                          ))}
                      </div>
                    </div>
                    <button
                      onClick={handleCancel}
                      aria-label="Deselect unit"
                      className="text-[#8b7355] hover:text-[#5c4a32] transition-colors"
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
                <div className="relative overflow-hidden rounded-sm border border-[#d4c5a9]/40 bg-[#f5efe6] p-3">
                  <div className="relative">
                    <h4 className="text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#8b7355]" />
                      Unit Composition
                    </h4>
                    <p className="text-xs text-[#5c4a32] leading-relaxed">
                      {selectedUnit.unit_composition}
                    </p>
                  </div>
                </div>
              )}

              {/* Model Count / Points Tier Selector */}
              {selectedUnit.points.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-[#5c4a32] mb-2 tracking-wide flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#b8860b]/70" />
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
                            ? "border-[#b8860b]/50 bg-[#b8860b]/10"
                            : "border-[#d4c5a9] bg-[#f5efe6] hover:border-[#b8860b]"
                        }`}
                      >
                        <div className="text-sm font-bold text-[#2c2416] font-mono mb-0.5">
                          {tier.models}
                        </div>
                        <div className={`text-xs font-mono ${selectedModelTier === idx ? "text-[#b8860b]" : "text-[#8b7355]"}`}>
                          {tier.cost} pts
                        </div>
                        {selectedModelTier === idx && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b8860b]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Name */}
              <div>
                <label className="block text-sm font-medium text-[#5c4a32] mb-2 tracking-wide">
                  Custom Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter custom unit name"
                  className="w-full bg-[#f5efe6] border border-[#d4c5a9] rounded-lg px-4 py-3 text-[#2c2416] placeholder:text-[#8b7355] focus:border-[#b8860b]/40 focus:outline-none focus:ring-2 focus:ring-[#b8860b]/20 transition-all"
                />
              </div>

              {/* Base Points */}
              <div>
                <label className="block text-sm font-medium text-[#5c4a32] mb-2 tracking-wide">
                  Base Points
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={customPoints}
                  onChange={(e) => setCustomPoints(Number(e.target.value))}
                  min="0"
                  className="w-full bg-[#f5efe6] border border-[#d4c5a9] rounded-lg px-4 py-3 text-[#2c2416] placeholder:text-[#8b7355] focus:border-[#b8860b]/40 focus:outline-none focus:ring-2 focus:ring-[#b8860b]/20 transition-all"
                />
              </div>

              {/* Wargear Options */}
              {wargearOptions.length > 0 && (
                <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3">
                  <h4 className="text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-2">Wargear Options</h4>
                  <ul className="space-y-1">
                    {wargearOptions.map((opt: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedEquipment.includes(opt)}
                          onChange={() => handleEquipmentToggle(opt)}
                          className="mt-1"
                        />
                        <span className="text-xs text-[#5c4a32]">{opt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Wargear Abilities */}
              {selectedUnit.wargear_abilities.length > 0 && (
                <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3">
                  <h4 className="text-xs font-semibold text-[#8b7355] uppercase tracking-wider mb-2">Wargear Abilities</h4>
                  <div className="space-y-2">
                    {selectedUnit.wargear_abilities.map((ability, idx: number) => {
                      if (typeof ability === 'string') return <p key={idx} className="text-xs text-[#5c4a32]">{ability}</p>;
                      return (
                        <div key={idx}>
                          <span className="text-xs font-bold text-[#b8860b]">{ability[0]}: </span>
                          <span className="text-xs text-[#5c4a32]">{ability[1]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Total Points Display */}
              <div className="relative overflow-hidden rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-4">
                <div className="relative flex items-center justify-between">
                  <span className="text-sm font-medium text-[#5c4a32] uppercase tracking-wider">
                    Total Points
                  </span>
                  <span className="text-2xl font-bold text-amber-600 font-mono">
                    {customPoints}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2 py-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#b8860b]/20 to-transparent" />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-6 py-3 rounded-lg border border-[#d4c5a9] bg-[#f5efe6] text-[#5c4a32] font-semibold hover:border-[#b8860b] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#b8860b] to-[#d4a017] rounded-lg transition-all duration-300 group-hover:shadow-[0_0_25px_rgba(184,134,11,0.4)]" />

                  <div className="relative px-6 py-3 flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                    <span className="text-base font-bold text-white tracking-wide">
                      Add to Army
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
          background: rgba(212, 197, 169, 0.3);
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(184, 134, 11, 0.3);
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(184, 134, 11, 0.5);
        }
      `}</style>
    </div>
  );
}
