import { useState, useEffect } from "react";
import { Search, X, Check } from "lucide-react";
import { FACTIONS } from "../../lib/factions";
import type { FactionId } from "../../types";

interface FactionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (factionId: FactionId, factionName: string, factionIcon: string) => void;
  selectedFactionId?: string;
  title?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  imperium: "Imperium",
  chaos: "Chaos",
  xenos: "Xenos",
};

export default function FactionPicker({
  isOpen,
  onClose,
  onSelect,
  selectedFactionId,
  title = "Select Faction",
}: FactionPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelectedId, setTempSelectedId] = useState(selectedFactionId || "");

  useEffect(() => {
    if (isOpen) {
      setTempSelectedId(selectedFactionId || "");
    }
  }, [isOpen, selectedFactionId]);

  if (!isOpen) return null;

  const filteredFactions = FACTIONS.filter((faction) =>
    faction.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirm = () => {
    const selectedFaction = FACTIONS.find((f) => f.id === tempSelectedId);
    if (!selectedFaction) return;
    onSelect(selectedFaction.id, selectedFaction.name, selectedFaction.icon);
    onClose();
  };

  const handleFactionClick = (factionId: string) => {
    setTempSelectedId(factionId);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="faction-picker-title"
        className="relative w-full max-w-2xl rounded-t-2xl sm:rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-stone-900 to-stone-950 shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-emerald-500/20 p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 id="faction-picker-title" className="text-2xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5 text-stone-400" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search factions..."
              className="w-full bg-gradient-to-br from-stone-900 to-stone-950 border border-emerald-500/20 rounded-lg pl-11 pr-4 py-3 text-stone-100 placeholder:text-stone-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
        </div>

        {/* Faction List */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {/* Group by category */}
          {(["imperium", "chaos", "xenos"] as const).map((category) => {
            const categoryFactions = filteredFactions.filter((f) => f.category === category);
            if (categoryFactions.length === 0) return null;

            return (
              <div key={category} className="mb-6 last:mb-0">
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 px-1">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="space-y-2">
                  {categoryFactions.map((faction) => (
                    <button
                      key={faction.id}
                      onClick={() => handleFactionClick(faction.id)}
                      className={`w-full relative overflow-hidden rounded-lg border transition-all group ${
                        tempSelectedId === faction.id
                          ? "border-emerald-500/60 bg-gradient-to-br from-emerald-950/40 to-stone-950"
                          : "border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 hover:border-emerald-500/40 hover:bg-emerald-500/5"
                      }`}
                    >
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{faction.icon}</span>
                          <span
                            className={`font-semibold ${
                              tempSelectedId === faction.id ? "text-emerald-400" : "text-stone-300"
                            }`}
                          >
                            {faction.name}
                          </span>
                        </div>

                        {tempSelectedId === faction.id && (
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500">
                            <Check className="w-4 h-4 text-black" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* No Results */}
          {filteredFactions.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-stone-700 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-bold text-stone-600 mb-2">No Factions Found</h3>
              <p className="text-stone-600 text-sm">Try adjusting your search query</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-emerald-500/20 p-6 pt-4">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 text-stone-300 font-semibold hover:border-emerald-500/40 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!tempSelectedId}
              className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all ${
                tempSelectedId
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-black hover:from-emerald-500 hover:to-emerald-400"
                  : "bg-stone-800 text-stone-600 cursor-not-allowed"
              }`}
            >
              Confirm Selection
            </button>
          </div>
        </div>

        {/* Faction Count */}
        <div className="absolute top-6 right-16 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-xs text-emerald-400 font-mono">
            {filteredFactions.length} / {FACTIONS.length}
          </span>
        </div>
      </div>
    </div>
  );
}