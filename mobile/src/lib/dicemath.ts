// ---------------------------------------------------------------------------
// Warhammer 40K Dice Probability Calculator
// Pure math — no API calls. Works offline on both web and mobile.
// ---------------------------------------------------------------------------

export interface AttackInput {
  attacks: number;
  skill: number;       // BS/WS target (e.g. 3 for 3+)
  strength: number;
  toughness: number;
  ap: number;          // AP value as positive (e.g. 2 for AP-2)
  save: number;        // Armor save target (e.g. 3 for 3+)
  invuln?: number;     // Invulnerable save (e.g. 4 for 4+)
  damage: number;      // Damage per unsaved wound
  fnp?: number;        // Feel No Pain target (e.g. 5 for 5+)
  // Special rules
  rerollHits?: 'ones' | 'all';
  rerollWounds?: 'ones' | 'all';
  lethalHits?: boolean;
  sustainedHits?: number;  // e.g. 1 for Sustained Hits 1
  devWounds?: boolean;
}

export interface AttackResult {
  expectedHits: number;
  expectedWounds: number;
  expectedUnsaved: number;
  expectedDamage: number;
  expectedModelsKilled: number;  // at damage-per-wound
  hitProb: number;
  woundProb: number;
  saveProb: number;
}

/** Probability of rolling target+ on a d6 */
function probOf(target: number): number {
  if (target <= 1) return 1;
  if (target >= 7) return 0;
  return (7 - target) / 6;
}

/** Wound roll target based on S vs T */
function woundTarget(strength: number, toughness: number): number {
  if (strength >= toughness * 2) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (strength * 2 <= toughness) return 6;
  return 5;
}

/** Probability after rerolls */
function withReroll(baseProb: number, reroll: 'ones' | 'all' | undefined): number {
  if (!reroll) return baseProb;
  if (reroll === 'ones') {
    // Reroll 1s: 1/6 chance of rolling a 1, then baseProb chance on reroll
    return baseProb + (1 / 6) * (1 - baseProb) * baseProb;
  }
  // Reroll all failures
  return baseProb + (1 - baseProb) * baseProb;
}

export function calculateAttack(input: AttackInput): AttackResult {
  const {
    attacks, skill, strength, toughness, ap, save, invuln, damage,
    fnp, rerollHits, rerollWounds, lethalHits, sustainedHits, devWounds,
  } = input;

  // Hit probability
  const baseHitProb = probOf(skill);
  const hitProb = withReroll(baseHitProb, rerollHits);
  const critHitProb = 1 / 6; // natural 6

  // Wound target
  const wTarget = woundTarget(strength, toughness);
  const baseWoundProb = probOf(wTarget);
  const woundProb = withReroll(baseWoundProb, rerollWounds);

  // Save target (modified by AP)
  const modifiedSave = save + ap;
  const effectiveSave = invuln ? Math.min(modifiedSave, invuln) : modifiedSave;
  const saveProb = probOf(effectiveSave);
  const failSaveProb = 1 - saveProb;

  // Expected hits (with sustained hits on crits)
  let expectedHits = attacks * hitProb;
  const expectedCrits = attacks * critHitProb;

  if (sustainedHits) {
    expectedHits += expectedCrits * sustainedHits;
  }

  // Expected wounds
  let expectedWounds: number;
  if (lethalHits) {
    // Crit hits auto-wound, rest need wound rolls
    const normalHits = expectedHits - expectedCrits;
    expectedWounds = expectedCrits + normalHits * woundProb;
  } else {
    expectedWounds = expectedHits * woundProb;
  }

  // Expected unsaved wounds
  let expectedUnsaved: number;
  if (devWounds) {
    // Crit wounds (6s to wound) skip saves
    const critWoundProb = 1 / 6;
    const normalWoundFraction = 1 - critWoundProb;
    const critWounds = expectedWounds * critWoundProb;
    const normalWounds = expectedWounds * normalWoundFraction;
    expectedUnsaved = critWounds + normalWounds * failSaveProb;
  } else {
    expectedUnsaved = expectedWounds * failSaveProb;
  }

  // Feel No Pain
  let expectedDamage = expectedUnsaved * damage;
  if (fnp) {
    const fnpProb = probOf(fnp);
    expectedDamage *= (1 - fnpProb);
  }

  return {
    expectedHits: Math.round(expectedHits * 100) / 100,
    expectedWounds: Math.round(expectedWounds * 100) / 100,
    expectedUnsaved: Math.round(expectedUnsaved * 100) / 100,
    expectedDamage: Math.round(expectedDamage * 100) / 100,
    expectedModelsKilled: Math.round((expectedDamage / Math.max(1, damage)) * 100) / 100,
    hitProb: Math.round(hitProb * 10000) / 100,
    woundProb: Math.round(woundProb * 10000) / 100,
    saveProb: Math.round(failSaveProb * 10000) / 100,
  };
}
