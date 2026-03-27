import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Shield, Edit, Plus, Award, AlertTriangle, Skull, ChevronDown, ChevronUp, Star, Trash2, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { useArmy } from "../../lib/ArmyContext";
import { getFactionName, getDataFactionId } from "../../lib/factions";
import { getUnitsForFaction, getRulesForFaction } from "../../data";
import type { Datasheet, FactionId } from "../../types";
import WeaponStatTable from "../components/WeaponStatTable";
import { FormattedRuleText } from "../../lib/formatText";

export default function UnitDetail() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();

  const { army, mode, factionId: armyFactionId, updateUnit, removeUnit, awardXP, addBattleHonour, addBattleScar, removeBattleScar } = useArmy();
  const factionId: FactionId | null = (armyFactionId as FactionId) ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [showAbilities, setShowAbilities] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);
  const [showSpendXP, setShowSpendXP] = useState(false);
  const [xpAmount, setXpAmount] = useState(1);
  const [editName, setEditName] = useState("");
  const [editPoints, setEditPoints] = useState(0);
  const [editNotes, setEditNotes] = useState(""); // kept for notes textarea UI
  const [showEnhancementPicker, setShowEnhancementPicker] = useState(false);
  const [showStratagems, setShowStratagems] = useState(false);

  const unit = army.find((u) => u.id === unitId);

  // Load matching datasheet from faction data
  const datasheet: Datasheet | undefined = useMemo(() => {
    if (!factionId || !unit) return undefined;
    const factionUnits = getUnitsForFaction(getDataFactionId(factionId));
    return factionUnits.find((ds) => ds.name === unit.datasheet_name);
  }, [factionId, unit]);

  // Load faction enhancements from all detachments
  const factionEnhancements = useMemo(() => {
    if (!factionId) return [];
    const rules = getRulesForFaction(getDataFactionId(factionId));
    if (!rules) return [];
    const enhancements: { detachment: string; name: string; cost: string; text: string }[] = [];
    for (const det of rules.detachments) {
      for (const enh of det.enhancements) {
        enhancements.push({ detachment: det.name, ...enh });
      }
    }
    return enhancements;
  }, [factionId]);

  // Filter enhancements by unit keyword eligibility
  const filteredEnhancements = useMemo(() => {
    if (!datasheet) return factionEnhancements;
    const unitKeywords = [...(datasheet.keywords || []), ...(datasheet.faction_keywords || [])].map(k => k.toUpperCase());

    return factionEnhancements.filter(enh => {
      const match = enh.text.match(/^(.+?)\s+model only\b/i);
      if (!match) return true;
      const restrictions = match[1]
        .split(/\s*(?:,\s*|\bor\b)\s*/i)
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      return restrictions.some(restriction => {
        if (unitKeywords.includes(restriction)) return true;
        const parts = restriction.split(/\s+/);
        if (parts.length > 1) {
          return parts.every(part => unitKeywords.some(kw => kw.includes(part)));
        }
        return unitKeywords.some(kw => kw === restriction);
      });
    });
  }, [factionEnhancements, datasheet]);

  // Match stratagems whose target field references this unit's keywords
  const matchingStratagems = useMemo(() => {
    if (!factionId || !datasheet) return [];
    const rules = getRulesForFaction(getDataFactionId(factionId));
    if (!rules) return [];

    const unitKeywords = [
      ...datasheet.keywords,
      datasheet.name,
    ].map(k => k.toUpperCase());

    const genericKeywords = new Set([
      'IMPERIUM', 'CHAOS', 'XENOS', 'TYRANIDS', 'ORKS', 'AELDARI',
      'DRUKHARI', 'NECRONS', 'T\'AU EMPIRE', 'LEAGUES OF VOTANN',
    ]);

    const results: { detachment: string; name: string; cp: string; type: string; when: string; target: string; effect: string; restrictions?: string }[] = [];

    for (const det of rules.detachments) {
      for (const strat of det.stratagems) {
        const targetUpper = strat.target.toUpperCase();
        const matched = unitKeywords.some(kw => {
          if (genericKeywords.has(kw)) return false;
          if (kw.length < 3) return false;
          return targetUpper.includes(kw);
        });
        if (matched) {
          results.push({ detachment: det.name, ...strat });
        }
      }
    }

    return results;
  }, [factionId, datasheet]);

  if (!unit) {
    return (
      <div className="min-h-screen bg-[#faf6f0] flex flex-col p-6 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md mx-auto">
          <button
            onClick={() => navigate("/army")}
            className="flex items-center gap-2 text-[#8b7355] hover:text-[#b8860b] transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Army</span>
          </button>
          <p className="text-[#8b7355] text-center mt-12">Unit not found.</p>
        </div>
      </div>
    );
  }

  const factionName = factionId ? getFactionName(factionId) : '';

  // Stats from datasheet or fallback
  const stats = datasheet?.stats ?? {};
  const invulnSave = datasheet?.invuln ?? null;
  const rangedWeapons = datasheet?.ranged_weapons ?? [];
  const meleeWeapons = datasheet?.melee_weapons ?? [];

  // Abilities: flatten core, faction, and other abilities into a unified list
  const abilities = datasheet ? (() => {
    const list: { name: string; description: string }[] = [];
    for (const core of datasheet.abilities.core) {
      list.push({ name: core, description: "Core ability" });
    }
    for (const faction of datasheet.abilities.faction) {
      list.push({ name: faction, description: "Faction ability" });
    }
    for (const [name, desc] of datasheet.abilities.other) {
      list.push({ name, description: desc });
    }
    return list;
  })() : [];

  const handleAddBattleHonor = () => {
    if (!unitId) return;
    addBattleHonour(unitId, { name: 'Battle Honour', type: 'Honour' });
    toast.success("Battle Honour added!");
  };

  const handleAssignEnhancement = (enh: { detachment: string; name: string; cost: string; text: string }) => {
    if (!unitId) return;
    addBattleHonour(unitId, { name: enh.name, type: 'Enhancement' });
    setShowEnhancementPicker(false);
    toast.success(`${enh.name} assigned!`);
  };

  const handleAddBattleScar = () => {
    if (!unitId) return;
    addBattleScar(unitId, { name: 'Battle Scar', effect: 'No effect assigned' });
    toast.success("Battle Scar added!");
  };

  const handleSpendXP = () => {
    if (xpAmount < 1 || !unitId) return;
    awardXP(unitId, xpAmount);
    toast.success(`+${xpAmount} XP awarded!`);
    setShowSpendXP(false);
    setXpAmount(1);
  };

  const handleStartEdit = () => {
    setEditName(unit.custom_name);
    setEditPoints(unit.points_cost);
    setEditNotes('');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!unitId) return;
    updateUnit(unitId, { custom_name: editName, points_cost: editPoints });
    setIsEditing(false);
    toast.success("Unit updated!");
  };

  const handleMarkDestroyed = () => {
    if (!unitId) return;
    updateUnit(unitId, { is_destroyed: true });
    toast.error("Unit marked as destroyed");
    setShowDestroyConfirm(false);
    setTimeout(() => navigate("/army"), 1500);
  };

  const handleRemove = () => {
    if (!unitId) return;
    removeUnit(unitId);
    toast.success("Unit removed from army");
    setShowDeleteConfirm(false);
    setTimeout(() => navigate("/army"), 1500);
  };

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

        {/* Unit Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-blue-500" strokeWidth={2} />
                <span className="text-xs text-[#8b7355] uppercase tracking-wider">
                  {factionName}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-[#2c2416] tracking-wider mb-1">
                {unit.custom_name}
              </h1>
              <p className="text-[#8b7355] text-sm italic mb-2">{unit.datasheet_name}</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-[#b8860b] font-mono">
                {unit.points_cost} pts
              </div>
              <button
                onClick={handleStartEdit}
                className="text-xs text-[#b8860b]/70 hover:text-[#b8860b] transition-colors flex items-center gap-1 mt-1"
              >
                <Edit className="w-3 h-3" />
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Stats Line */}
        {Object.keys(stats).length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-[#5c4a32] uppercase tracking-wider mb-3">
              Unit Statistics
            </h2>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {Object.entries(stats).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3"
                >
                  <div className="text-center">
                    <div className="text-xs text-[#8b7355] uppercase tracking-wider mb-1">
                      {key}
                    </div>
                    <div className="text-lg font-bold text-[#2c2416] font-mono">
                      {value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {invulnSave && (
              <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3">
                <div className="text-center">
                  <div className="text-xs text-purple-500 uppercase tracking-wider mb-1">
                    Invulnerable Save
                  </div>
                  <div className="text-lg font-bold text-purple-600 font-mono">
                    {invulnSave}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ranged Weapons */}
        {rangedWeapons.length > 0 && (
          <div className="mb-6">
            <WeaponStatTable weapons={rangedWeapons} type="ranged" />
          </div>
        )}

        {/* Melee Weapons */}
        {meleeWeapons.length > 0 && (
          <div className="mb-6">
            <WeaponStatTable weapons={meleeWeapons} type="melee" />
          </div>
        )}

        {/* Wargear Options */}
        {datasheet?.wargear_options && datasheet.wargear_options.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-[#5c4a32] uppercase tracking-wider mb-3">Wargear Options</h2>
            <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3">
              <ul className="list-disc list-inside space-y-1 text-xs text-[#5c4a32]">
                {datasheet.wargear_options.map((opt: string, idx: number) => (
                  <li key={idx}>{opt}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Wargear Abilities */}
        {datasheet?.wargear_abilities && datasheet.wargear_abilities.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-[#5c4a32] uppercase tracking-wider mb-3">Wargear Abilities</h2>
            <div className="space-y-2">
              {datasheet.wargear_abilities.map((ability, idx: number) => {
                if (typeof ability === 'string') return <p key={idx} className="text-xs text-[#5c4a32]">{ability}</p>;
                return (
                  <div key={idx} className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3">
                    <h3 className="text-xs font-bold text-[#b8860b] mb-1">{ability[0]}</h3>
                    <p className="text-xs text-[#5c4a32]">{ability[1]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Abilities Section - Collapsible */}
        {abilities.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowAbilities(!showAbilities)}
              className="w-full flex items-center justify-between text-sm font-semibold text-[#5c4a32] uppercase tracking-wider mb-3 hover:text-[#b8860b] transition-colors"
            >
              <span>Abilities ({abilities.length})</span>
              {showAbilities ? (
                <ChevronUp className="w-5 h-5 text-[#b8860b]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#b8860b]" />
              )}
            </button>
            {showAbilities && (
              <div className="space-y-2">
                {abilities.map((ability, idx) => (
                  <div
                    key={idx}
                    className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3"
                  >
                    <h3 className="text-sm font-semibold text-[#b8860b] mb-1">
                      {ability.name}
                    </h3>
                    <p className="text-xs text-[#8b7355] leading-relaxed">
                      {ability.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Applicable Stratagems */}
        {matchingStratagems.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowStratagems(!showStratagems)}
              className="w-full flex items-center justify-between text-sm font-semibold text-[#5c4a32] uppercase tracking-wider mb-3 hover:text-[#b8860b] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Stratagems ({matchingStratagems.length})
              </span>
              {showStratagems ? (
                <ChevronUp className="w-5 h-5 text-[#b8860b]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#b8860b]" />
              )}
            </button>
            {showStratagems && (
              <div className="space-y-2">
                {matchingStratagems.map((strat, idx) => (
                  <div
                    key={idx}
                    className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-sm font-semibold text-amber-600">
                        {strat.name}
                      </h4>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-[#8b7355] uppercase">{strat.type}</span>
                        <span className="text-xs font-bold text-amber-600 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">
                          {strat.cp}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#8b7355] mb-1">{strat.detachment}</p>
                    <div className="space-y-1 text-xs text-[#8b7355] leading-relaxed">
                      <p><span className="text-[#5c4a32] font-medium">When:</span> {strat.when}</p>
                      <p><span className="text-[#5c4a32] font-medium">Target:</span> {strat.target}</p>
                      <p><span className="text-[#5c4a32] font-medium">Effect:</span> {strat.effect}</p>
                      {strat.restrictions && (
                        <p><span className="text-red-500/70 font-medium">Restrictions:</span> {strat.restrictions}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Crusade Progression - only shown in crusade mode */}
        {mode === 'crusade' && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-[#5c4a32] uppercase tracking-wider mb-3">
              Crusade Progression
            </h2>

            {/* XP and Rank */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3">
                <div>
                  <div className="text-xs text-[#8b7355] uppercase tracking-wider mb-1">
                    Crusade Points
                  </div>
                  <div className="text-xl font-bold text-[#b8860b] font-mono">
                    {unit.experience_points}
                  </div>
                </div>
              </div>
              <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3">
                <div>
                  <div className="text-xs text-[#8b7355] uppercase tracking-wider mb-1">
                    Rank
                  </div>
                  <div className="text-base font-bold text-[#b8860b]">
                    {unit.rank}
                  </div>
                </div>
              </div>
            </div>

            {/* Battles */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3">
                <div>
                  <div className="text-xs text-[#8b7355] uppercase tracking-wider mb-1">
                    Battles Fought
                  </div>
                  <div className="text-xl font-bold text-[#2c2416] font-mono">
                    {unit.battles_played}
                  </div>
                </div>
              </div>
              <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3">
                <div>
                  <div className="text-xs text-[#8b7355] uppercase tracking-wider mb-1">
                    Battles Survived
                  </div>
                  <div className="text-xl font-bold text-[#2c2416] font-mono">
                    {unit.battles_survived}
                  </div>
                </div>
              </div>
            </div>

            {/* Battle Honors */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[#8b7355] uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Battle Honors
                </h3>
                <div className="flex items-center gap-3">
                  {filteredEnhancements.length > 0 && (
                    <button
                      onClick={() => setShowEnhancementPicker(true)}
                      className="text-xs text-purple-500/70 hover:text-purple-500 transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Enhancement
                    </button>
                  )}
                  <button
                    onClick={handleAddBattleHonor}
                    className="text-xs text-[#b8860b]/70 hover:text-[#b8860b] transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {unit.battle_honours.map((honor, idx) => (
                  <div
                    key={honor.id || idx}
                    className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3"
                  >
                    <h4 className="text-sm font-semibold text-amber-600 mb-1 flex items-center gap-1.5">
                      <Star className="w-3 h-3" />
                      {honor.name}
                    </h4>
                    <p className="text-xs text-[#8b7355] leading-relaxed">
                      {honor.type}
                    </p>
                  </div>
                ))}
                {unit.battle_honours.length === 0 && (
                  <p className="text-xs text-[#8b7355] italic">No battle honours yet.</p>
                )}
              </div>
            </div>

            {/* Battle Scars */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[#8b7355] uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Battle Scars
                </h3>
                <button
                  onClick={handleAddBattleScar}
                  className="text-xs text-[#b8860b]/70 hover:text-[#b8860b] transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {unit.battle_scars.map((scar, idx) => (
                  <div
                    key={scar.id || idx}
                    className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3"
                  >
                    <h4 className="text-sm font-semibold text-red-500 mb-1">
                      {scar.name}
                    </h4>
                    <p className="text-xs text-[#8b7355] leading-relaxed">
                      {scar.effect}
                    </p>
                  </div>
                ))}
                {unit.battle_scars.length === 0 && (
                  <p className="text-xs text-[#8b7355] italic">No battle scars yet.</p>
                )}
              </div>
            </div>

            {/* Award XP Button */}
            <button
              onClick={() => setShowSpendXP(true)}
              className="w-full relative overflow-hidden group mb-3"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#b8860b] to-[#d4a017] rounded-lg transition-all duration-300 group-hover:shadow-[0_0_25px_rgba(184,134,11,0.4)]" />

              <div className="relative px-6 py-3 flex items-center justify-center gap-2">
                <Star className="w-5 h-5 text-white" strokeWidth={2} />
                <span className="text-base font-bold text-white tracking-wide">
                  Award XP
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-2 py-2 mb-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#b8860b]/20 to-transparent" />
        </div>

        {/* Destructive Actions */}
        <div className="space-y-3">
          {mode === 'crusade' && (
            <button
              onClick={() => setShowDestroyConfirm(true)}
              className="w-full px-6 py-3 rounded-lg border border-red-500/30 bg-red-50 text-red-500 font-semibold hover:border-red-500/50 hover:bg-red-100 transition-all flex items-center justify-center gap-2"
            >
              <Skull className="w-5 h-5" />
              Mark as Destroyed
            </button>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-6 py-3 rounded-lg border border-red-500/30 bg-red-50 text-red-500 font-semibold hover:border-red-500/50 hover:bg-red-100 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Remove from Army
          </button>
        </div>
      </div>

      {/* Edit Unit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-sm border border-[#d4c5a9] bg-[#faf6f0] p-6">
            <div>
              <h3 className="text-lg font-bold text-[#2c2416] mb-4">Edit Unit</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#8b7355] uppercase tracking-wider mb-1">Custom Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#f5efe6] border border-[#d4c5a9] rounded-lg px-3 py-2 text-[#2c2416] text-sm focus:border-[#b8860b]/40 focus:outline-none focus:ring-2 focus:ring-[#b8860b]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#8b7355] uppercase tracking-wider mb-1">Points Cost</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editPoints}
                    onChange={(e) => setEditPoints(Number(e.target.value))}
                    min="0"
                    className="w-full bg-[#f5efe6] border border-[#d4c5a9] rounded-lg px-3 py-2 text-[#2c2416] text-sm focus:border-[#b8860b]/40 focus:outline-none focus:ring-2 focus:ring-[#b8860b]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#8b7355] uppercase tracking-wider mb-1">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    placeholder="Battle notes, lore, etc."
                    className="w-full bg-[#f5efe6] border border-[#d4c5a9] rounded-lg px-3 py-2 text-[#2c2416] text-sm focus:border-[#b8860b]/40 focus:outline-none focus:ring-2 focus:ring-[#b8860b]/20 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[#d4c5a9] bg-[#f5efe6] text-[#5c4a32] font-semibold hover:border-[#b8860b] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#b8860b] hover:bg-[#d4a017] text-white font-semibold transition-all"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhancement Picker Modal */}
      {showEnhancementPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-sm border border-[#d4c5a9] bg-[#faf6f0] p-6 max-h-[80vh] overflow-y-auto">
            <div>
              <div className="flex justify-center mb-4">
                <Sparkles className="w-12 h-12 text-purple-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-[#2c2416] text-center mb-2">
                Assign Enhancement
              </h3>
              <p className="text-sm text-[#8b7355] text-center mb-4">
                Select an enhancement from your detachment
              </p>

              <div className="space-y-3">
                {filteredEnhancements.map((enh, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAssignEnhancement(enh)}
                    className="w-full text-left rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3 hover:border-[#b8860b] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-purple-600">{enh.name}</h4>
                      <span className="text-xs font-bold text-purple-500 font-mono flex-shrink-0">{enh.cost} pts</span>
                    </div>
                    <p className="text-[10px] text-[#8b7355] mb-1">{enh.detachment}</p>
                    <FormattedRuleText text={enh.text} className="text-xs" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowEnhancementPicker(false)}
                className="w-full mt-4 px-4 py-2 rounded-lg border border-[#d4c5a9] bg-[#f5efe6] text-[#5c4a32] font-semibold hover:border-[#b8860b] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Award XP Modal */}
      {showSpendXP && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-sm border border-[#d4c5a9] bg-[#faf6f0] p-6">
            <div>
              <div className="flex justify-center mb-4">
                <Star className="w-12 h-12 text-[#b8860b]" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-[#2c2416] text-center mb-2">
                Award Experience
              </h3>
              <p className="text-sm text-[#8b7355] text-center mb-4">
                Current XP: <span className="text-[#b8860b] font-mono">{unit.experience_points}</span>
              </p>

              <div className="flex items-center justify-center gap-4 mb-6">
                <button
                  onClick={() => setXpAmount(Math.max(1, xpAmount - 1))}
                  className="w-11 h-11 rounded-lg border border-[#b8860b]/30 bg-[#f5efe6] text-[#b8860b] font-bold text-lg hover:bg-[#e8dcc8] transition-colors"
                >
                  -
                </button>
                <div className="text-3xl font-bold text-[#b8860b] font-mono w-16 text-center">
                  {xpAmount}
                </div>
                <button
                  onClick={() => setXpAmount(xpAmount + 1)}
                  className="w-11 h-11 rounded-lg border border-[#b8860b]/30 bg-[#f5efe6] text-[#b8860b] font-bold text-lg hover:bg-[#e8dcc8] transition-colors"
                >
                  +
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowSpendXP(false); setXpAmount(1); }}
                  className="flex-1 px-4 py-2 rounded-lg border border-[#d4c5a9] bg-[#f5efe6] text-[#5c4a32] font-semibold hover:border-[#b8860b] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSpendXP}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#b8860b] hover:bg-[#d4a017] text-white font-semibold transition-all"
                >
                  Award +{xpAmount} XP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Destroy Confirmation Modal */}
      {showDestroyConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-sm border border-[#d4c5a9] bg-[#faf6f0] p-6">
            <div>
              <div className="flex justify-center mb-4">
                <Skull className="w-12 h-12 text-red-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-[#2c2416] text-center mb-2">
                Mark as Destroyed?
              </h3>
              <p className="text-sm text-[#8b7355] text-center mb-6">
                This unit will be marked as destroyed but remain in your army for record keeping.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDestroyConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[#d4c5a9] bg-[#f5efe6] text-[#5c4a32] font-semibold hover:border-[#b8860b] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkDestroyed}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-all"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-sm border border-[#d4c5a9] bg-[#faf6f0] p-6">
            <div>
              <div className="flex justify-center mb-4">
                <Trash2 className="w-12 h-12 text-red-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-[#2c2416] text-center mb-2">
                Remove from Army?
              </h3>
              <p className="text-sm text-[#8b7355] text-center mb-6">
                This will permanently remove this unit from your army. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[#d4c5a9] bg-[#f5efe6] text-[#5c4a32] font-semibold hover:border-[#b8860b] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemove}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-all"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
