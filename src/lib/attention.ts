import type { CrusadeUnit, UnitRank } from '../types';
import { getRankFromXP } from './ranks';

export interface AttentionItem {
  type: 'rank_up' | 'missing_scar' | 'missing_warlord_trait';
  message: string;
  actionUrl: string;
}

/** Max battle honours allowed per rank */
const MAX_HONOURS: Record<UnitRank, number> = {
  'Battle-ready': 0,
  'Blooded': 1,
  'Battle-hardened': 2,
  'Heroic': 3,
  'Legendary': 4,
};

/** XP thresholds for reaching each rank */
const RANK_XP_THRESHOLDS: Record<UnitRank, number> = {
  'Battle-ready': 0,
  'Blooded': 5,
  'Battle-hardened': 16,
  'Heroic': 31,
  'Legendary': 51,
};

const RANK_ORDER: UnitRank[] = ['Battle-ready', 'Blooded', 'Battle-hardened', 'Heroic', 'Legendary'];

export function getUnitAttentionItems(unit: CrusadeUnit): AttentionItem[] {
  const items: AttentionItem[] = [];
  const url = `/unit/${unit.id}`;

  // 1. Rank-up available: XP crossed threshold but honours < max for that rank
  const currentRank = getRankFromXP(unit.experience_points);
  const rankIndex = RANK_ORDER.indexOf(currentRank);
  if (rankIndex > 0) {
    const maxHonours = MAX_HONOURS[currentRank];
    if (unit.battle_honours.length < maxHonours) {
      items.push({
        type: 'rank_up',
        message: `${unit.custom_name} can gain a Battle Honour (${currentRank})`,
        actionUrl: url,
      });
    }
  }

  // 2. Unit destroyed but no scar assigned
  if (unit.is_destroyed && unit.battle_scars.length === 0) {
    items.push({
      type: 'missing_scar',
      message: `${unit.custom_name} was destroyed but has no Battle Scar`,
      actionUrl: url,
    });
  }

  // 3. Is warlord but no warlord trait in battle_honours
  if (unit.is_warlord) {
    const hasWarlordTrait = unit.battle_honours.some(
      (h) => h.type === 'battle_trait' || h.name.toLowerCase().includes('warlord')
    );
    if (!hasWarlordTrait && unit.battle_honours.length === 0) {
      items.push({
        type: 'missing_warlord_trait',
        message: `${unit.custom_name} is your Warlord but has no trait`,
        actionUrl: url,
      });
    }
  }

  return items;
}

export function getPlayerAttentionCount(units: CrusadeUnit[]): number {
  return units.reduce((count, unit) => count + getUnitAttentionItems(unit).length, 0);
}
