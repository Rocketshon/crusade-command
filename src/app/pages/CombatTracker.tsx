import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { ArrowLeft, Swords, Target, Shield, Crosshair, Settings2 } from "lucide-react";
import { useCrusade } from "../../lib/CrusadeContext";
import { getFaction } from "../../lib/factions";
import { getUnitsForFaction } from "../../data";
import {
  resolveCombat,
  getWoundTarget,
  getEffectiveSave,
  parseStatTarget,
  type CombatInput,
  type CombatResult,
} from "../../lib/combatEngine";
import { generateId, safeGetItem, safeSetItem, STORAGE_KEYS } from "../../lib/storage";
import DiceRoller from "../components/DiceRoller";
import CombatLog from "../components/CombatLog";
import type { CrusadeUnit, Datasheet, WeaponProfile, CombatEngagement } from "../../types";

/** Parse attack count from weapon profile, handling dice notation like "D6", "2D6+1" */
function parseAttackCount(a: string): number {
  const num = parseInt(a);
  if (!isNaN(num)) return num;
  // Handle "D6", "D3", "2D6", "2D6+1", etc. — use average (rounded up)
  const match = a.match(/^(\d*)D(\d+)([+-]\d+)?$/i);
  if (match) {
    const multiplier = parseInt(match[1]) || 1;
    const sides = parseInt(match[2]);
    const modifier = parseInt(match[3]) || 0;
    return Math.max(1, multiplier * Math.ceil(sides / 2) + modifier);
  }
  return 1;
}

type Phase = "shooting" | "melee";
type CombatStep = "select" | "weapon" | "preview" | "roll-hit" | "roll-wound" | "roll-save" | "result";

function getDiceMode(): "digital" | "manual" {
  const stored = safeGetItem<string>(STORAGE_KEYS.DICE_MODE, "digital");
  return stored === "manual" ? "manual" : "digital";
}

function setDiceMode(mode: "digital" | "manual") {
  safeSetItem(STORAGE_KEYS.DICE_MODE, JSON.stringify(mode));
}

export default function CombatTracker() {
  const navigate = useNavigate();
  const { opponentId } = useParams<{ opponentId: string }>();
  const { battleId } = (useLocation().state ?? {}) as { battleId?: string };
  const { players, currentPlayer, units, battles, updateBattle } = useCrusade();

  // State
  const [phase, setPhase] = useState<Phase>("shooting");
  const [attackerId, setAttackerId] = useState<string | null>(null);
  const [defenderId, setDefenderId] = useState<string | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponProfile | null>(null);
  const [step, setStep] = useState<CombatStep>("select");
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
  const [hitRolls, setHitRolls] = useState<number[]>([]);
  const [woundRolls, setWoundRolls] = useState<number[]>([]);
  const [engagements, setEngagements] = useState<CombatEngagement[]>([]);
  const [diceMode, setDiceModeState] = useState<"digital" | "manual">(getDiceMode);
  const [turn, setTurn] = useState(1);

  // Find opponent
  const opponent = useMemo(
    () => players.find((p) => p.id === opponentId) ?? null,
    [players, opponentId]
  );

  // My units / opponent units
  const myUnits = useMemo(
    () => units.filter((u) => u.player_id === currentPlayer?.id && !u.is_destroyed),
    [units, currentPlayer]
  );
  const opponentUnits = useMemo(
    () => units.filter((u) => u.player_id === opponentId && !u.is_destroyed),
    [units, opponentId]
  );

  // Datasheet lookups
  const getDatasheet = useCallback(
    (unit: CrusadeUnit): Datasheet | undefined => {
      const player = unit.player_id === currentPlayer?.id ? currentPlayer : opponent;
      if (!player) return undefined;
      const factionUnits = getUnitsForFaction(player.faction_id);
      return factionUnits.find(
        (d) => d.name.toLowerCase() === unit.datasheet_name.toLowerCase()
      );
    },
    [currentPlayer, opponent]
  );

  const attackerUnit = useMemo(
    () => myUnits.find((u) => u.id === attackerId) ?? null,
    [myUnits, attackerId]
  );
  const defenderUnit = useMemo(
    () => opponentUnits.find((u) => u.id === defenderId) ?? null,
    [opponentUnits, defenderId]
  );
  const attackerDatasheet = useMemo(
    () => (attackerUnit ? getDatasheet(attackerUnit) : null),
    [attackerUnit, getDatasheet]
  );
  const defenderDatasheet = useMemo(
    () => (defenderUnit ? getDatasheet(defenderUnit) : null),
    [defenderUnit, getDatasheet]
  );

  // Available weapons based on phase
  const weapons = useMemo(() => {
    if (!attackerDatasheet) return [];
    return phase === "shooting"
      ? attackerDatasheet.ranged_weapons
      : attackerDatasheet.melee_weapons;
  }, [attackerDatasheet, phase]);

  // Combat preview values
  const preview = useMemo(() => {
    if (!selectedWeapon || !defenderDatasheet || !attackerDatasheet) return null;

    const skill = selectedWeapon.skill;
    const hitTarget = parseStatTarget(skill);
    const strength = parseInt(selectedWeapon.S) || 0;
    const toughness = parseInt(defenderDatasheet.stats.T ?? "0") || 0;
    const woundTarget = getWoundTarget(strength, toughness);
    const saveTarget = getEffectiveSave(
      defenderDatasheet.stats.Sv ?? "7+",
      selectedWeapon.AP,
      defenderDatasheet.invuln
    );

    return { hitTarget, woundTarget, saveTarget, skill, strength, toughness };
  }, [selectedWeapon, defenderDatasheet, attackerDatasheet]);

  // Reset selections
  const resetCombat = useCallback(() => {
    setAttackerId(null);
    setDefenderId(null);
    setSelectedWeapon(null);
    setStep("select");
    setCombatResult(null);
    setHitRolls([]);
    setWoundRolls([]);
  }, []);

  // Toggle dice mode
  const toggleDiceMode = () => {
    const newMode = diceMode === "digital" ? "manual" : "digital";
    setDiceModeState(newMode);
    setDiceMode(newMode);
  };

  // Handle attacker selection
  const handleSelectAttacker = (unitId: string) => {
    if (attackerId === unitId) {
      setAttackerId(null);
      setSelectedWeapon(null);
      setStep("select");
    } else {
      setAttackerId(unitId);
      if (defenderId) {
        setStep("weapon");
      }
    }
  };

  // Handle defender selection
  const handleSelectDefender = (unitId: string) => {
    if (defenderId === unitId) {
      setDefenderId(null);
      setSelectedWeapon(null);
      setStep(attackerId ? "select" : "select");
    } else {
      setDefenderId(unitId);
      if (attackerId) {
        setStep("weapon");
      }
    }
  };

  // Handle weapon selection
  const handleSelectWeapon = (weapon: WeaponProfile) => {
    setSelectedWeapon(weapon);
    setStep("preview");
  };

  // Roll for full combat (auto mode)
  const handleFullRoll = () => {
    if (!selectedWeapon || !defenderDatasheet || !attackerDatasheet) return;

    const input: CombatInput = {
      attackerBS: selectedWeapon.skill,
      weapon: selectedWeapon,
      phase,
      defenderT: defenderDatasheet.stats.T ?? "4",
      defenderSv: defenderDatasheet.stats.Sv ?? "4+",
      defenderInvuln: defenderDatasheet.invuln,
      defenderW: defenderDatasheet.stats.W ?? "1",
    };

    const result = resolveCombat(input);
    setCombatResult(result);
    setStep("result");
  };

  // Step-by-step rolling
  const handleStartStepRoll = () => {
    setStep("roll-hit");
  };

  // Hit rolls complete
  const handleHitRollsComplete = (rolls: number[]) => {
    setHitRolls(rolls);
    // Count hits
    const hitTarget = preview?.hitTarget ?? 7;
    let hits = 0;
    for (const r of rolls) {
      if (r === 1) continue;
      if (r === 6 || r >= hitTarget) hits++;
    }
    if (hits > 0) {
      setStep("roll-wound");
    } else {
      // No hits — skip to result with zeroes
      finalizeCombat(rolls, [], []);
    }
  };

  // Wound rolls complete
  const handleWoundRollsComplete = (rolls: number[]) => {
    setWoundRolls(rolls);
    const woundTarget = preview?.woundTarget ?? 7;
    let wounds = 0;
    for (const r of rolls) {
      if (r === 1) continue;
      if (r === 6 || r >= woundTarget) wounds++;
    }
    if (wounds > 0) {
      setStep("roll-save");
    } else {
      finalizeCombat(hitRolls, rolls, []);
    }
  };

  // Save rolls complete
  const handleSaveRollsComplete = (rolls: number[]) => {
    finalizeCombat(hitRolls, woundRolls, rolls);
  };

  // Finalize combat with manual rolls
  const finalizeCombat = (hitR: number[], woundR: number[], saveR: number[]) => {
    if (!selectedWeapon || !defenderDatasheet || !attackerDatasheet) return;

    const input: CombatInput = {
      attackerBS: selectedWeapon.skill,
      weapon: selectedWeapon,
      phase,
      defenderT: defenderDatasheet.stats.T ?? "4",
      defenderSv: defenderDatasheet.stats.Sv ?? "4+",
      defenderInvuln: defenderDatasheet.invuln,
      defenderW: defenderDatasheet.stats.W ?? "1",
      manualHitRolls: hitR.length > 0 ? hitR : undefined,
      manualWoundRolls: woundR.length > 0 ? woundR : undefined,
      manualSaveRolls: saveR.length > 0 ? saveR : undefined,
    };

    const result = resolveCombat(input);
    setCombatResult(result);
    setStep("result");
  };

  // Log engagement
  const handleLogEngagement = () => {
    if (!combatResult || !attackerUnit || !defenderUnit || !selectedWeapon) return;

    const engagement: CombatEngagement = {
      id: generateId(),
      turn,
      phase,
      attacker_unit_id: attackerUnit.id,
      attacker_unit_name: attackerUnit.custom_name || attackerUnit.datasheet_name,
      attacker_weapon: selectedWeapon.name,
      defender_unit_id: defenderUnit.id,
      defender_unit_name: defenderUnit.custom_name || defenderUnit.datasheet_name,
      defender_player_id: opponentId ?? "",
      attacks: combatResult.totalAttacks,
      hits: combatResult.hits,
      wounds: combatResult.wounds,
      failed_saves: combatResult.failedSaves,
      damage_dealt: combatResult.totalDamage,
      models_destroyed: combatResult.modelsDestroyed,
      timestamp: new Date().toISOString(),
    };

    setEngagements((prev) => [engagement, ...prev]);

    // Save engagement to the specific battle (by ID) or fall back to most recent
    const targetBattle = battleId ? battles.find(b => b.id === battleId) : battles[0];
    if (targetBattle) {
      const updatedLog = [...(targetBattle.combat_log || []), engagement];
      updateBattle(targetBattle.id, { combat_log: updatedLog });
    }

    resetCombat();
  };

  // Count hits for wound roll count
  const hitsForWoundRoll = useMemo(() => {
    if (!preview || hitRolls.length === 0) return 0;
    let hits = 0;
    for (const r of hitRolls) {
      if (r === 1) continue;
      if (r === 6 || r >= preview.hitTarget) hits++;
    }
    return hits;
  }, [hitRolls, preview]);

  // Count wounds for save roll count
  const woundsForSaveRoll = useMemo(() => {
    if (!preview || woundRolls.length === 0) return 0;
    let wounds = 0;
    for (const r of woundRolls) {
      if (r === 1) continue;
      if (r === 6 || r >= preview.woundTarget) wounds++;
    }
    return wounds;
  }, [woundRolls, preview]);

  const myFaction = currentPlayer ? getFaction(currentPlayer.faction_id) : null;
  const oppFaction = opponent ? getFaction(opponent.faction_id) : null;

  // Effect: sync dice mode from localStorage on mount
  useEffect(() => {
    setDiceModeState(getDiceMode());
  }, []);

  // Guard: no own units
  if (myUnits.length === 0) {
    return (
      <div className="min-h-screen bg-black p-6 pb-24">
        <button onClick={() => navigate(-1)} className="mb-4 text-stone-400">&larr; Back</button>
        <div className="text-center py-12">
          <p className="text-stone-400 mb-2">You have no units in your roster.</p>
          <p className="text-stone-500 text-sm mb-4">Add units before entering battle.</p>
          <button onClick={() => navigate('/add-unit')} className="px-4 py-2 rounded-sm bg-emerald-600 text-black font-semibold">Add Units</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-sm border-b border-stone-800 px-4 py-3">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button
            onClick={() => navigate("/battle-lobby")}
            className="text-stone-400 hover:text-stone-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Swords className="w-5 h-5 text-emerald-500" />
          <h1 className="text-lg font-bold text-stone-100 flex-1">Combat Tracker</h1>

          {/* Turn counter */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTurn((t) => Math.max(1, t - 1))}
              className="w-6 h-6 rounded-sm bg-stone-800 text-stone-400 hover:text-stone-200 flex items-center justify-center text-xs"
            >
              -
            </button>
            <span className="text-xs text-stone-400 min-w-[40px] text-center">
              T{turn}
            </span>
            <button
              onClick={() => setTurn((t) => t + 1)}
              className="w-6 h-6 rounded-sm bg-stone-800 text-stone-400 hover:text-stone-200 flex items-center justify-center text-xs"
            >
              +
            </button>
          </div>

          {/* Dice mode toggle */}
          <button
            onClick={toggleDiceMode}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors"
            title={`Dice: ${diceMode}`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{diceMode === "digital" ? "Auto" : "Manual"}</span>
          </button>
        </div>

        {/* Phase tabs */}
        <div className="flex gap-2 mt-2 max-w-md mx-auto">
          <button
            onClick={() => {
              setPhase("shooting");
              setSelectedWeapon(null);
              if (step === "weapon" || step === "preview") setStep("weapon");
            }}
            className={`flex-1 py-1.5 rounded-sm text-xs font-semibold transition-colors ${
              phase === "shooting"
                ? "bg-emerald-600 text-black"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            <Crosshair className="w-3 h-3 inline mr-1" />
            Shooting
          </button>
          <button
            onClick={() => {
              setPhase("melee");
              setSelectedWeapon(null);
              if (step === "weapon" || step === "preview") setStep("weapon");
            }}
            className={`flex-1 py-1.5 rounded-sm text-xs font-semibold transition-colors ${
              phase === "melee"
                ? "bg-red-600 text-white"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            <Swords className="w-3 h-3 inline mr-1" />
            Melee
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 max-w-md mx-auto w-full">
        {/* YOUR ARMY (top) */}
        <div className="mt-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-emerald-500 font-semibold uppercase tracking-wider">
              {myFaction?.icon} Your Army
            </span>
            {attackerUnit && (
              <span className="text-[10px] text-emerald-400 ml-auto">
                Attacker: {attackerUnit.custom_name || attackerUnit.datasheet_name}
              </span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {myUnits.map((unit) => {
              const isSelected = attackerId === unit.id;
              return (
                <button
                  key={unit.id}
                  onClick={() => handleSelectAttacker(unit.id)}
                  className={`flex-shrink-0 px-3 py-2 rounded-sm border text-xs whitespace-nowrap transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                      : "border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500"
                  }`}
                >
                  {unit.custom_name || unit.datasheet_name}
                </button>
              );
            })}
            {myUnits.length === 0 && (
              <p className="text-xs text-stone-600 py-2">No units in your roster</p>
            )}
          </div>
        </div>

        {/* COMBAT RESOLUTION AREA (middle) */}
        <div className="rounded-sm border border-stone-700/60 bg-stone-900/50 p-4 mb-3 min-h-[200px]">
          {/* Step: Select */}
          {step === "select" && (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <Target className="w-10 h-10 text-stone-700 mb-3" strokeWidth={1.5} />
              <p className="text-stone-500 text-sm text-center">
                {!attackerId
                  ? "Select one of your units above"
                  : "Select an enemy unit below"}
              </p>
            </div>
          )}

          {/* Step: Weapon picker */}
          {step === "weapon" && (
            <div>
              <h3 className="text-sm font-semibold text-stone-200 mb-3">
                Select Weapon ({phase === "shooting" ? "Ranged" : "Melee"})
              </h3>
              {weapons.length === 0 ? (
                <p className="text-xs text-stone-500">
                  No {phase === "shooting" ? "ranged" : "melee"} weapons available
                </p>
              ) : (
                <div className="space-y-2">
                  {weapons.map((w, i) => (
                    <button
                      key={`${w.name}-${i}`}
                      onClick={() => handleSelectWeapon(w)}
                      className="w-full rounded-sm border border-stone-700 bg-stone-800 p-3 text-left hover:border-emerald-500/50 transition-colors"
                    >
                      <div className="font-semibold text-sm text-stone-200 mb-1">
                        {w.name}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-stone-400">
                        <span>Range: {w.range}</span>
                        <span>A: {w.A}</span>
                        <span>Skill: {w.skill}</span>
                        <span>S: {w.S}</span>
                        <span>AP: {w.AP}</span>
                        <span>D: {w.D}</span>
                      </div>
                      {w.traits.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {w.traits.map((t, j) => (
                            <span
                              key={j}
                              className="text-[9px] bg-stone-700 text-stone-300 px-1.5 py-0.5 rounded-sm"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && preview && selectedWeapon && (
            <div>
              <h3 className="text-sm font-semibold text-stone-200 mb-3">
                Combat Preview
              </h3>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400">Weapon</span>
                  <span className="text-stone-200 font-semibold">{selectedWeapon.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400">Attacks</span>
                  <span className="text-stone-200 font-semibold">{selectedWeapon.A}</span>
                </div>
                <div className="h-px bg-stone-800" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400 flex items-center gap-1">
                    <Crosshair className="w-3 h-3" /> To Hit
                  </span>
                  <span className="text-emerald-400 font-bold">{preview.hitTarget}+</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400 flex items-center gap-1">
                    <Target className="w-3 h-3" /> To Wound
                  </span>
                  <span className="text-amber-400 font-bold">
                    {preview.woundTarget}+ (S{preview.strength} vs T{preview.toughness})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Save
                  </span>
                  <span className="text-blue-400 font-bold">
                    {preview.saveTarget > 6 ? "No save" : `${preview.saveTarget}+`}
                    {selectedWeapon.AP !== "0" && ` (AP ${selectedWeapon.AP})`}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleFullRoll}
                  className="flex-1 py-2.5 rounded-sm bg-emerald-600 hover:bg-emerald-500 text-black font-semibold text-sm transition-colors"
                >
                  Quick Roll
                </button>
                <button
                  onClick={handleStartStepRoll}
                  className="flex-1 py-2.5 rounded-sm border border-emerald-500/50 text-emerald-400 font-semibold text-sm hover:bg-emerald-500/10 transition-colors"
                >
                  Step-by-Step
                </button>
              </div>
            </div>
          )}

          {/* Step: Roll Hits */}
          {step === "roll-hit" && preview && selectedWeapon && (
            <DiceRoller
              count={parseAttackCount(selectedWeapon.A)}
              target={preview.hitTarget}
              label="Hit Rolls"
              mode={diceMode}
              onComplete={handleHitRollsComplete}
            />
          )}

          {/* Step: Roll Wounds */}
          {step === "roll-wound" && preview && (
            <DiceRoller
              count={hitsForWoundRoll}
              target={preview.woundTarget}
              label="Wound Rolls"
              mode={diceMode}
              onComplete={handleWoundRollsComplete}
            />
          )}

          {/* Step: Roll Saves */}
          {step === "roll-save" && preview && (
            <DiceRoller
              count={woundsForSaveRoll}
              target={preview.saveTarget}
              label="Save Rolls (opponent)"
              mode={diceMode}
              onComplete={handleSaveRollsComplete}
            />
          )}

          {/* Step: Result */}
          {step === "result" && combatResult && (
            <div>
              <h3 className="text-sm font-semibold text-stone-200 mb-3">
                Combat Result
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-sm bg-stone-800 p-2.5 text-center">
                  <div className="text-lg font-bold text-stone-100">
                    {combatResult.totalAttacks}
                  </div>
                  <div className="text-[10px] text-stone-500">Attacks</div>
                </div>
                <div className="rounded-sm bg-stone-800 p-2.5 text-center">
                  <div className="text-lg font-bold text-emerald-400">
                    {combatResult.hits}
                  </div>
                  <div className="text-[10px] text-stone-500">Hits</div>
                </div>
                <div className="rounded-sm bg-stone-800 p-2.5 text-center">
                  <div className="text-lg font-bold text-amber-400">
                    {combatResult.wounds}
                  </div>
                  <div className="text-[10px] text-stone-500">Wounds</div>
                </div>
                <div className="rounded-sm bg-stone-800 p-2.5 text-center">
                  <div className="text-lg font-bold text-red-400">
                    {combatResult.failedSaves}
                  </div>
                  <div className="text-[10px] text-stone-500">Unsaved</div>
                </div>
              </div>

              <div className="rounded-sm border border-stone-700 bg-stone-800/50 p-3 mb-4 text-center">
                <div className="text-2xl font-bold text-stone-100">
                  {combatResult.totalDamage}
                </div>
                <div className="text-xs text-stone-400">Total Damage</div>
                {combatResult.modelsDestroyed > 0 && (
                  <div className="text-sm text-red-400 font-semibold mt-1">
                    {combatResult.modelsDestroyed} model{combatResult.modelsDestroyed > 1 ? "s" : ""} destroyed
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleLogEngagement}
                  className="flex-1 py-2.5 rounded-sm bg-emerald-600 hover:bg-emerald-500 text-black font-semibold text-sm transition-colors"
                >
                  Log Engagement
                </button>
                <button
                  onClick={resetCombat}
                  className="py-2.5 px-4 rounded-sm border border-stone-600 text-stone-400 text-sm hover:text-stone-200 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* OPPONENT'S ARMY (bottom) */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-red-500 font-semibold uppercase tracking-wider">
              {oppFaction?.icon} {opponent?.name ?? "Opponent"}
            </span>
            {defenderUnit && (
              <span className="text-[10px] text-red-400 ml-auto">
                Defender: {defenderUnit.custom_name || defenderUnit.datasheet_name}
              </span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {opponentUnits.map((unit) => {
              const isSelected = defenderId === unit.id;
              return (
                <button
                  key={unit.id}
                  onClick={() => handleSelectDefender(unit.id)}
                  className={`flex-shrink-0 px-3 py-2 rounded-sm border text-xs whitespace-nowrap transition-all ${
                    isSelected
                      ? "border-red-500 bg-red-500/20 text-red-300"
                      : "border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500"
                  }`}
                >
                  {unit.custom_name || unit.datasheet_name}
                </button>
              );
            })}
            {opponentUnits.length === 0 && (
              <div className="text-center py-4">
                <p className="text-stone-400 text-sm">Opponent's units haven't synced yet.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-3 py-1 text-xs rounded-sm border border-stone-700 text-stone-400 hover:text-stone-200"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        </div>

        {/* COMBAT LOG */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            <span className="text-xs text-stone-500 uppercase tracking-wider">
              Combat Log
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          </div>
          <CombatLog engagements={engagements} />
        </div>
      </div>
    </div>
  );
}
