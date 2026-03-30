/**
 * Phase Parser — maps stratagems and abilities to game phases
 * for the Tactical Cheat Sheet feature.
 */

import type {
  DetachmentStratagem,
  Datasheet,
  CrusadeUnit,
  FactionId,
} from '../types';
import { getDataFactionId } from './factions';
import { FACTION_RULES } from '../data';
import { UNITS } from '../data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GamePhase =
  | 'command'
  | 'movement'
  | 'shooting'
  | 'charge'
  | 'fight';

export type Timing = 'your_turn' | 'opponent_turn' | 'either';

export interface CheatSheetEntry {
  type: 'stratagem' | 'ability' | 'detachment_rule' | 'core_ability';
  name: string;
  phase: GamePhase;
  timing: Timing;
  /** Stratagem CP cost */
  cp?: string;
  /** Stratagem type (Battle Tactic, Strategic Ploy, etc.) */
  stratagemType?: string;
  /** Source detachment name */
  detachment?: string;
  /** Source unit(s) that provide this ability */
  sourceUnits?: string[];
  /** Short description - when/target/effect combined */
  when?: string;
  target?: string;
  effect?: string;
  restrictions?: string;
  /** For abilities: the ability text */
  description?: string;
}

export interface PhaseSection {
  phase: GamePhase;
  label: string;
  yourTurn: CheatSheetEntry[];
  opponentTurn: CheatSheetEntry[];
  either: CheatSheetEntry[];
}

// ---------------------------------------------------------------------------
// Phase parsing from stratagem "when" fields
// ---------------------------------------------------------------------------

const PHASE_KEYWORDS: Record<GamePhase, RegExp[]> = {
  command: [/command\s*phase/i],
  movement: [/movement\s*phase/i, /move/i, /advance/i, /fall\s*back/i],
  shooting: [/shooting\s*phase/i, /shoot/i, /ranged/i, /overwatch/i],
  charge: [/charge\s*phase/i, /charge/i],
  fight: [/fight\s*phase/i, /fight/i, /melee/i, /pile\s*in/i, /consolidat/i],
};

const TIMING_PATTERNS: { pattern: RegExp; timing: Timing }[] = [
  { pattern: /your\s*opponent['']?s?\s*(turn|phase)/i, timing: 'opponent_turn' },
  { pattern: /enemy\s*(turn|phase)/i, timing: 'opponent_turn' },
  { pattern: /your\s*(turn|phase)/i, timing: 'your_turn' },
  { pattern: /either\s*player['']?s?\s*turn/i, timing: 'either' },
];

export function parsePhase(whenText: string): GamePhase {
  const text = whenText.toLowerCase();

  // Check exact phase keywords in order of specificity
  if (/command\s*phase/i.test(text)) return 'command';
  if (/fight\s*phase/i.test(text) || /pile\s*in/i.test(text) || /consolidat/i.test(text)) return 'fight';
  if (/charge\s*phase/i.test(text)) return 'charge';
  if (/shooting\s*phase/i.test(text) || /overwatch/i.test(text)) return 'shooting';
  if (/movement\s*phase/i.test(text) || /advance/i.test(text) || /fall\s*back/i.test(text)) return 'movement';

  // Fallback: check if any phase keyword exists
  for (const [phase, patterns] of Object.entries(PHASE_KEYWORDS)) {
    for (const pat of patterns) {
      if (pat.test(text)) return phase as GamePhase;
    }
  }

  // Default to command if we can't determine phase
  return 'command';
}

export function parseTiming(whenText: string): Timing {
  for (const { pattern, timing } of TIMING_PATTERNS) {
    if (pattern.test(whenText)) return timing;
  }
  return 'either';
}

// ---------------------------------------------------------------------------
// Build cheat sheet from roster data
// ---------------------------------------------------------------------------

export const PHASE_LABELS: Record<GamePhase, string> = {
  command: 'Command Phase',
  movement: 'Movement Phase',
  shooting: 'Shooting Phase',
  charge: 'Charge Phase',
  fight: 'Fight Phase',
};

export const PHASE_ORDER: GamePhase[] = ['command', 'movement', 'shooting', 'charge', 'fight'];

/**
 * Build a complete tactical cheat sheet from a player's roster and detachment.
 */
export function buildCheatSheet(
  factionId: FactionId,
  detachmentId: string | undefined,
  rosterUnits: CrusadeUnit[],
): PhaseSection[] {
  const entries: CheatSheetEntry[] = [];
  const dataFactionId = getDataFactionId(factionId);
  const factionRules = FACTION_RULES[dataFactionId] ?? null;
  const allDatasheets = UNITS[dataFactionId] ?? [];

  // 1. Detachment stratagems
  if (factionRules && detachmentId) {
    const detachment = factionRules.detachments?.find(d => d.name === detachmentId);
    if (detachment) {
      // Add detachment rule as a command-phase entry
      if (detachment.rule?.text) {
        entries.push({
          type: 'detachment_rule',
          name: detachment.rule.name,
          phase: 'command',
          timing: 'either',
          description: detachment.rule.text,
          detachment: detachment.name,
        });
      }

      // Add stratagems
      for (const strat of detachment.stratagems) {
        const phase = parsePhase(strat.when);
        const timing = parseTiming(strat.when);

        // Check if this stratagem targets any of the roster's unit keywords
        const matchingUnits = findMatchingUnits(strat, rosterUnits, allDatasheets);

        entries.push({
          type: 'stratagem',
          name: strat.name,
          phase,
          timing,
          cp: strat.cp,
          stratagemType: strat.type,
          detachment: detachment.name,
          sourceUnits: matchingUnits.length > 0 ? matchingUnits : undefined,
          when: strat.when,
          target: strat.target,
          effect: strat.effect,
          restrictions: strat.restrictions,
        });
      }
    }
  }

  // 2. Unit abilities from roster
  for (const unit of rosterUnits) {
    const datasheet = allDatasheets.find(d => d.name === unit.datasheet_name);
    if (!datasheet) continue;

    // Core abilities (e.g., "Fights First", "Feel No Pain 5+", "Deep Strike")
    for (const core of datasheet.abilities.core) {
      const abilityPhase = parseCoreAbilityPhase(core);
      if (abilityPhase) {
        entries.push({
          type: 'core_ability',
          name: core,
          phase: abilityPhase.phase,
          timing: abilityPhase.timing,
          sourceUnits: [unit.custom_name || unit.datasheet_name],
          description: core,
        });
      }
    }

    // Other abilities
    for (const [abilName, abilText] of datasheet.abilities.other) {
      const abilityPhase = parseAbilityPhase(abilName, abilText);
      entries.push({
        type: 'ability',
        name: abilName,
        phase: abilityPhase.phase,
        timing: abilityPhase.timing,
        sourceUnits: [unit.custom_name || unit.datasheet_name],
        description: abilText,
      });
    }
  }

  // 3. Deduplicate core abilities that appear on multiple units
  const deduped = deduplicateEntries(entries);

  // 4. Group by phase
  return PHASE_ORDER.map(phase => {
    const phaseEntries = deduped.filter(e => e.phase === phase);
    return {
      phase,
      label: PHASE_LABELS[phase],
      yourTurn: phaseEntries.filter(e => e.timing === 'your_turn'),
      opponentTurn: phaseEntries.filter(e => e.timing === 'opponent_turn'),
      either: phaseEntries.filter(e => e.timing === 'either'),
    };
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findMatchingUnits(
  strat: DetachmentStratagem,
  rosterUnits: CrusadeUnit[],
  allDatasheets: Datasheet[],
): string[] {
  const targetText = (strat.target || '').toLowerCase();
  const matches: string[] = [];

  for (const unit of rosterUnits) {
    const datasheet = allDatasheets.find(d => d.name === unit.datasheet_name);
    if (!datasheet) continue;

    const allKeywords = [...datasheet.keywords, ...datasheet.faction_keywords].map(k => k.toLowerCase());

    // Check if any keyword appears in the stratagem target
    for (const kw of allKeywords) {
      if (kw && targetText.includes(kw)) {
        matches.push(unit.custom_name || unit.datasheet_name);
        break;
      }
    }
  }

  return [...new Set(matches)];
}

interface PhaseTimingResult {
  phase: GamePhase;
  timing: Timing;
}

const CORE_ABILITY_MAP: Record<string, PhaseTimingResult> = {
  'Fights First': { phase: 'fight', timing: 'either' },
  'Deep Strike': { phase: 'movement', timing: 'your_turn' },
  'Infiltrators': { phase: 'movement', timing: 'your_turn' },
  'Scouts': { phase: 'movement', timing: 'your_turn' },
  'Lone Operative': { phase: 'shooting', timing: 'opponent_turn' },
  'Stealth': { phase: 'shooting', timing: 'opponent_turn' },
};

function parseCoreAbilityPhase(coreAbility: string): PhaseTimingResult | null {
  // Check exact match first
  for (const [key, result] of Object.entries(CORE_ABILITY_MAP)) {
    if (coreAbility.startsWith(key)) return result;
  }

  // Feel No Pain
  if (/feel\s*no\s*pain/i.test(coreAbility)) {
    return { phase: 'shooting', timing: 'either' };
  }

  // Deadly Demise
  if (/deadly\s*demise/i.test(coreAbility)) {
    return { phase: 'fight', timing: 'either' };
  }

  return null;
}

function parseAbilityPhase(name: string, text: string): PhaseTimingResult {
  const combined = `${name} ${text}`.toLowerCase();

  // Check for invulnerable saves
  if (/invulnerable\s*save/i.test(combined)) {
    return { phase: 'shooting', timing: 'either' };
  }

  // Check for "fight on death" / "fights on death"
  if (/fight.*death/i.test(combined) || /death.*fight/i.test(combined)) {
    return { phase: 'fight', timing: 'either' };
  }

  // Use phase parsing on the text
  const phase = parsePhase(combined);
  const timing = parseTiming(combined);
  return { phase, timing };
}

function deduplicateEntries(entries: CheatSheetEntry[]): CheatSheetEntry[] {
  const seen = new Map<string, CheatSheetEntry>();

  for (const entry of entries) {
    const key = `${entry.type}:${entry.name}:${entry.phase}:${entry.timing}`;

    if (seen.has(key)) {
      // Merge source units
      const existing = seen.get(key)!;
      if (entry.sourceUnits && existing.sourceUnits) {
        const merged = [...new Set([...existing.sourceUnits, ...entry.sourceUnits])];
        existing.sourceUnits = merged;
      }
    } else {
      seen.set(key, { ...entry });
    }
  }

  return [...seen.values()];
}
