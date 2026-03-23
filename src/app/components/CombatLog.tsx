import { Swords, Skull } from "lucide-react";
import type { CombatEngagement } from "../../types";

interface CombatLogProps {
  engagements: CombatEngagement[];
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export default function CombatLog({ engagements }: CombatLogProps) {
  if (engagements.length === 0) {
    return (
      <div className="text-center py-6">
        <Swords className="w-8 h-8 text-stone-700 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-stone-500 text-sm">No engagements yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {engagements.map((eng) => {
        const dealt = eng.damage_dealt > 0;
        return (
          <div
            key={eng.id}
            className={`rounded-sm border p-3 ${
              dealt
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-stone-700/60 bg-stone-900"
            }`}
          >
            {/* Header: Attacker -> Defender with Weapon */}
            <div className="flex items-center gap-1.5 text-xs mb-1.5">
              <span className="font-semibold text-stone-200 truncate max-w-[100px]">
                {eng.attacker_unit_name}
              </span>
              <span className="text-stone-500">&rarr;</span>
              <span className="font-semibold text-stone-200 truncate max-w-[100px]">
                {eng.defender_unit_name}
              </span>
              <span className="text-stone-600 ml-auto text-[10px] whitespace-nowrap">
                {formatRelativeTime(eng.timestamp)}
              </span>
            </div>

            {/* Weapon */}
            <div className="text-[10px] text-stone-500 mb-1.5 truncate">
              with {eng.attacker_weapon}
            </div>

            {/* Stats chain */}
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <span>{eng.attacks} atk</span>
              <span className="text-stone-600">&rarr;</span>
              <span>{eng.hits} hit</span>
              <span className="text-stone-600">&rarr;</span>
              <span>{eng.wounds} wnd</span>
              <span className="text-stone-600">&rarr;</span>
              <span>{eng.failed_saves} unsv</span>
              <span className="text-stone-600">&rarr;</span>
              <span className={dealt ? "text-emerald-400 font-semibold" : "text-stone-500"}>
                {eng.damage_dealt} dmg
              </span>
            </div>

            {/* Models destroyed */}
            {eng.models_destroyed > 0 && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-red-400">
                <Skull className="w-3 h-3" />
                <span>
                  {eng.models_destroyed} model{eng.models_destroyed > 1 ? "s" : ""} destroyed
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
