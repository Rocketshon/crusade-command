import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Map, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useCrusade } from "../../lib/CrusadeContext";
import { useAuth } from "../../lib/AuthContext";
import { supabase } from "../../lib/supabase";
import type { Territory } from "../../types";

export default function CampaignMap() {
  const navigate = useNavigate();
  const { campaign, players } = useCrusade();
  const { user } = useAuth();

  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<Territory | null>(null);
  const [newName, setNewName] = useState("");
  const [newBonus, setNewBonus] = useState("");

  const isCM = campaign?.owner_id === user?.id;

  const fetchTerritories = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cc_territories")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: true });
    if (!error && data) {
      setTerritories(data as Territory[]);
    }
    setLoading(false);
  }, [campaign]);

  useEffect(() => {
    fetchTerritories();
  }, [fetchTerritories]);

  useEffect(() => {
    if (!campaign) {
      navigate("/home", { replace: true });
    }
  }, [campaign, navigate]);

  if (!campaign) return null;

  const handleAddTerritory = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a territory name");
      return;
    }

    const nextIndex = territories.length;
    const cols = 4;
    const posX = nextIndex % cols;
    const posY = Math.floor(nextIndex / cols);

    const { data, error } = await supabase
      .from("cc_territories")
      .insert({
        campaign_id: campaign.id,
        name: newName.trim(),
        bonus_text: newBonus.trim(),
        controlled_by: null,
        position_x: posX,
        position_y: posY,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create territory");
      return;
    }

    setTerritories((prev) => [...prev, data as Territory]);
    setNewName("");
    setNewBonus("");
    setShowAddModal(false);
    toast.success(`Territory "${newName.trim()}" created!`);
  };

  const handleAssign = async (playerId: string | null) => {
    if (!showAssignModal) return;

    const { error } = await supabase
      .from("cc_territories")
      .update({ controlled_by: playerId })
      .eq("id", showAssignModal.id);

    if (error) {
      toast.error("Failed to assign territory");
      return;
    }

    setTerritories((prev) =>
      prev.map((t) =>
        t.id === showAssignModal.id ? { ...t, controlled_by: playerId } : t
      )
    );

    const label = playerId
      ? players.find((p) => p.id === playerId)?.name ?? "player"
      : "nobody";
    toast.success(`Territory assigned to ${label}`);
    setShowAssignModal(null);
  };

  // Build color map from players
  const playerColorMap: Record<string, string> = {};
  const FACTION_COLORS = [
    "bg-emerald-600", "bg-amber-600", "bg-red-600", "bg-blue-600",
    "bg-purple-600", "bg-cyan-600", "bg-pink-600", "bg-orange-600",
  ];
  players.forEach((p, i) => {
    playerColorMap[p.id] = FACTION_COLORS[i % FACTION_COLORS.length];
  });

  const getPlayerBgClass = (controlledBy: string | null) => {
    if (!controlledBy) return "bg-stone-800";
    return playerColorMap[controlledBy] ?? "bg-stone-700";
  };

  const getPlayerName = (controlledBy: string | null) => {
    if (!controlledBy) return null;
    return players.find((p) => p.id === controlledBy)?.name ?? null;
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

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <div className="relative">
              <Map className="w-12 h-12 text-emerald-500/80" strokeWidth={1.5} />
              <div className="absolute inset-0 blur-md">
                <Map className="w-12 h-12 text-emerald-500/40" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 mb-2 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            Campaign Map
          </h1>
          <p className="text-stone-400 text-sm">
            Territory control across the warzone
          </p>
        </div>

        {/* Territories */}
        {loading ? (
          <div className="text-center text-stone-500 text-sm py-12">
            Loading territories...
          </div>
        ) : territories.length === 0 ? (
          <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-8 text-center">
            <Map className="w-10 h-10 text-stone-700 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-stone-400 text-sm mb-1">No territories set up</p>
            <p className="text-stone-600 text-xs">
              {isCM
                ? "Add territories to start tracking the campaign map."
                : "The Campaign Master has not added any territories yet."}
            </p>
            {isCM && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-semibold transition-all text-sm"
              >
                Create Territory
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Hex Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {territories.map((territory) => {
                const bgClass = getPlayerBgClass(territory.controlled_by);
                const ownerName = getPlayerName(territory.controlled_by);

                return (
                  <button
                    key={territory.id}
                    onClick={() => isCM ? setShowAssignModal(territory) : undefined}
                    disabled={!isCM}
                    className={`relative overflow-hidden transition-all ${isCM ? "cursor-pointer hover:scale-105" : "cursor-default"}`}
                    style={{
                      clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                    }}
                  >
                    <div className={`${bgClass} p-4 pt-6 pb-6 flex flex-col items-center justify-center min-h-[100px]`}>
                      <span className="text-xs font-bold text-white text-center leading-tight drop-shadow-md">
                        {territory.name}
                      </span>
                      {ownerName && (
                        <span className="text-[10px] text-white/70 mt-1 text-center drop-shadow-sm">
                          {ownerName}
                        </span>
                      )}
                      {territory.bonus_text && (
                        <span className="text-[9px] text-white/50 mt-0.5 text-center italic">
                          {territory.bonus_text}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-3 mb-4">
              <h3 className="text-xs text-stone-500 uppercase tracking-wider mb-2">Legend</h3>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-stone-800 border border-stone-700" />
                  <span className="text-xs text-stone-400">Unclaimed</span>
                </div>
                {players.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${playerColorMap[p.id]}`} />
                    <span className="text-xs text-stone-400">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* CM: Add Territory FAB */}
        {isCM && territories.length > 0 && (
          <button
            onClick={() => setShowAddModal(true)}
            className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)] z-20 flex items-center justify-center"
          >
            <Plus className="w-6 h-6 text-black" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Add Territory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-sm rounded-sm border border-stone-700/60 bg-stone-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-100">Add Territory</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-500 hover:text-stone-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1">
                  Territory Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Hive Primus"
                  className="w-full bg-stone-950 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 text-sm focus:border-emerald-500/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1">
                  Bonus Text (optional)
                </label>
                <input
                  type="text"
                  value={newBonus}
                  onChange={(e) => setNewBonus(e.target.value)}
                  placeholder="e.g., +1 CP per round"
                  className="w-full bg-stone-950 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 text-sm focus:border-emerald-500/40 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-stone-700/60 bg-stone-900 text-stone-300 font-semibold hover:border-emerald-500/50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTerritory}
                className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-semibold transition-all"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Territory Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-sm rounded-sm border border-stone-700/60 bg-stone-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-100">
                Assign: {showAssignModal.name}
              </h3>
              <button onClick={() => setShowAssignModal(null)} className="text-stone-500 hover:text-stone-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {/* Unclaimed option */}
              <button
                onClick={() => handleAssign(null)}
                className="w-full text-left rounded-sm px-4 py-3 bg-stone-800 border border-stone-700/60 hover:border-emerald-500/40 transition-all"
              >
                <span className="text-sm text-stone-400 italic">Unclaimed</span>
              </button>
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAssign(p.id)}
                  className={`w-full text-left rounded-sm px-4 py-3 border transition-all ${
                    showAssignModal.controlled_by === p.id
                      ? "bg-emerald-900/30 border-emerald-500/40"
                      : "bg-stone-800 border-stone-700/60 hover:border-emerald-500/40"
                  }`}
                >
                  <span className="text-sm text-stone-200">{p.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAssignModal(null)}
              className="w-full mt-4 px-4 py-2 rounded-lg border border-stone-700/60 bg-stone-900 text-stone-300 font-semibold hover:border-emerald-500/50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
