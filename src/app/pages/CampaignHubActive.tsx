import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Copy, Check, Skull, Plus, Swords, AlertCircle, Trophy, Megaphone, Map } from "lucide-react";
import { toast } from "sonner";
import { useCrusade } from "../../lib/CrusadeContext";
import { useCampaignGuard } from "../../lib/hooks/useCampaignGuard";
import { isFeatureEnabled } from "../../lib/featureFlags";
import { getFactionName, getFactionIcon } from "../../lib/factions";
import { getResultColor } from "../../lib/ranks";
import { getResultLabel, formatRecord } from "../../lib/formatText";
import { getUnitAttentionItems } from "../../lib/attention";
import type { AttentionItem } from "../../lib/attention";

export default function CampaignHubActive() {
  const guard = useCampaignGuard();
  const navigate = useNavigate();
  const { players, battles, units, syncing } = useCrusade();
  const [copied, setCopied] = useState(false);
  const [showAllBattles, setShowAllBattles] = useState(true);

  const currentPlayerId = guard.ready ? guard.currentPlayer?.id : '';

  // Build a lookup for player names by player_id
  const playerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of players) {
      map[p.id] = p.name;
    }
    return map;
  }, [players]);

  // Attention items for current player's units
  const playerUnits = useMemo(() => units.filter(u => u.player_id === currentPlayerId), [units, currentPlayerId]);
  const attentionItems: AttentionItem[] = useMemo(
    () => playerUnits.flatMap(u => getUnitAttentionItems(u)),
    [playerUnits]
  );

  if (!guard.ready) return null;
  const { campaign, currentPlayer } = guard;

  // Build the players list — for local-first, show currentPlayer (and any others in the array)
  const displayPlayers = players.length > 0
    ? players
    : currentPlayer
      ? [currentPlayer]
      : [];

  const playerBattles = battles.filter(b => b.player_id === currentPlayer?.id);
  const totalBattles = playerBattles.length;

  // Recent battles: last 5, sorted newest first (battles are already sorted newest first from context)
  const displayedBattles = showAllBattles ? battles : playerBattles;
  const recentBattles = displayedBattles.slice(0, 5);

  const handleCopyJoinCode = () => {
    navigator.clipboard.writeText(campaign.join_code)
      .then(() => {
        setCopied(true);
        toast.success("Join code copied to clipboard!", {
          duration: 2000,
        });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Couldn't copy — tap and hold to copy manually"));
  };

  const handlePlayerClick = (playerId: string) => {
    navigate(`/player/${playerId}`);
  };

  const handleLogBattle = () => {
    navigate("/log-battle");
  };

  const formatAnnouncementDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

        {/* Attention Banner */}
        {attentionItems.length > 0 && (
          <div className="mb-6 rounded-sm border border-amber-500/40 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-amber-400">
                Action Required ({attentionItems.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {attentionItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(item.actionUrl)}
                  className="block w-full text-left text-xs text-amber-300/80 hover:text-amber-300 transition-colors"
                >
                  &bull; {item.message}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Current Round */}
          <div className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 p-4">
            <div className="relative">
              <div className="text-2xl font-bold text-stone-100 mb-1">
                {campaign.current_round}
              </div>
              <div className="text-xs text-stone-400 uppercase tracking-wider">
                Round
              </div>
            </div>
          </div>

          {/* Total Battles */}
          <div className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 p-4">
            <div className="relative">
              <div className="text-2xl font-bold text-stone-100 mb-1">
                {totalBattles}
              </div>
              <div className="text-xs text-stone-400 uppercase tracking-wider">
                Battles
              </div>
            </div>
          </div>

          {/* Player Count */}
          <div className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 p-4">
            <div className="relative">
              <div className="text-2xl font-bold text-stone-100 mb-1">
                {displayPlayers.length}
              </div>
              <div className="text-xs text-stone-400 uppercase tracking-wider">
                Players
              </div>
            </div>
          </div>
        </div>

        {/* Announcements */}
        {campaign.announcements && campaign.announcements.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-stone-500 uppercase tracking-wider font-semibold">
                Announcements
              </span>
            </div>
            <div className="space-y-2">
              {campaign.announcements.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="rounded-sm border border-stone-700/60 bg-stone-900 p-3"
                >
                  <p className="text-sm text-stone-200">{a.text}</p>
                  <p className="text-xs text-stone-500 mt-1">
                    {a.author && <span className="text-stone-400">{a.author} &middot; </span>}
                    {formatAnnouncementDate(a.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Players Section Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          <span className="text-xs text-stone-500 uppercase tracking-wider">
            Crusaders
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        </div>

        {/* Sync indicator */}
        {syncing && (
          <div className="text-center py-2 mb-2">
            <p className="text-emerald-400 text-xs animate-pulse">Syncing campaign data...</p>
          </div>
        )}

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
                className="group w-full relative overflow-hidden rounded-sm"
              >
                {/* Card background */}
                <div className="absolute inset-0 bg-stone-900 border border-stone-700/60 rounded-sm transition-all duration-300 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]" />

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
                      <p className="text-sm text-stone-400">
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
                    <div className="relative h-3 bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${
                          supplyPercentage > 80
                            ? "bg-gradient-to-r from-amber-600 to-amber-500"
                            : "bg-gradient-to-r from-emerald-600 to-emerald-500"
                        }`}
                        style={{ width: `${Math.min(supplyPercentage, 100)}%` }}
                      />
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
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            <span className="text-xs text-stone-500 uppercase tracking-wider">
              Recent Battles
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          </div>

          {/* My Battles / All Battles toggle */}
          <div className="flex items-center justify-center gap-1 mb-4">
            <button
              onClick={() => setShowAllBattles(false)}
              className={`px-3 py-1 rounded-sm text-xs font-medium transition-all ${
                !showAllBattles
                  ? "bg-emerald-600 text-black"
                  : "bg-stone-800 text-stone-400 hover:text-stone-300"
              }`}
            >
              My Battles
            </button>
            <button
              onClick={() => setShowAllBattles(true)}
              className={`px-3 py-1 rounded-sm text-xs font-medium transition-all ${
                showAllBattles
                  ? "bg-emerald-600 text-black"
                  : "bg-stone-800 text-stone-400 hover:text-stone-300"
              }`}
            >
              All Battles
            </button>
          </div>

          {recentBattles.length === 0 ? (
            <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-6 text-center">
              <Swords className="w-10 h-10 text-stone-700 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-stone-500 text-sm">No battles logged yet</p>
              <p className="text-stone-600 text-xs mt-1">
                Tap the + button to log your first battle
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentBattles.map((battle) => (
                <button
                  key={battle.id}
                  onClick={() => navigate(`/battle/${battle.id}`)}
                  className="group w-full rounded-sm border border-stone-700/60 bg-stone-900 p-3 text-left hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-bold ${getResultColor(battle.result)}`}>
                          {getResultLabel(battle.result)}
                        </span>
                        <span className="text-stone-500 text-xs">vs</span>
                        <span className="text-stone-300 text-sm truncate">
                          {battle.opponent_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-stone-400">
                        {showAllBattles && (
                          <span className="text-emerald-400 font-medium">
                            {playerNameMap[battle.player_id] ?? "Unknown"}
                          </span>
                        )}
                        <span>{battle.mission_name}</span>
                      </div>
                    </div>
                    <div className="text-xs text-stone-500 whitespace-nowrap">
                      {formatBattleDate(battle.created_at)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Battle Mode Link */}
        {isFeatureEnabled('COMBAT_TRACKER') && (
          <button
            onClick={() => navigate("/battle-lobby")}
            className="mt-6 w-full rounded-sm border border-stone-700/60 bg-stone-900 p-4 flex items-center gap-3 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all group"
          >
            <Swords className="w-5 h-5 text-red-500 group-hover:text-red-400 transition-colors" />
            <span className="text-sm font-semibold text-stone-100 group-hover:text-red-400 transition-colors">
              Battle Mode
            </span>
            <span className="ml-auto text-xs text-stone-500">Live Combat</span>
          </button>
        )}

        {/* Hall of Fame Link */}
        {isFeatureEnabled('HALL_OF_FAME') && (
          <button
            onClick={() => navigate("/hall-of-fame")}
            className="mt-3 w-full rounded-sm border border-stone-700/60 bg-stone-900 p-4 flex items-center gap-3 hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all group"
          >
            <Trophy className="w-5 h-5 text-amber-500 group-hover:text-amber-400 transition-colors" />
            <span className="text-sm font-semibold text-stone-100 group-hover:text-amber-400 transition-colors">
              Hall of Fame
            </span>
            <span className="ml-auto text-xs text-stone-500">Stats &amp; Achievements</span>
          </button>
        )}

        {/* Campaign Map Link */}
        {isFeatureEnabled('CAMPAIGN_MAP') && (
          <button
            onClick={() => navigate("/campaign-map")}
            className="mt-3 w-full rounded-sm border border-stone-700/60 bg-stone-900 p-4 flex items-center gap-3 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all group"
          >
            <Map className="w-5 h-5 text-emerald-500 group-hover:text-emerald-400 transition-colors" />
            <span className="text-sm font-semibold text-stone-100 group-hover:text-emerald-400 transition-colors">
              Campaign Map
            </span>
            <span className="ml-auto text-xs text-stone-500">Territory Control</span>
          </button>
        )}
      </div>

      {/* Floating Action Button - Log Battle */}
      <button
        onClick={handleLogBattle}
        aria-label="Log battle"
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] z-20 flex items-center justify-center group"
      >
        <Plus className="w-6 h-6 text-black group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
        <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-md" />
      </button>
    </div>
  );
}
