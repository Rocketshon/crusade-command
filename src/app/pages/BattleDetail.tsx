import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Calendar, Users, Star, Skull, Award, Zap, TrendingUp, FileText, BookOpen, Loader2, Trash2 } from "lucide-react";
import { useCrusade } from "../../lib/CrusadeContext";
import { getRankFromXP } from "../../lib/ranks";
import { getResultLabel, getBattleSizeColor } from "../../lib/formatText";
import { getFactionIcon, getFactionName, FACTIONS } from "../../lib/factions";
import { generateBattleStory, canGenerateStory } from "../../lib/battleNarrator";
import type { NarratorInput } from "../../lib/battleNarrator";

// localStorage key for persisted stories
const STORY_KEY_PREFIX = "crusade_battle_story_";

export default function BattleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { battles, units, currentPlayer } = useCrusade();

  // Battle story state
  const [story, setStory] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  // Load persisted story from localStorage on mount
  useEffect(() => {
    if (!id) return;
    const saved = localStorage.getItem(STORY_KEY_PREFIX + id);
    if (saved) setStory(saved);
  }, [id]);

  // Find battle by id
  const battle = battles.find(b => b.id === id);

  const handleGenerateStory = useCallback(async () => {
    if (!battle || !currentPlayer) return;

    setIsGenerating(true);
    setStoryError(null);
    setStory("");

    const playerFaction = getFactionName(currentPlayer.faction_id);

    const input: NarratorInput = {
      playerName: currentPlayer.name,
      playerFaction,
      opponentName: battle.opponent_name,
      opponentFaction: battle.opponent_faction,
      missionName: battle.mission_name,
      battleSize: battle.battle_size,
      result: battle.result,
      playerVP: battle.player_vp,
      opponentVP: battle.opponent_vp,
      combatLog: battle.combat_log.map(e => ({
        attacker_unit_name: e.attacker_unit_name,
        attacker_weapon: e.attacker_weapon,
        defender_unit_name: e.defender_unit_name,
        phase: e.phase,
        hits: e.hits,
        wounds: e.wounds,
        damage_dealt: e.damage_dealt,
        models_destroyed: e.models_destroyed,
      })),
    };

    try {
      const finalText = await generateBattleStory(input, (streamedText) => {
        setStory(streamedText);
      });
      setStory(finalText);
      // Persist to localStorage
      if (id) {
        localStorage.setItem(STORY_KEY_PREFIX + id, finalText);
      }
    } catch (err) {
      setStoryError(err instanceof Error ? err.message : "Failed to generate story");
    } finally {
      setIsGenerating(false);
    }
  }, [battle, currentPlayer, id]);

  const handleClearStory = useCallback(() => {
    if (!id) return;
    setStory("");
    localStorage.removeItem(STORY_KEY_PREFIX + id);
  }, [id]);

  if (!battle) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-stone-400 mb-4">Battle not found.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 text-black"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Get fielded units from battle data mapped against roster
  const fieldedUnits = battle.units_fielded
    .map(unitId => units.find(u => u.id === unitId))
    .filter(Boolean) as typeof units;

  // Derive result label using the shared utility
  const resultLabel = getResultLabel(battle.result);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case "victory":
        return {
          text: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          glow: "shadow-[0_0_20px_rgba(16,185,129,0.3)]",
        };
      case "defeat":
        return {
          text: "text-red-400",
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          glow: "shadow-[0_0_20px_rgba(239,68,68,0.3)]",
        };
      case "draw":
        return {
          text: "text-amber-400",
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          glow: "shadow-[0_0_20px_rgba(245,158,11,0.3)]",
        };
      default:
        return {
          text: "text-stone-400",
          bg: "bg-stone-800",
          border: "border-stone-700",
          glow: "",
        };
    }
  };

  const resultColors = getResultColor(battle.result);

  /**
   * Try to resolve opponent faction string to a faction icon.
   * Matches against FACTIONS by name (case-insensitive) or id.
   */
  const resolveOpponentFactionIcon = (factionStr: string): string | null => {
    if (!factionStr) return null;
    const lower = factionStr.toLowerCase();
    const match = FACTIONS.find(
      (f) => f.name.toLowerCase() === lower || f.id === lower
    );
    return match ? match.icon : null;
  };

  const opponentFactionIcon = resolveOpponentFactionIcon(battle.opponent_faction);

  // Battle size colored badge classes
  const battleSizeClasses = getBattleSizeColor(battle.battle_size);

  const apiKeyConfigured = canGenerateStory();

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col min-h-screen">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-stone-700/60">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>

          <h1 className="text-2xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] mb-3">
            {battle.mission_name}
          </h1>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-stone-400 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(battle.created_at)}</span>
            </div>
            {/* Battle size — colored badge */}
            <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${battleSizeClasses}`}>
              {battle.battle_size}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Result Banner */}
          <div
            className={`rounded-sm border ${resultColors.border} ${resultColors.bg} p-6 text-center ${resultColors.glow}`}
          >
            <h2 className={`text-4xl font-bold ${resultColors.text} tracking-wider mb-4 uppercase`}>
              {resultLabel}
            </h2>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div>
                <p className="text-stone-400 mb-1">Your Score</p>
                <p className="text-2xl font-bold text-stone-200">{battle.player_vp}</p>
              </div>
              <div className="text-stone-500 text-2xl">&mdash;</div>
              <div>
                <p className="text-stone-400 mb-1">Opponent Score</p>
                <p className="text-2xl font-bold text-stone-200">{battle.opponent_vp}</p>
              </div>
            </div>
          </div>

          {/* Opponent Section */}
          <div>
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
              Opponent
            </h3>
            <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-4">
              <h4 className="text-lg font-bold text-stone-300 mb-2">
                {battle.opponent_name}
              </h4>
              <div className="flex items-center gap-2 text-sm text-stone-400">
                {opponentFactionIcon && (
                  <span className="text-base">{opponentFactionIcon}</span>
                )}
                <span>{battle.opponent_faction}</span>
              </div>
            </div>
          </div>

          {/* Units Fielded Section */}
          {fieldedUnits.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Units Fielded
              </h3>
              <div className="space-y-2">
                {fieldedUnits.map((unit) => {
                  const isMarked = battle.marked_for_greatness === unit.id;
                  return (
                    <div
                      key={unit.id}
                      onClick={() => navigate(`/unit/${unit.id}`)}
                      className="rounded-sm border border-stone-700/60 bg-stone-900 p-4 cursor-pointer hover:border-emerald-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-stone-300">{unit.custom_name}</h4>
                        <div className="flex items-center gap-2">
                          {isMarked && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            </div>
                          )}
                          {unit.is_destroyed && (
                            <div className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold">
                              Destroyed
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-stone-400">{unit.points_cost} pts</span>
                        <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-400">
                          {unit.rank}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Battle Results Section */}
          <div>
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
              Battle Results
            </h3>

            {/* XP Awarded — show per fielded unit */}
            {fieldedUnits.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-stone-400 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  Units in Battle
                </h4>
                <div className="space-y-2">
                  {fieldedUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="rounded-sm border border-stone-700/60 bg-stone-900 p-3 flex items-center justify-between"
                    >
                      <span className="text-sm text-stone-400">{unit.custom_name}</span>
                      <span className="font-bold text-emerald-400">{unit.experience_points} XP</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Battle Honors — from fielded units that have honours */}
            {fieldedUnits.some(u => u.battle_honours.length > 0) && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-stone-400 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  Battle Honors
                </h4>
                <div className="space-y-2">
                  {fieldedUnits
                    .filter(u => u.battle_honours.length > 0)
                    .map((unit) =>
                      unit.battle_honours.map((honour) => (
                        <div
                          key={`${unit.id}-${honour.id}`}
                          className="rounded-sm border border-stone-700/60 bg-stone-900 p-3 flex items-center justify-between"
                        >
                          <span className="text-sm text-stone-400">{unit.custom_name}</span>
                          <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                            {honour.name}
                          </span>
                        </div>
                      ))
                    )}
                </div>
              </div>
            )}

            {/* Battle Scars — from fielded units that have scars */}
            {fieldedUnits.some(u => u.battle_scars.length > 0) && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-stone-400 mb-2 flex items-center gap-2">
                  <Skull className="w-4 h-4 text-red-500" />
                  Battle Scars
                </h4>
                <div className="space-y-2">
                  {fieldedUnits
                    .filter(u => u.battle_scars.length > 0)
                    .map((unit) =>
                      unit.battle_scars.map((scar) => (
                        <div
                          key={`${unit.id}-${scar.id}`}
                          className="rounded-sm border border-stone-700/60 bg-stone-900 p-3 flex items-center justify-between"
                        >
                          <span className="text-sm text-stone-400">{unit.custom_name}</span>
                          <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold">
                            {scar.name}
                          </span>
                        </div>
                      ))
                    )}
                </div>
              </div>
            )}
          </div>

          {/* Notes Section — with whitespace-pre-line for user-entered line breaks */}
          {battle.notes && (
            <div>
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                Battle Notes
              </h3>
              <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-stone-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-stone-400 italic leading-relaxed whitespace-pre-line">
                    {battle.notes}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Battle Story Section */}
          <div>
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Battle Narrative
            </h3>

            {/* Show persisted or streamed story */}
            {story && (
              <div className="rounded-sm border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-stone-950 p-5 mb-3">
                <p className="font-serif text-stone-300 text-sm leading-relaxed whitespace-pre-line">
                  {story}
                </p>
                {!isGenerating && (
                  <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-stone-700/40">
                    <button
                      onClick={handleClearStory}
                      className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                    <button
                      onClick={handleGenerateStory}
                      className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-400 transition-colors"
                    >
                      <BookOpen className="w-3 h-3" />
                      Regenerate
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error message */}
            {storyError && (
              <div className="rounded-sm border border-red-500/30 bg-red-500/10 p-3 mb-3">
                <p className="text-sm text-red-400">{storyError}</p>
              </div>
            )}

            {/* Generate button — show if no story yet or while generating */}
            {!story && !isGenerating && (
              <div className="relative group">
                <button
                  onClick={handleGenerateStory}
                  disabled={!apiKeyConfigured || !currentPlayer}
                  className={`w-full rounded-sm border p-4 flex items-center justify-center gap-3 transition-all ${
                    apiKeyConfigured && currentPlayer
                      ? "border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-stone-950 hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] cursor-pointer"
                      : "border-stone-700/40 bg-stone-900/50 cursor-not-allowed opacity-50"
                  }`}
                >
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold text-amber-400 text-sm">
                    Generate Battle Story
                  </span>
                </button>
                {!apiKeyConfigured && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded bg-stone-800 border border-stone-700 text-xs text-stone-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Add VITE_CLAUDE_API_KEY to enable
                  </div>
                )}
              </div>
            )}

            {/* Loading state */}
            {isGenerating && !story && (
              <div className="rounded-sm border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-stone-950 p-6 flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                <span className="text-sm text-amber-400">Chronicling the battle...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
