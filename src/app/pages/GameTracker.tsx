import { useState, useEffect, useCallback } from "react";
import { Target, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

interface TrackerState {
  player1Name: string;
  player2Name: string;
  player1VP: number;
  player2VP: number;
  player1CP: number;
  player2CP: number;
  currentRound: number;
}

const STORAGE_KEY = "crusade_game_tracker";

const DEFAULT_STATE: TrackerState = {
  player1Name: "Player 1",
  player2Name: "Player 2",
  player1VP: 0,
  player2VP: 0,
  player1CP: 0,
  player2CP: 0,
  currentRound: 1,
};

function loadState(): TrackerState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_STATE, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { ...DEFAULT_STATE };
}

export default function GameTracker() {
  const [state, setState] = useState<TrackerState>(loadState);
  const [showReset, setShowReset] = useState(false);
  const [editingName, setEditingName] = useState<"p1" | "p2" | null>(null);
  const [editingCounter, setEditingCounter] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((partial: Partial<TrackerState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const handleReset = () => {
    setState({ ...DEFAULT_STATE });
    setShowReset(false);
  };

  const handleNameSubmit = (player: "p1" | "p2", value: string) => {
    const trimmed = value.trim() || (player === "p1" ? "Player 1" : "Player 2");
    update(player === "p1" ? { player1Name: trimmed } : { player2Name: trimmed });
    setEditingName(null);
  };

  const handleCounterTap = (key: string, currentValue: number) => {
    setEditingCounter(key);
    setEditValue(String(currentValue));
  };

  const handleCounterSubmit = (key: string) => {
    const num = Math.max(0, parseInt(editValue) || 0);
    update({ [key]: num } as Partial<TrackerState>);
    setEditingCounter(null);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden pb-24">
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="relative">
              <Target className="w-12 h-12 text-emerald-500/80" strokeWidth={1.5} />
              <div className="absolute inset-0 blur-md">
                <Target className="w-12 h-12 text-emerald-500/40" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 mb-1 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            Game Tracker
          </h1>
          <p className="text-stone-400 text-sm">Track VP and CP during your game</p>
        </div>

        {/* Round Tracker */}
        <div className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 p-3 mb-6">
          <div className="relative flex items-center justify-between">
            <button
              onClick={() => update({ currentRound: Math.max(1, state.currentRound - 1) })}
              disabled={state.currentRound <= 1}
              className="w-8 h-8 rounded-lg border border-emerald-500/30 bg-stone-950 text-emerald-400 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <div className="text-[10px] text-stone-500 uppercase tracking-wider">Battle Round</div>
              <div className="text-2xl font-bold text-amber-400 font-mono">{state.currentRound}</div>
              <div className="text-[10px] text-stone-500">of 5</div>
            </div>
            <button
              onClick={() => update({ currentRound: Math.min(5, state.currentRound + 1) })}
              disabled={state.currentRound >= 5}
              className="w-8 h-8 rounded-lg border border-emerald-500/30 bg-stone-950 text-emerald-400 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-900 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Player Panels */}
        <div className="space-y-4 mb-6">
          {(["p1", "p2"] as const).map((player) => {
            const isP1 = player === "p1";
            const name = isP1 ? state.player1Name : state.player2Name;
            const vp = isP1 ? state.player1VP : state.player2VP;
            const cp = isP1 ? state.player1CP : state.player2CP;
            const vpKey = isP1 ? "player1VP" : "player2VP";
            const cpKey = isP1 ? "player1CP" : "player2CP";

            return (
              <div key={player} className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900" style={{ borderLeftWidth: '4px', borderLeftColor: isP1 ? 'rgb(16, 185, 129)' : 'rgb(245, 158, 11)' }}>
                <div className="relative p-4">
                  {/* Player Name */}
                  <div className="mb-4">
                    {editingName === player ? (
                      <input
                        autoFocus
                        defaultValue={name}
                        onBlur={(e) => handleNameSubmit(player, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleNameSubmit(player, (e.target as HTMLInputElement).value);
                        }}
                        className="w-full bg-stone-950 border border-emerald-500/40 rounded-lg px-3 py-1.5 text-stone-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    ) : (
                      <button
                        onClick={() => setEditingName(player)}
                        className="text-base font-bold text-stone-100 tracking-wider hover:text-emerald-400 transition-colors"
                      >
                        {name}
                      </button>
                    )}
                  </div>

                  {/* Counters Row */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* VP Counter */}
                    <div className="text-center">
                      <div className="text-[10px] text-emerald-500/70 uppercase tracking-wider mb-2 font-semibold">
                        Victory Points
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => update({ [vpKey]: Math.max(0, vp - 1) } as Partial<TrackerState>)}
                          className="w-12 h-12 rounded-lg border border-emerald-500/30 bg-stone-950 text-emerald-400 font-bold text-lg hover:bg-stone-900 transition-colors"
                        >
                          -
                        </button>
                        {editingCounter === vpKey ? (
                          <input
                            autoFocus
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCounterSubmit(vpKey)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleCounterSubmit(vpKey); }}
                            className="w-14 text-center text-4xl font-bold text-emerald-400 font-mono bg-stone-950 border border-emerald-500/30 rounded-lg focus:outline-none"
                            min="0"
                          />
                        ) : (
                          <button
                            onClick={() => handleCounterTap(vpKey, vp)}
                            className="text-4xl font-bold text-emerald-400 font-mono w-14 text-center hover:text-emerald-300 transition-colors"
                          >
                            {vp}
                          </button>
                        )}
                        <button
                          onClick={() => update({ [vpKey]: vp + 1 } as Partial<TrackerState>)}
                          className="w-12 h-12 rounded-lg border border-emerald-500/30 bg-stone-950 text-emerald-400 font-bold text-lg hover:bg-stone-900 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* CP Counter */}
                    <div className="text-center">
                      <div className="text-[10px] text-amber-500/70 uppercase tracking-wider mb-2 font-semibold">
                        Command Points
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => update({ [cpKey]: Math.max(0, cp - 1) } as Partial<TrackerState>)}
                          className="w-12 h-12 rounded-lg border border-amber-500/30 bg-stone-950 text-amber-400 font-bold text-lg hover:bg-stone-900 transition-colors"
                        >
                          -
                        </button>
                        {editingCounter === cpKey ? (
                          <input
                            autoFocus
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCounterSubmit(cpKey)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleCounterSubmit(cpKey); }}
                            className="w-14 text-center text-4xl font-bold text-amber-400 font-mono bg-stone-950 border border-amber-500/30 rounded-lg focus:outline-none"
                            min="0"
                          />
                        ) : (
                          <button
                            onClick={() => handleCounterTap(cpKey, cp)}
                            className="text-4xl font-bold text-amber-400 font-mono w-14 text-center hover:text-amber-300 transition-colors"
                          >
                            {cp}
                          </button>
                        )}
                        <button
                          onClick={() => update({ [cpKey]: cp + 1 } as Partial<TrackerState>)}
                          className="w-12 h-12 rounded-lg border border-amber-500/30 bg-stone-950 text-amber-400 font-bold text-lg hover:bg-stone-900 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reset Button */}
        <button
          onClick={() => setShowReset(true)}
          className="w-full px-6 py-3 rounded-lg border border-red-500/30 bg-gradient-to-br from-red-950/20 to-stone-950 text-red-400 font-semibold hover:border-red-500/50 hover:bg-red-950/30 transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Reset Game
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {showReset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-sm relative overflow-hidden rounded-sm border border-red-500/30 bg-stone-900 p-6">
            <div className="relative">
              <div className="flex justify-center mb-4">
                <RotateCcw className="w-12 h-12 text-red-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-stone-100 text-center mb-2">
                Reset Game?
              </h3>
              <p className="text-sm text-stone-400 text-center mb-6">
                This will reset all scores, command points, and the round counter back to their starting values.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReset(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-stone-700/60 bg-stone-900 text-stone-300 font-semibold hover:border-emerald-500/50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-all"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
