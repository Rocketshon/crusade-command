import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Shield, Edit, Plus, Award, AlertTriangle, Skull, ChevronDown, ChevronUp, Star, Trash2, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { useCrusade } from "../../lib/CrusadeContext";
import { getFactionName } from "../../lib/factions";
import { getRankFromXP, getRankColor } from "../../lib/ranks";
import { getUnitsForFaction, getRulesForFaction } from "../../data";
import type { Datasheet } from "../../types";
import WeaponStatTable from "../components/WeaponStatTable";
import WargearOptionsPanel, { WargearAbilitiesPanel } from "../components/WargearOptionsPanel";
import { FormattedRuleText } from "../../lib/formatText";

export default function UnitDetail() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const {
    campaign,
    currentPlayer,
    units,
    updateUnit,
    awardXP,
    addBattleHonour,
    addBattleScar,
    markDestroyed,
    removeUnit,
  } = useCrusade();

  const [isEditing, setIsEditing] = useState(false);
  const [showAbilities, setShowAbilities] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);
  const [showSpendXP, setShowSpendXP] = useState(false);
  const [xpAmount, setXpAmount] = useState(1);
  const [editName, setEditName] = useState("");
  const [editPoints, setEditPoints] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [showEnhancementPicker, setShowEnhancementPicker] = useState(false);

  // If no campaign, redirect to /home
  useEffect(() => {
    if (!campaign) {
      navigate("/home", { replace: true });
    }
  }, [campaign, navigate]);

  const unit = units.find((u) => u.id === unitId);

  // Load matching datasheet from faction data
  const datasheet: Datasheet | undefined = useMemo(() => {
    if (!currentPlayer || !unit) return undefined;
    const factionUnits = getUnitsForFaction(currentPlayer.faction_id);
    return factionUnits.find((ds) => ds.name === unit.datasheet_name);
  }, [currentPlayer, unit]);

  // Load faction enhancements from all detachments
  const factionEnhancements = useMemo(() => {
    if (!currentPlayer) return [];
    const rules = getRulesForFaction(currentPlayer.faction_id);
    if (!rules) return [];
    const enhancements: { detachment: string; name: string; cost: string; text: string }[] = [];
    for (const det of rules.detachments) {
      for (const enh of det.enhancements) {
        enhancements.push({ detachment: det.name, ...enh });
      }
    }
    return enhancements;
  }, [currentPlayer]);

  // Filter enhancements by unit keyword eligibility
  const filteredEnhancements = useMemo(() => {
    if (!datasheet) return factionEnhancements;
    const unitKeywords = [...(datasheet.keywords || []), ...(datasheet.faction_keywords || [])].map(k => k.toUpperCase());

    return factionEnhancements.filter(enh => {
      // Match "KEYWORD model only" or "KEYWORD1 or KEYWORD2 model only" at start of text
      const match = enh.text.match(/^(.+?)\s+model only\b/i);
      if (!match) return true; // No restriction = available to all

      // Split on " or " and ", " to get individual required keywords
      const restrictions = match[1]
        .split(/\s*(?:,\s*|\bor\b)\s*/i)
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);

      // Check if any restriction keyword matches any unit keyword
      return restrictions.some(restriction => {
        // Direct match
        if (unitKeywords.includes(restriction)) return true;
        // Compound keyword: check if all parts exist across unit keywords
        const parts = restriction.split(/\s+/);
        if (parts.length > 1) {
          return parts.every(part => unitKeywords.some(kw => kw.includes(part)));
        }
        // Check if any unit keyword contains the restriction
        return unitKeywords.some(kw => kw === restriction);
      });
    });
  }, [factionEnhancements, datasheet]);

  const [showStratagems, setShowStratagems] = useState(false);

  // Match stratagems whose target field references this unit's keywords
  const matchingStratagems = useMemo(() => {
    if (!currentPlayer || !datasheet) return [];
    const rules = getRulesForFaction(currentPlayer.faction_id);
    if (!rules) return [];

    // Collect unit keywords (uppercase)
    const unitKeywords = [
      ...datasheet.keywords,
      datasheet.name, // also match on datasheet name itself
    ].map(k => k.toUpperCase());

    // Skip overly generic keywords that would match every stratagem
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
          if (kw.length < 3) return false; // skip trivially short keywords
          return targetUpper.includes(kw);
        });

        if (matched) {
          results.push({ detachment: det.name, ...strat });
        }
      }
    }

    return results;
  }, [currentPlayer, datasheet]);

  if (!campaign || !currentPlayer) return null;

  if (!unit) {
    return (
      <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md mx-auto">
          <button
            onClick={() => navigate("/roster")}
            className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Roster</span>
          </button>
          <p className="text-stone-500 text-center mt-12">Unit not found.</p>
        </div>
      </div>
    );
  }

  const factionName = getFactionName(currentPlayer.faction_id);
  const rank = getRankFromXP(unit.experience_points);
  const rankColor = getRankColor(rank);

  // Stats from datasheet or fallback
  const stats = datasheet?.stats ?? {};
  const invulnSave = datasheet?.invuln ?? null;
  const rangedWeapons = datasheet?.ranged_weapons ?? [];
  const meleeWeapons = datasheet?.melee_weapons ?? [];

  // Abilities: flatten core, faction, and other abilities into a unified list
  const abilities = useMemo(() => {
    if (!datasheet) return [];
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
  }, [datasheet]);

  const handleAddBattleHonor = () => {
    addBattleHonour(unit.id, {
      id: crypto.randomUUID(),
      type: "battle_trait",
      name: "New Battle Honour",
      description: "Earned through valorous deeds in battle.",
    });
    toast.success("Battle Honor added!");
  };

  const handleAssignEnhancement = (enh: { detachment: string; name: string; cost: string; text: string }) => {
    addBattleHonour(unit.id, {
      id: crypto.randomUUID(),
      type: "weapon_enhancement",
      name: enh.name,
      description: `${enh.text} (${enh.detachment} — ${enh.cost} pts)`,
    });
    setShowEnhancementPicker(false);
    toast.success(`${enh.name} assigned!`);
  };

  const handleAddBattleScar = () => {
    addBattleScar(unit.id, {
      id: crypto.randomUUID(),
      name: "New Battle Scar",
      description: "Sustained during a harrowing engagement.",
    });
    toast.success("Battle Scar added!");
  };

  const handleSpendXP = () => {
    if (xpAmount < 1) return;
    awardXP(unit.id, xpAmount);
    toast.success(`+${xpAmount} XP awarded!`);
    setShowSpendXP(false);
    setXpAmount(1);
  };

  const handleStartEdit = () => {
    setEditName(unit.custom_name);
    setEditPoints(unit.points_cost);
    setEditNotes(unit.notes);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateUnit(unit.id, {
      custom_name: editName || unit.datasheet_name,
      points_cost: editPoints,
      notes: editNotes,
    });
    setIsEditing(false);
    toast.success("Unit updated!");
  };

  const handleMarkDestroyed = () => {
    markDestroyed(unit.id);
    toast.error("Unit marked as destroyed");
    setShowDestroyConfirm(false);
    setTimeout(() => navigate("/roster"), 1500);
  };

  const handleRemove = () => {
    removeUnit(unit.id);
    toast.success("Unit removed from roster");
    setShowDeleteConfirm(false);
    setTimeout(() => navigate("/roster"), 1500);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden pb-8">
      {/* Dark ambient glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back to Roster</span>
        </button>

        {/* Unit Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-blue-500" strokeWidth={2} />
                <span className="text-xs text-stone-500 uppercase tracking-wider">
                  {factionName}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] mb-1">
                {unit.custom_name}
              </h1>
              <p className="text-stone-500 text-sm italic">{unit.datasheet_name}</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-emerald-500 font-mono">
                {unit.points_cost} pts
              </div>
              <button
                onClick={handleStartEdit}
                className="text-xs text-emerald-500/70 hover:text-emerald-500 transition-colors flex items-center gap-1 mt-1"
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
            <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-3">
              Unit Statistics
            </h2>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {Object.entries(stats).map(([key, value]) => (
                <div
                  key={key}
                  className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-3"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
                  <div className="relative text-center">
                    <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                      {key}
                    </div>
                    <div className="text-lg font-bold text-stone-100 font-mono">
                      {value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {invulnSave && (
              <div className="relative overflow-hidden rounded-lg border border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-stone-950 p-3">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
                <div className="relative text-center">
                  <div className="text-xs text-purple-400 uppercase tracking-wider mb-1">
                    Invulnerable Save
                  </div>
                  <div className="text-lg font-bold text-purple-300 font-mono">
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
            <WargearOptionsPanel
              options={datasheet.wargear_options}
              selectable
              selectedOptions={unit.equipment ? unit.equipment.split(", ").filter(Boolean) : []}
              onToggleOption={(option) => {
                const current = unit.equipment ? unit.equipment.split(", ").filter(Boolean) : [];
                const updated = current.includes(option)
                  ? current.filter((o) => o !== option)
                  : [...current, option];
                updateUnit(unit.id, { equipment: updated.join(", ") });
              }}
            />
          </div>
        )}

        {/* Wargear Abilities */}
        {datasheet?.wargear_abilities && datasheet.wargear_abilities.length > 0 && (
          <div className="mb-6">
            <WargearAbilitiesPanel abilities={datasheet.wargear_abilities} />
          </div>
        )}

        {/* Abilities Section - Collapsible */}
        {abilities.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowAbilities(!showAbilities)}
              className="w-full flex items-center justify-between text-sm font-semibold text-stone-300 uppercase tracking-wider mb-3 hover:text-emerald-400 transition-colors"
            >
              <span>Abilities ({abilities.length})</span>
              {showAbilities ? (
                <ChevronUp className="w-5 h-5 text-emerald-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-emerald-500" />
              )}
            </button>
            {showAbilities && (
              <div className="space-y-2">
                {abilities.map((ability, idx) => (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-3"
                  >
                    <h3 className="text-sm font-semibold text-emerald-400 mb-1">
                      {ability.name}
                    </h3>
                    <p className="text-xs text-stone-400 leading-relaxed">
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
              className="w-full flex items-center justify-between text-sm font-semibold text-stone-300 uppercase tracking-wider mb-3 hover:text-emerald-400 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Stratagems ({matchingStratagems.length})
              </span>
              {showStratagems ? (
                <ChevronUp className="w-5 h-5 text-emerald-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-emerald-500" />
              )}
            </button>
            {showStratagems && (
              <div className="space-y-2">
                {matchingStratagems.map((strat, idx) => (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-lg border border-amber-500/20 bg-gradient-to-br from-amber-950/10 to-stone-950 p-3"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-sm font-semibold text-amber-400">
                        {strat.name}
                      </h4>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-stone-500 uppercase">{strat.type}</span>
                        <span className="text-xs font-bold text-amber-500 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">
                          {strat.cp}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-stone-500 mb-1">{strat.detachment}</p>
                    <div className="space-y-1 text-xs text-stone-400 leading-relaxed">
                      <p><span className="text-stone-500 font-medium">When:</span> {strat.when}</p>
                      <p><span className="text-stone-500 font-medium">Target:</span> {strat.target}</p>
                      <p><span className="text-stone-500 font-medium">Effect:</span> {strat.effect}</p>
                      {strat.restrictions && (
                        <p><span className="text-red-400/70 font-medium">Restrictions:</span> {strat.restrictions}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Crusade Progression */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-3">
            Crusade Progression
          </h2>

          {/* XP and Rank */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-3">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <div className="relative">
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                  Crusade Points
                </div>
                <div className="text-xl font-bold text-emerald-400 font-mono">
                  {unit.experience_points}
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-3">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <div className="relative">
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                  Rank
                </div>
                <div className={`text-base font-bold ${rankColor}`}>
                  {rank}
                </div>
              </div>
            </div>
          </div>

          {/* Battles */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-3">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <div className="relative">
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                  Battles Fought
                </div>
                <div className="text-xl font-bold text-stone-100 font-mono">
                  {unit.battles_played}
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-3">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <div className="relative">
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                  Battles Survived
                </div>
                <div className="text-xl font-bold text-stone-100 font-mono">
                  {unit.battles_survived}
                </div>
              </div>
            </div>
          </div>

          {/* Battle Honors */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Battle Honors
              </h3>
              <div className="flex items-center gap-3">
                {filteredEnhancements.length > 0 && (
                  <button
                    onClick={() => setShowEnhancementPicker(true)}
                    className="text-xs text-purple-400/70 hover:text-purple-400 transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Enhancement
                  </button>
                )}
                <button
                  onClick={handleAddBattleHonor}
                  className="text-xs text-emerald-500/70 hover:text-emerald-500 transition-colors flex items-center gap-1"
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
                  className="relative overflow-hidden rounded-lg border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-stone-950 p-3"
                >
                  <h4 className="text-sm font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                    <Star className="w-3 h-3" />
                    {honor.name}
                  </h4>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {honor.description}
                  </p>
                </div>
              ))}
              {unit.battle_honours.length === 0 && (
                <p className="text-xs text-stone-600 italic">No battle honours yet.</p>
              )}
            </div>
          </div>

          {/* Battle Scars */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Battle Scars
              </h3>
              <button
                onClick={handleAddBattleScar}
                className="text-xs text-emerald-500/70 hover:text-emerald-500 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {unit.battle_scars.map((scar, idx) => (
                <div
                  key={scar.id || idx}
                  className="relative overflow-hidden rounded-lg border border-red-500/20 bg-gradient-to-br from-red-950/20 to-stone-950 p-3"
                >
                  <h4 className="text-sm font-semibold text-red-400 mb-1">
                    {scar.name}
                  </h4>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {scar.description}
                  </p>
                </div>
              ))}
              {unit.battle_scars.length === 0 && (
                <p className="text-xs text-stone-600 italic">No battle scars yet.</p>
              )}
            </div>
          </div>

          {/* Notes */}
          {unit.notes && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                Notes
              </h3>
              <div className="relative overflow-hidden rounded-lg border border-stone-700/40 bg-gradient-to-br from-stone-900 to-stone-950 p-3">
                <p className="text-xs text-stone-400 leading-relaxed whitespace-pre-line">
                  {unit.notes}
                </p>
              </div>
            </div>
          )}

          {/* Equipment / Relics */}
          {unit.equipment && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                Relics & Upgrades
              </h3>
              <div className="space-y-2">
                <div className="relative overflow-hidden rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-stone-950 p-3">
                  <p className="text-sm font-semibold text-purple-300">
                    {unit.equipment}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={() => setShowSpendXP(true)}
            className="w-full relative overflow-hidden group mb-3"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg transition-all duration-300 group-hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-700/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />

            <div className="relative px-6 py-3 flex items-center justify-center gap-2">
              <Star className="w-5 h-5 text-black" strokeWidth={2} />
              <span className="text-base font-bold text-black tracking-wide">
                Award XP
              </span>
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2 py-2 mb-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        </div>

        {/* Destructive Actions */}
        <div className="space-y-3">
          <button
            onClick={() => setShowDestroyConfirm(true)}
            className="w-full px-6 py-3 rounded-lg border border-red-500/30 bg-gradient-to-br from-red-950/20 to-stone-950 text-red-400 font-semibold hover:border-red-500/50 hover:bg-red-950/30 transition-all flex items-center justify-center gap-2"
          >
            <Skull className="w-5 h-5" />
            Mark as Destroyed
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-6 py-3 rounded-lg border border-red-500/30 bg-gradient-to-br from-red-950/20 to-stone-950 text-red-400 font-semibold hover:border-red-500/50 hover:bg-red-950/30 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Remove from Roster
          </button>
        </div>
      </div>

      {/* Edit Unit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-sm relative overflow-hidden rounded-lg border border-emerald-500/30 bg-gradient-to-br from-stone-900 to-stone-950 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <div className="relative">
              <h3 className="text-lg font-bold text-stone-100 mb-4">Edit Unit</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1">Custom Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-stone-950 border border-emerald-500/20 rounded-lg px-3 py-2 text-stone-100 text-sm focus:border-emerald-500/40 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1">Points Cost</label>
                  <input
                    type="number"
                    value={editPoints}
                    onChange={(e) => setEditPoints(Number(e.target.value))}
                    min="0"
                    className="w-full bg-stone-950 border border-emerald-500/20 rounded-lg px-3 py-2 text-stone-100 text-sm focus:border-emerald-500/40 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    placeholder="Battle notes, lore, etc."
                    className="w-full bg-stone-950 border border-emerald-500/20 rounded-lg px-3 py-2 text-stone-100 text-sm focus:border-emerald-500/40 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 text-stone-300 font-semibold hover:border-emerald-500/40 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-semibold transition-all"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-sm relative overflow-hidden rounded-lg border border-purple-500/30 bg-gradient-to-br from-stone-900 to-stone-950 p-6 max-h-[80vh] overflow-y-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
            <div className="relative">
              <div className="flex justify-center mb-4">
                <Sparkles className="w-12 h-12 text-purple-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-stone-100 text-center mb-2">
                Assign Enhancement
              </h3>
              <p className="text-sm text-stone-400 text-center mb-4">
                Select an enhancement from your detachment
              </p>

              <div className="space-y-3">
                {filteredEnhancements.map((enh, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAssignEnhancement(enh)}
                    className="w-full text-left relative overflow-hidden rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-stone-950 p-3 hover:border-purple-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-purple-300">{enh.name}</h4>
                      <span className="text-xs font-bold text-purple-400 font-mono flex-shrink-0">{enh.cost} pts</span>
                    </div>
                    <p className="text-[10px] text-stone-500 mb-1">{enh.detachment}</p>
                    <FormattedRuleText text={enh.text} className="text-xs" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowEnhancementPicker(false)}
                className="w-full mt-4 px-4 py-2 rounded-lg border border-purple-500/20 bg-gradient-to-br from-stone-900 to-stone-950 text-stone-300 font-semibold hover:border-purple-500/40 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Award XP Modal */}
      {showSpendXP && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-sm relative overflow-hidden rounded-lg border border-emerald-500/30 bg-gradient-to-br from-stone-900 to-stone-950 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <div className="relative">
              <div className="flex justify-center mb-4">
                <Star className="w-12 h-12 text-emerald-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-stone-100 text-center mb-2">
                Award Experience
              </h3>
              <p className="text-sm text-stone-400 text-center mb-4">
                Current XP: <span className="text-emerald-400 font-mono">{unit.experience_points}</span> &middot; Rank: <span className={rankColor}>{rank}</span>
              </p>

              <div className="flex items-center justify-center gap-4 mb-6">
                <button
                  onClick={() => setXpAmount(Math.max(1, xpAmount - 1))}
                  className="w-10 h-10 rounded-lg border border-emerald-500/30 bg-stone-950 text-emerald-400 font-bold text-lg hover:bg-stone-900 transition-colors"
                >
                  -
                </button>
                <div className="text-3xl font-bold text-emerald-400 font-mono w-16 text-center">
                  {xpAmount}
                </div>
                <button
                  onClick={() => setXpAmount(xpAmount + 1)}
                  className="w-10 h-10 rounded-lg border border-emerald-500/30 bg-stone-950 text-emerald-400 font-bold text-lg hover:bg-stone-900 transition-colors"
                >
                  +
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowSpendXP(false); setXpAmount(1); }}
                  className="flex-1 px-4 py-2 rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 text-stone-300 font-semibold hover:border-emerald-500/40 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSpendXP}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-semibold transition-all"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-sm relative overflow-hidden rounded-lg border border-red-500/30 bg-gradient-to-br from-stone-900 to-stone-950 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
            <div className="relative">
              <div className="flex justify-center mb-4">
                <Skull className="w-12 h-12 text-red-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-stone-100 text-center mb-2">
                Mark as Destroyed?
              </h3>
              <p className="text-sm text-stone-400 text-center mb-6">
                This unit will be marked as destroyed but remain in your roster for record keeping.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDestroyConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 text-stone-300 font-semibold hover:border-emerald-500/40 transition-all"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-sm relative overflow-hidden rounded-lg border border-red-500/30 bg-gradient-to-br from-stone-900 to-stone-950 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
            <div className="relative">
              <div className="flex justify-center mb-4">
                <Trash2 className="w-12 h-12 text-red-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-stone-100 text-center mb-2">
                Remove from Roster?
              </h3>
              <p className="text-sm text-stone-400 text-center mb-6">
                This will permanently remove this unit from your roster. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 text-stone-300 font-semibold hover:border-emerald-500/40 transition-all"
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
