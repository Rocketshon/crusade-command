import { useState } from "react";
import { useNavigate } from "react-router";
import { Swords, ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
import { useCrusade } from "../../lib/CrusadeContext";
import { getFaction } from "../../lib/factions";
import { getUnitsForFaction } from "../../data";
import { getRankColor } from "../../lib/ranks";
import type { CampaignPlayer, Datasheet } from "../../types";

export default function BattleLobby() {
  const navigate = useNavigate();
  const { players, currentPlayer, units } = useCrusade();
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  const displayPlayers = players.length > 0
    ? players
    : currentPlayer
      ? [currentPlayer]
      : [];

  const toggleExpand = (playerId: string) => {
    setExpandedPlayerId((prev) => (prev === playerId ? null : playerId));
  };

  const handleSelectOpponent = (opponentId: string) => {
    navigate(`/battle-live/${opponentId}`);
  };

  const getPlayerUnits = (player: CampaignPlayer) => {
    return units.filter((u) => u.player_id === player.id && !u.is_destroyed);
  };

  const findDatasheet = (player: CampaignPlayer, datasheetName: string): Datasheet | undefined => {
    const faction = getFaction(player.faction_id);
    if (!faction) return undefined;
    const factionUnits = getUnitsForFaction(player.faction_id);
    return factionUnits.find(
      (d) => d.name.toLowerCase() === datasheetName.toLowerCase()
    );
  };

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 pb-24">
      <div className="w-full max-w-md mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate("/campaign/active")}
          className="flex items-center gap-1.5 text-stone-400 hover:text-stone-200 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Campaign
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative">
            <Swords className="w-8 h-8 text-emerald-500" strokeWidth={1.5} />
            <div className="absolute inset-0 blur-md">
              <Swords className="w-8 h-8 text-emerald-500/40" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-100 tracking-wider">
              Battle Mode
            </h1>
            <p className="text-xs text-stone-500">Select your opponent</p>
          </div>
        </div>

        {/* Player list */}
        <div className="space-y-3">
          {displayPlayers.map((player) => {
            const faction = getFaction(player.faction_id);
            const playerUnits = getPlayerUnits(player);
            const isExpanded = expandedPlayerId === player.id;
            const isCurrentPlayer = player.id === currentPlayer?.id;

            return (
              <div
                key={player.id}
                className={`rounded-sm border bg-stone-900 overflow-hidden transition-all ${
                  isCurrentPlayer
                    ? "border-emerald-500/30"
                    : "border-stone-700/60"
                }`}
              >
                {/* Player header */}
                <button
                  onClick={() => toggleExpand(player.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  {/* Faction icon */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: faction
                        ? `color-mix(in srgb, ${faction.color} 20%, transparent)`
                        : undefined,
                    }}
                  >
                    <span className="text-lg">{faction?.icon ?? "?"}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-stone-100 truncate">
                        {player.name}
                      </h3>
                      {isCurrentPlayer && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-400">{faction?.name ?? player.faction_id}</p>
                  </div>

                  {/* Unit count + expand */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">
                      {playerUnits.length} unit{playerUnits.length !== 1 ? "s" : ""}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-stone-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-stone-500" />
                    )}
                  </div>
                </button>

                {/* Expanded unit list */}
                {isExpanded && (
                  <div className="border-t border-stone-800 px-4 py-3 space-y-2">
                    {playerUnits.length === 0 ? (
                      <p className="text-xs text-stone-600 py-2">No units in roster</p>
                    ) : (
                      playerUnits.map((unit) => {
                        const ds = findDatasheet(player, unit.datasheet_name);
                        return (
                          <div
                            key={unit.id}
                            className="flex items-center gap-2 py-1.5 text-xs"
                          >
                            <span className="text-stone-200 flex-1 truncate">
                              {unit.custom_name || unit.datasheet_name}
                            </span>
                            {ds && (
                              <span className="text-stone-500">{unit.datasheet_name}</span>
                            )}
                            <span className="text-stone-600">{unit.points_cost}pts</span>
                            <span
                              className={`text-[10px] font-medium ${getRankColor(unit.rank)}`}
                            >
                              {unit.rank}
                            </span>
                          </div>
                        );
                      })
                    )}

                    {/* Select Opponent button (not for self) */}
                    {!isCurrentPlayer && (
                      <button
                        onClick={() => handleSelectOpponent(player.id)}
                        className="w-full mt-2 py-2.5 rounded-sm bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <Swords className="w-4 h-4" />
                        Select Opponent
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {displayPlayers.length <= 1 && (
          <div className="mt-6 rounded-sm border border-stone-700/60 bg-stone-900 p-4 text-center">
            <p className="text-stone-500 text-sm">
              Share your campaign join code to add opponents
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
