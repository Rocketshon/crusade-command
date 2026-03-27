/**
 * Sonnet Analysis → Haiku Implementation Pipeline
 *
 * Phase 1: Sonnet 4.6 analyzes all source code for bugs, UX issues, and improvements
 * Phase 2: Haiku 4.5 implements the fixes
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/sonnet-audit.ts
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/sonnet-audit.ts --analyze-only
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/sonnet-audit.ts --implement-only
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const SONNET = 'claude-sonnet-4-6';
const HAIKU = 'claude-haiku-4-5-20251001';

const PRICING = {
  sonnet: { input: 3.00, output: 15.00 },
  haiku: { input: 1.00, output: 5.00 },
};

const args = process.argv.slice(2);
const analyzeOnly = args.includes('--analyze-only');
const implementOnly = args.includes('--implement-only');

let sonnetIn = 0, sonnetOut = 0, haikuIn = 0, haikuOut = 0;

const client = new Anthropic();

// ─── File Collection ───────────────────────────────────────────────────────

function collectSourceFiles(dir: string, basePath: string = projectRoot): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (['node_modules', 'dist', '.git', '.claude', 'data'].includes(entry)) continue;
      files.push(...collectSourceFiles(full, basePath));
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      if (entry.endsWith('.d.ts')) continue;
      files.push(full);
    }
  }
  return files;
}

// ─── Phase 1: Sonnet Analysis ──────────────────────────────────────────────

interface Finding {
  file: string;
  line?: number;
  category: 'bug' | 'ux' | 'performance' | 'accessibility' | 'code-quality' | 'data-display';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedFix: string;
  autoFixable: boolean;
  needsResearch: boolean;
}

const SONNET_SYSTEM = `You are a senior full-stack engineer auditing a React + TypeScript PWA (Warhammer 40K Crusade Campaign Manager). This app will be demoed at Adepticon, a major gaming convention, in 2 days.

Analyze the provided source code and report ALL issues you find. Be thorough and specific.

Categories to check:
1. **BUGS**: Logic errors, null access risks, race conditions, broken navigation, state management issues
2. **UX**: Confusing flows, missing feedback, poor error messages, accessibility issues, mobile usability
3. **PERFORMANCE**: Unnecessary re-renders, missing memoization, large inline styles
4. **DATA DISPLAY**: Incorrect formatting, missing fallbacks for empty data, truncated text display
5. **CODE QUALITY**: Dead code, unused imports, inconsistent patterns

For each issue, respond with a JSON array of findings:
{
  "file": "relative/path.tsx",
  "line": 42,
  "category": "bug|ux|performance|accessibility|code-quality|data-display",
  "severity": "critical|high|medium|low",
  "title": "Short title",
  "description": "Detailed description of the problem",
  "suggestedFix": "Specific code change or approach to fix this",
  "autoFixable": true/false,
  "needsResearch": true/false
}

Rules:
- Only report REAL issues that affect the user experience or app stability
- Do NOT report style preferences or subjective opinions
- Do NOT report issues with auto-generated data files
- For each issue, provide a SPECIFIC fix, not generic advice
- Set autoFixable=true only if the fix is 100% mechanical and you can see exactly what the code should be
- Be specific about line numbers when possible
- CRITICAL: Do NOT hallucinate or assume. If you're unsure about game rules, correct values, or intended behavior, set "needsResearch": true and describe what needs to be verified. Do NOT guess at correct Warhammer 40K rules values, point costs, or game mechanics.
- If a fix requires knowing something you don't (like correct stat values, rule wording, design intent), mark it as needsResearch=true and autoFixable=false`;

async function analyzeChunk(files: { path: string; content: string }[]): Promise<Finding[]> {
  const fileBlock = files.map(f =>
    `=== ${f.path} ===\n${f.content}`
  ).join('\n\n');

  const resp = await client.messages.create({
    model: SONNET,
    max_tokens: 8192,
    system: SONNET_SYSTEM,
    messages: [{ role: 'user', content: `Analyze these source files:\n\n${fileBlock}` }],
  });

  sonnetIn += resp.usage.input_tokens;
  sonnetOut += resp.usage.output_tokens;

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text).join('');

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.warn('  Warning: Could not parse Sonnet response');
    return [];
  }
}

async function runAnalysis(): Promise<Finding[]> {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Phase 1: Sonnet 4.6 Analysis                       ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Collect all source files (excluding data/)
  const srcDir = resolve(projectRoot, 'src');
  const allFiles = collectSourceFiles(srcDir);

  // Also include key config files
  const extraFiles = ['index.html', 'public/manifest.json', 'public/sw.js', 'vite.config.ts']
    .map(f => resolve(projectRoot, f))
    .filter(f => { try { statSync(f); return true; } catch { return false; } });

  const sourceFiles = [...allFiles, ...extraFiles]
    .filter(f => !f.includes('data/units.ts') && !f.includes('data/rules.ts') && !f.includes('data/general.ts'))
    .map(f => ({
      path: relative(projectRoot, f).replace(/\\/g, '/'),
      content: readFileSync(f, 'utf-8'),
    }));

  console.log(`Collected ${sourceFiles.length} source files`);

  // Group files into chunks (~50K tokens each, ~200KB)
  const chunks: typeof sourceFiles[] = [];
  let currentChunk: typeof sourceFiles = [];
  let currentSize = 0;
  const MAX_CHUNK = 150000; // chars (~37K tokens)

  for (const file of sourceFiles) {
    if (currentSize + file.content.length > MAX_CHUNK && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }
    currentChunk.push(file);
    currentSize += file.content.length;
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);

  console.log(`Split into ${chunks.length} analysis chunks\n`);

  const allFindings: Finding[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const fileNames = chunk.map(f => f.path).join(', ');
    console.log(`Chunk ${i + 1}/${chunks.length}: ${chunk.length} files (${fileNames.slice(0, 80)}...)`);

    const findings = await analyzeChunk(chunk);
    allFindings.push(...findings);
    console.log(`  → ${findings.length} findings`);
  }

  // Save analysis results
  const analysisPath = resolve(projectRoot, 'sonnet-analysis.json');
  writeFileSync(analysisPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalFindings: allFindings.length,
    bySeverity: {
      critical: allFindings.filter(f => f.severity === 'critical').length,
      high: allFindings.filter(f => f.severity === 'high').length,
      medium: allFindings.filter(f => f.severity === 'medium').length,
      low: allFindings.filter(f => f.severity === 'low').length,
    },
    byCategory: {
      bug: allFindings.filter(f => f.category === 'bug').length,
      ux: allFindings.filter(f => f.category === 'ux').length,
      performance: allFindings.filter(f => f.category === 'performance').length,
      'data-display': allFindings.filter(f => f.category === 'data-display').length,
      'code-quality': allFindings.filter(f => f.category === 'code-quality').length,
    },
    autoFixable: allFindings.filter(f => f.autoFixable).length,
    findings: allFindings,
    cost: {
      input: sonnetIn,
      output: sonnetOut,
      dollars: (sonnetIn / 1e6) * PRICING.sonnet.input + (sonnetOut / 1e6) * PRICING.sonnet.output,
    },
  }, null, 2));

  console.log(`\nAnalysis saved to sonnet-analysis.json`);
  return allFindings;
}

// ─── Phase 2: Haiku Implementation ─────────────────────────────────────────

const HAIKU_SYSTEM = `You are implementing specific code fixes for a React + TypeScript app. You will receive:
1. The current file content
2. A specific issue to fix with a suggested approach

Return ONLY the modified file content. No explanation, no markdown, no code blocks — just the raw file content that should replace the current file.

Rules:
- Make the MINIMUM change needed to fix the issue
- Do NOT change anything else in the file
- Do NOT add comments explaining your fix
- Do NOT change formatting, imports, or unrelated code
- Preserve all existing functionality
- Do NOT guess or hallucinate values. If you are unsure about a correct value, leave the existing code unchanged
- If the suggested fix references game rules or data you're not sure about, skip the fix entirely and return the original file unchanged`;

async function implementFix(finding: Finding): Promise<{ success: boolean; newContent?: string }> {
  const filePath = resolve(projectRoot, finding.file);
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return { success: false };
  }

  const resp = await client.messages.create({
    model: HAIKU,
    max_tokens: 16384,
    system: HAIKU_SYSTEM,
    messages: [{
      role: 'user',
      content: `File: ${finding.file}
Issue: ${finding.title}
Description: ${finding.description}
Suggested Fix: ${finding.suggestedFix}
Line: ${finding.line || 'unknown'}

Current file content:
${content}`,
    }],
  });

  haikuIn += resp.usage.input_tokens;
  haikuOut += resp.usage.output_tokens;

  const newContent = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text).join('');

  // Basic sanity check — new content shouldn't be drastically different
  if (newContent.length < content.length * 0.5 || newContent.length > content.length * 2) {
    console.log(`  ⚠ Skipping — output size too different (${content.length} → ${newContent.length})`);
    return { success: false };
  }

  return { success: true, newContent };
}

async function runImplementation(findings: Finding[]) {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Phase 2: Haiku 4.5 Implementation                  ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Only implement autoFixable findings, sorted by severity
  const fixable = findings
    .filter(f => f.autoFixable)
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });

  console.log(`${fixable.length} auto-fixable findings to implement\n`);

  // Group by file to avoid conflicting edits
  const byFile = new Map<string, Finding[]>();
  for (const f of fixable) {
    const existing = byFile.get(f.file) || [];
    existing.push(f);
    byFile.set(f.file, existing);
  }

  let implemented = 0;
  let failed = 0;

  for (const [file, fileFindings] of byFile) {
    console.log(`\n${file} (${fileFindings.length} fixes):`);

    // Apply fixes one at a time to avoid conflicts
    for (const finding of fileFindings) {
      const sev = finding.severity === 'critical' ? '🔴' :
        finding.severity === 'high' ? '🟠' :
        finding.severity === 'medium' ? '🟡' : '🟢';

      console.log(`  ${sev} ${finding.title}`);

      const result = await implementFix(finding);
      if (result.success && result.newContent) {
        writeFileSync(resolve(projectRoot, file), result.newContent, 'utf-8');
        implemented++;
        console.log(`    ✓ Fixed`);
      } else {
        failed++;
        console.log(`    ✗ Skipped`);
      }
    }
  }

  console.log(`\nImplemented: ${implemented}, Skipped: ${failed}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Warcaster: Sonnet Analyze → Haiku Implement        ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  let findings: Finding[];

  if (implementOnly) {
    // Load existing analysis
    const analysisPath = resolve(projectRoot, 'sonnet-analysis.json');
    const analysis = JSON.parse(readFileSync(analysisPath, 'utf-8'));
    findings = analysis.findings;
    console.log(`\nLoaded ${findings.length} findings from previous analysis`);
  } else {
    findings = await runAnalysis();
  }

  // Print summary
  console.log('\n── Analysis Summary ──');
  console.log(`Total findings: ${findings.length}`);
  console.log(`  Critical: ${findings.filter(f => f.severity === 'critical').length}`);
  console.log(`  High: ${findings.filter(f => f.severity === 'high').length}`);
  console.log(`  Medium: ${findings.filter(f => f.severity === 'medium').length}`);
  console.log(`  Low: ${findings.filter(f => f.severity === 'low').length}`);
  console.log(`  Auto-fixable: ${findings.filter(f => f.autoFixable).length}`);
  console.log(`  Needs research: ${findings.filter(f => f.needsResearch).length}`);

  console.log('\n── By Category ──');
  console.log(`  Bugs: ${findings.filter(f => f.category === 'bug').length}`);
  console.log(`  UX: ${findings.filter(f => f.category === 'ux').length}`);
  console.log(`  Performance: ${findings.filter(f => f.category === 'performance').length}`);
  console.log(`  Data Display: ${findings.filter(f => f.category === 'data-display').length}`);
  console.log(`  Code Quality: ${findings.filter(f => f.category === 'code-quality').length}`);

  // Print all findings
  console.log('\n── All Findings ──\n');
  for (const f of findings) {
    const sev = f.severity === 'critical' ? '🔴' :
      f.severity === 'high' ? '🟠' :
      f.severity === 'medium' ? '🟡' : '🟢';
    const fix = f.autoFixable ? '🔧' : '📝';
    console.log(`${sev}${fix} [${f.file}] ${f.title}`);
    console.log(`   ${f.description}`);
    console.log(`   Fix: ${f.suggestedFix}`);
    console.log('');
  }

  if (!analyzeOnly && findings.filter(f => f.autoFixable).length > 0) {
    await runImplementation(findings);
  }

  // Cost summary
  const sonnetCost = (sonnetIn / 1e6) * PRICING.sonnet.input + (sonnetOut / 1e6) * PRICING.sonnet.output;
  const haikuCost = (haikuIn / 1e6) * PRICING.haiku.input + (haikuOut / 1e6) * PRICING.haiku.output;

  console.log('\n── Cost Summary ──');
  console.log(`  Sonnet: ${sonnetIn.toLocaleString()} in / ${sonnetOut.toLocaleString()} out = $${sonnetCost.toFixed(4)}`);
  console.log(`  Haiku:  ${haikuIn.toLocaleString()} in / ${haikuOut.toLocaleString()} out = $${haikuCost.toFixed(4)}`);
  console.log(`  Total:  $${(sonnetCost + haikuCost).toFixed(4)}`);
}

main().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
