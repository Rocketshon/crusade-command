import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Users, AlertCircle } from "lucide-react";
import FactionPicker from "../components/FactionPicker";
import { useCrusade } from "../../lib/CrusadeContext";
import type { FactionId } from "../../types";

export default function JoinCampaign() {
  const navigate = useNavigate();
  const { joinCampaign } = useCrusade();

  // Form state
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [selectedFaction, setSelectedFaction] = useState<{
    id: string;
    name: string;
    icon: string;
  } | null>(null);

  // UI state
  const [showFactionPicker, setShowFactionPicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleFactionSelect = (factionId: string, factionName: string, factionIcon: string) => {
    setSelectedFaction({ id: factionId, name: factionName, icon: factionIcon });
    setErrorMessage(""); // Clear error when user makes changes
    setTouched(true);
  };

  const handleJoin = async () => {
    // Clear previous errors
    setErrorMessage("");

    // Validate join code
    if (joinCode.trim().length < 6) {
      setErrorMessage("Invalid join code. Please enter a valid 6-character code.");
      return;
    }

    if (!selectedFaction) return;
    if (isJoining) return;
    setIsJoining(true);

    try {
      const result = await joinCampaign(
        joinCode.trim(),
        playerName.trim(),
        selectedFaction.id as FactionId
      );

      if (result.success) {
        navigate("/campaign/active");
      } else {
        setErrorMessage(result.error ?? "Failed to join campaign.");
      }
    } finally {
      setIsJoining(false);
    }
  };

  const isFormValid = joinCode.trim() && playerName.trim() && selectedFaction;

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
            <Users className="w-8 h-8 text-emerald-500" strokeWidth={1.5} />
            <h1 className="text-3xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              Join Campaign
            </h1>
          </div>
          <p className="text-stone-400 text-sm">
            Enter a campaign code to join an existing Crusade
          </p>
        </div>

        {/* Form */}
        <div className="space-y-5">
          {/* Join Code */}
          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              Campaign Join Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setErrorMessage(""); // Clear error on input
                setTouched(true);
              }}
              placeholder="ABC123"
              maxLength={6}
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-stone-100 text-center text-2xl font-mono tracking-widest placeholder:text-stone-500 placeholder:text-base placeholder:tracking-normal focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all uppercase"
            />
            <p className="text-xs text-stone-500 mt-1 text-center">6-character code from campaign host</p>
          </div>

          {/* Error Message Area */}
          {errorMessage && (
            <div className="rounded-lg border border-red-500/30 bg-gradient-to-br from-red-950/40 to-stone-950 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-red-400 font-semibold text-sm mb-1">Error</h3>
                  <p className="text-red-300/80 text-sm">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

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
                onChange={(e) => { setPlayerName(e.target.value); setTouched(true); }}
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

          {/* Join Button */}
          <button
            onClick={handleJoin}
            disabled={!isFormValid || isJoining}
            className={`w-full py-4 rounded-lg font-bold transition-all mt-8 ${
              isFormValid && !isJoining
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-black hover:from-emerald-500 hover:to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "bg-stone-800 text-stone-500 cursor-not-allowed"
            }`}
          >
            Join Campaign
          </button>

          {/* Validation helper text */}
          {touched && !isFormValid && (
            <p className="text-xs text-amber-400 mt-2 text-center">
              {!joinCode.trim()
                ? "Enter a join code to continue"
                : !playerName.trim()
                ? "Enter your commander name"
                : !selectedFaction
                ? "Select a faction to continue"
                : ""}
            </p>
          )}

          {/* Help Text */}
          <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-4 mt-6">
            <p className="text-xs text-stone-400">
              <span className="font-semibold text-stone-400">Need a join code?</span> Ask the campaign host to share their 6-character campaign code with you.
            </p>
          </div>
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
