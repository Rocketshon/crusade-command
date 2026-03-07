import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Copy, Check, Skull, Plus, Swords } from "lucide-react";
import { toast } from "sonner";
import { useCrusade } from "../../lib/CrusadeContext";
import { getFactionName, getFactionIcon } from "../../lib/factions";
import { getResultColor } from "../../lib/ranks";
import { getResultLabel, formatRecord } from "../../lib/formatText";

export default function CampaignHubActive() {
  const navigate = useNavigate();
  const { campaign, players, currentPlayer, battles } = useCrusade();
  const [copied, setCopied] = useState(false);

  // If no campaign, redirect to home
  useEffect(() => {
    if (!campaign) {
      navigate("/home", { replace: true });
    }
  }, [campaign, navigate]);

  if (!campaign) return null;

  // Build the players list — for local-first, show currentPlayer (and any others in the array)
  const displayPlayers = players.length > 0
    ? players
    : currentPlayer
      ? [currentPlayer]
      : [];

  const totalBattles = battles.length;

  // Recent battles: last 5, sorted newest first (battles are already sorted newest first from context)
  const recentBattles = battles.slice(0, 5);

  const handleCopyJoinCode = () => {
    navigator.clipboard.writeText(campaign.join_code);
    setCopied(true);
    toast.success("Join code copied to clipboard!", {
      duration: 2000,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayerClick = (playerId: string) => {
    navigate(`/player/${playerId}`);
  };

  const handleLogBattle = () => {
    navigate("/log-battle");
  };

  const formatBattleDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden pb-24">
      {/* Dark ambient glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Content container */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Header Section */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Skull className="w-12 h-12 text-emerald-500/80" strokeWidth={1.5} />
              <div className="absolute inset-0 blur-md">
                <Skull className="w-12 h-12 text-emerald-500/40" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-3 tracking-wider text-stone-100 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            {campaign.name}
          </h1>

          {/* Join Code Pill */}
          <button
            onClick={handleCopyJoinCode}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-900 border border-emerald-500/30 hover:border-emerald-500/50 transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] group"
          >
            <span className="text-emerald-500 tracking-widest font-mono text-sm">
              {campaign.join_code}
            </span>
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 text-emerald-500/70 group-hover:text-emerald-500 transition-colors" />
            )}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Current Round */}
          <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <div className="relative">
              <div className="text-2xl font-bold text-stone-100 mb-1">
                {campaign.current_round}
              </div>
              <div className="text-xs text-stone-500 uppercase tracking-wider">
                Round
              </div>
            </div>
          </div>

          {/* Total Battles */}
          <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <div className="relative">
              <div className="text-2xl font-bold text-stone-100 mb-1">
                {totalBattles}
              </div>
              <div className="text-xs text-stone-500 uppercase tracking-wider">
                Battles
              </div>
            </div>
          </div>

          {/* Player Count */}
          <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <div className="relative">
              <div className="text-2xl font-bold text-stone-100 mb-1">
                {displayPlayers.length}
              </div>
              <div className="text-xs text-stone-500 uppercase tracking-wider">
                Players
              </div>
            </div>
          </div>
        </div>

        {/* Players Section Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          <span className="text-xs text-stone-500 uppercase tracking-wider">
            Crusaders
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        </div>

        {/* Player Cards List */}
        <div className="space-y-3">
          {displayPlayers.map((player) => {
            const factionIcon = getFactionIcon(player.faction_id);
            const factionName = getFactionName(player.faction_id);
            const supplyPercentage = campaign.supply_limit > 0
              ? ((player.supply_used || 0) / campaign.supply_limit) * 100
              : 0;

            return (
              <button
                key={player.id}
                onClick={() => handlePlayerClick(player.id)}
                className="group w-full relative overflow-hidden rounded-lg"
              >
                {/* Card background */}
                <div className="absolute inset-0 bg-gradient-to-br from-stone-900 to-stone-950 border border-emerald-500/20 transition-all duration-300 group-hover:border-emerald-500/40 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]" />

                {/* Subtle inner glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Content */}
                <div className="relative p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {/* Faction Icon */}
                    <div className="relative w-10 h-10 rounded-full bg-emerald-500 bg-opacity-20 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">{factionIcon}</span>
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 text-left">
                      <h3 className="text-base font-semibold text-stone-100 mb-0.5">
                        {player.name}
                      </h3>
                      <p className="text-sm text-stone-500">
                        {factionName}
                      </p>
                    </div>

                    {/* Win-Loss-Draw Record */}
                    <div className="text-right">
                      <div className="text-sm text-stone-300 font-mono">
                        {formatRecord(player.battles_won, player.battles_lost, player.battles_drawn)}
                      </div>
                    </div>
                  </div>

                  {/* Supply Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500">Supply</span>
                      <span className="text-stone-400 font-mono">
                        {player.supply_used || 0} / {campaign.supply_limit}
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(supplyPercentage, 100)}%` }}
                      >
                        <div className="absolute inset-0 bg-emerald-400/30 blur-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
              </button>
            );
          })}
        </div>

        {/* Recent Battles Section */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            <span className="text-xs text-stone-500 uppercase tracking-wider">
              Recent Battles
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          </div>

          {recentBattles.length === 0 ? (
            <div className="rounded-lg border border-stone-700/50 bg-gradient-to-br from-stone-900 to-stone-950 p-6 text-center">
              <Swords className="w-10 h-10 text-stone-700 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-stone-600 text-sm">No battles logged yet</p>
              <p className="text-stone-700 text-xs mt-1">
                Tap the + button to log your first battle
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentBattles.map((battle) => (
                <button
                  key={battle.id}
                  onClick={() => navigate(`/battle/${battle.id}`)}
                  className="group w-full rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-3 text-left hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-bold ${getResultColor(battle.result)}`}>
                          {getResultLabel(battle.result)}
                        </span>
                        <span className="text-stone-600 text-xs">vs</span>
                        <span className="text-stone-300 text-sm truncate">
                          {battle.opponent_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span>{battle.mission_name}</span>
                      </div>
                    </div>
                    <div className="text-xs text-stone-600 whitespace-nowrap">
                      {formatBattleDate(battle.created_at)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button - Log Battle */}
      <button
        onClick={handleLogBattle}
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] z-20 flex items-center justify-center group"
      >
        <Plus className="w-6 h-6 text-black group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
        <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-md" />
      </button>
    </div>
  );
}
