import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import DiceRoller from "../components/DiceRoller";

interface RollRecord {
  id: string;
  count: number;
  target: number;
  passes: number;
  fails: number;
  rolls: number[];
}

export default function QuickDiceRoller() {
  const navigate = useNavigate();
  const [diceCount, setDiceCount] = useState(3);
  const [targetNumber, setTargetNumber] = useState(4);
  const [rollKey, setRollKey] = useState(0);
  const [history, setHistory] = useState<RollRecord[]>([]);

  const handleRollComplete = useCallback(
    (rolls: number[]) => {
      const passes = rolls.filter((r) => r >= targetNumber).length;
      const fails = rolls.length - passes;
      setHistory((prev) => {
        const next = [
          { id: crypto.randomUUID(), count: diceCount, target: targetNumber, passes, fails, rolls },
          ...prev,
        ];
        return next.slice(0, 10);
      });
    },
    [diceCount, targetNumber]
  );

  const handleRollAgain = () => {
    setRollKey((k) => k + 1);
  };

  const targets = [2, 3, 4, 5, 6];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-stone-950/90 backdrop-blur-sm border-b border-stone-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-stone-400" />
          </button>
          <h1 className="text-lg font-bold text-stone-100 tracking-wide">Dice Roller</h1>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-6">
        {/* Number of Dice */}
        <div>
          <label className="block text-xs text-stone-500 uppercase tracking-wider mb-2">
            Number of Dice
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDiceCount((c) => Math.max(1, c - 1))}
              className="p-2 rounded-sm bg-stone-800 border border-stone-700 hover:border-stone-600 transition-colors"
            >
              <Minus className="w-4 h-4 text-stone-300" />
            </button>
            <span className="text-2xl font-bold text-stone-100 w-12 text-center tabular-nums">
              {diceCount}
            </span>
            <button
              onClick={() => setDiceCount((c) => Math.min(20, c + 1))}
              className="p-2 rounded-sm bg-stone-800 border border-stone-700 hover:border-stone-600 transition-colors"
            >
              <Plus className="w-4 h-4 text-stone-300" />
            </button>
          </div>
        </div>

        {/* Target Number */}
        <div>
          <label className="block text-xs text-stone-500 uppercase tracking-wider mb-2">
            Target Number
          </label>
          <div className="flex gap-2">
            {targets.map((t) => (
              <button
                key={t}
                onClick={() => setTargetNumber(t)}
                className={`flex-1 py-2.5 rounded-sm text-sm font-bold transition-colors border ${
                  targetNumber === t
                    ? "bg-amber-500/20 border-amber-500/60 text-amber-400"
                    : "bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600"
                }`}
              >
                {t}+
              </button>
            ))}
          </div>
        </div>

        {/* Dice Roller */}
        <div className="bg-stone-900 border border-stone-800 rounded-sm p-4">
          <DiceRoller
            key={rollKey}
            count={diceCount}
            target={targetNumber}
            label={`${diceCount}D6, ${targetNumber}+`}
            onComplete={handleRollComplete}
            mode="digital"
          />
        </div>

        {/* Roll Again Button */}
        {history.length > 0 && (
          <button
            onClick={handleRollAgain}
            className="w-full py-2.5 rounded-sm bg-amber-600 hover:bg-amber-500 text-black font-semibold text-sm transition-colors"
          >
            Roll Again
          </button>
        )}

        {/* Roll History */}
        {history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs text-stone-500 uppercase tracking-wider">
                Recent Rolls
              </label>
              <button
                onClick={() => setHistory([])}
                className="text-xs text-stone-600 hover:text-stone-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="bg-stone-900 border border-stone-800 rounded-sm px-4 py-3 flex items-center justify-between"
                >
                  <div className="text-xs text-stone-500">
                    {record.count}D6, {record.target}+
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-emerald-400 font-semibold">
                      {record.passes} pass{record.passes !== 1 ? "es" : ""}
                    </span>
                    <span className="text-stone-700">|</span>
                    <span className="text-red-400">
                      {record.fails} fail{record.fails !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
