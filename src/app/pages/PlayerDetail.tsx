import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Sword, Trophy, Edit } from "lucide-react";
import { useCrusade } from "../../lib/CrusadeContext";
import { getFactionName, getFactionIcon, FACTIONS } from "../../lib/factions";
import { getRankColor, getResultColor } from "../../lib/ranks";
import { formatRecord, getResultLabel } from "../../lib/formatText";

export default function PlayerDetail() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { currentPlayer, players, campaign, units, getPlayerBattles } = useCrusade();

  // Find the requested player — fall back to currentPlayer if it's own profile
  const isOwnProfile = !playerId || playerId === currentPlayer?.id;
  const player = isOwnProfile
    ? currentPlayer
    : players.find(p => p.id === playerId) ?? null;

  if (!player) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-stone-400">Player not found</p>
      </div>
    );
  }

  const factionName = getFactionName(player.faction_id);
  const factionIcon = getFactionIcon(player.faction_id);

  // Supply from units belonging to this player
  const playerUnits = units.filter(u => u.player_id === player.id);
  const supplyUsed = playerUnits.reduce((sum, u) => sum + u.points_cost, 0);
  const supplyLimit = campaign?.supply_limit ?? 1000;

  // Player battles
  const playerBattles = getPlayerBattles(player.id);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  /**
   * Try to resolve an opponent faction string to a faction icon.
   * Matches against the FACTIONS list by name (case-insensitive) or id.
   */
  const resolveOpponentFactionIcon = (factionStr: string): string | null => {
    if (!factionStr) return null;
    const lower = factionStr.toLowerCase();
    const match = FACTIONS.find(
      (f) => f.name.toLowerCase() === lower || f.id === lower
    );
    return match ? match.icon : null;
  };

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden pb-24">
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back to Campaign</span>
        </button>

        {/* Player Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="relative w-16 h-16 rounded-full bg-emerald-500 bg-opacity-20 flex items-center justify-center">
              <span className="text-3xl">{factionIcon}</span>
              <div className="absolute inset-0 blur-md">
                <div className="w-16 h-16 rounded-full bg-emerald-500 opacity-20" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-stone-100 mb-1 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            {player.name}
          </h1>
          <p className="text-stone-400 text-sm">
            {factionName}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Supply */}
          <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-4">
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Supply
              </div>
              <div className="text-xl font-bold text-stone-100">
                {supplyUsed} <span className="text-stone-400 text-sm">/ {supplyLimit}</span>
              </div>
          </div>

          {/* Requisition */}
          <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-4">
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Requisition
              </div>
              <div className="text-xl font-bold text-emerald-400">
                {player.requisition_points}
              </div>
          </div>

          {/* Battles */}
          <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-4">
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Battles
              </div>
              <div className="text-xl font-bold text-stone-100">
                {player.battles_played}
              </div>
          </div>

          {/* Record — now showing W-L-D */}
          <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-4">
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Record
              </div>
              <div className="text-sm font-bold font-mono">
                <span className="text-emerald-500">{player.battles_won}W</span>
                <span className="text-stone-400 mx-1">-</span>
                <span className="text-red-500/80">{player.battles_lost}L</span>
                <span className="text-stone-400 mx-1">-</span>
                <span className="text-amber-400">{player.battles_drawn}D</span>
              </div>
          </div>
        </div>

        {/* Order of Battle Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sword className="w-5 h-5 text-emerald-500/80" strokeWidth={1.5} />
              <h2 className="text-lg font-semibold text-stone-100 tracking-wide">
                Order of Battle
              </h2>
            </div>
            {isOwnProfile && (
              <button
                onClick={() => navigate('/roster')}
                className="flex items-center gap-1.5 text-xs text-emerald-500/70 hover:text-emerald-500 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Roster
              </button>
            )}
          </div>

          {/* Units List */}
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
            {playerUnits.length === 0 && (
              <p className="text-stone-400 text-sm text-center py-4">No units in roster yet.</p>
            )}
            {playerUnits.map((unit) => (
              <div
                key={unit.id}
                onClick={() => navigate(`/unit/${unit.id}`)}
                className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 cursor-pointer hover:border-emerald-500/50 transition-all"
              >
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-stone-100 mb-0.5">
                        {unit.custom_name}
                      </h3>
                      {/* Datasheet name subtitle — only if different from custom name */}
                      {unit.custom_name !== unit.datasheet_name && (
                        <p className="text-xs text-stone-400 italic mb-1">
                          {unit.datasheet_name}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${getRankColor(unit.rank)} font-medium`}>
                          {unit.rank}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-500 font-mono">
                        {unit.points_cost} pts
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
              </div>
            ))}
          </div>
        </div>

        {/* Battle History Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-emerald-500/80" strokeWidth={1.5} />
            <h2 className="text-lg font-semibold text-stone-100 tracking-wide">
              Battle History
            </h2>
          </div>

          {/* Battles List */}
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
            {playerBattles.length === 0 && (
              <p className="text-stone-400 text-sm text-center py-4">No battles fought yet.</p>
            )}
            {playerBattles.map((battle) => {
              const opponentIcon = resolveOpponentFactionIcon(battle.opponent_faction);
              return (
                <div
                  key={battle.id}
                  onClick={() => navigate(`/battle/${battle.id}`)}
                  className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 cursor-pointer hover:border-emerald-500/50 transition-all"
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-stone-400 font-mono">
                            {formatDate(battle.created_at)}
                          </span>
                          <span className={`text-xs font-bold ${getResultColor(battle.result)}`}>
                            {getResultLabel(battle.result)}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-stone-100 mb-0.5">
                          vs {battle.opponent_name}
                        </h3>
                        {/* Opponent faction with optional icon */}
                        {battle.opponent_faction && (
                          <p className="text-xs text-stone-400 flex items-center gap-1">
                            {opponentIcon && <span>{opponentIcon}</span>}
                            <span>{battle.opponent_faction}</span>
                          </p>
                        )}
                        <p className="text-xs text-stone-400 italic mt-0.5">
                          {battle.mission_name}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                </div>
              );
            })}
          </div>
        </div>
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
