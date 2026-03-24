import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Swords, Users } from "lucide-react";
import FactionPicker from "../components/FactionPicker";
import { useCrusade } from "../../lib/CrusadeContext";
import type { FactionId } from "../../types";

export default function CreateCampaign() {
  const navigate = useNavigate();
  const { createCampaign } = useCrusade();

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [supplyLimit, setSupplyLimit] = useState(1000);
  const [startingRequisition, setStartingRequisition] = useState(5);
  const [playerName, setPlayerName] = useState("");
  const [selectedFaction, setSelectedFaction] = useState<{
    id: string;
    name: string;
    icon: string;
  } | null>(null);

  // UI state
  const [showFactionPicker, setShowFactionPicker] = useState(false);

  const handleFactionSelect = (factionId: string, factionName: string, factionIcon: string) => {
    setSelectedFaction({ id: factionId, name: factionName, icon: factionIcon });
  };

  const handleCreate = () => {
    if (!selectedFaction) return;
    if (supplyLimit < 1) return;
    createCampaign(
      campaignName.trim(),
      supplyLimit,
      startingRequisition,
      playerName.trim(),
      selectedFaction.id as FactionId
    );
    navigate("/campaign/active");
  };

  const isFormValid = campaignName.trim() && playerName.trim() && selectedFaction;

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 pb-24 relative overflow-hidden">
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
          <div className="flex items-center gap-3 mb-2">
            <Swords className="w-8 h-8 text-emerald-500" strokeWidth={1.5} />
            <h1 className="text-3xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              Create Campaign
            </h1>
          </div>
          <p className="text-stone-400 text-sm">
            Start a new Crusade campaign
          </p>
        </div>

        {/* Form */}
        <div className="space-y-5">
          {/* Campaign Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              Campaign Name
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="War for Armageddon"
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-stone-100 placeholder:text-stone-500 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          {/* Supply Limit */}
          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              Supply Limit
            </label>
            <input
              type="number"
              value={supplyLimit}
              onChange={(e) => setSupplyLimit(parseInt(e.target.value) || 0)}
              min={1}
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-stone-100 placeholder:text-stone-500 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
            <p className="text-xs text-stone-500 mt-1">Maximum points for armies</p>
          </div>

          {/* Starting Requisition */}
          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              Starting Requisition Points
            </label>
            <input
              type="number"
              value={startingRequisition}
              onChange={(e) => setStartingRequisition(parseInt(e.target.value) || 0)}
              min={0}
              max={20}
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-stone-100 placeholder:text-stone-500 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
            <p className="text-xs text-stone-500 mt-1">Points available for requisitions</p>
          </div>

          {/* Divider */}
          <div className="border-t border-stone-800 pt-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-emerald-500/70" />
              <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">
                Your Details
              </h2>
            </div>

            {/* Player Name */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                Player Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Commander Name"
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-stone-100 placeholder:text-stone-500 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {/* Faction Picker Button */}
            <div>
              <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                Faction
              </label>
              <button
                onClick={() => setShowFactionPicker(true)}
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-left hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
              >
                {selectedFaction ? (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedFaction.icon}</span>
                    <span className="text-stone-300 font-semibold">{selectedFaction.name}</span>
                  </div>
                ) : (
                  <span className="text-stone-500">Select your faction...</span>
                )}
              </button>
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={!isFormValid}
            className={`w-full py-4 rounded-lg font-bold transition-all mt-8 ${
              isFormValid
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-black hover:from-emerald-500 hover:to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "bg-stone-800 text-stone-500 cursor-not-allowed"
            }`}
          >
            Create Campaign
          </button>
        </div>
      </div>

      {/* Faction Picker Modal */}
      <FactionPicker
        isOpen={showFactionPicker}
        onClose={() => setShowFactionPicker(false)}
        onSelect={handleFactionSelect}
        selectedFactionId={selectedFaction?.id}
        title="Select Your Faction"
      />
    </div>
  );
}
