import { useMemo } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Trophy } from "lucide-react";
import { useCrusade } from "../../lib/CrusadeContext";
import { getFaction, getFactionIcon, getFactionName } from "../../lib/factions";
import type { CampaignPlayer, CrusadeUnit, FactionId } from "../../types";

// ──────────────────────────────────────────────
// Hall of Fame — Campaign Stats & Achievements
// ──────────────────────────────────────────────

export default function HallOfFame() {
  const navigate = useNavigate();
  const { units, players, battles, currentPlayer, campaign } = useCrusade();

  const displayPlayers = players.length > 0 ? players : currentPlayer ? [currentPlayer] : [];

  // ── Computed Stats ──────────────────────────

  const allUnits = units; // units already contains all units across all players in the campaign

  const playerMap = useMemo(() => {
    const m = new Map<string, CampaignPlayer>();
    for (const p of displayPlayers) m.set(p.id, p);
    return m;
  }, [displayPlayers]);

  // Top 3 units by XP
  const topUnits = useMemo(() => {
    return [...allUnits]
      .filter((u) => !u.is_destroyed)
      .sort((a, b) => b.experience_points - a.experience_points)
      .slice(0, 3);
  }, [allUnits]);

  // Player leaderboard sorted by total crusade points desc, then wins desc
  const leaderboard = useMemo(() => {
    return [...displayPlayers]
      .map((p) => {
        const pUnits = allUnits.filter((u) => u.player_id === p.id);
        const totalCP = pUnits.reduce((sum, u) => sum + u.crusade_points, 0);
        const pBattles = battles.filter((b) => b.player_id === p.id);
        const lastBattle = pBattles.length > 0 ? pBattles[0] : null;
        return { player: p, totalCP, lastBattle };
      })
      .sort((a, b) => {
        if (b.player.battles_won !== a.player.battles_won)
          return b.player.battles_won - a.player.battles_won;
        return b.totalCP - a.totalCP;
      });
  }, [displayPlayers, allUnits, battles]);

  // Static Tailwind class lookup (dynamic `bg-${color}-500` doesn't work with Tailwind purge)
  const factionBgColors: Record<string, string> = {
    blue: 'bg-blue-500', cyan: 'bg-cyan-500', slate: 'bg-slate-500',
    red: 'bg-red-500', amber: 'bg-amber-500', orange: 'bg-orange-500',
    green: 'bg-green-500', yellow: 'bg-yellow-500', purple: 'bg-purple-500',
    zinc: 'bg-zinc-500', lime: 'bg-lime-500', rose: 'bg-rose-500',
    stone: 'bg-stone-500', emerald: 'bg-emerald-500', violet: 'bg-violet-500',
    sky: 'bg-sky-500', indigo: 'bg-indigo-500',
  };

  // Faction win rates
  const factionStats = useMemo(() => {
    const fMap = new Map<
      FactionId,
      { wins: number; total: number }
    >();
    for (const p of displayPlayers) {
      if (!fMap.has(p.faction_id)) fMap.set(p.faction_id, { wins: 0, total: 0 });
      const entry = fMap.get(p.faction_id)!;
      entry.wins += p.battles_won;
      entry.total += p.battles_played;
    }
    return [...fMap.entries()]
      .map(([factionId, stats]) => ({ factionId, ...stats }))
      .sort((a, b) => {
        const aRate = a.total > 0 ? a.wins / a.total : 0;
        const bRate = b.total > 0 ? b.wins / b.total : 0;
        return bRate - aRate;
      });
  }, [displayPlayers]);

  // Achievements
  const achievements = useMemo(() => {
    const activeUnits = allUnits.filter((u) => !u.is_destroyed);
    const result: { icon: string; title: string; label: string }[] = [];

    // Most Battles Fought
    if (activeUnits.length > 0) {
      const most = activeUnits.reduce((a, b) =>
        b.battles_played > a.battles_played ? b : a
      );
      if (most.battles_played > 0) {
        const owner = playerMap.get(most.player_id);
        result.push({
          icon: "\u2694\uFE0F",
          title: "Most Battles Fought",
          label: `${most.custom_name}${owner ? ` (${owner.name})` : ""} \u2014 ${most.battles_played} battles`,
        });
      }
    }

    // Iron Wall — best survival ratio
    const survivable = activeUnits.filter((u) => u.battles_played > 0);
    if (survivable.length > 0) {
      const wall = survivable.reduce((a, b) => {
        const aRatio = a.battles_survived / a.battles_played;
        const bRatio = b.battles_survived / b.battles_played;
        return bRatio > aRatio ? b : a;
      });
      const ratio = Math.round((wall.battles_survived / wall.battles_played) * 100);
      const owner = playerMap.get(wall.player_id);
      result.push({
        icon: "\uD83D\uDEE1\uFE0F",
        title: "Iron Wall",
        label: `${wall.custom_name}${owner ? ` (${owner.name})` : ""} \u2014 ${ratio}% survival`,
      });
    }

    // Most Battle Scars
    const scarred = activeUnits.filter((u) => u.battle_scars.length > 0);
    if (scarred.length > 0) {
      const mostScarred = scarred.reduce((a, b) =>
        b.battle_scars.length > a.battle_scars.length ? b : a
      );
      const owner = playerMap.get(mostScarred.player_id);
      result.push({
        icon: "\uD83E\uDE79",
        title: "Most Battle Scars",
        label: `${mostScarred.custom_name}${owner ? ` (${owner.name})` : ""} \u2014 ${mostScarred.battle_scars.length} scars`,
      });
    }

    // Warlord Supreme — player with most victories
    if (displayPlayers.length > 0) {
      const warlord = displayPlayers.reduce((a, b) =>
        b.battles_won > a.battles_won ? b : a
      );
      if (warlord.battles_won > 0) {
        result.push({
          icon: "\uD83D\uDC51",
          title: "Warlord Supreme",
          label: `${warlord.name} \u2014 ${warlord.battles_won} victories`,
        });
      }
    }

    return result;
  }, [allUnits, displayPlayers, playerMap]);

  // ── Helpers ─────────────────────────────────

  function getHeroTitle(index: number): string {
    if (index === 0) return "Most Experienced";
    if (index === 1) return "Most Decorated";
    return "Most Resilient";
  }

  function getHeroBorderColor(index: number): string {
    if (index === 0) return "border-amber-500";
    if (index === 1) return "border-stone-400";
    return "border-amber-700";
  }

  function getHeroBadgeBg(index: number): string {
    if (index === 0) return "bg-amber-500 text-black";
    if (index === 1) return "bg-stone-400 text-black";
    return "bg-amber-700 text-stone-100";
  }

  function getRankLabel(index: number): string {
    if (index === 0) return "\uD83E\uDD47";
    if (index === 1) return "\uD83E\uDD48";
    return "\uD83E\uDD49";
  }

  function getTrendArrow(lastResult: string | undefined): string {
    if (lastResult === "victory") return "\u2191";
    if (lastResult === "defeat") return "\u2193";
    return "\u2192";
  }

  function getTrendColor(lastResult: string | undefined): string {
    if (lastResult === "victory") return "text-emerald-400";
    if (lastResult === "defeat") return "text-red-400";
    return "text-stone-500";
  }

  // ── Render ──────────────────────────────────

  const isEmpty = allUnits.length === 0 && displayPlayers.length === 0;

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 pb-24">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-sm border border-stone-700/60 bg-stone-900 text-stone-400 hover:text-stone-100 hover:border-emerald-500/50 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold text-stone-100 tracking-wider">
              Hall of Fame
            </h1>
          </div>
        </div>

        {isEmpty ? (
          <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-8 text-center">
            <Trophy className="w-12 h-12 text-stone-700 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-stone-500 text-sm">No data yet</p>
            <p className="text-stone-600 text-xs mt-1">
              Play some battles and recruit units to populate the Hall of Fame
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ─── Section 1: Hero Cards (Top 3 Units) ─── */}
            {topUnits.length > 0 && (
              <section>
                <SectionHeader label="Top Units" />
                <div className="space-y-3">
                  {topUnits.map((unit, i) => {
                    const owner = playerMap.get(unit.player_id);
                    const factionName = owner
                      ? getFactionName(owner.faction_id)
                      : "";
                    return (
                      <div
                        key={unit.id}
                        className={`rounded-sm border-2 ${getHeroBorderColor(i)} bg-stone-900 p-4 relative overflow-hidden`}
                      >
                        {/* Rank badge */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getHeroBadgeBg(i)}`}
                            >
                              {getRankLabel(i)}
                            </span>
                            <div>
                              <h3 className="text-lg font-bold text-stone-100">
                                {unit.custom_name}
                              </h3>
                              <p className="text-xs text-stone-400">
                                {owner?.name}
                                {factionName ? ` \u2022 ${factionName}` : ""}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
                            {getHeroTitle(i)}
                          </span>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-sm bg-stone-800/50 p-2">
                            <div className="text-lg font-bold text-emerald-400">
                              {unit.experience_points}
                            </div>
                            <div className="text-[10px] text-stone-500 uppercase">
                              XP
                            </div>
                          </div>
                          <div className="rounded-sm bg-stone-800/50 p-2">
                            <div className="text-lg font-bold text-stone-100">
                              {unit.battle_honours.length}
                            </div>
                            <div className="text-[10px] text-stone-500 uppercase">
                              Honours
                            </div>
                          </div>
                          <div className="rounded-sm bg-stone-800/50 p-2">
                            <div className="text-lg font-bold text-stone-100">
                              {unit.battles_survived}/{unit.battles_played}
                            </div>
                            <div className="text-[10px] text-stone-500 uppercase">
                              Survived
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ─── Section 2: Player Leaderboard ─── */}
            {leaderboard.length > 0 && (
              <section>
                <SectionHeader label="Player Leaderboard" />
                <div className="rounded-sm border border-stone-700/60 bg-stone-900 overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[2rem_1fr_4.5rem_3.5rem_2.5rem_1.5rem] gap-1 px-3 py-2 text-[10px] text-stone-500 uppercase tracking-wider border-b border-stone-700/40">
                    <span>#</span>
                    <span>Player</span>
                    <span className="text-center">W-L-D</span>
                    <span className="text-center">CP</span>
                    <span className="text-center">RP</span>
                    <span />
                  </div>
                  {leaderboard.map(({ player, totalCP, lastBattle }, i) => (
                    <div
                      key={player.id}
                      className="grid grid-cols-[2rem_1fr_4.5rem_3.5rem_2.5rem_1.5rem] gap-1 items-center px-3 py-2.5 border-b border-stone-800/50 last:border-b-0 hover:bg-stone-800/30 transition-colors"
                    >
                      <span className="text-sm font-bold text-stone-400">
                        {i + 1}
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base flex-shrink-0">
                          {getFactionIcon(player.faction_id)}
                        </span>
                        <span className="text-sm text-stone-100 truncate">
                          {player.name}
                        </span>
                      </div>
                      <span className="text-xs text-stone-300 font-mono text-center">
                        {player.battles_won}-{player.battles_lost}-
                        {player.battles_drawn}
                      </span>
                      <span className="text-xs text-amber-400 font-mono text-center">
                        {totalCP}
                      </span>
                      <span className="text-xs text-stone-400 font-mono text-center">
                        {player.requisition_points}
                      </span>
                      <span
                        className={`text-sm font-bold text-center ${getTrendColor(lastBattle?.result)}`}
                      >
                        {getTrendArrow(lastBattle?.result)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ─── Section 3: Faction Win Rates ─── */}
            {factionStats.length > 0 && (
              <section>
                <SectionHeader label="Faction Win Rates" />
                <div className="space-y-3">
                  {factionStats.map(({ factionId, wins, total }) => {
                    const pct = total > 0 ? Math.round((wins / total) * 100) : 0;
                    const faction = getFaction(factionId);
                    const colorClass = faction
                      ? (factionBgColors[faction.color] || 'bg-emerald-500')
                      : "bg-emerald-500";
                    return (
                      <div
                        key={factionId}
                        className="rounded-sm border border-stone-700/60 bg-stone-900 p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">
                              {faction?.icon ?? "\u26AA"}
                            </span>
                            <span className="text-sm text-stone-100">
                              {faction?.name ?? factionId}
                            </span>
                          </div>
                          <span className="text-xs text-stone-400">
                            {wins} win{wins !== 1 ? "s" : ""} / {total} battle
                            {total !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {/* Bar */}
                        <div className="relative h-3 bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${colorClass}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-right mt-1">
                          <span className="text-[10px] text-stone-500">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ─── Section 4: Campaign Achievements ─── */}
            {achievements.length > 0 && (
              <section>
                <SectionHeader label="Achievements" />
                <div className="grid grid-cols-2 gap-3">
                  {achievements.map((a) => (
                    <div
                      key={a.title}
                      className="rounded-sm border border-stone-700/60 bg-stone-900 p-3 text-center"
                    >
                      <div className="text-2xl mb-1">{a.icon}</div>
                      <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                        {a.title}
                      </div>
                      <div className="text-[11px] text-stone-400 leading-tight">
                        {a.label}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reusable section header ───────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      <span className="text-xs text-stone-500 uppercase tracking-wider">
        {label}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
    </div>
  );
}
