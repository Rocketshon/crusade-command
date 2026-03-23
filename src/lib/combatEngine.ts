// Combat Engine — Warhammer 40K 10th Edition combat resolution math
// Handles hit rolls, wound rolls, saving throws, and damage calculation

import type { WeaponProfile, UnitStats } from '../types';

// ---------------------------------------------------------------------------
// Dice math helpers
// ---------------------------------------------------------------------------

/** Roll a D6 (1-6) */
export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/** Roll multiple D6s */
export function rollMultipleD6(count: number): number[] {
  return Array.from({ length: count }, () => rollD6());
}

/** Parse a dice string like "D6", "2D6", "D3", "3", "D6+1" */
export function parseDiceString(str: string): number {
  if (!str || str === '-' || str === 'N/A') return 0;
  const trimmed = str.trim().toUpperCase();

  // Plain number
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed);

  // D6+N or D3+N
  const plusMatch = trimmed.match(/^(\d*)D(\d)\+(\d+)$/);
  if (plusMatch) {
    const count = plusMatch[1] ? parseInt(plusMatch[1]) : 1;
    const sides = parseInt(plusMatch[2]);
    const bonus = parseInt(plusMatch[3]);
    let total = bonus;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
  }

  // ND6 or ND3
  const diceMatch = trimmed.match(/^(\d*)D(\d)$/);
  if (diceMatch) {
    const count = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
    const sides = parseInt(diceMatch[2]);
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
  }

  return parseInt(trimmed) || 0;
}

/** Parse a stat value like "3+", "4+", "2+" into the target number */
export function parseStatTarget(stat: string): number {
  if (!stat || stat === '-' || stat === 'N/A') return 7; // impossible
  const match = stat.match(/(\d+)\+?/);
  return match ? parseInt(match[1]) : 7;
}

// ---------------------------------------------------------------------------
// Combat resolution
// ---------------------------------------------------------------------------

export interface CombatInput {
  // Attacker
  attackerBS: string;    // e.g., "3+" for ranged, WS for melee
  weapon: WeaponProfile;
  phase: 'shooting' | 'melee';

  // Defender
  defenderT: string;     // Toughness, e.g., "4"
  defenderSv: string;    // Save, e.g., "3+"
  defenderInvuln: string | null; // Invulnerable save, e.g., "4+"
  defenderW: string;     // Wounds per model, e.g., "2"

  // Modifiers
  hitModifier?: number;   // +1 or -1 to hit
  woundModifier?: number; // +1 or -1 to wound

  // Manual rolls (if player uses real dice)
  manualHitRolls?: number[];
  manualWoundRolls?: number[];
  manualSaveRolls?: number[];
}

export interface CombatResult {
  // Counts
  totalAttacks: number;
  hitRolls: number[];
  hits: number;
  criticalHits: number;
  woundRolls: number[];
  wounds: number;
  saveRolls: number[];
  failedSaves: number;
  damagePerFailedSave: number[];
  totalDamage: number;
  modelsDestroyed: number;

  // Thresholds (for display: "You need X+ to hit")
  hitTarget: number;
  woundTarget: number;
  saveTarget: number;
}

/** Calculate the wound roll target based on Strength vs Toughness */
export function getWoundTarget(strength: number, toughness: number): number {
  if (strength >= toughness * 2) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (strength * 2 <= toughness) return 6;
  return 5; // strength < toughness
}

/** Calculate the effective save after AP */
export function getEffectiveSave(save: string, ap: string, invuln: string | null): number {
  const baseSave = parseStatTarget(save);
  const apValue = parseInt(ap) || 0; // AP is negative, e.g., "-2"
  const modifiedSave = baseSave + Math.abs(apValue);

  if (invuln) {
    const invulnSave = parseStatTarget(invuln);
    return Math.min(modifiedSave, invulnSave);
  }
  return modifiedSave;
}

/** Resolve a full combat sequence: attacks → hits → wounds → saves → damage */
export function resolveCombat(input: CombatInput): CombatResult {
  const {
    attackerBS, weapon, phase,
    defenderT, defenderSv, defenderInvuln, defenderW,
    hitModifier = 0, woundModifier = 0,
    manualHitRolls, manualWoundRolls, manualSaveRolls,
  } = input;

  // 1. Determine number of attacks
  const totalAttacks = parseDiceString(weapon.A);

  // 2. Hit rolls
  const skill = phase === 'shooting' ? attackerBS : attackerBS; // Both use the weapon's skill
  const baseHitTarget = parseStatTarget(skill);
  const hitTarget = Math.max(2, Math.min(6, baseHitTarget - hitModifier)); // Clamp 2-6
  const hitRolls = manualHitRolls ?? rollMultipleD6(totalAttacks);
  let hits = 0;
  let criticalHits = 0;
  for (const roll of hitRolls) {
    if (roll === 1) continue; // Unmodified 1 always fails
    if (roll === 6) { hits++; criticalHits++; continue; } // Unmodified 6 always hits (critical)
    if (roll >= hitTarget) hits++;
  }

  // Handle SUSTAINED HITS trait
  const sustainedHits = weapon.traits?.find(t => t.toLowerCase().includes('sustained hits'));
  if (sustainedHits && criticalHits > 0) {
    const bonusMatch = sustainedHits.match(/(\d+)/);
    const bonusPerCrit = bonusMatch ? parseInt(bonusMatch[1]) : 1;
    hits += criticalHits * bonusPerCrit;
  }

  // Handle LETHAL HITS trait (critical hits auto-wound)
  const lethalHits = weapon.traits?.some(t => t.toLowerCase().includes('lethal hits'));
  let autoWounds = 0;
  if (lethalHits) {
    autoWounds = criticalHits;
    hits -= criticalHits; // Remove crits from wound roll pool — they auto-wound
  }

  // 3. Wound rolls
  const strength = parseInt(weapon.S) || 0;
  const toughness = parseInt(defenderT) || 0;
  const baseWoundTarget = getWoundTarget(strength, toughness);
  const woundTarget = Math.max(2, Math.min(6, baseWoundTarget - woundModifier));
  const woundRolls = manualWoundRolls ?? rollMultipleD6(hits);
  let wounds = autoWounds;
  for (const roll of woundRolls) {
    if (roll === 1) continue; // Unmodified 1 always fails
    if (roll === 6) { wounds++; continue; } // Unmodified 6 always wounds
    if (roll >= woundTarget) wounds++;
  }

  // 4. Save rolls
  const saveTarget = getEffectiveSave(defenderSv, weapon.AP, defenderInvuln);
  const saveRolls = manualSaveRolls ?? rollMultipleD6(wounds);
  let failedSaves = 0;
  for (const roll of saveRolls) {
    if (saveTarget > 6) { failedSaves++; continue; } // No save possible
    if (roll < saveTarget) failedSaves++;
  }

  // 5. Damage
  const woundsPerModel = parseInt(defenderW) || 1;
  const damagePerFailedSave: number[] = [];
  let totalDamage = 0;
  for (let i = 0; i < failedSaves; i++) {
    const dmg = parseDiceString(weapon.D);
    damagePerFailedSave.push(dmg);
    totalDamage += dmg;
  }

  // Handle DEVASTATING WOUNDS trait (mortal wounds on critical wound)
  // TODO: implement when we track mortal wounds separately

  const modelsDestroyed = Math.floor(totalDamage / woundsPerModel);

  return {
    totalAttacks,
    hitRolls,
    hits: hits + autoWounds,
    criticalHits,
    woundRolls,
    wounds,
    saveRolls,
    failedSaves,
    damagePerFailedSave,
    totalDamage,
    modelsDestroyed,
    hitTarget,
    woundTarget,
    saveTarget,
  };
}

/** Get a human-readable summary of a combat result */
export function getCombatSummary(
  attackerName: string,
  weaponName: string,
  defenderName: string,
  result: CombatResult,
): string {
  const parts: string[] = [];
  parts.push(`${attackerName} attacks ${defenderName} with ${weaponName}`);
  parts.push(`${result.totalAttacks} attacks → ${result.hits} hits → ${result.wounds} wounds → ${result.failedSaves} unsaved`);
  if (result.totalDamage > 0) {
    parts.push(`${result.totalDamage} damage dealt`);
    if (result.modelsDestroyed > 0) {
      parts.push(`${result.modelsDestroyed} model${result.modelsDestroyed > 1 ? 's' : ''} destroyed`);
    }
  } else {
    parts.push('No damage dealt');
  }
  return parts.join(' — ');
}
