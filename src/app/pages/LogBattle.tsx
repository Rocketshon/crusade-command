import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Swords, ChevronDown, Shield, Star, FileText } from "lucide-react";
import { toast } from "sonner";
import { useCrusade } from "../../lib/CrusadeContext";
import { getFactionName } from "../../lib/factions";
import type { Battle } from "../../types";

const BATTLE_SIZES = [
  "Combat Patrol",
  "Incursion",
  "Strike Force",
  "Onslaught",
];

const WINNER_OPTIONS = [
  { value: "you", label: "You" },
  { value: "opponent", label: "Opponent" },
  { value: "draw", label: "Draw" },
];

export default function LogBattle() {
  const navigate = useNavigate();
  const { campaign, players, currentPlayer, units, logBattle } = useCrusade();

  const [opponentId, setOpponentId] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [opponentFaction, setOpponentFaction] = useState("");
  const [missionName, setMissionName] = useState("");
  const [battleSize, setBattleSize] = useState("Incursion");
  const [yourScore, setYourScore] = useState("");
  const [opponentScore, setOpponentScore] = useState("");
  const [winner, setWinner] = useState("you");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [markedForGreatness, setMarkedForGreatness] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build opponent list from players (excluding current player)
  const otherPlayers = players.filter(p => p.id !== currentPlayer?.id);

  // Filter units to only those belonging to the current player, and not destroyed
  const availableUnits = units.filter(u => u.player_id === currentPlayer?.id && !u.is_destroyed);

  // Units that have been selected/fielded (for Marked for Greatness selection)
  const fieldedUnits = availableUnits.filter(u => selectedUnitIds.includes(u.id));

  const toggleUnitSelection = (unitId: string) => {
    setSelectedUnitIds(prev => {
      if (prev.includes(unitId)) {
        const next = prev.filter(id => id !== unitId);
        // If the removed unit was marked for greatness, clear that too
        if (markedForGreatness === unitId) {
          setMarkedForGreatness(null);
        }
        return next;
      }
      return [...prev, unitId];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!opponentName.trim() && !opponentId) {
      toast.error("Please select or name an opponent");
      return;
    }

    if (!missionName.trim()) {
      toast.error("Please enter a mission name");
      return;
    }

    if (!campaign || !currentPlayer) {
      toast.error("No active campaign");
      return;
    }

    // Determine result
    let result: Battle['result'];
    if (winner === "you") result = "victory";
    else if (winner === "opponent") result = "defeat";
    else result = "draw";

    // Resolve opponent details
    const selectedOpponent = otherPlayers.find(p => p.id === opponentId);
    const finalOpponentName = selectedOpponent?.name || opponentName.trim();
    const finalOpponentFaction = selectedOpponent
      ? getFactionName(selectedOpponent.faction_id)
      : opponentFaction.trim();

    logBattle({
      campaign_id: campaign.id,
      player_id: currentPlayer.id,
      opponent_id: opponentId || '',
      opponent_name: finalOpponentName,
      opponent_faction: finalOpponentFaction,
      mission_name: missionName.trim(),
      battle_size: battleSize as Battle['battle_size'],
      player_vp: parseInt(yourScore) || 0,
      opponent_vp: parseInt(opponentScore) || 0,
      result,
      units_fielded: selectedUnitIds,
      marked_for_greatness: markedForGreatness,
      notes: notes.trim(),
    });

    toast.success(`Battle recorded vs ${finalOpponentName}!`, {
      duration: 3000,
    });

    navigate("/post-battle");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden pb-8">
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back to Campaign</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <div className="relative">
              <Swords className="w-12 h-12 text-emerald-500/80" strokeWidth={1.5} />
              <div className="absolute inset-0 blur-md">
                <Swords className="w-12 h-12 text-emerald-500/40" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 mb-2 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            Log Battle
          </h1>
          <p className="text-stone-400 text-sm">
            Record the results of your crusade battle
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Opponent Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2 tracking-wide">
              Opponent
            </label>
            {otherPlayers.length > 0 ? (
              <div className="relative">
                <select
                  value={opponentId}
                  onChange={(e) => {
                    setOpponentId(e.target.value);
                    const p = otherPlayers.find(p => p.id === e.target.value);
                    if (p) {
                      setOpponentName(p.name);
                      setOpponentFaction(getFactionName(p.faction_id));
                    }
                  }}
                  className="w-full appearance-none bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-stone-100 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                >
                  <option value="" className="bg-stone-900">
                    Select opponent...
                  </option>
                  {otherPlayers.map((player) => (
                    <option key={player.id} value={player.id} className="bg-stone-900">
                      {player.name} — {getFactionName(player.faction_id)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/50 pointer-events-none" />
              </div>
            ) : (
              /* No other players in campaign — manual entry */
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder="Opponent name"
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-stone-100 placeholder:text-stone-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            )}
          </div>

          {/* Opponent Faction (manual entry when no other players) */}
          {otherPlayers.length === 0 && (
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2 tracking-wide">
                Opponent Faction
              </label>
              <input
                type="text"
                value={opponentFaction}
                onChange={(e) => setOpponentFaction(e.target.value)}
                placeholder="e.g., Space Marines"
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-stone-100 placeholder:text-stone-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          )}

          {/* Mission Name */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2 tracking-wide">
              Mission Name
            </label>
            <input
              type="text"
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              placeholder="e.g., Sweep and Clear"
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-stone-100 placeholder:text-stone-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          {/* Battle Size - Segmented Control */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2 tracking-wide">
              Battle Size
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BATTLE_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setBattleSize(size)}
                  className={`relative overflow-hidden rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                    battleSize === size
                      ? "bg-emerald-600 text-black border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      : "bg-stone-900 text-stone-300 border border-stone-700/60 hover:border-emerald-500/50"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-4">
            {/* Your VP */}
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1 tracking-wide">
                Your VP
              </label>
              <p className="text-xs text-stone-500 mb-2">(Victory Points)</p>
              <input
                type="number"
                value={yourScore}
                onChange={(e) => setYourScore(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-stone-100 placeholder:text-stone-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {/* Opponent VP */}
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1 tracking-wide">
                Opponent VP
              </label>
              <p className="text-xs text-stone-500 mb-2">(Victory Points)</p>
              <input
                type="number"
                value={opponentScore}
                onChange={(e) => setOpponentScore(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-stone-100 placeholder:text-stone-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* Winner Selection - Radio Buttons */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-3 tracking-wide">
              Result
            </label>
            <div className="flex gap-3">
              {WINNER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setWinner(option.value)}
                  className={`flex-1 relative overflow-hidden rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                    winner === option.value
                      ? "bg-emerald-600 text-black border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      : "bg-stone-900 text-stone-300 border border-stone-700/60 hover:border-emerald-500/50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 py-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          </div>

          {/* Units Fielded */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-300 mb-3 tracking-wide">
              <Shield className="w-4 h-4 text-emerald-500/70" />
              Units Fielded
            </label>
            {availableUnits.length === 0 ? (
              <p className="text-stone-400 text-sm italic">
                No units in your roster. Add units from the Roster page first.
              </p>
            ) : (
              <div className="space-y-2">
                {availableUnits.map((unit) => {
                  const isSelected = selectedUnitIds.includes(unit.id);
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => toggleUnitSelection(unit.id)}
                      className={`w-full text-left rounded-sm px-4 py-3 transition-all ${
                        isSelected
                          ? "bg-gradient-to-br from-emerald-900/40 to-emerald-950/30 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                          : "bg-stone-900 border border-stone-700/60 hover:border-emerald-500/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Checkbox indicator */}
                        <div
                          className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-emerald-600 border-emerald-500"
                              : "border-stone-600 bg-stone-800"
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        {/* Unit info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-medium truncate ${isSelected ? "text-emerald-300" : "text-stone-200"}`}>
                              {unit.custom_name || unit.datasheet_name}
                            </span>
                            <span className="text-xs text-stone-500 flex-shrink-0">
                              {unit.points_cost} pts
                            </span>
                          </div>
                          {unit.custom_name && (
                            <p className="text-xs text-stone-500 truncate">
                              {unit.datasheet_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {selectedUnitIds.length > 0 && (
                  <p className="text-xs text-stone-400 mt-1">
                    {selectedUnitIds.length} unit{selectedUnitIds.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Marked for Greatness */}
          {fieldedUnits.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-stone-300 mb-2 tracking-wide">
                <Star className="w-4 h-4 text-amber-500/70" />
                Marked for Greatness
              </label>
              <p className="text-xs text-stone-400 mb-3">
                Optionally select one fielded unit to receive bonus XP
              </p>
              <div className="space-y-2">
                {/* None option */}
                <button
                  type="button"
                  onClick={() => setMarkedForGreatness(null)}
                  className={`w-full text-left rounded-sm px-4 py-3 transition-all ${
                    markedForGreatness === null
                      ? "bg-gradient-to-br from-stone-800 to-stone-900 border border-stone-500/40"
                      : "bg-stone-900 border border-stone-700/60 hover:border-emerald-500/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
                        markedForGreatness === null
                          ? "border-stone-400 bg-stone-600"
                          : "border-stone-600 bg-stone-800"
                      }`}
                    >
                      {markedForGreatness === null && (
                        <div className="w-2.5 h-2.5 rounded-full bg-stone-300" />
                      )}
                    </div>
                    <span className="text-sm text-stone-400 italic">None</span>
                  </div>
                </button>

                {fieldedUnits.map((unit) => {
                  const isMarked = markedForGreatness === unit.id;
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => setMarkedForGreatness(unit.id)}
                      className={`w-full text-left rounded-sm px-4 py-3 transition-all ${
                        isMarked
                          ? "bg-gradient-to-br from-amber-900/30 to-amber-950/20 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                          : "bg-stone-900 border border-stone-700/60 hover:border-emerald-500/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Radio indicator */}
                        <div
                          className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
                            isMarked
                              ? "border-amber-500 bg-amber-600"
                              : "border-stone-600 bg-stone-800"
                          }`}
                        >
                          {isMarked && (
                            <div className="w-2.5 h-2.5 rounded-full bg-black" />
                          )}
                        </div>

                        {/* Unit info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-medium truncate ${isMarked ? "text-amber-300" : "text-stone-200"}`}>
                              {unit.custom_name || unit.datasheet_name}
                            </span>
                            <span className="text-xs text-stone-500 flex-shrink-0">
                              {unit.points_cost} pts
                            </span>
                          </div>
                          {unit.custom_name && (
                            <p className="text-xs text-stone-500 truncate">
                              {unit.datasheet_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-300 mb-2 tracking-wide">
              <FileText className="w-4 h-4 text-emerald-500/70" />
              Battle Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about the battle..."
              rows={4}
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-stone-100 placeholder:text-stone-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 py-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-amber-500 rounded-lg transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-amber-700/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />

            <div className="relative px-6 py-4 flex items-center justify-center gap-2">
              <Swords className="w-5 h-5 text-black" strokeWidth={2} />
              <span className="text-base font-bold text-black tracking-wide">
                Record Battle
              </span>
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}
