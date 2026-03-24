import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { ArrowLeft, Check, ChevronDown, X, Award, Zap, Skull, TrendingUp, Trophy } from "lucide-react";
import { useCrusade } from "../../lib/CrusadeContext";
import { useCampaignGuard } from "../../lib/hooks/useCampaignGuard";
import { getRankFromXP, getRankColor } from "../../lib/ranks";
import { generateId } from "../../lib/storage";
import { updatePlayerInCloud } from "../../lib/sync";
import { isSupabaseConfigured } from "../../lib/supabase";

// Battle scars options (game rules, not mock data)
const BATTLE_SCARS = [
  { id: "no-scar", name: "No Scar", description: "Unit avoided permanent injury" },
  { id: "shell-shock", name: "Shell Shock", description: "-1 to hit with ranged weapons" },
  { id: "maimed", name: "Maimed", description: "-1 to Move characteristic" },
  { id: "traumatized", name: "Traumatized", description: "-1 to Leadership" },
  { id: "damaged-armor", name: "Damaged Armor", description: "-1 to Save characteristic" },
  { id: "cursed", name: "Cursed", description: "Nearby allies suffer -1 Ld" },
  { id: "haunted", name: "Haunted", description: "Must pass Ld test to advance" },
];

// Battle honors options (game rules, not mock data)
const BATTLE_HONORS = [
  { id: "hero", name: "Hero of the Chapter", category: "Battle Trait", description: "+1 to hit rolls in melee" },
  { id: "marksman", name: "Master Marksman", category: "Battle Trait", description: "+1 to hit with ranged weapons" },
  { id: "resilient", name: "Iron Will", category: "Battle Trait", description: "+1 to Toughness" },
  { id: "lethal", name: "Lethal Blows", category: "Weapon Enhancement", description: "Melee weapons gain +1 Strength" },
  { id: "precision", name: "Precision Shot", category: "Weapon Enhancement", description: "Ranged weapons gain +1 AP" },
  { id: "fortitude", name: "Psychic Fortitude", category: "Psychic Fortitude", description: "Ignore perils on a 5+" },
  { id: "champion", name: "Champion of Mankind", category: "Battle Trait", description: "Re-roll one hit per turn" },
  { id: "stalwart", name: "Stalwart Defender", category: "Battle Trait", description: "+1 to armor saves" },
];

interface UnitState {
  id: string;
  destroyed: boolean;
  xpGained: number;
  newTotalXP: number;
  rankedUp: boolean;
  newRank: string;
  selectedScar: string | null;
  selectedHonor: string | null;
}

export default function PostBattleWizard() {
  const guard = useCampaignGuard();
  const navigate = useNavigate();
  const location = useLocation();
  const { battles, units, awardXP, recordBattleParticipation, addBattleScar, addBattleHonour, markDestroyed, awardRequisition } = useCrusade();

  // Get the battle by ID from location state, or fall back to most recent
  const targetBattleId = (location.state as { battleId?: string } | null)?.battleId;
  const latestBattle = useMemo(() => {
    if (targetBattleId) {
      return battles.find(b => b.id === targetBattleId) ?? battles[0] ?? null;
    }
    return battles[0] ?? null;
  }, [targetBattleId, battles]);

  // Guard: prevent double-apply on back-navigation remount
  const alreadyProcessed = latestBattle && sessionStorage.getItem('lastProcessedBattleId') === latestBattle.id;
  const battleWon = latestBattle?.result === "victory";

  // Get fielded units: from battle.units_fielded, or fall back to all roster units
  const fieldedUnits = useMemo(() => {
    if (!latestBattle) return [];
    if (latestBattle.units_fielded.length > 0) {
      return latestBattle.units_fielded
        .map(id => units.find(u => u.id === id))
        .filter(Boolean) as typeof units;
    }
    // Fall back to current player's roster units only (not all units in the campaign)
    return units.filter(u => u.player_id === guard.currentPlayer?.id);
  }, [latestBattle, units, guard.currentPlayer]);

  const [currentStep, setCurrentStep] = useState(1);

  // Unit states
  const [unitStates, setUnitStates] = useState<Record<string, UnitState>>(() =>
    fieldedUnits.reduce((acc, unit) => {
      acc[unit.id] = {
        id: unit.id,
        destroyed: false,
        xpGained: 0,
        newTotalXP: unit.experience_points,
        rankedUp: false,
        newRank: unit.rank,
        selectedScar: null,
        selectedHonor: null,
      };
      return acc;
    }, {} as Record<string, UnitState>)
  );

  // Track the fielded unit IDs at mount time to detect if units change
  const initialUnitIdsRef = useRef(fieldedUnits.map(u => u.id).join(','));

  // Re-initialize unitStates if the fielded units change (e.g. from stale data)
  useEffect(() => {
    const currentIds = fieldedUnits.map(u => u.id).join(',');
    if (currentIds !== initialUnitIdsRef.current) {
      initialUnitIdsRef.current = currentIds;
      setUnitStates(
        fieldedUnits.reduce((acc, unit) => {
          acc[unit.id] = {
            id: unit.id,
            destroyed: false,
            xpGained: 0,
            newTotalXP: unit.experience_points,
            rankedUp: false,
            newRank: unit.rank,
            selectedScar: null,
            selectedHonor: null,
          };
          return acc;
        }, {} as Record<string, UnitState>)
      );
    }
  }, [fieldedUnits]);

  // Track whether step 5 changes have been applied
  const [changesApplied, setChangesApplied] = useState(!!alreadyProcessed);
  const appliedRef = useRef(false);
  // Sync ref with initial state
  if (alreadyProcessed && !appliedRef.current) {
    appliedRef.current = true;
  }

  // If already processed, skip straight to summary and recalculate XP for display
  useEffect(() => {
    if (alreadyProcessed) {
      setCurrentStep(5);
    }
  }, [alreadyProcessed]);

  useEffect(() => {
    if (alreadyProcessed && latestBattle) {
      calculateXP();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyProcessed, latestBattle]);

  // UI state for pickers
  const [scarPickerOpen, setScarPickerOpen] = useState<string | null>(null);
  const [honorPickerOpen, setHonorPickerOpen] = useState<string | null>(null);

  // Early returns AFTER all hooks
  if (!guard.ready) return null;

  const { currentPlayer } = guard;

  const steps = [
    { number: 1, name: "Casualties" },
    { number: 2, name: "Experience" },
    { number: 3, name: "Scars" },
    { number: 4, name: "Honors" },
    { number: 5, name: "Summary" },
  ];

  const toggleDestroyed = (unitId: string) => {
    setUnitStates((prev) => ({
      ...prev,
      [unitId]: { ...prev[unitId], destroyed: !prev[unitId].destroyed },
    }));
  };

  const calculateXP = () => {
    const newStates = { ...unitStates };
    fieldedUnits.forEach((unit) => {
      const state = newStates[unit.id];
      if (!state) return;

      let xp = 1; // Participated
      if (!state.destroyed) xp += 1; // Survived
      if (latestBattle?.marked_for_greatness === unit.id) xp += 1; // Marked for Greatness
      if (battleWon) xp += 1; // Won battle

      const newTotal = unit.experience_points + xp;
      const oldRank = getRankFromXP(unit.experience_points);
      const newRank = getRankFromXP(newTotal);

      newStates[unit.id] = {
        ...state,
        xpGained: xp,
        newTotalXP: newTotal,
        rankedUp: oldRank !== newRank,
        newRank,
      };
    });
    setUnitStates(newStates);
  };

  const selectScar = (unitId: string, scarId: string) => {
    setUnitStates((prev) => ({
      ...prev,
      [unitId]: { ...prev[unitId], selectedScar: scarId },
    }));
    setScarPickerOpen(null);
  };

  const selectHonor = (unitId: string, honorId: string) => {
    setUnitStates((prev) => ({
      ...prev,
      [unitId]: { ...prev[unitId], selectedHonor: honorId },
    }));
    setHonorPickerOpen(null);
  };

  const applyChanges = () => {
    if (appliedRef.current) return;
    appliedRef.current = true;

    fieldedUnits.forEach((unit) => {
      const state = unitStates[unit.id];
      if (!state) return;

      // Award XP
      if (state.xpGained > 0) {
        awardXP(unit.id, state.xpGained);
      }

      // Record battle participation (survived = not destroyed)
      recordBattleParticipation(unit.id, !state.destroyed);

      // Mark destroyed
      if (state.destroyed) {
        markDestroyed(unit.id);
      }

      // Add battle scar
      if (state.selectedScar && state.selectedScar !== "no-scar") {
        const scarDef = BATTLE_SCARS.find(s => s.id === state.selectedScar);
        if (scarDef) {
          addBattleScar(unit.id, {
            id: generateId(),
            name: scarDef.name,
            description: scarDef.description,
          });
        }
      }

      // Add battle honour
      if (state.selectedHonor) {
        const honorDef = BATTLE_HONORS.find(h => h.id === state.selectedHonor);
        if (honorDef) {
          addBattleHonour(unit.id, {
            id: generateId(),
            type: honorDef.category === "Weapon Enhancement" ? "weapon_enhancement"
              : honorDef.category === "Psychic Fortitude" ? "psychic_fortitude"
              : "battle_trait",
            name: honorDef.name,
            description: honorDef.description,
          });
        }
      }
    });

    // Award RP for winning
    if (battleWon) {
      awardRequisition(1);
    }

    // Persist guard BEFORE state update so it survives unmount mid-update
    if (latestBattle) {
      sessionStorage.setItem('lastProcessedBattleId', latestBattle.id);
    }
    setChangesApplied(true);

    // Push player data to cloud immediately so it isn't lost on navigation
    if (isSupabaseConfigured() && currentPlayer) {
      setTimeout(() => {
        if (currentPlayer) {
          updatePlayerInCloud(currentPlayer).catch(console.warn);
        }
      }, 100);
    }
  };

  const goToNextStep = () => {
    if (currentStep === 1) {
      calculateXP();
    }
    if (currentStep === 4) {
      // Moving to summary step — apply all changes
      applyChanges();
    }
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const destroyedUnits = fieldedUnits.filter((u) => unitStates[u.id]?.destroyed);
  const rankedUpUnits = fieldedUnits.filter((u) => unitStates[u.id]?.rankedUp);

  if (!latestBattle) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-stone-400 mb-4">No recent battle to process.</p>
          <button
            onClick={() => navigate("/campaign/active")}
            className="px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 text-black"
          >
            Return to Campaign
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col min-h-screen">
        {/* Header with progress */}
        <div className="p-6 pb-4 border-b border-stone-700/60">
          <button
            onClick={() => currentStep === 1 ? navigate(-1) : goToPreviousStep()}
            className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">{currentStep === 1 ? "Cancel" : "Back"}</span>
          </button>

          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step.number < currentStep
                        ? "bg-emerald-500 text-black"
                        : step.number === currentStep
                        ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                        : "bg-stone-800 text-stone-500"
                    }`}
                  >
                    {step.number < currentStep ? (
                      <Check className="w-4 h-4" strokeWidth={3} />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-1 ${
                      step.number === currentStep ? "text-amber-400" : "text-stone-500"
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 mt-[-16px] ${
                      step.number < currentStep ? "bg-emerald-500" : "bg-stone-800"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-visible p-6">
          {/* STEP 1 - Mark Casualties */}
          {currentStep === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] mb-2">
                Mark Casualties
              </h1>
              <p className="text-stone-400 text-sm mb-6">
                Which of your units were destroyed during the battle?
              </p>

              <div className="space-y-3">
                {fieldedUnits.map((unit) => {
                  const isDestroyed = unitStates[unit.id]?.destroyed ?? false;
                  const rank = unit.rank || getRankFromXP(unit.experience_points);
                  const rankColor = getRankColor(rank);
                  return (
                    <button
                      key={unit.id}
                      onClick={() => toggleDestroyed(unit.id)}
                      className={`w-full rounded-sm border transition-all p-4 text-left ${
                        isDestroyed
                          ? "border-red-500/40 bg-gradient-to-br from-red-950/40 to-stone-950"
                          : "border-stone-700/60 bg-stone-900 hover:border-emerald-500/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3
                            className={`font-semibold mb-1 ${
                              isDestroyed ? "line-through text-stone-500" : "text-stone-300"
                            }`}
                          >
                            {unit.custom_name}
                          </h3>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-stone-500">{unit.points_cost} pts</span>
                            <span className={`px-2 py-0.5 rounded-full bg-stone-800 ${rankColor} font-medium`}>
                              {rank}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`flex items-center justify-center w-6 h-6 rounded border-2 transition-all ${
                            isDestroyed
                              ? "border-red-500 bg-red-500"
                              : "border-stone-600"
                          }`}
                        >
                          {isDestroyed && <X className="w-4 h-4 text-black" strokeWidth={3} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2 - Award Experience */}
          {currentStep === 2 && (
            <div>
              <h1 className="text-2xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] mb-2">
                Award Experience
              </h1>
              <p className="text-stone-400 text-sm mb-6">
                XP is automatically calculated based on battle participation
              </p>

              <div className="space-y-3">
                {fieldedUnits.map((unit) => {
                  const state = unitStates[unit.id];
                  if (!state) return null;
                  const isMarkedForGreatness = latestBattle?.marked_for_greatness === unit.id;
                  const newRankColor = getRankColor(getRankFromXP(state.newTotalXP));
                  return (
                    <div
                      key={unit.id}
                      className="rounded-sm border border-stone-700/60 bg-stone-900 p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-stone-300">{unit.custom_name}</h3>
                        {state.rankedUp && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/40">
                            <Award className="w-3 h-3 text-amber-400" />
                            <span className="text-xs font-bold text-amber-400">RANK UP!</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 text-xs mb-3">
                        <div className="flex justify-between text-stone-400">
                          <span>+1 Participated</span>
                        </div>
                        {!state.destroyed && (
                          <div className="flex justify-between text-stone-400">
                            <span>+1 Survived</span>
                          </div>
                        )}
                        {isMarkedForGreatness && (
                          <div className="flex justify-between text-emerald-500">
                            <span>+1 Marked for Greatness</span>
                          </div>
                        )}
                        {battleWon && (
                          <div className="flex justify-between text-stone-400">
                            <span>+1 Won Battle</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-stone-700">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-emerald-500" />
                          <span className="text-stone-400 text-sm">XP Gained:</span>
                          <span className="font-bold text-emerald-400">+{state.xpGained}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-stone-500">New Total</p>
                          <p className="font-bold text-stone-300">{state.newTotalXP} XP</p>
                          <p className={`text-xs font-medium ${newRankColor}`}>({state.newRank})</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3 - Battle Scars */}
          {currentStep === 3 && (
            <div>
              <h1 className="text-2xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] mb-2">
                Battle Scars
              </h1>
              <p className="text-stone-400 text-sm mb-6">
                Destroyed units must test for battle scars
              </p>

              {destroyedUnits.length === 0 ? (
                <div className="rounded-sm border border-emerald-500/30 bg-stone-900 p-6 text-center">
                  <Check className="w-12 h-12 text-emerald-500 mx-auto mb-3" strokeWidth={1.5} />
                  <h3 className="text-lg font-semibold text-emerald-400 mb-2">No Casualties</h3>
                  <p className="text-stone-400 text-sm">No scars to assign this battle</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {destroyedUnits.map((unit) => {
                    const state = unitStates[unit.id];
                    if (!state) return null;
                    const selectedScar = BATTLE_SCARS.find((s) => s.id === state.selectedScar);

                    return (
                      <div
                        key={unit.id}
                        className="rounded-sm border border-red-500/30 bg-stone-900 p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Skull className="w-4 h-4 text-red-500" />
                          <h3 className="font-semibold text-stone-300">{unit.custom_name}</h3>
                        </div>

                        <div className="relative">
                          <button
                            onClick={() => setScarPickerOpen(scarPickerOpen === unit.id ? null : unit.id)}
                            className="w-full rounded-sm border border-stone-700/60 bg-stone-900 px-4 py-3 text-left hover:border-emerald-500/50 transition-all flex items-center justify-between"
                          >
                            {selectedScar ? (
                              <div>
                                <p className="font-semibold text-red-400">{selectedScar.name}</p>
                                <p className="text-xs text-stone-500 mt-1">{selectedScar.description}</p>
                              </div>
                            ) : (
                              <span className="text-stone-500">Assign Battle Scar...</span>
                            )}
                            <ChevronDown className="w-5 h-5 text-stone-500" />
                          </button>

                          {scarPickerOpen === unit.id && (
                            <div className="absolute z-10 w-full mt-2 bg-stone-900 border border-stone-700/60 rounded-sm overflow-hidden shadow-2xl">
                              {BATTLE_SCARS.map((scar) => (
                                <button
                                  key={scar.id}
                                  onClick={() => selectScar(unit.id, scar.id)}
                                  className={`w-full px-4 py-3 text-left transition-colors border-b border-stone-800 last:border-0 ${
                                    scar.id === state.selectedScar
                                      ? "bg-red-500/10 text-red-400"
                                      : "text-stone-300 hover:bg-stone-800"
                                  }`}
                                >
                                  <p className="font-semibold text-sm">{scar.name}</p>
                                  <p className="text-xs text-stone-500 mt-1">{scar.description}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 4 - Battle Honors */}
          {currentStep === 4 && (
            <div>
              <h1 className="text-2xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] mb-2">
                Battle Honors
              </h1>
              <p className="text-stone-400 text-sm mb-6">
                Units that ranked up may select a battle honor
              </p>

              {rankedUpUnits.length === 0 ? (
                <div className="rounded-sm border border-stone-700/50 bg-stone-900 p-6 text-center">
                  <Award className="w-12 h-12 text-stone-500 mx-auto mb-3" strokeWidth={1.5} />
                  <h3 className="text-lg font-semibold text-stone-400 mb-2">No Rank Ups</h3>
                  <p className="text-stone-500 text-sm">No units ranked up this battle</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rankedUpUnits.map((unit) => {
                    const state = unitStates[unit.id];
                    if (!state) return null;
                    const selectedHonor = BATTLE_HONORS.find((h) => h.id === state.selectedHonor);
                    const newRankColor = getRankColor(getRankFromXP(state.newTotalXP));

                    return (
                      <div
                        key={unit.id}
                        className="rounded-sm border border-emerald-500/30 bg-stone-900 p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Award className="w-4 h-4 text-amber-400" />
                          <h3 className="font-semibold text-stone-300">{unit.custom_name}</h3>
                          <span className={`px-2 py-0.5 rounded-full bg-amber-500/20 ${newRankColor} text-xs font-bold`}>
                            {state.newRank}
                          </span>
                        </div>

                        <div className="relative">
                          <button
                            onClick={() => setHonorPickerOpen(honorPickerOpen === unit.id ? null : unit.id)}
                            className="w-full rounded-sm border border-stone-700/60 bg-stone-900 px-4 py-3 text-left hover:border-emerald-500/50 transition-all flex items-center justify-between"
                          >
                            {selectedHonor ? (
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-emerald-400">{selectedHonor.name}</p>
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold">
                                    {selectedHonor.category}
                                  </span>
                                </div>
                                <p className="text-xs text-stone-500">{selectedHonor.description}</p>
                              </div>
                            ) : (
                              <span className="text-stone-500">Select Battle Honor...</span>
                            )}
                            <ChevronDown className="w-5 h-5 text-stone-500" />
                          </button>

                          {honorPickerOpen === unit.id && (
                            <div className="absolute z-10 w-full mt-2 bg-stone-900 border border-stone-700/60 rounded-sm overflow-hidden shadow-2xl max-h-80 overflow-y-auto">
                              {BATTLE_HONORS.map((honor) => (
                                <button
                                  key={honor.id}
                                  onClick={() => selectHonor(unit.id, honor.id)}
                                  className={`w-full px-4 py-3 text-left transition-colors border-b border-stone-800 last:border-0 ${
                                    honor.id === state.selectedHonor
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : "text-stone-300 hover:bg-stone-800"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-sm">{honor.name}</p>
                                    <span className="px-2 py-0.5 rounded-full bg-stone-700 text-stone-400 text-[10px] font-semibold">
                                      {honor.category}
                                    </span>
                                  </div>
                                  <p className="text-xs text-stone-500">{honor.description}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 5 - Summary & Rewards */}
          {currentStep === 5 && (
            <div>
              <h1 className="text-2xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] mb-2">
                Battle Complete
              </h1>
              <p className="text-stone-400 text-sm mb-6">
                Crusade updated successfully
              </p>

              {/* Campaign stats */}
              <div className="rounded-sm border border-emerald-500/30 bg-stone-900 p-5 mb-6">
                <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3">
                  Campaign Update
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400 text-sm">New Record:</span>
                    <span className="text-stone-300 font-semibold">
                      {currentPlayer?.battles_won ?? 0}W - {currentPlayer?.battles_lost ?? 0}L - {currentPlayer?.battles_drawn ?? 0}D
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400 text-sm">RP Gained:</span>
                    <span className="text-emerald-400 font-bold">+{battleWon ? 1 : 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400 text-sm">Current RP:</span>
                    <span className="text-stone-300 font-bold">{currentPlayer?.requisition_points ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Recap */}
              <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3">
                Battle Recap
              </h3>

              <div className="space-y-3">
                {/* XP Gained */}
                {fieldedUnits.map((unit) => {
                  const state = unitStates[unit.id];
                  if (!state) return null;
                  const newRankColor = getRankColor(getRankFromXP(state.newTotalXP));
                  return (
                    <div key={unit.id} className="rounded-sm border border-stone-700/50 bg-stone-900 p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-stone-300 text-sm">{unit.custom_name}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">
                              <Zap className="w-3 h-3" />
                              +{state.xpGained} XP
                            </span>
                            {state.rankedUp && (
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 ${newRankColor} text-xs`}>
                                <TrendingUp className="w-3 h-3" />
                                {state.newRank}
                              </span>
                            )}
                            {state.destroyed && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs">
                                <Skull className="w-3 h-3" />
                                Destroyed
                              </span>
                            )}
                            {state.selectedScar && state.selectedScar !== "no-scar" && (
                              <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs">
                                {BATTLE_SCARS.find((s) => s.id === state.selectedScar)?.name}
                              </span>
                            )}
                            {state.selectedHonor && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">
                                <Trophy className="w-3 h-3" />
                                {BATTLE_HONORS.find((h) => h.id === state.selectedHonor)?.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom button */}
        <div className="p-6 pt-4 border-t border-stone-700/60">
          {currentStep < 5 ? (
            <div>
              <button
                onClick={goToNextStep}
                disabled={currentStep === 4 && changesApplied}
                className="w-full py-4 rounded-lg font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 text-black hover:from-emerald-500 hover:to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentStep === 4 ? "Confirm & Apply Changes" : "Next"}
              </button>
              {currentStep === 4 && (
                <p className="text-xs text-amber-400 text-center mt-2">
                  This will permanently update your roster with XP, honours, and scars.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => navigate("/campaign/active")}
                className="w-full py-4 rounded-lg font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 text-black hover:from-emerald-500 hover:to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
              >
                Return to Campaign
              </button>
              <button
                onClick={() => navigate("/requisition")}
                className="w-full text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                Spend Requisition Points
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
