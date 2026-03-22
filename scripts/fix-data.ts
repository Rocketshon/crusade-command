/**
 * Data Cleanup Script
 * Fixes all data quality issues found by the audit.
 *
 * Usage: npx tsx scripts/fix-data.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = resolve(__dirname, '../src/data');

// ─── Known trait keywords that get concatenated into weapon names ───────────

const KNOWN_TRAITS = [
  'ANTI-INFANTRY\\d[+]?', 'ANTI-VEHICLE\\d[+]?', 'ANTI-MONSTER\\d[+]?',
  'ANTI-FLY\\d[+]?', 'ANTI-TITANIC\\d[+]?', 'ANTI-WALKER\\d[+]?',
  'SUSTAINED\\s?HITS\\s?\\d*', 'LETHAL\\s?HITS', 'DEVASTATING\\s?WOUNDS',
  'RAPID\\s?FIRE\\s?\\d*', 'HEAVY', 'ASSAULT', 'PISTOL', 'TORRENT',
  'BLAST', 'MELTA\\s?\\d*', 'TWIN-LINKED', 'IGNORES\\s?COVER',
  'HAZARDOUS', 'INDIRECT\\s?FIRE', 'PRECISION', 'ONE\\s?SHOT',
  'EXTRA\\s?ATTACKS?', 'LANCE', 'PSYCHIC',
];

// Build a combined regex to match trait suffixes on weapon names
const TRAIT_PATTERN = new RegExp(
  `(${KNOWN_TRAITS.join('|')})`,
  'gi'
);

// Match trait text concatenated to end of a weapon name (no space before trait)
const WEAPON_SUFFIX_PATTERN = new RegExp(
  `([a-z0-9"'\\)\\]])\\s*((?:${KNOWN_TRAITS.join('|')})(?:\\s*(?:${KNOWN_TRAITS.join('|')}))*)\\s*$`,
  'i'
);

let fixCount = 0;

function log(category: string, msg: string) {
  fixCount++;
  // Only log first 50 to avoid spam
  if (fixCount <= 50) console.log(`  [${category}] ${msg}`);
  else if (fixCount === 51) console.log('  ... (truncating log, more fixes applied)');
}

// ─── Fix weapon names with concatenated traits ─────────────────────────────

//
// Trait classification:
//
// SAFE traits: multi-word or very distinctive — never appear as weapon name words.
//   These can be matched case-insensitively (e.g. "lethalHits", "devastatingWounds").
//
// AMBIGUOUS traits: single words that ARE common in weapon names (lance, melta, heavy,
//   blast, psychic, precision, torrent). These are ONLY treated as traits when:
//   - They appear in ALL-CAPS concatenated to the name (e.g. "BlasterASSAULT")
//   - They appear in ALL-CAPS after a space (e.g. "weapon HEAVY")
//   - NOT when lowercase after a space (e.g. "Bright lance" is a weapon name)
//

// Safe (unambiguous) trait patterns — matched case-insensitively
const SAFE_TRAIT_PATTERNS = [
  { re: /Anti-(?:Infantry|Vehicle|Monster|Fly|Titanic|Walker)\s*\d[+]?/i, fmt: (s: string) => s.replace(/anti-/gi, 'Anti-').replace(/([a-z])(\d)/i, '$1 $2') },
  { re: /Sustained\s*Hits\s*\d+/i, fmt: (s: string) => { const m = s.match(/\d+/); return m ? `Sustained Hits ${m[0]}` : 'Sustained Hits'; } },
  { re: /Sustained\s*Hits/i, fmt: () => 'Sustained Hits' },
  { re: /Lethal\s*Hits/i, fmt: () => 'Lethal Hits' },
  { re: /Devastating\s*Wounds/i, fmt: () => 'Devastating Wounds' },
  { re: /Rapid\s*Fire\s*\d*/i, fmt: (s: string) => { const m = s.match(/\d+/); return m ? `Rapid Fire ${m[0]}` : 'Rapid Fire'; } },
  { re: /Extra\s*Attacks?/i, fmt: () => 'Extra Attacks' },
  { re: /Ignores?\s*Cover/i, fmt: () => 'Ignores Cover' },
  { re: /Indirect\s*Fire/i, fmt: () => 'Indirect Fire' },
  { re: /Twin-Linked/i, fmt: () => 'Twin-linked' },
  { re: /One\s*Shot/i, fmt: () => 'One Shot' },
];

// Ambiguous trait patterns — only matched when ALL-CAPS (concatenated or after space)
const AMBIGUOUS_TRAIT_PATTERNS = [
  { re: /MELTA\s*\d*/i, fmt: () => 'Melta', capsOnly: true },
  { re: /HAZARDOUS/i, fmt: () => 'Hazardous', capsOnly: true },
  { re: /PRECISION/i, fmt: () => 'Precision', capsOnly: true },
  { re: /PSYCHIC/i, fmt: () => 'Psychic', capsOnly: true },
  { re: /TORRENT/i, fmt: () => 'Torrent', capsOnly: true },
  { re: /ASSAULT/i, fmt: () => 'Assault', capsOnly: true },
  { re: /PISTOL/i, fmt: () => 'Pistol', capsOnly: true },
  { re: /BLAST/i, fmt: () => 'Blast', capsOnly: true },
  { re: /HEAVY/i, fmt: () => 'Heavy', capsOnly: true },
  { re: /LANCE/i, fmt: () => 'Lance', capsOnly: true },
];

const ALL_TRAIT_PATTERNS = [...SAFE_TRAIT_PATTERNS, ...AMBIGUOUS_TRAIT_PATTERNS];

/**
 * Try to extract traits from a suffix string, consuming it left-to-right.
 * For ambiguous single-word traits (lance, melta, heavy, etc.), they must be
 * ALL-CAPS in the original text to be treated as traits.
 * Returns extracted traits only if the ENTIRE suffix is consumed.
 */
function extractTraitsFromSuffix(suffix: string): string[] {
  const traits: string[] = [];
  let rest = suffix.replace(/^\s+/, '');

  while (rest.length > 0) {
    // Skip whitespace between traits
    const wsMatch = rest.match(/^\s+/);
    if (wsMatch) rest = rest.slice(wsMatch[0].length);
    if (rest.length === 0) break;

    let matched = false;

    // Try safe traits first (case-insensitive)
    for (const { re, fmt } of SAFE_TRAIT_PATTERNS) {
      const localPat = new RegExp('^' + re.source, 'i');
      const tm = rest.match(localPat);
      if (tm) {
        const formatted = fmt(tm[0]).trim();
        if (formatted && !traits.includes(formatted)) traits.push(formatted);
        rest = rest.slice(tm[0].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Try ambiguous traits — must be ALL-CAPS in original text
      for (const { re } of AMBIGUOUS_TRAIT_PATTERNS) {
        // Match case-insensitively, then verify mostly caps
        const capsSource = re.source;
        const localPat = new RegExp('^' + capsSource, 'i');
        const tm = rest.match(localPat);
        if (tm) {
          // Verify the matched text is mostly all-caps (allow 1 typo char)
          const alphaChars = tm[0].replace(/[^a-zA-Z]/g, '');
          const upperCount = (alphaChars.match(/[A-Z]/g) || []).length;
          const lowerCount = (alphaChars.match(/[a-z]/g) || []).length;
          if (lowerCount <= 1 && upperCount >= 2) {
            let formatted = tm[0]
              .replace(/^ANTI-/g, 'Anti-')
              .replace(/^MELTA\s*(\d+)/g, 'Melta $1')
              .replace(/^MELTA$/g, 'Melta')
              .replace(/^HAZARDOUS/g, 'Hazardous')
              .replace(/^PRECISION/g, 'Precision')
              .replace(/^PSYCHIC/g, 'Psychic')
              .replace(/^TORRENT/g, 'Torrent')
              .replace(/^ASSAULT/g, 'Assault')
              .replace(/^PISTOL/g, 'Pistol')
              .replace(/^BLAST/g, 'Blast')
              .replace(/^HEAVY/g, 'Heavy')
              .replace(/^LANCE/g, 'Lance')
              .trim();
            // Ensure "Melta" without a number doesn't have trailing space
            formatted = formatted.replace(/\s+$/, '');
            if (formatted && !traits.includes(formatted)) traits.push(formatted);
            rest = rest.slice(tm[0].length);
            matched = true;
            break;
          }
        }
      }
    }

    if (!matched) break;
  }

  // Only return traits if the entire suffix was consumed (no leftover text)
  return rest.trim().length === 0 ? traits : [];
}

function cleanWeaponName(weapon: any): boolean {
  if (!weapon || !weapon.name || typeof weapon.name !== 'string') return false;
  let changed = false;
  const originalName = weapon.name;

  // Strategy: find candidate split points where trait text might start, then verify
  // the entire remainder is composed of known traits.
  //
  // Pattern 1: lowercase/digit then uppercase: "bolterSUSTAINED", "BlasterASSAULT"
  // Pattern 2: space then uppercase: "Mechanicus DEVASTATING"
  // Pattern 3: camelCase trait boundary: "bladelethalHits" → split at "lethal"
  //
  // We try all candidate splits and pick the one that leaves the longest name.

  const candidateSplits: Set<number> = new Set();

  // (a) Uppercase letter after lowercase/digit/punctuation/hyphen
  for (let i = 1; i < weapon.name.length; i++) {
    if (/[A-Z]/.test(weapon.name[i]) && /[a-z0-9"'\)\]\-]/.test(weapon.name[i - 1])) {
      candidateSplits.add(i);
    }
  }

  // (b) After a space where the next char is uppercase (ALL-CAPS trait after space)
  //     Only if the word after the space is ALL-CAPS (to avoid "Bright lance")
  //     Mark these as "space splits" so we can apply stricter validation later
  const spaceSplits = new Set<number>();
  for (let i = 1; i < weapon.name.length; i++) {
    if (weapon.name[i - 1] === ' ' && /[A-Z]/.test(weapon.name[i])) {
      // Check if the word starting here is all-caps
      const wordAfter = weapon.name.slice(i).match(/^[A-Z][A-Z0-9+\-]+/);
      if (wordAfter) {
        candidateSplits.add(i);
        spaceSplits.add(i);
      }
    }
  }

  // (c) Case-insensitive search for multi-word (safe) trait starts within the name
  //     These are unambiguous so we can find them even in mixed case
  const safeTraitStarters = [
    /Anti-/i, /Sustained/i, /Lethal/i, /Devastating/i, /Rapid/i,
    /Extra/i, /Ignores?/i, /Indirect/i, /Twin-/i,
  ];
  for (const tPat of safeTraitStarters) {
    const re = new RegExp(tPat.source, 'gi');
    let tm;
    while ((tm = re.exec(weapon.name)) !== null) {
      if (tm.index > 0) {
        candidateSplits.add(tm.index);
      }
    }
  }

  // Try each split point. Prefer the split that extracts the MOST traits.
  // If tied on trait count, prefer the longest remaining name.
  let bestNamePart = '';
  let bestTraits: string[] = [];

  for (const splitIdx of candidateSplits) {
    let namePart = weapon.name.slice(0, splitIdx).trim();
    const traitSuffix = weapon.name.slice(splitIdx);

    if (namePart.length < 2) continue;

    const traits = extractTraitsFromSuffix(traitSuffix);
    if (traits.length > 0) {
      // For space-separated splits (e.g. "Bolt PISTOL"), require either:
      // - Multiple traits, OR
      // - At least one multi-word trait (safe/unambiguous)
      // This prevents stripping "PISTOL" from "Bolt PISTOL" (which should be "Bolt pistol")
      if (spaceSplits.has(splitIdx)) {
        const hasMultiWordTrait = traits.some(t => t.includes(' ') || t.includes('-'));
        if (traits.length < 2 && !hasMultiWordTrait) continue;
      }

      // Prefer more traits extracted; if tied, prefer longer name
      if (traits.length > bestTraits.length ||
          (traits.length === bestTraits.length && namePart.length > bestNamePart.length)) {
        bestNamePart = namePart;
        bestTraits = traits;
      }
    }
  }

  if (bestTraits.length > 0 && bestNamePart.length > 1) {
    weapon.name = bestNamePart;
    if (!weapon.traits) weapon.traits = [];
    for (const t of bestTraits) {
      const exists = weapon.traits.some((existing: string) =>
        existing.toLowerCase().replace(/\s+/g, '') === t.toLowerCase().replace(/\s+/g, '')
      );
      if (!exists) {
        weapon.traits.push(t);
      }
    }
    log('weapon-name', `"${originalName}" → "${weapon.name}" + traits: [${bestTraits.join(', ')}]`);
    changed = true;
  }

  // Fix ALL-CAPS trait words in weapon names where the trait is already in traits array
  // e.g. "Bolt PISTOL" → "Bolt pistol" (trait "Pistol" already exists)
  // e.g. "Absolvor bolt PISTOL" → "Absolvor bolt pistol"
  if (weapon.traits && Array.isArray(weapon.traits)) {
    const ambiguousWords = ['PISTOL', 'HEAVY', 'BLAST', 'LANCE', 'MELTA', 'ASSAULT', 'TORRENT', 'PSYCHIC', 'PRECISION', 'HAZARDOUS'];
    for (const word of ambiguousWords) {
      const re = new RegExp(`\\s${word}$`);
      if (re.test(weapon.name)) {
        const traitName = word.charAt(0) + word.slice(1).toLowerCase();
        const hasTrait = weapon.traits.some((t: string) => t.toLowerCase() === traitName.toLowerCase());
        if (hasTrait) {
          weapon.name = weapon.name.replace(re, ' ' + traitName.toLowerCase());
          log('weapon-name', `Fixed ALL-CAPS trait word in name: "${originalName}" → "${weapon.name}"`);
          changed = true;
        }
      }
    }
  }

  // Fix "one shot" concatenated: "Grot-guided bommone shot" → "Grot-guided bomm"
  // Actually these are weapon trait "one shot" stuck to name
  if (weapon.name.match(/one\s*shot$/i) && !weapon.name.match(/^one shot$/i)) {
    weapon.name = weapon.name.replace(/one\s*shot$/i, '').trim();
    if (!weapon.traits) weapon.traits = [];
    if (!weapon.traits.some((t: string) => t.toLowerCase().includes('one shot'))) {
      weapon.traits.push('One Shot');
    }
    log('weapon-name', `Fixed "one shot" suffix on "${weapon.name}"`);
    changed = true;
  }

  // Fix "dead choppy" → "Dread klaw" + separate weapon (likely scraper merge)
  // "Dread klawdead choppy" - this is two weapons merged
  if (weapon.name.includes('dead choppy') || weapon.name.includes('dread choppy')) {
    // Can't split without knowing the actual weapons, just clean up
    weapon.name = weapon.name.replace(/dead\s*choppy/i, '').trim();
    if (weapon.name.endsWith('klaw')) weapon.name = 'Dread klaw';
    log('weapon-name', `Cleaned merged weapon name to "${weapon.name}"`);
    changed = true;
  }

  // Fix extra spaces in names
  if (weapon.name.includes('  ')) {
    weapon.name = weapon.name.replace(/\s{2,}/g, ' ').trim();
    log('weapon-name', `Fixed double spaces in "${weapon.name}"`);
    changed = true;
  }

  // Fix trailing special chars
  weapon.name = weapon.name.replace(/\s*–\s*$/, '').trim();

  return changed;
}

// ─── Fix malformed keywords ────────────────────────────────────────────────

function cleanKeywords(unit: any): boolean {
  if (!unit.keywords || !Array.isArray(unit.keywords)) return false;
  let changed = false;
  const originalKeywords = [...unit.keywords];

  const newKeywords: string[] = [];
  for (const kw of unit.keywords) {
    if (typeof kw !== 'string') continue;

    // Pattern: "KEYWORDS – ALL MODELS:INFANTRY" → "INFANTRY"
    if (kw.includes('KEYWORDS') || kw.includes('ALL MODELS:') || kw.includes('ALL:')) {
      // Extract the actual keywords after the colon
      const parts = kw.split(':');
      if (parts.length > 1) {
        const extracted = parts.slice(1).join(':').trim();
        if (extracted) {
          // Split by common delimiters
          const subKws = extracted.split(/[,\s]+/).filter(Boolean);
          newKeywords.push(...subKws);
          changed = true;
          continue;
        }
      }
      // Skip malformed keyword entirely if we can't extract anything useful
      changed = true;
      continue;
    }

    // Pattern: "KILLTEAMCASSIUSCHAPLAIN CASSIUS:CHARACTER" → split
    if (kw.includes(':') && kw.length > 30) {
      const parts = kw.split(':');
      for (const p of parts) {
        const cleaned = p.trim();
        if (cleaned && !cleaned.includes('KEYWORDS')) {
          newKeywords.push(cleaned);
        }
      }
      changed = true;
      continue;
    }

    // Pattern: "TYRANID WAR RIORSWITHMELEEBIO-WEAPONS" → try to fix
    if (kw.includes('RIORS') || kw.includes('IORS')) {
      const fixed = kw
        .replace(/WAR\s*RIORS/g, 'WARRIORS')
        .replace(/WARRIORS?WITH/g, 'WARRIORS WITH ')
        .replace(/MELEEBIO/g, 'MELEE BIO')
        .replace(/RANGEDBIO/g, 'RANGED BIO');
      newKeywords.push(fixed);
      changed = true;
      continue;
    }

    // Pattern: "SKY-SLASHERS WAR MS" → "SKY-SLASHER SWARMS"
    if (kw.includes('WAR MS')) {
      newKeywords.push(kw.replace('WAR MS', 'SWARMS'));
      changed = true;
      continue;
    }

    // Pattern: "KUS TOMB OOSTA-BLASTA" → "KUSTOM BOOSTA-BLASTA"
    if (kw.includes('KUS TOMB')) {
      newKeywords.push('KUSTOM BOOSTA-BLASTA');
      changed = true;
      continue;
    }

    // Pattern: "RUBRICMARINES" → "RUBRIC MARINES"
    const spaceFix = kw
      .replace(/RUBRICMARINES/g, 'RUBRIC MARINES')
      .replace(/SCARABOCCULT/g, 'SCARAB OCCULT')
      .replace(/TZAANGORENLIGHTENED/g, 'TZAANGOR ENLIGHTENED')
      .replace(/HYPERADAPTEDRAVENERS/g, 'HYPERADAPTED RAVENERS');

    if (spaceFix !== kw) {
      newKeywords.push(spaceFix);
      changed = true;
      continue;
    }

    newKeywords.push(kw);
  }

  if (changed) {
    // Deduplicate
    unit.keywords = [...new Set(newKeywords)];
    log('keywords', `${unit.name}: fixed ${originalKeywords.length} → ${unit.keywords.length} keywords`);
  }
  return changed;
}

// ─── Fix faction abilities spacing ─────────────────────────────────────────

function cleanAbilities(unit: any): boolean {
  if (!unit.abilities) return false;
  let changed = false;

  // Fix "Shadowinthe Warp" → "Shadow in the Warp"
  const fixAbilityText = (text: string): string => {
    return text
      .replace(/Shadowinthe Warp/g, 'Shadow in the Warp')
      .replace(/D3mortal wounds/g, 'D3 mortal wounds')
      .replace(/D6mortal wounds/g, 'D6 mortal wounds');
  };

  if (unit.abilities.faction && Array.isArray(unit.abilities.faction)) {
    for (let i = 0; i < unit.abilities.faction.length; i++) {
      if (typeof unit.abilities.faction[i] === 'string') {
        const fixed = fixAbilityText(unit.abilities.faction[i]);
        if (fixed !== unit.abilities.faction[i]) {
          unit.abilities.faction[i] = fixed;
          log('abilities', `${unit.name}: fixed faction ability text`);
          changed = true;
        }
      }
    }
  }

  if (unit.abilities.other && Array.isArray(unit.abilities.other)) {
    for (const entry of unit.abilities.other) {
      if (Array.isArray(entry) && entry.length >= 2 && typeof entry[1] === 'string') {
        const fixed = fixAbilityText(entry[1]);
        if (fixed !== entry[1]) {
          entry[1] = fixed;
          log('abilities', `${unit.name}: fixed ability text spacing`);
          changed = true;
        }
      }
    }
  }

  return changed;
}

// ─── Fix rules text issues ─────────────────────────────────────────────────

function cleanRulesText(text: string): string {
  if (!text || typeof text !== 'string') return text;

  return text
    .replace(/D3mortal wounds/g, 'D3 mortal wounds')
    .replace(/D6mortal wounds/g, 'D6 mortal wounds')
    .replace(/\bIt the bearer\b/g, 'If the bearer')  // Typo fix
    .replace(/Shadowinthe Warp/g, 'Shadow in the Warp');
}

function cleanFactionRules(rules: any): boolean {
  if (!rules) return false;
  let changed = false;

  // Clean army rules text
  if (rules.army_rules && Array.isArray(rules.army_rules)) {
    // Remove non-rule entries (JS code, TOC, ads)
    const cleanedRules = rules.army_rules.filter((r: string) => {
      if (typeof r !== 'string') return false;
      // Remove if it contains JavaScript code
      if (r.includes('function(') || r.includes('var ') || r.includes('document.')) {
        log('army-rules', 'Removed JavaScript code from army_rules');
        changed = true;
        return false;
      }
      // Remove if it's clearly an ad/subscription text
      if (r.includes('subscription') || r.includes('Subscribe') || r.includes('newsletter')) {
        log('army-rules', 'Removed ad/subscription text from army_rules');
        changed = true;
        return false;
      }
      return true;
    });
    if (cleanedRules.length !== rules.army_rules.length) {
      rules.army_rules = cleanedRules;
    }

    // Clean text in remaining rules
    for (let i = 0; i < rules.army_rules.length; i++) {
      if (typeof rules.army_rules[i] === 'string') {
        const fixed = cleanRulesText(rules.army_rules[i]);
        if (fixed !== rules.army_rules[i]) {
          rules.army_rules[i] = fixed;
          changed = true;
        }
      }
    }
  }

  // Clean detachment rules
  if (rules.detachments && Array.isArray(rules.detachments)) {
    for (const det of rules.detachments) {
      // Clean detachment rule text
      if (det.rule?.text) {
        const fixed = cleanRulesText(det.rule.text);
        if (fixed !== det.rule.text) {
          det.rule.text = fixed;
          log('detachment', `${det.name}: fixed rule text`);
          changed = true;
        }
      }

      // Clean enhancement text
      if (det.enhancements && Array.isArray(det.enhancements)) {
        for (const enh of det.enhancements) {
          if (enh.text) {
            const fixed = cleanRulesText(enh.text);
            if (fixed !== enh.text) {
              enh.text = fixed;
              changed = true;
            }
          }
        }
      }

      // Clean stratagem text
      if (det.stratagems && Array.isArray(det.stratagems)) {
        for (const strat of det.stratagems) {
          for (const field of ['when', 'target', 'effect', 'restrictions']) {
            if (strat[field] && typeof strat[field] === 'string') {
              const fixed = cleanRulesText(strat[field]);
              if (fixed !== strat[field]) {
                strat[field] = fixed;
                changed = true;
              }
            }
          }
        }
      }
    }
  }

  // Clean crusade rules text
  if (rules.crusade_rules && Array.isArray(rules.crusade_rules)) {
    for (const cr of rules.crusade_rules) {
      if (cr.text && typeof cr.text === 'string') {
        const fixed = cleanRulesText(cr.text);
        if (fixed !== cr.text) {
          cr.text = fixed;
          changed = true;
        }
      }
    }
  }

  return changed;
}

// ─── Main ──────────────────────────────────────────────────────────────────

function processUnitsFile() {
  console.log('\n━━━ Processing units.ts ━━━');
  const filePath = resolve(dataDir, 'units.ts');
  const raw = readFileSync(filePath, 'utf-8');

  // Extract the header and footer — find the data object (after "= {")
  const dataObjMarker = raw.indexOf('= {');
  const headerEnd = raw.indexOf('{', dataObjMarker + 2);
  const header = raw.slice(0, headerEnd);

  const footerStart = raw.lastIndexOf('};');
  const footer = raw.slice(footerStart);

  // Extract the JSON object content
  const jsonContent = raw.slice(headerEnd, footerStart + 1);

  // Parse each faction individually using the faster extraction method
  const factionPattern = /^\s{1,2}"([a-z_]+)":\s*\[/gm;
  const factions = [...raw.matchAll(factionPattern)].map(m => m[1]);

  console.log(`Found ${factions.length} factions`);

  const allFactionData: Record<string, any[]> = {};

  for (const factionId of factions) {
    const searchStr = `"${factionId}": [`;
    const factionStart = raw.indexOf(searchStr);
    const arrayStart = raw.indexOf('[', factionStart);

    // Find next top-level key
    const nextKeyRe = /\n  "[a-z_]+":\s*\[/g;
    nextKeyRe.lastIndex = arrayStart + 1;
    const nextKeyMatch = nextKeyRe.exec(raw);

    let end: number;
    if (nextKeyMatch) {
      end = nextKeyMatch.index;
      while (end > arrayStart && raw[end] !== ']') end--;
    } else {
      // Last faction — find the matching ] by counting brackets
      let depth = 0;
      end = arrayStart;
      for (let i = arrayStart; i < raw.length; i++) {
        if (raw[i] === '[') depth++;
        else if (raw[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
      }
    }

    const jsonStr = raw.slice(arrayStart, end + 1);
    let units: any[];
    try {
      units = JSON.parse(jsonStr);
    } catch {
      console.log(`  SKIP ${factionId}: could not parse JSON`);
      allFactionData[factionId] = [];
      continue;
    }

    let factionFixes = 0;

    for (const unit of units) {
      // Fix weapon names
      if (unit.ranged_weapons) {
        for (const w of unit.ranged_weapons) {
          if (cleanWeaponName(w)) factionFixes++;
        }
      }
      if (unit.melee_weapons) {
        for (const w of unit.melee_weapons) {
          if (cleanWeaponName(w)) factionFixes++;
        }
      }

      // Fix keywords
      if (cleanKeywords(unit)) factionFixes++;

      // Fix abilities
      if (cleanAbilities(unit)) factionFixes++;
    }

    allFactionData[factionId] = units;
    if (factionFixes > 0) {
      console.log(`  ${factionId}: ${factionFixes} fixes applied`);
    }
  }

  // Rebuild the file
  let output = header + '{\n';
  const factionEntries = Object.entries(allFactionData);
  for (let i = 0; i < factionEntries.length; i++) {
    const [factionId, units] = factionEntries[i];
    output += `  "${factionId}": ${JSON.stringify(units, null, 2)}`;
    if (i < factionEntries.length - 1) output += ',';
    output += '\n';
  }
  output += footer;

  writeFileSync(filePath, output, 'utf-8');
  console.log(`\nUnits file written (${(output.length / 1024 / 1024).toFixed(1)}MB)`);
}

function processRulesFile() {
  console.log('\n━━━ Processing rules.ts ━━━');
  const filePath = resolve(dataDir, 'rules.ts');
  const raw = readFileSync(filePath, 'utf-8');

  // Find the actual data object start (after "= {")
  const dataObjMarker = raw.indexOf('= {');
  const headerEnd = raw.indexOf('{', dataObjMarker + 2);
  const header = raw.slice(0, headerEnd);
  const footerStart = raw.lastIndexOf('};');
  const footer = raw.slice(footerStart);

  const factionPattern = /^\s{1,2}"([a-z_]+)":\s*\{/gm;
  const factions = [...raw.matchAll(factionPattern)].map(m => m[1]);

  console.log(`Found ${factions.length} factions`);

  const allFactionData: Record<string, any> = {};

  for (const factionId of factions) {
    const searchStr = `"${factionId}": {`;
    const factionStart = raw.indexOf(searchStr);
    const objStart = raw.indexOf('{', factionStart);

    const nextKeyRe = /\n  "[a-z_]+":\s*\{/g;
    nextKeyRe.lastIndex = objStart + 1;
    const nextKeyMatch = nextKeyRe.exec(raw);

    let end: number;
    if (nextKeyMatch) {
      end = nextKeyMatch.index;
      while (end > objStart && raw[end] !== '}') end--;
    } else {
      // Last faction — find the matching } by counting braces
      let depth = 0;
      end = objStart;
      for (let i = objStart; i < raw.length; i++) {
        if (raw[i] === '{') depth++;
        else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
    }

    const jsonStr = raw.slice(objStart, end + 1);
    let rules: any;
    try {
      rules = JSON.parse(jsonStr);
    } catch {
      console.log(`  SKIP ${factionId}: could not parse JSON`);
      allFactionData[factionId] = {};
      continue;
    }

    if (cleanFactionRules(rules)) {
      console.log(`  ${factionId}: rules text cleaned`);
    }

    allFactionData[factionId] = rules;
  }

  // Rebuild the file
  let output = header + '{\n';
  const factionEntries = Object.entries(allFactionData);
  for (let i = 0; i < factionEntries.length; i++) {
    const [factionId, rules] = factionEntries[i];
    output += `  "${factionId}": ${JSON.stringify(rules, null, 2)}`;
    if (i < factionEntries.length - 1) output += ',';
    output += '\n';
  }
  output += footer;

  writeFileSync(filePath, output, 'utf-8');
  console.log(`\nRules file written (${(output.length / 1024 / 1024).toFixed(1)}MB)`);
}

// ─── Run ───────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║       CrusadeCommand Data Cleanup                   ║');
console.log('╚══════════════════════════════════════════════════════╝');

processUnitsFile();
processRulesFile();

console.log(`\n✓ Total fixes applied: ${fixCount}`);
console.log('\nDone. Run "npx tsx scripts/audit-data.ts" to verify remaining issues.');
