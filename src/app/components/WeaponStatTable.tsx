import { Target, Swords } from "lucide-react";
import type { WeaponProfile } from "../../types";

interface WeaponStatTableProps {
  weapons: WeaponProfile[];
  type: "ranged" | "melee";
  compact?: boolean;
}

/** Styled badge for weapon traits like [SUSTAINED HITS 1], [ANTI-INFANTRY 4+] etc. */
function TraitBadge({ trait }: { trait: string }) {
  // Color code by trait category
  let color = "text-purple-400 border-purple-500/30 bg-purple-500/10";
  const t = trait.toLowerCase();
  if (t.includes("anti-")) color = "text-red-400 border-red-500/30 bg-red-500/10";
  else if (t.includes("sustained") || t.includes("lethal")) color = "text-amber-400 border-amber-500/30 bg-amber-500/10";
  else if (t.includes("devastating") || t.includes("hazardous")) color = "text-orange-400 border-orange-500/30 bg-orange-500/10";
  else if (t.includes("torrent") || t.includes("blast") || t.includes("ignores")) color = "text-sky-400 border-sky-500/30 bg-sky-500/10";
  else if (t.includes("pistol") || t.includes("assault") || t.includes("rapid") || t.includes("heavy")) color = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  else if (t.includes("melta") || t.includes("lance")) color = "text-rose-400 border-rose-500/30 bg-rose-500/10";

  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${color}`}>
      {trait}
    </span>
  );
}

/** Single weapon card with stats grid and trait badges */
function WeaponCard({ weapon, type, compact }: { weapon: WeaponProfile; type: "ranged" | "melee"; compact?: boolean }) {
  const isRanged = type === "ranged";
  const borderColor = isRanged ? "border-emerald-500/20" : "border-red-500/20";
  const accentColor = isRanged ? "text-emerald-400" : "text-red-400";
  const bgGlow = isRanged ? "from-emerald-500/5" : "from-red-500/5";

  return (
    <div className={`relative overflow-hidden rounded-sm border ${borderColor} bg-[var(--bg-card)]`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGlow} to-transparent`} />
      <div className="relative p-3">
        {/* Weapon Name */}
        <h4 className={`text-sm font-semibold text-[var(--text-primary)] mb-2 ${compact ? 'text-xs' : ''}`}>
          {weapon.name}
        </h4>

        {/* Stats Row */}
        <div className="grid grid-cols-6 gap-1 mb-2">
          {[
            { label: isRanged ? "Range" : "Range", value: weapon.range },
            { label: "A", value: weapon.A },
            { label: isRanged ? "BS" : "WS", value: weapon.skill },
            { label: "S", value: weapon.S },
            { label: "AP", value: weapon.AP },
            { label: "D", value: weapon.D },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={`text-[10px] ${accentColor} font-semibold uppercase tracking-wider`}>
                {stat.label}
              </div>
              <div className={`${compact ? 'text-xs' : 'text-sm'} font-bold text-[var(--text-primary)] font-mono`}>
                {stat.value ?? '-'}
              </div>
            </div>
          ))}
        </div>

        {/* Trait Badges */}
        {weapon.traits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {weapon.traits.map((trait) => (
              <TraitBadge key={trait} trait={trait} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WeaponStatTable({ weapons, type, compact }: WeaponStatTableProps) {
  if (weapons.length === 0) return null;

  const isRanged = type === "ranged";
  const Icon = isRanged ? Target : Swords;
  const label = isRanged ? "Ranged Weapons" : "Melee Weapons";
  const iconColor = isRanged ? "text-emerald-500" : "text-red-500";

  return (
    <div className="mb-6">
      <h2 className={`text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
        {label}
        <span className="text-[var(--text-secondary)] text-xs font-normal normal-case ml-auto">
          {weapons.length} {weapons.length === 1 ? 'weapon' : 'weapons'}
        </span>
      </h2>
      <div className="space-y-2">
        {weapons.map((weapon) => (
          <WeaponCard key={weapon.name} weapon={weapon} type={type} compact={compact} />
        ))}
      </div>
    </div>
  );
}

export { TraitBadge, WeaponCard };
