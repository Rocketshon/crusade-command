/**
 * build-data.ts
 *
 * Reads scraped Wahapedia JSON files and generates typed TypeScript data modules.
 *
 * Usage: npx tsx scripts/build-data.ts
 *
 * Input:  C:\Users\dshon\Projects\Warhammer\datasheets\
 * Output: src/data/units.ts, src/data/rules.ts, src/data/general.ts, src/data/index.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASHEETS_ROOT = path.resolve(process.env.DATASHEETS_PATH || path.join(__dirname, '..', '..', '_backlog', 'Warhammer', 'datasheets'));
const OUTPUT_DIR = path.resolve(__dirname, '..', 'src', 'data');

// Directory slug (hyphens) -> FactionId (underscores)
// Special cases where the mapping isn't a simple hyphen-to-underscore swap:
const SLUG_TO_FACTION_ID: Record<string, string> = {
  'emperor-s-children': 'emperors_children',
  't-au-empire': 'tau_empire',
};

function dirSlugToFactionId(dirSlug: string): string {
  if (SLUG_TO_FACTION_ID[dirSlug]) return SLUG_TO_FACTION_ID[dirSlug];
  return dirSlug.replace(/-/g, '_');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJson(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Escape backticks and backslashes for embedding in template literals */
function escapeForTemplate(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

/** JSON.stringify but produces output safe for embedding in a TS file. */
function safeJsonStringify(obj: unknown, indent = 2): string {
  return JSON.stringify(obj, null, indent);
}

// ---------------------------------------------------------------------------
// Process units
// ---------------------------------------------------------------------------

interface RawUnit {
  name: string;
  legends?: boolean;
  base_size?: string;
  faction: string;
  stats: Record<string, string>;
  invuln: string | null;
  ranged_weapons: RawWeapon[];
  melee_weapons: RawWeapon[];
  abilities: {
    core: string[];
    faction: string[];
    other: [string, string][];
  };
  wargear_abilities: string[];
  wargear_options: string[];
  unit_composition: string;
  points: { models: string; cost: string }[];
  leader: string;
  damaged: string;
  keywords: string[];
  faction_keywords: string[];
}

interface RawWeapon {
  name: string;
  range: string;
  A: string;
  skill: string;
  S: string;
  AP: string;
  D: string;
  traits: string[];
}

function processUnits(): Map<string, RawUnit[]> {
  const unitsByFaction = new Map<string, RawUnit[]>();
  const dirs = fs.readdirSync(DATASHEETS_ROOT);

  for (const dirName of dirs) {
    if (dirName === '_general') continue;
    const dirPath = path.join(DATASHEETS_ROOT, dirName);
    if (!fs.statSync(dirPath).isDirectory()) continue;

    const factionId = dirSlugToFactionId(dirName);
    const units: RawUnit[] = [];

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      if (file.startsWith('_')) continue; // skip rules files

      const filePath = path.join(dirPath, file);
      try {
        const unit = readJson(filePath) as RawUnit;
        units.push(unit);
      } catch (err) {
        console.warn(`  [WARN] Failed to parse ${filePath}: ${err}`);
      }
    }

    // Sort units by name for consistent output
    units.sort((a, b) => a.name.localeCompare(b.name));
    unitsByFaction.set(factionId, units);
    console.log(`  ${factionId}: ${units.length} units`);
  }

  return unitsByFaction;
}

// ---------------------------------------------------------------------------
// Process faction rules
// ---------------------------------------------------------------------------

interface RawFactionRules {
  faction: string;
  army_rules: string[];
  detachments: {
    name: string;
    rule: { name: string; text: string };
    enhancements: { name: string; cost: string; text: string }[];
    stratagems: {
      name: string;
      cp: string;
      type: string;
      when: string;
      target: string;
      effect: string;
      restrictions?: string;
    }[];
    other: unknown[];
  }[];
  crusade_rules?: { name: string; text: string }[];
  boarding_actions?: unknown[];
}

function processFactionRules(): Map<string, RawFactionRules & { faction_id: string }> {
  const rulesByFaction = new Map<string, RawFactionRules & { faction_id: string }>();
  const dirs = fs.readdirSync(DATASHEETS_ROOT);

  for (const dirName of dirs) {
    if (dirName === '_general') continue;
    const dirPath = path.join(DATASHEETS_ROOT, dirName);
    if (!fs.statSync(dirPath).isDirectory()) continue;

    const factionId = dirSlugToFactionId(dirName);

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (!file.startsWith('_') || !file.endsWith('_rules.json')) continue;

      const filePath = path.join(dirPath, file);
      try {
        const rules = readJson(filePath) as RawFactionRules;
        rulesByFaction.set(factionId, { ...rules, faction_id: factionId });
        console.log(`  ${factionId}: ${rules.detachments?.length ?? 0} detachments`);
      } catch (err) {
        console.warn(`  [WARN] Failed to parse ${filePath}: ${err}`);
      }
    }
  }

  return rulesByFaction;
}

// ---------------------------------------------------------------------------
// Process general rules
// ---------------------------------------------------------------------------

interface RawGeneralDoc {
  name: string;
  sections: { name: string; subsections: string[]; text: string }[];
}

function processGeneral(): {
  coreRules: RawGeneralDoc | null;
  crusadeRules: RawGeneralDoc | null;
  rulesCommentary: RawGeneralDoc | null;
} {
  const generalDir = path.join(DATASHEETS_ROOT, '_general');

  let coreRules: RawGeneralDoc | null = null;
  let crusadeRules: RawGeneralDoc | null = null;
  let rulesCommentary: RawGeneralDoc | null = null;

  try {
    coreRules = readJson(path.join(generalDir, 'core-rules.json')) as RawGeneralDoc;
    console.log(`  core-rules: ${coreRules.sections.length} sections`);
  } catch (err) {
    console.warn(`  [WARN] core-rules.json: ${err}`);
  }

  try {
    crusadeRules = readJson(path.join(generalDir, 'crusade-rules.json')) as RawGeneralDoc;
    console.log(`  crusade-rules: ${crusadeRules.sections.length} sections`);
  } catch (err) {
    console.warn(`  [WARN] crusade-rules.json: ${err}`);
  }

  try {
    rulesCommentary = readJson(path.join(generalDir, 'rules-commentary.json')) as RawGeneralDoc;
    console.log(`  rules-commentary: ${rulesCommentary.sections.length} sections`);
  } catch (err) {
    console.warn(`  [WARN] rules-commentary.json: ${err}`);
  }

  return { coreRules, crusadeRules, rulesCommentary };
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

function generateUnitsFile(unitsByFaction: Map<string, RawUnit[]>): string {
  const lines: string[] = [];
  lines.push('// AUTO-GENERATED by scripts/build-data.ts — DO NOT EDIT');
  lines.push('// Generated: ' + new Date().toISOString());
  lines.push('');
  lines.push("import type { Datasheet, FactionId } from '../types';");
  lines.push('');

  // Build one big object literal with all factions
  lines.push('const _units: Record<string, Datasheet[]> = {');

  for (const [factionId, units] of unitsByFaction) {
    // Each unit needs faction_id injected
    const unitsWithId = units.map((u) => ({
      ...u,
      faction_id: factionId,
      legends: u.legends ?? false,
      base_size: u.base_size ?? '',
    }));
    lines.push(`  ${JSON.stringify(factionId)}: ${safeJsonStringify(unitsWithId)},`);
  }

  lines.push('};');
  lines.push('');
  lines.push('export const UNITS = _units as Record<FactionId, Datasheet[]>;');
  lines.push('');

  return lines.join('\n');
}

function generateRulesFile(
  rulesByFaction: Map<string, RawFactionRules & { faction_id: string }>
): string {
  const lines: string[] = [];
  lines.push('// AUTO-GENERATED by scripts/build-data.ts — DO NOT EDIT');
  lines.push('// Generated: ' + new Date().toISOString());
  lines.push('');
  lines.push("import type { FactionRulesData, FactionId } from '../types';");
  lines.push('');

  lines.push('const _factionRules: Record<string, FactionRulesData> = {');

  for (const [factionId, rules] of rulesByFaction) {
    lines.push(`  ${JSON.stringify(factionId)}: ${safeJsonStringify(rules)},`);
  }

  lines.push('};');
  lines.push('');
  lines.push('export const FACTION_RULES = _factionRules as Record<FactionId, FactionRulesData>;');
  lines.push('');

  return lines.join('\n');
}

function generateGeneralFile(general: {
  coreRules: RawGeneralDoc | null;
  crusadeRules: RawGeneralDoc | null;
  rulesCommentary: RawGeneralDoc | null;
}): string {
  const lines: string[] = [];
  lines.push('// AUTO-GENERATED by scripts/build-data.ts — DO NOT EDIT');
  lines.push('// Generated: ' + new Date().toISOString());
  lines.push('');
  lines.push("import type { GeneralRulesDocument } from '../types';");
  lines.push('');

  lines.push(
    `export const CORE_RULES: GeneralRulesDocument | null = ${
      general.coreRules ? safeJsonStringify(general.coreRules) : 'null'
    };`
  );
  lines.push('');

  lines.push(
    `export const CRUSADE_RULES: GeneralRulesDocument | null = ${
      general.crusadeRules ? safeJsonStringify(general.crusadeRules) : 'null'
    };`
  );
  lines.push('');

  lines.push(
    `export const RULES_COMMENTARY: GeneralRulesDocument | null = ${
      general.rulesCommentary ? safeJsonStringify(general.rulesCommentary) : 'null'
    };`
  );
  lines.push('');

  return lines.join('\n');
}

function generateIndexFile(): string {
  const lines: string[] = [];
  lines.push('// AUTO-GENERATED by scripts/build-data.ts — DO NOT EDIT');
  lines.push('// Generated: ' + new Date().toISOString());
  lines.push('');
  lines.push("import type { Datasheet, FactionRulesData, FactionId, GeneralRulesDocument } from '../types';");
  lines.push('');
  lines.push("export { UNITS } from './units';");
  lines.push("export { FACTION_RULES } from './rules';");
  lines.push("export { CORE_RULES, CRUSADE_RULES, RULES_COMMENTARY } from './general';");
  lines.push('');
  lines.push("import { UNITS } from './units';");
  lines.push("import { FACTION_RULES } from './rules';");
  lines.push('');
  lines.push('// --- Helper functions ---');
  lines.push('');
  lines.push('export function getUnitsForFaction(factionId: FactionId): Datasheet[] {');
  lines.push('  return UNITS[factionId] ?? [];');
  lines.push('}');
  lines.push('');
  lines.push('export function getRulesForFaction(factionId: FactionId): FactionRulesData | undefined {');
  lines.push('  return FACTION_RULES[factionId];');
  lines.push('}');
  lines.push('');
  lines.push('export function getAllFactionSlugs(): FactionId[] {');
  lines.push('  return Object.keys(UNITS) as FactionId[];');
  lines.push('}');
  lines.push('');
  lines.push('export function searchUnits(query: string, factionId?: FactionId): Datasheet[] {');
  lines.push('  const q = query.toLowerCase().trim();');
  lines.push('  if (!q) return factionId ? getUnitsForFaction(factionId) : getAllUnits();');
  lines.push('  const pool = factionId ? getUnitsForFaction(factionId) : getAllUnits();');
  lines.push('  return pool.filter(');
  lines.push('    (u) =>');
  lines.push('      u.name.toLowerCase().includes(q) ||');
  lines.push('      u.keywords.some((k) => k.toLowerCase().includes(q))');
  lines.push('  );');
  lines.push('}');
  lines.push('');
  lines.push('export function getAllUnits(): Datasheet[] {');
  lines.push('  const all: Datasheet[] = [];');
  lines.push('  for (const factionId of getAllFactionSlugs()) {');
  lines.push('    all.push(...getUnitsForFaction(factionId));');
  lines.push('  }');
  lines.push('  return all;');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('=== Warcaster Data Build ===');
  console.log(`Source: ${DATASHEETS_ROOT}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log('');

  ensureDir(OUTPUT_DIR);

  // 1. Process units
  console.log('[1/3] Processing unit datasheets...');
  const unitsByFaction = processUnits();
  let totalUnits = 0;
  for (const units of unitsByFaction.values()) totalUnits += units.length;
  console.log(`  Total: ${totalUnits} units across ${unitsByFaction.size} factions`);
  console.log('');

  // 2. Process faction rules
  console.log('[2/3] Processing faction rules...');
  const rulesByFaction = processFactionRules();
  console.log(`  Total: ${rulesByFaction.size} faction rule sets`);
  console.log('');

  // 3. Process general rules
  console.log('[3/3] Processing general rules...');
  const general = processGeneral();
  console.log('');

  // 4. Generate output files
  console.log('Writing output files...');

  const unitsContent = generateUnitsFile(unitsByFaction);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'units.ts'), unitsContent, 'utf-8');
  console.log(`  units.ts: ${(Buffer.byteLength(unitsContent) / 1024 / 1024).toFixed(2)} MB`);

  const rulesContent = generateRulesFile(rulesByFaction);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'rules.ts'), rulesContent, 'utf-8');
  console.log(`  rules.ts: ${(Buffer.byteLength(rulesContent) / 1024 / 1024).toFixed(2)} MB`);

  const generalContent = generateGeneralFile(general);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'general.ts'), generalContent, 'utf-8');
  console.log(`  general.ts: ${(Buffer.byteLength(generalContent) / 1024 / 1024).toFixed(2)} MB`);

  const indexContent = generateIndexFile();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), indexContent, 'utf-8');
  console.log(`  index.ts: ${(Buffer.byteLength(indexContent) / 1024).toFixed(1)} KB`);

  console.log('');
  console.log('Done!');
}

main();
