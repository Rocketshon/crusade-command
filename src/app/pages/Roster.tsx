import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Plus, Sword, Skull, Award, AlertTriangle } from "lucide-react";
import { useCrusade } from "../../lib/CrusadeContext";
import { getFactionName } from "../../lib/factions";
import { getRankFromXP, getRankColor } from "../../lib/ranks";

export default function Roster() {
  const navigate = useNavigate();
  const { campaign, currentPlayer, units, removeUnit } = useCrusade();
  const [showRemove, setShowRemove] = useState<string | null>(null);

  // If no campaign, redirect to /home
  useEffect(() => {
    if (!campaign) {
      navigate("/home", { replace: true });
    }
  }, [campaign, navigate]);

  if (!campaign || !currentPlayer) return null;

  const factionName = getFactionName(currentPlayer.faction_id);
  const supplyUsed = units.reduce((sum, u) => sum + u.points_cost, 0);
  const supplyLimit = campaign.supply_limit;
  const supplyPercent = supplyLimit > 0 ? (supplyUsed / supplyLimit) * 100 : 0;

  const handleUnitClick = (unitId: string) => {
    if (showRemove === unitId) {
      setShowRemove(null);
    } else {
      navigate(`/unit/${unitId}`);
    }
  };

  const handleLongPress = (unitId: string) => {
    setShowRemove(showRemove === unitId ? null : unitId);
  };

  if (units.length === 0) {
    // Empty State
    return (
      <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden">
        {/* Dark ambient glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] mb-1">
              Order of Battle
            </h1>
            <p className="text-stone-500 text-sm">{factionName}</p>
          </div>

          {/* Empty State Content */}
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-6">
              <Sword className="w-24 h-24 text-emerald-500/30" strokeWidth={1} />
              <div className="absolute inset-0 blur-lg">
                <Sword className="w-24 h-24 text-emerald-500/20" strokeWidth={1} />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-stone-100 mb-3 tracking-wide">
              No Units Yet
            </h2>
            <p className="text-stone-500 text-sm max-w-sm leading-relaxed mb-8">
              Add units from your faction's codex to build your Order of Battle and begin your crusade.
            </p>

            {/* Add Unit Button */}
            <button
              onClick={() => navigate("/add-unit")}
              className="relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg transition-all duration-300 group-hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]" />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-700/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />

              <div className="relative px-8 py-4 flex items-center justify-center gap-2">
                <Plus className="w-5 h-5 text-black" strokeWidth={2.5} />
                <span className="text-base font-bold text-black tracking-wide">
                  Add Unit
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active State
  return (
    <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden pb-24">
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
          <span className="text-sm">Back to Campaign</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] mb-1">
            {currentPlayer.name}
          </h1>
          <p className="text-stone-500 text-sm">{factionName}</p>
        </div>

        {/* Supply and Requisition */}
        <div className="mb-6 space-y-4">
          {/* Supply Bar */}
          <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-500 uppercase tracking-wider">
                  Supply
                </span>
                <span className="text-sm font-bold text-stone-100 font-mono">
                  {supplyUsed} <span className="text-stone-500">/ {supplyLimit}</span>
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-stone-950 rounded-full overflow-hidden border border-emerald-500/10">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${Math.min(supplyPercent, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Requisition Points */}
          <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <div className="relative flex items-center justify-between">
              <span className="text-xs text-stone-500 uppercase tracking-wider">
                Requisition Points
              </span>
              <span className="text-xl font-bold text-emerald-400 font-mono">
                {currentPlayer.requisition_points}
              </span>
            </div>
          </div>
        </div>

        {/* Units List */}
        <div className="space-y-3 mb-6">
          {units.map((unit) => {
            const rank = getRankFromXP(unit.experience_points);
            const rankColor = getRankColor(rank);

            return (
              <div
                key={unit.id}
                className="relative overflow-hidden"
              >
                <button
                  onClick={() => handleUnitClick(unit.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleLongPress(unit.id);
                  }}
                  className={`w-full text-left relative overflow-hidden rounded-lg border bg-gradient-to-br from-stone-900 to-stone-950 transition-all ${
                    unit.is_destroyed
                      ? "border-red-500/30 opacity-60"
                      : "border-emerald-500/20 hover:border-emerald-500/40"
                  }`}
                >
                  <div className="p-4">
                    {/* Unit Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className={`text-base font-semibold mb-0.5 ${
                          unit.is_destroyed ? "line-through text-stone-500" : "text-stone-100"
                        }`}>
                          {unit.custom_name}
                        </h3>
                        {/* Datasheet name subtitle — only if different from custom name */}
                        {unit.custom_name !== unit.datasheet_name && (
                          <p className="text-xs text-stone-500 italic mb-1">
                            {unit.datasheet_name}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${rankColor} font-medium`}>
                            {rank}
                          </span>
                          {unit.is_destroyed && (
                            <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                              <Skull className="w-3 h-3" />
                              Destroyed
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-500 font-mono mb-0.5">
                          {unit.points_cost} pts
                        </div>
                        <div className="text-xs text-stone-500 font-mono">
                          {unit.experience_points} XP
                        </div>
                      </div>
                    </div>

                    {/* Stats Row — Honours and Scars with names */}
                    <div className="flex flex-col gap-2 text-xs">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <Award className="w-4 h-4" />
                          <span className="font-mono">{unit.battle_honours.length}</span>
                          <span className="text-stone-600">Honors</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-mono">{unit.battle_scars.length}</span>
                          <span className="text-stone-600">Scars</span>
                        </div>
                      </div>

                      {/* Honour name badges */}
                      {unit.battle_honours.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {unit.battle_honours.slice(0, 2).map((honour) => (
                            <span
                              key={honour.id}
                              className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium"
                            >
                              {honour.name}
                            </span>
                          ))}
                          {unit.battle_honours.length > 2 && (
                            <span className="text-stone-600 text-[10px]">
                              +{unit.battle_honours.length - 2} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Scar name badges */}
                      {unit.battle_scars.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {unit.battle_scars.slice(0, 2).map((scar) => (
                            <span
                              key={scar.id}
                              className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-medium"
                            >
                              {scar.name}
                            </span>
                          ))}
                          {unit.battle_scars.length > 2 && (
                            <span className="text-stone-600 text-[10px]">
                              +{unit.battle_scars.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {unit.is_destroyed && (
                    <div className="absolute inset-0 bg-red-950/20 pointer-events-none" />
                  )}

                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                </button>

                {/* Remove action overlay */}
                {showRemove === unit.id && (
                  <div className="absolute inset-0 bg-red-950/95 rounded-lg flex items-center justify-center backdrop-blur-sm border border-red-500/30 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUnit(unit.id);
                        setShowRemove(null);
                      }}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Remove Unit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate("/add-unit")}
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center shadow-[0_4px_20px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_30px_rgba(16,185,129,0.6)] transition-all duration-300 group z-50"
      >
        <Plus className="w-6 h-6 text-black group-hover:scale-110 transition-transform" strokeWidth={2.5} />
      </button>
    </div>
  );
}
