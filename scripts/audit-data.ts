/**
 * Data Quality Audit Script
 *
 * Uses Claude Haiku 4.5 to validate all game data (units, rules, stratagems)
 * for formatting issues, missing fields, truncated text, and inconsistencies.
 *
 * Escalates flagged issues to Sonnet 4.6 for deeper review.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/audit-data.ts
 *
 * Options:
 *   --faction=space_marines    Audit a single faction (default: all)
 *   --skip-sonnet              Skip Sonnet escalation
 *   --dry-run                  Show what would be sent without calling API
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Config ────────────────────────────────────────────────────────────────────

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS_PER_REQUEST = 2048;

// Pricing per million tokens
const PRICING = {
  haiku: { input: 1.00, output: 5.00 },
  sonnet: { input: 3.00, output: 15.00 },
};

// ─── Parse Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const factionFilter = args.find(a => a.startsWith('--faction='))?.split('=')[1];
const skipSonnet = args.includes('--skip-sonnet');
const dryRun = args.includes('--dry-run');

// ─── Load Data ─────────────────────────────────────────────────────────────────

const dataDir = resolve(__dirname, '../src/data');

// We need to extract the raw JSON objects from the TS files
function extractJsonFromTs(filePath: string, varName: string): Record<string, any> {
  const content = readFileSync(filePath, 'utf-8');
  // Find the variable assignment and extract the JSON-like object
  const startMarker = `const ${varName}: Record<string, `;
  const altStartMarker = `const ${varName} = {`;

  // Strategy: use dynamic import won't work easily with TS, so let's parse smartly
  // The files export like: const _units: Record<string, Datasheet[]> = { ... };
  // We'll extract faction keys by regex, then load per-faction chunks

  const factionMatches = [...content.matchAll(/"([a-z_]+)":\s*[\[{]/g)];
  const factions: string[] = [];
  for (const match of factionMatches) {
    if (match.index !== undefined && !factions.includes(match[1])) {
      factions.push(match[1]);
    }
  }
  return { _factions: factions, _raw: content };
}

function extractFactionUnits(raw: string, factionId: string): any[] {
  const marker = `"${factionId}": [`;
  const factionStart = raw.indexOf(marker);
  if (factionStart === -1) return [];

  const arrayStart = raw.indexOf('[', factionStart);
  // Find the closing ] by looking for the next top-level key (indented 2 spaces)
  const nextKeyPattern = /\n  "[a-z_]+":\s*\[/g;
  nextKeyPattern.lastIndex = arrayStart + 1;
  const nextKeyMatch = nextKeyPattern.exec(raw);
  // If no next key, the array extends to the end of the object
  let end: number;
  if (nextKeyMatch) {
    end = nextKeyMatch.index;
    while (end > 0 && raw[end] !== ']') end--;
  } else {
    // Last faction — find the closing ] of the whole object
    end = raw.lastIndexOf(']');
  }
  const jsonStr = raw.slice(arrayStart, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
}

function extractFactionRules(raw: string, factionId: string): any | null {
  const marker = `"${factionId}": {`;
  const factionStart = raw.indexOf(marker);
  if (factionStart === -1) return null;

  const objStart = raw.indexOf('{', factionStart);
  // Find next top-level key
  const nextKeyPattern = /\n  "[a-z_]+":\s*\{/g;
  nextKeyPattern.lastIndex = objStart + 1;
  const nextKeyMatch = nextKeyPattern.exec(raw);

  let end: number;
  if (nextKeyMatch) {
    end = nextKeyMatch.index;
    while (end > 0 && raw[end] !== '}') end--;
  } else {
    end = raw.lastIndexOf('}');
  }

  const jsonStr = raw.slice(objStart, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// ─── Audit Prompts ─────────────────────────────────────────────────────────────

const UNIT_AUDIT_PROMPT = `You are auditing Warhammer 40K unit datasheet data for a campaign manager app. Check for data quality issues ONLY. Do NOT verify game rules accuracy — just structural/formatting issues.

For each unit, check:
1. MISSING FIELDS: name, stats (M/T/Sv/W/Ld/OC), points (at least one tier with cost), keywords (non-empty)
2. TRUNCATED TEXT: Ability descriptions that end mid-sentence or with "..."
3. FORMATTING: Stats should be numbers or dice notation (e.g. "3+", "2D6", "6\""). Points costs should be numeric strings.
4. EMPTY ARRAYS: weapons arrays that are empty when the unit clearly should have weapons (based on name)
5. INCONSISTENCIES: Melee-only units with ranged weapons, or vice versa (by keyword)
6. DUPLICATE NAMES: Multiple units with the exact same name

Respond with a JSON array of issues found. Each issue should have:
{ "unit": "unit name", "field": "field name", "issue": "description", "severity": "high|medium|low" }

If no issues found, respond with: []

IMPORTANT: Only report genuine problems. Do NOT report:
- Units without invulnerable saves (that's normal)
- Units with empty traits arrays on weapons (that's valid)
- Legends units (they're intentionally included)`;

const RULES_AUDIT_PROMPT = `You are auditing Warhammer 40K faction rules data for a campaign manager app. Check for data quality issues ONLY. Do NOT verify game rules accuracy.

For each faction's rules, check:
1. ARMY RULES: Should have at least one army rule with non-trivial text (>50 chars)
2. DETACHMENTS: Each should have name, rule (with name+text), enhancements (each with name/cost/text), stratagems (each with name/cp/type/when/target/effect)
3. STRATAGEMS: CP field should match pattern like "1CP" or "2CP". Type, when, target, effect should all be non-empty.
4. ENHANCEMENTS: Cost should be a numeric string. Text should contain "model only" restriction.
5. TRUNCATED TEXT: Any text field that ends mid-sentence or appears cut off
6. MISSING REQUIRED FIELDS: Stratagems missing when/target/effect, enhancements missing cost
7. CRUSADE RULES: If present, each entry should have at least name or text

Respond with a JSON array of issues found. Each issue should have:
{ "section": "detachment/stratagem/enhancement name", "field": "field name", "issue": "description", "severity": "high|medium|low" }

If no issues found, respond with: []`;

const SONNET_REVIEW_PROMPT = `You are doing a deep quality review of Warhammer 40K game data that was flagged by an initial scan. For each flagged issue below, determine:

1. Is this a REAL problem that needs fixing? (true/false)
2. If real, what is the correct fix?
3. Priority: critical (app will break), high (wrong data shown), medium (formatting), low (cosmetic)

Respond with a JSON array:
{ "original_issue": "...", "is_real": true/false, "fix": "description or null", "priority": "critical|high|medium|low" }`;

// ─── API Client ────────────────────────────────────────────────────────────────

let totalInputTokens = 0;
let totalOutputTokens = 0;
let haikuInputTokens = 0;
let haikuOutputTokens = 0;
let sonnetInputTokens = 0;
let sonnetOutputTokens = 0;

async function callClaude(
  model: string,
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  if (dryRun) {
    const approxTokens = Math.ceil(userContent.length / 4);
    console.log(`  [DRY RUN] Would send ~${approxTokens.toLocaleString()} tokens to ${model}`);
    return '[]';
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS_PER_REQUEST,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  totalInputTokens += inputTokens;
  totalOutputTokens += outputTokens;

  if (model === HAIKU_MODEL) {
    haikuInputTokens += inputTokens;
    haikuOutputTokens += outputTokens;
  } else {
    sonnetInputTokens += inputTokens;
    sonnetOutputTokens += outputTokens;
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return text;
}

function parseJsonResponse(text: string): any[] {
  // Extract JSON array from response (might have markdown wrapping)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.warn('  Warning: Could not parse API response as JSON');
    return [];
  }
}

// ─── Main Audit ────────────────────────────────────────────────────────────────

interface AuditIssue {
  faction: string;
  type: 'unit' | 'rules';
  details: any;
}

async function auditFactionUnits(factionId: string, units: any[]): Promise<AuditIssue[]> {
  if (units.length === 0) return [];

  // Chunk units to stay within context limits (~100K tokens per request)
  // Each unit is roughly 500-2000 chars, so ~50 units per chunk
  const CHUNK_SIZE = 40;
  const issues: AuditIssue[] = [];

  for (let i = 0; i < units.length; i += CHUNK_SIZE) {
    const chunk = units.slice(i, i + CHUNK_SIZE);
    const chunkStr = JSON.stringify(chunk, null, 1);

    console.log(`  Units ${i + 1}-${Math.min(i + CHUNK_SIZE, units.length)} of ${units.length} (~${Math.ceil(chunkStr.length / 4).toLocaleString()} tokens)...`);

    const response = await callClaude(
      HAIKU_MODEL,
      UNIT_AUDIT_PROMPT,
      `Faction: ${factionId}\n\nUnit data:\n${chunkStr}`
    );

    const parsed = parseJsonResponse(response);
    for (const issue of parsed) {
      issues.push({ faction: factionId, type: 'unit', details: issue });
    }
  }

  return issues;
}

async function auditFactionRules(factionId: string, rules: any): Promise<AuditIssue[]> {
  if (!rules) return [];

  const rulesStr = JSON.stringify(rules, null, 1);
  console.log(`  Rules (~${Math.ceil(rulesStr.length / 4).toLocaleString()} tokens)...`);

  const response = await callClaude(
    HAIKU_MODEL,
    RULES_AUDIT_PROMPT,
    `Faction: ${factionId}\n\nRules data:\n${rulesStr}`
  );

  const parsed = parseJsonResponse(response);
  return parsed.map((issue: any) => ({ faction: factionId, type: 'rules' as const, details: issue }));
}

async function escalateToSonnet(issues: AuditIssue[]): Promise<any[]> {
  if (issues.length === 0 || skipSonnet) return [];

  // Group by faction for context
  const issueText = issues.map((i, idx) =>
    `${idx + 1}. [${i.faction}] ${i.type}: ${JSON.stringify(i.details)}`
  ).join('\n');

  console.log(`\nEscalating ${issues.length} issues to Sonnet for deep review...`);

  const response = await callClaude(
    SONNET_MODEL,
    SONNET_REVIEW_PROMPT,
    `Flagged issues from Haiku scan:\n\n${issueText}`
  );

  return parseJsonResponse(response);
}

function calculateCost(): { haiku: number; sonnet: number; total: number } {
  const haikuCost =
    (haikuInputTokens / 1_000_000) * PRICING.haiku.input +
    (haikuOutputTokens / 1_000_000) * PRICING.haiku.output;
  const sonnetCost =
    (sonnetInputTokens / 1_000_000) * PRICING.sonnet.input +
    (sonnetOutputTokens / 1_000_000) * PRICING.sonnet.output;
  return { haiku: haikuCost, sonnet: sonnetCost, total: haikuCost + sonnetCost };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     CrusadeCommand Data Quality Audit               ║');
  console.log('║     Haiku 4.5 scan + Sonnet 4.6 deep review        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (dryRun) console.log('*** DRY RUN MODE — no API calls will be made ***\n');
  if (factionFilter) console.log(`Filtering to faction: ${factionFilter}\n`);
  if (skipSonnet) console.log('Sonnet escalation: SKIPPED\n');

  // Load raw data files
  console.log('Loading data files...');
  const unitsRaw = readFileSync(resolve(dataDir, 'units.ts'), 'utf-8');
  const rulesRaw = readFileSync(resolve(dataDir, 'rules.ts'), 'utf-8');

  // Extract top-level faction keys from the units file
  // Match keys at the start of a line (after optional whitespace) followed by ": ["
  const factionMatches = [...unitsRaw.matchAll(/^\s{1,2}"([a-z_]+)":\s*\[/gm)];
  const allFactions = [...new Set(factionMatches.map(m => m[1]))];
  const factions = factionFilter ? allFactions.filter(f => f === factionFilter) : allFactions;

  console.log(`Found ${allFactions.length} factions, auditing ${factions.length}\n`);

  const allIssues: AuditIssue[] = [];
  const highSeverityIssues: AuditIssue[] = [];

  // Audit each faction
  for (const faction of factions) {
    console.log(`\n━━━ ${faction.toUpperCase()} ━━━`);

    // Extract and audit units
    const units = extractFactionUnits(unitsRaw, faction);
    console.log(`  ${units.length} units found`);
    const unitIssues = await auditFactionUnits(faction, units);
    allIssues.push(...unitIssues);

    // Extract and audit rules
    const rules = extractFactionRules(rulesRaw, faction);
    if (rules) {
      const detCount = rules.detachments?.length ?? 0;
      const stratCount = rules.detachments?.reduce((sum: number, d: any) => sum + (d.stratagems?.length ?? 0), 0) ?? 0;
      console.log(`  ${detCount} detachments, ${stratCount} stratagems`);
      const ruleIssues = await auditFactionRules(faction, rules);
      allIssues.push(...ruleIssues);
    } else {
      console.log('  No rules data found');
    }

    // Track high severity
    const factionHighIssues = allIssues.filter(
      i => i.faction === faction && i.details.severity === 'high'
    );
    highSeverityIssues.push(...factionHighIssues);

    const factionIssueCount = allIssues.filter(i => i.faction === faction).length;
    console.log(`  → ${factionIssueCount} issues found`);
  }

  // Sonnet escalation for high severity issues
  let sonnetResults: any[] = [];
  if (highSeverityIssues.length > 0 && !skipSonnet) {
    sonnetResults = await escalateToSonnet(highSeverityIssues);
  }

  // Calculate costs
  const cost = calculateCost();

  // Print summary
  console.log('\n\n╔══════════════════════════════════════════════════════╗');
  console.log('║                    AUDIT RESULTS                     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  console.log(`Total issues found: ${allIssues.length}`);
  console.log(`  High severity: ${allIssues.filter(i => i.details.severity === 'high').length}`);
  console.log(`  Medium severity: ${allIssues.filter(i => i.details.severity === 'medium').length}`);
  console.log(`  Low severity: ${allIssues.filter(i => i.details.severity === 'low').length}`);

  if (sonnetResults.length > 0) {
    const confirmed = sonnetResults.filter((r: any) => r.is_real);
    console.log(`\nSonnet confirmed: ${confirmed.length} of ${sonnetResults.length} flagged issues are real`);
  }

  console.log('\n── Token Usage ──');
  console.log(`  Haiku:  ${haikuInputTokens.toLocaleString()} in / ${haikuOutputTokens.toLocaleString()} out`);
  console.log(`  Sonnet: ${sonnetInputTokens.toLocaleString()} in / ${sonnetOutputTokens.toLocaleString()} out`);
  console.log(`  Total:  ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out`);

  console.log('\n── Cost ──');
  console.log(`  Haiku:  $${cost.haiku.toFixed(4)}`);
  console.log(`  Sonnet: $${cost.sonnet.toFixed(4)}`);
  console.log(`  Total:  $${cost.total.toFixed(4)}`);

  // Write report
  const report = {
    timestamp: new Date().toISOString(),
    factions_audited: factions.length,
    total_issues: allIssues.length,
    issues_by_severity: {
      high: allIssues.filter(i => i.details.severity === 'high').length,
      medium: allIssues.filter(i => i.details.severity === 'medium').length,
      low: allIssues.filter(i => i.details.severity === 'low').length,
    },
    cost,
    token_usage: {
      haiku: { input: haikuInputTokens, output: haikuOutputTokens },
      sonnet: { input: sonnetInputTokens, output: sonnetOutputTokens },
    },
    issues: allIssues,
    sonnet_review: sonnetResults,
  };

  const reportPath = resolve(__dirname, '../audit-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nFull report saved to: ${reportPath}`);

  // Print individual issues
  if (allIssues.length > 0) {
    console.log('\n── Issues Detail ──\n');
    for (const issue of allIssues) {
      const sev = issue.details.severity === 'high' ? '🔴' : issue.details.severity === 'medium' ? '🟡' : '🟢';
      const unit = issue.details.unit || issue.details.section || '';
      const field = issue.details.field || '';
      console.log(`${sev} [${issue.faction}] ${unit} → ${field}: ${issue.details.issue}`);
    }
  }
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
