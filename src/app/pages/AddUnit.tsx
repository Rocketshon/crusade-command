import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Search, Plus, X, Users } from "lucide-react";
import { toast } from "sonner";
import { useArmy } from "../../lib/ArmyContext";
import { getFactionName, getDataFactionId } from "../../lib/factions";
import { getUnitsForFaction, searchUnits } from "../../data";
import { toTitleCase } from "../../lib/formatText";
import type { Datasheet, FactionId } from "../../types";
import WeaponStatTable from "../components/WeaponStatTable";

export default function AddUnit() {
  const navigate = useNavigate();
  const { addUnit, factionId: armyFactionId, army, mode, supplyLimit } = useArmy();
  const pointsCap = supplyLimit;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<Datasheet | null>(null);
  const [customName, setCustomName] = useState("");
  const [customPoints, setCustomPoints] = useState(0);
  const [selectedModelTier, setSelectedModelTier] = useState(0);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  const factionId: FactionId | null = (armyFactionId as FactionId) ?? null;

  useEffect(() => {
    if (!factionId) navigate('/army');
  }, [factionId, navigate]);

  const allFactionUnits = useMemo(() => {
    if (!factionId) return [];
    return getUnitsForFaction(getDataFactionId(factionId as FactionId));
  }, [factionId]);

  const filteredUnits = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allFactionUnits;
    // Search all factions when querying — supports adding allied units
    return searchUnits(q);
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

  const handleEquipmentToggle = (option: string) => {
    setSelectedEquipment(prev => prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]);
  };

  const handleSubmit = () => {
    if (!selectedUnit) { toast.error("Please select a unit"); return; }
    if (!customName.trim()) { toast.error("Please enter a unit name"); return; }
    const cap = pointsCap;
    const currentTotal = army.reduce((sum, u) => sum + u.points_cost, 0);
    const newTotal = currentTotal + customPoints;
    addUnit({
      datasheetName: selectedUnit.name,
      customName: customName.trim(),
      pointsCost: customPoints,
      factionId: selectedUnit.faction_id,
      isCharacter: selectedUnit.keywords.includes('CHARACTER'),
    });
    if (newTotal > cap && cap > 0) {
      toast.warning(`Adding this unit puts you ${(newTotal - cap).toLocaleString()} pts over budget`, { duration: 4000 });
    } else {
      toast.success(`${customName} added to army!`, { duration: 3000 });
    }
    navigate("/army");
  };

  const handleCancel = () => {
    setSelectedUnit(null);
    setCustomName("");
    setCustomPoints(0);
    setSelectedEquipment([]);
  };

  const wargearOptions = selectedUnit?.wargear_options ?? [];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col p-6 relative overflow-hidden pb-24">
      <div className="relative z-10 w-full max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" /><span className="text-sm">Back to Army</span>
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-wider mb-1">Add Unit</h1>
          <p className="text-[var(--text-secondary)] text-sm">{factionName}</p>
        </div>

        {!selectedUnit ? (
          <>
            <div className="mb-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--accent-gold)]/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search units or keywords..."
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg pl-11 pr-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-gold)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
              {filteredUnits.map((unit, idx) => {
                const baseCost = unit.points[0]?.cost ? parseInt(unit.points[0].cost, 10) : 0;
                const displayKeywords = unit.keywords.filter(k => !["IMPERIUM", "CHAOS", "XENOS"].includes(k.toUpperCase())).slice(0, 4);
                return (
                  <button
                    key={`${unit.name}-${idx}`}
                    onClick={() => handleUnitSelect(unit)}
                    className="w-full text-left relative overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)] transition-all group"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition-colors">{unit.name}</h3>
                            {unit.faction_id !== getDataFactionId(factionId as FactionId) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-400/40 text-amber-400 flex-shrink-0">Allied</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {displayKeywords.map((kw, kidx) => (
                              <span key={kidx} className="text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] px-2 py-0.5 rounded">{toTitleCase(kw)}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-[var(--accent-gold)] font-mono">{baseCost} pts</div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredUnits.length === 0 && <div className="text-center py-12"><p className="text-[var(--text-secondary)] text-sm">No units found</p></div>}
            </div>
          </>
        ) : (
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{selectedUnit.name}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedUnit.keywords.filter(k => !["IMPERIUM", "CHAOS", "XENOS"].includes(k.toUpperCase())).slice(0, 4).map((kw, idx) => (
                      <span key={idx} className="text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] px-2 py-0.5 rounded">{toTitleCase(kw)}</span>
                    ))}
                  </div>
                </div>
                <button onClick={handleCancel} aria-label="Deselect unit" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <WeaponStatTable weapons={selectedUnit.ranged_weapons} type="ranged" compact />
            <WeaponStatTable weapons={selectedUnit.melee_weapons} type="melee" compact />

            {selectedUnit.unit_composition && (
              <div className="rounded-lg border border-[var(--border-color)]/40 bg-[var(--bg-card)] p-3">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[var(--text-secondary)]" />Unit Composition
                </h4>
                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{selectedUnit.unit_composition}</p>
              </div>
            )}

            {selectedUnit.points.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-2 tracking-wide flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[var(--accent-gold)]/70" />Unit Size
                </label>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(selectedUnit.points.length, 3)}, 1fr)` }}>
                  {selectedUnit.points.map((tier, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleModelTierChange(idx)}
                      className={`relative overflow-hidden rounded-lg border p-3 text-center transition-all ${
                        selectedModelTier === idx
                          ? "border-[var(--accent-gold)]/50 bg-[var(--accent-gold)]/10"
                          : "border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]"
                      }`}
                    >
                      <div className="text-sm font-bold text-[var(--text-primary)] font-mono mb-0.5">{tier.models}</div>
                      <div className={`text-xs font-mono ${selectedModelTier === idx ? "text-[var(--accent-gold)]" : "text-[var(--text-secondary)]"}`}>{tier.cost} pts</div>
                      {selectedModelTier === idx && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-gold)]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-2 tracking-wide">Custom Name</label>
              <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Enter custom unit name"
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-gold)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/20 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-2 tracking-wide">Base Points</label>
              <input type="number" inputMode="numeric" value={customPoints} onChange={(e) => setCustomPoints(Number(e.target.value))} min="0"
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-gold)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/20 transition-all" />
            </div>

            {wargearOptions.length > 0 && (
              <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Wargear Options</h4>
                <ul className="space-y-1">
                  {wargearOptions.map((opt: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <input type="checkbox" checked={selectedEquipment.includes(opt)} onChange={() => handleEquipmentToggle(opt)} className="mt-1" />
                      <span className="text-xs text-[var(--text-tertiary)]">{opt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedUnit.wargear_abilities.length > 0 && (
              <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Wargear Abilities</h4>
                <div className="space-y-2">
                  {selectedUnit.wargear_abilities.map((ability, idx: number) => {
                    if (typeof ability === 'string') return <p key={idx} className="text-xs text-[var(--text-tertiary)]">{ability}</p>;
                    return (
                      <div key={idx}>
                        <span className="text-xs font-bold text-[var(--accent-gold)]">{ability[0]}: </span>
                        <span className="text-xs text-[var(--text-tertiary)]">{ability[1]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="relative overflow-hidden rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--bg-card)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Total Points</span>
                <span className="text-2xl font-bold text-[var(--accent-gold)] font-mono">{customPoints}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 py-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--accent-gold)]/20 to-transparent" />
            </div>

            <div className="flex gap-3">
              <button onClick={handleCancel} className="flex-1 px-6 py-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-tertiary)] font-semibold hover:border-[var(--accent-gold)] transition-all">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[var(--accent-gold)] rounded-lg transition-all duration-300 group-hover:shadow-[0_0_25px_rgba(201,168,76,0.4)]" />
                <div className="relative px-6 py-3 flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5 text-[var(--bg-primary)]" strokeWidth={2.5} />
                  <span className="text-base font-bold text-[var(--bg-primary)] tracking-wide">Add to Army</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: rgba(42, 42, 53, 0.3); border-radius: 2px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(201, 168, 76, 0.3); border-radius: 2px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(201, 168, 76, 0.5); }
      `}</style>
    </div>
  );
}
