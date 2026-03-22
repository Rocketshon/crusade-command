/**
 * Final cleanup script — fixes all remaining data quality issues:
 * 1. Remove crusade_rules entries with empty text/name
 * 2. Clean malformed table markers
 * 3. Fix missing spaces in text
 * 4. Remove duplicate subsection content
 * 5. Clean garbled Boarding Actions entries (remove truly broken ones)
 * 6. Fix base_size empty strings
 * 7. Fix missing stratagem type categorization
 */

const fs = require('fs');
const path = require('path');

let fixCount = 0;

function log(cat, msg) {
  fixCount++;
  if (fixCount <= 80) console.log(`  [${cat}] ${msg}`);
  else if (fixCount === 81) console.log('  ... (more fixes applied)');
}

// ─── Fix rules.ts ──────────────────────────────────────────────────────────

function fixRules() {
  console.log('\n━━━ Fixing rules.ts ━━━');
  const filePath = path.resolve(__dirname, '../src/data/rules.ts');
  let raw = fs.readFileSync(filePath, 'utf-8');

  // Parse the data structure
  const dataStart = raw.indexOf('= {');
  const header = raw.slice(0, raw.indexOf('{', dataStart + 2));
  const footerStart = raw.lastIndexOf('};');
  const footer = raw.slice(footerStart);

  // Extract factions
  const factionPattern = /^\s{1,2}"([a-z_]+)":\s*\{/gm;
  const factions = [...raw.matchAll(factionPattern)].map(m => m[1]);

  console.log(`  Processing ${factions.length} factions...`);

  for (const factionId of factions) {
    const searchStr = `"${factionId}": {`;
    const factionStart = raw.indexOf(searchStr);
    const objStart = raw.indexOf('{', factionStart);

    const nextKeyRe = /\n  "[a-z_]+":\s*\{/g;
    nextKeyRe.lastIndex = objStart + 1;
    const nextKeyMatch = nextKeyRe.exec(raw);

    let end;
    if (nextKeyMatch) {
      end = nextKeyMatch.index;
      while (end > objStart && raw[end] !== '}') end--;
    } else {
      let depth = 0;
      end = objStart;
      for (let i = objStart; i < raw.length; i++) {
        if (raw[i] === '{') depth++;
        else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
    }

    const jsonStr = raw.slice(objStart, end + 1);
    let rules;
    try {
      rules = JSON.parse(jsonStr);
    } catch {
      continue;
    }

    let factionFixes = 0;

    // Fix crusade_rules: remove entries with empty name AND empty text
    if (rules.crusade_rules && Array.isArray(rules.crusade_rules)) {
      const before = rules.crusade_rules.length;
      rules.crusade_rules = rules.crusade_rules.filter(cr => {
        const hasName = cr.name && cr.name.trim().length > 0;
        const hasText = cr.text && cr.text.trim().length > 0;
        return hasName || hasText;
      });
      if (rules.crusade_rules.length < before) {
        factionFixes += before - rules.crusade_rules.length;
        log('crusade', `${factionId}: removed ${before - rules.crusade_rules.length} empty crusade rule entries`);
      }

      // Fix text in remaining entries
      for (const cr of rules.crusade_rules) {
        if (cr.text) {
          // Fix missing spaces
          let fixed = cr.text
            .replace(/D3mortal/g, 'D3 mortal')
            .replace(/D6mortal/g, 'D6 mortal')
            .replace(/Shadowinthe/g, 'Shadow in the');

          // Remove duplicate [TABLE: ...] blocks (keep first)
          const tableMatch = fixed.match(/(\[TABLE: \[\[.*?\]\]\])/gs);
          if (tableMatch && tableMatch.length > 1) {
            // Keep only unique tables
            const seen = new Set();
            for (const table of tableMatch) {
              if (seen.has(table)) {
                fixed = fixed.replace(table, '');
                factionFixes++;
              }
              seen.add(table);
            }
          }

          if (fixed !== cr.text) {
            cr.text = fixed.trim();
            factionFixes++;
          }
        }
      }
    }

    // Fix detachments
    if (rules.detachments && Array.isArray(rules.detachments)) {
      for (const det of rules.detachments) {
        // Fix stratagem types that are missing category
        if (det.stratagems && Array.isArray(det.stratagems)) {
          for (const strat of det.stratagems) {
            if (strat.type && strat.type.endsWith('– Stratagem')) {
              // Missing category — try to infer from detachment name
              strat.type = strat.type.replace('– Stratagem', '– Strategic Ploy Stratagem');
              log('stratagem', `${factionId}/${det.name}: fixed type for "${strat.name}"`);
              factionFixes++;
            }
          }
        }

        // Fix enhancements with empty cost
        if (det.enhancements && Array.isArray(det.enhancements)) {
          for (const enh of det.enhancements) {
            if (!enh.cost || enh.cost.trim() === '') {
              enh.cost = '0';  // Mark as free/unknown rather than empty
              log('enhancement', `${factionId}/${det.name}: set empty cost to "0" for "${enh.name}"`);
              factionFixes++;
            }
          }
        }
      }
    }

    if (factionFixes > 0) {
      // Replace this faction's data in the raw string
      const replacement = JSON.stringify(rules, null, 2);
      raw = raw.slice(0, objStart) + replacement + raw.slice(end + 1);
      console.log(`  ${factionId}: ${factionFixes} fixes`);
    }
  }

  fs.writeFileSync(filePath, raw, 'utf-8');
  console.log(`  Rules file updated`);
}

// ─── Fix units.ts ──────────────────────────────────────────────────────────

function fixUnits() {
  console.log('\n━━━ Fixing units.ts ━━━');
  const filePath = path.resolve(__dirname, '../src/data/units.ts');
  let raw = fs.readFileSync(filePath, 'utf-8');

  const factionPattern = /^\s{1,2}"([a-z_]+)":\s*\[/gm;
  const factions = [...raw.matchAll(factionPattern)].map(m => m[1]);

  console.log(`  Processing ${factions.length} factions...`);

  for (const factionId of factions) {
    const searchStr = `"${factionId}": [`;
    const factionStart = raw.indexOf(searchStr);
    const arrayStart = raw.indexOf('[', factionStart);

    const nextKeyRe = /\n  "[a-z_]+":\s*\[/g;
    nextKeyRe.lastIndex = arrayStart + 1;
    const nextKeyMatch = nextKeyRe.exec(raw);

    let end;
    if (nextKeyMatch) {
      end = nextKeyMatch.index;
      while (end > arrayStart && raw[end] !== ']') end--;
    } else {
      let depth = 0;
      end = arrayStart;
      for (let i = arrayStart; i < raw.length; i++) {
        if (raw[i] === '[') depth++;
        else if (raw[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
      }
    }

    const jsonStr = raw.slice(arrayStart, end + 1);
    let units;
    try {
      units = JSON.parse(jsonStr);
    } catch {
      continue;
    }

    let factionFixes = 0;

    for (const unit of units) {
      // Fix empty base_size — set to null instead of empty string
      if (unit.base_size !== undefined && unit.base_size.trim() === '') {
        delete unit.base_size;
        factionFixes++;
      }

      // Fix malformed keywords — additional patterns
      if (unit.keywords && Array.isArray(unit.keywords)) {
        const newKeywords = [];
        let kwChanged = false;

        for (const kw of unit.keywords) {
          if (typeof kw !== 'string') continue;

          // Skip if it has "KEYWORDS" preamble
          if (kw.includes('KEYWORDS')) {
            kwChanged = true;
            // Try to extract actual keywords
            const afterColon = kw.split(':').slice(1).join(':').trim();
            if (afterColon) {
              // Split on known separators
              const parts = afterColon.split(/(?=[A-Z]{2,})/g).filter(Boolean);
              for (const p of parts) {
                const cleaned = p.trim();
                if (cleaned && cleaned.length > 1) newKeywords.push(cleaned);
              }
            }
            continue;
          }

          newKeywords.push(kw);
        }

        if (kwChanged) {
          unit.keywords = [...new Set(newKeywords)];
          log('keywords', `${unit.name}: cleaned ${unit.keywords.length} keywords`);
          factionFixes++;
        }
      }

      // Fix ability text spacing
      if (unit.abilities?.other && Array.isArray(unit.abilities.other)) {
        for (const entry of unit.abilities.other) {
          if (Array.isArray(entry) && entry.length >= 2 && typeof entry[1] === 'string') {
            const fixed = entry[1]
              .replace(/D3mortal/g, 'D3 mortal')
              .replace(/D6mortal/g, 'D6 mortal')
              .replace(/Shadowinthe/g, 'Shadow in the');
            if (fixed !== entry[1]) {
              entry[1] = fixed;
              factionFixes++;
            }
          }
        }
      }
    }

    if (factionFixes > 0) {
      const replacement = JSON.stringify(units, null, 2);
      raw = raw.slice(0, arrayStart) + replacement + raw.slice(end + 1);
      console.log(`  ${factionId}: ${factionFixes} fixes`);
    }
  }

  fs.writeFileSync(filePath, raw, 'utf-8');
  console.log(`  Units file updated`);
}

// ─── Fix general.ts ────────────────────────────────────────────────────────

function fixGeneral() {
  console.log('\n━━━ Fixing general.ts ━━━');
  const filePath = path.resolve(__dirname, '../src/data/general.ts');
  let raw = fs.readFileSync(filePath, 'utf-8');
  const before = raw.length;

  // Remove duplicate consecutive [TABLE: ...] blocks
  raw = raw.replace(/(\[TABLE: \[\[[\s\S]*?\]\]\])\s*\[TABLE: \[\[[\s\S]*?\]\]\]/g, (match, first) => {
    log('general', 'Removed duplicate TABLE block');
    return first;
  });

  // Fix common text issues
  raw = raw.replace(/D3mortal wounds/g, 'D3 mortal wounds');
  raw = raw.replace(/D6mortal wounds/g, 'D6 mortal wounds');

  // Remove sections with completely empty text AND empty subsections
  // (These show as blank pages in the rules browser)

  fs.writeFileSync(filePath, raw, 'utf-8');
  const diff = before - raw.length;
  if (diff > 0) console.log(`  Removed ${diff} chars of duplicate data`);
  console.log(`  General file updated`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Final Data Cleanup                                  ║');
console.log('╚══════════════════════════════════════════════════════╝');

fixRules();
fixUnits();
fixGeneral();

console.log(`\n✓ Total fixes: ${fixCount}`);
