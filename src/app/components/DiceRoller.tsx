import { useState, useEffect, useCallback } from "react";
import { Dices } from "lucide-react";

interface DiceRollerProps {
  count: number;
  target: number;
  label: string;
  onComplete: (rolls: number[]) => void;
  mode: "digital" | "manual";
}

// Pip layouts for each die face (positions in a 3x3 grid)
const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function DieFace({ value, size = 48 }: { value: number; size?: number }) {
  const pips = PIP_POSITIONS[value] ?? [];
  const cellSize = size / 3;
  const pipRadius = Math.max(2, cellSize * 0.22);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {pips.map(([row, col], i) => (
        <circle
          key={i}
          cx={col * cellSize + cellSize / 2}
          cy={row * cellSize + cellSize / 2}
          r={pipRadius}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

export default function DiceRoller({ count, target, label, onComplete, mode }: DiceRollerProps) {
  const [rolls, setRolls] = useState<number[]>([]);
  const [rolling, setRolling] = useState(false);
  const [animValues, setAnimValues] = useState<number[]>([]);
  const [manualInputs, setManualInputs] = useState<string[]>(
    () => Array.from({ length: count }, () => "")
  );
  const [submitted, setSubmitted] = useState(false);

  // Reset when count/label changes
  useEffect(() => {
    setRolls([]);
    setRolling(false);
    setAnimValues([]);
    setManualInputs(Array.from({ length: count }, () => ""));
    setSubmitted(false);
  }, [count, label]);

  const rollDigital = useCallback(() => {
    if (rolling || count === 0) return;
    setRolling(true);
    setRolls([]);

    // Animate random faces rapidly for 800ms
    const interval = setInterval(() => {
      setAnimValues(
        Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1)
      );
    }, 60);

    setTimeout(() => {
      clearInterval(interval);
      const finalRolls = Array.from({ length: count }, () =>
        Math.floor(Math.random() * 6) + 1
      );
      setRolls(finalRolls);
      setAnimValues([]);
      setRolling(false);
      onComplete(finalRolls);
    }, 800);
  }, [count, rolling, onComplete]);

  const handleManualSubmit = useCallback(() => {
    const parsed = manualInputs.map((v) => {
      const n = parseInt(v);
      return isNaN(n) || n < 1 || n > 6 ? 1 : n;
    });
    setRolls(parsed);
    setSubmitted(true);
    onComplete(parsed);
  }, [manualInputs, onComplete]);

  const handleManualInputChange = (index: number, value: string) => {
    setManualInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  if (count === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-stone-500 text-sm">No dice to roll</p>
      </div>
    );
  }

  const displayValues = rolls.length > 0 ? rolls : animValues;
  const successes = rolls.filter((r) => r >= target).length;
  const failures = rolls.filter((r) => r < target).length;

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dices className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-stone-200">{label}</span>
        </div>
        <span className="text-xs text-stone-500">
          {count}D6, need {target}+
        </span>
      </div>

      {mode === "digital" ? (
        <>
          {/* Dice grid */}
          <div className="flex flex-wrap gap-2 justify-center min-h-[56px]">
            {displayValues.length > 0
              ? displayValues.map((val, i) => {
                  const isResult = rolls.length > 0;
                  const success = isResult && val >= target;
                  const fail = isResult && val < target;
                  return (
                    <div
                      key={i}
                      className={`w-12 h-12 rounded-sm flex items-center justify-center border transition-all duration-300 ${
                        rolling
                          ? "border-stone-600 bg-stone-800 text-stone-300 animate-dice-tumble"
                          : success
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                            : fail
                              ? "border-red-500/60 bg-red-500/10 text-red-400"
                              : "border-stone-600 bg-stone-800 text-stone-300"
                      }`}
                    >
                      <DieFace value={val} size={36} />
                    </div>
                  );
                })
              : Array.from({ length: count }, (_, i) => (
                  <div
                    key={i}
                    className="w-12 h-12 rounded-sm border border-stone-700 bg-stone-800/50 flex items-center justify-center"
                  >
                    <span className="text-stone-600 text-lg">?</span>
                  </div>
                ))}
          </div>

          {/* Roll button or results */}
          {rolls.length === 0 ? (
            <button
              onClick={rollDigital}
              disabled={rolling}
              className="w-full py-2.5 rounded-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 disabled:text-stone-500 text-black font-semibold text-sm transition-colors"
            >
              {rolling ? "Rolling..." : `Roll ${count}D6`}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-emerald-400 font-semibold">
                {successes} pass{successes !== 1 ? "es" : ""}
              </span>
              <span className="text-stone-600">|</span>
              <span className="text-red-400">
                {failures} fail{failures !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Manual entry grid */}
          <div className="flex flex-wrap gap-2 justify-center">
            {manualInputs.map((val, i) => (
              <input
                key={i}
                type="number"
                min={1}
                max={6}
                value={val}
                onChange={(e) => handleManualInputChange(i, e.target.value)}
                disabled={submitted}
                className={`w-12 h-12 rounded-sm text-center text-lg font-bold border transition-colors ${
                  submitted
                    ? parseInt(val) >= target
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                      : "border-red-500/60 bg-red-500/10 text-red-400"
                    : "border-stone-600 bg-stone-800 text-stone-200 focus:border-emerald-500 focus:outline-none"
                } [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                placeholder="-"
              />
            ))}
          </div>

          {!submitted ? (
            <button
              onClick={handleManualSubmit}
              className="w-full py-2.5 rounded-sm bg-emerald-600 hover:bg-emerald-500 text-black font-semibold text-sm transition-colors"
            >
              Submit Rolls
            </button>
          ) : (
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-emerald-400 font-semibold">
                {successes} pass{successes !== 1 ? "es" : ""}
              </span>
              <span className="text-stone-600">|</span>
              <span className="text-red-400">
                {failures} fail{failures !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
