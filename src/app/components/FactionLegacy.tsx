import { getFactionLegacyConfig } from "../../lib/factionLegacy";
import type { FactionLegacyTracker } from "../../lib/factionLegacy";
import { Minus, Plus } from "lucide-react";

interface FactionLegacyProps {
  factionId: string;
  legacy: Record<string, unknown>;
  onUpdate: (key: string, value: unknown) => void;
}

export default function FactionLegacy({ factionId, legacy, onUpdate }: FactionLegacyProps) {
  const config = getFactionLegacyConfig(factionId);
  if (!config) return null;

  return (
    <div className="space-y-4">
      {config.trackers.map((tracker) => (
        <TrackerRenderer
          key={tracker.key}
          tracker={tracker}
          value={legacy[tracker.key]}
          onUpdate={(val) => onUpdate(tracker.key, val)}
        />
      ))}
    </div>
  );
}

function TrackerRenderer({
  tracker,
  value,
  onUpdate,
}: {
  tracker: FactionLegacyTracker;
  value: unknown;
  onUpdate: (val: unknown) => void;
}) {
  switch (tracker.type) {
    case 'counter':
      return <CounterTracker tracker={tracker} value={value} onUpdate={onUpdate} />;
    case 'progress':
      return <ProgressTracker tracker={tracker} value={value} onUpdate={onUpdate} />;
    case 'grid':
      return <GridTracker tracker={tracker} value={value} onUpdate={onUpdate} />;
    case 'toggle_list':
      return <ToggleListTracker tracker={tracker} value={value} onUpdate={onUpdate} />;
  }
}

// --- Counter ---
function CounterTracker({
  tracker,
  value,
  onUpdate,
}: {
  tracker: FactionLegacyTracker;
  value: unknown;
  onUpdate: (val: unknown) => void;
}) {
  const count = typeof value === 'number' ? value : 0;

  return (
    <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-4">
      <h4 className="text-sm font-semibold text-emerald-400 mb-1">{tracker.label}</h4>
      <p className="text-xs text-stone-500 mb-3">{tracker.description}</p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onUpdate(Math.max(0, count - 1))}
          className="w-9 h-9 rounded-lg border border-emerald-500/30 bg-stone-950 text-emerald-400 flex items-center justify-center hover:bg-stone-800 transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-2xl font-bold text-emerald-400 font-mono w-12 text-center">
          {count}
        </span>
        <button
          onClick={() => onUpdate(count + 1)}
          className="w-9 h-9 rounded-lg border border-emerald-500/30 bg-stone-950 text-emerald-400 flex items-center justify-center hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// --- Progress ---
function ProgressTracker({
  tracker,
  value,
  onUpdate,
}: {
  tracker: FactionLegacyTracker;
  value: unknown;
  onUpdate: (val: unknown) => void;
}) {
  const current = typeof value === 'number' ? value : 0;
  const max = tracker.max ?? 10;
  const pct = Math.min((current / max) * 100, 100);

  return (
    <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-4">
      <h4 className="text-sm font-semibold text-emerald-400 mb-1">{tracker.label}</h4>
      <p className="text-xs text-stone-500 mb-3">{tracker.description}</p>
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => onUpdate(Math.max(0, current - 1))}
          className="w-8 h-8 rounded-lg border border-emerald-500/30 bg-stone-950 text-emerald-400 flex items-center justify-center hover:bg-stone-800 transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <div className="flex-1">
          <div className="relative h-4 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => onUpdate(Math.min(max, current + 1))}
          className="w-8 h-8 rounded-lg border border-emerald-500/30 bg-stone-950 text-emerald-400 flex items-center justify-center hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      <div className="text-center text-xs text-stone-400 font-mono">
        {current} / {max}
      </div>
    </div>
  );
}

// --- Grid (3x3) ---
function GridTracker({
  tracker,
  value,
  onUpdate,
}: {
  tracker: FactionLegacyTracker;
  value: unknown;
  onUpdate: (val: unknown) => void;
}) {
  // value is a boolean[] of length 9
  const cells: boolean[] = Array.isArray(value) && value.length === 9
    ? (value as boolean[])
    : Array(9).fill(false);

  const toggle = (idx: number) => {
    const next = [...cells];
    next[idx] = !next[idx];
    onUpdate(next);
  };

  return (
    <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-4">
      <h4 className="text-sm font-semibold text-emerald-400 mb-1">{tracker.label}</h4>
      <p className="text-xs text-stone-500 mb-3">{tracker.description}</p>
      <div className="grid grid-cols-3 gap-2 max-w-[180px] mx-auto">
        {cells.map((active, idx) => (
          <button
            key={idx}
            onClick={() => toggle(idx)}
            className={`aspect-square rounded-sm border transition-all flex items-center justify-center text-lg ${
              active
                ? "bg-emerald-600 border-emerald-500/60 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "bg-stone-800 border-stone-700/60 text-stone-600 hover:border-emerald-500/40"
            }`}
          >
            {active && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Toggle List ---
function ToggleListTracker({
  tracker,
  value,
  onUpdate,
}: {
  tracker: FactionLegacyTracker;
  value: unknown;
  onUpdate: (val: unknown) => void;
}) {
  const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
  const options = tracker.options ?? [];

  const toggle = (option: string) => {
    const next = selected.includes(option)
      ? selected.filter(s => s !== option)
      : [...selected, option];
    onUpdate(next);
  };

  return (
    <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-4">
      <h4 className="text-sm font-semibold text-emerald-400 mb-1">{tracker.label}</h4>
      <p className="text-xs text-stone-500 mb-3">{tracker.description}</p>
      <div className="space-y-2">
        {options.map((option) => {
          const isActive = selected.includes(option);
          return (
            <button
              key={option}
              onClick={() => toggle(option)}
              className={`w-full text-left rounded-sm px-3 py-2 transition-all flex items-center gap-3 ${
                isActive
                  ? "bg-emerald-900/30 border border-emerald-500/40"
                  : "bg-stone-800 border border-stone-700/60 hover:border-emerald-500/40"
              }`}
            >
              <div
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-emerald-600 border-emerald-500"
                    : "border-stone-600 bg-stone-800"
                }`}
              >
                {isActive && (
                  <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${isActive ? "text-emerald-300" : "text-stone-300"}`}>
                {option}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
