/**
 * Sonnet Section Splitter
 *
 * Takes every core/crusade rule text block and splits it into
 * titled subsections for accordion display.
 *
 * Output: each section gets a `parsed_subsections` array of { title, text } objects
 */

const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const MODEL = "claude-sonnet-4-20250514";

const client = new Anthropic({ apiKey: API_KEY });

let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalCalls = 0;

const SYSTEM_PROMPT = `You split Warhammer 40,000 rules text into logical subsections for an accordion UI.

RULES:
1. Return a JSON array of objects: [{"title": "...", "text": "..."}]
2. Each object is one accordion item with a short descriptive title and the rules text for that section
3. Titles should be SHORT (2-6 words) and descriptive. Like "Engagement Range", "Unit Coherency", "Hit Roll Modifiers"
4. Keep ALL original rules text EXACTLY as-is. Do NOT rephrase, summarize, or remove anything
5. Split at natural logical breaks — where a new concept or rule topic begins
6. Aim for 2-8 subsections per input. Don't make too many tiny ones or too few huge ones
7. If the input is very short (under 100 words), return it as a single subsection
8. Remove [TABLE:...] blocks from the text (they don't render well)
9. Remove [Section Name] markers — the titles replace them
10. Return ONLY the JSON array. No markdown, no code fences, no explanation

Example input:
"Hit Roll (Ranged Attack): A hit is scored if the D6 result equals or exceeds that attack's BS. Hit Roll (Melee Attack): A hit is scored if the D6 result equals or exceeds that attack's WS. Critical Hit: Unmodified Hit roll of 6. Always successful. An unmodified Hit roll of 1 always fails. A Hit roll can never be modified by more than -1 or +1."

Example output:
[{"title":"Ranged Hit Rolls","text":"Hit Roll (Ranged Attack): A hit is scored if the D6 result equals or exceeds that attack's BS."},{"title":"Melee Hit Rolls","text":"Hit Roll (Melee Attack): A hit is scored if the D6 result equals or exceeds that attack's WS."},{"title":"Critical Hits & Failures","text":"Critical Hit: Unmodified Hit roll of 6. Always successful. An unmodified Hit roll of 1 always fails."},{"title":"Hit Roll Modifiers","text":"A Hit roll can never be modified by more than -1 or +1."}]`;

async function splitText(name, text) {
  if (!text || text.trim().length < 80) {
    return [{ title: name, text: text || '' }];
  }

  // Clean TABLE blocks before sending
  const cleaned = text.replace(/\[TABLE:\s*\[[\s\S]*?\]\]\s*/g, '').trim();
  if (cleaned.length < 80) {
    return [{ title: name, text: cleaned }];
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Section: "${name}"\n\nTEXT:\n${cleaned}` }],
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;
    totalCalls++;

    let result = response.content[0].text.trim();

    // Strip markdown code fences if present
    result = result.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    const parsed = JSON.parse(result);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title && parsed[0].text !== undefined) {
      return parsed;
    }

    console.log(`    ⚠️  Bad format, keeping as single section`);
    return [{ title: name, text: cleaned }];
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.log(`    ⚠️  JSON parse error, keeping as single section`);
    } else {
      console.error(`    ❌ API error: ${err.message}`);
    }
    return [{ title: name, text: cleaned.replace(/\[([A-Za-z][^\]]*)\]/g, '').trim() }];
  }
}

async function main() {
  console.log("🚀 Sonnet Section Splitter");
  console.log("=========================");
  const startTime = Date.now();

  const dataPath = path.join(__dirname, "general-rules-data.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  // Process core rules
  console.log("\n=== Core Rules ===\n");
  for (const section of data.core_rules.sections) {
    process.stdout.write(`  ${section.name} (${(section.text || '').length} chars)... `);
    const subs = await splitText(section.name, section.text);
    section.accordion = subs;
    console.log(`✅ ${subs.length} subsections`);
    await new Promise(r => setTimeout(r, 300));
  }

  // Process crusade rules
  console.log("\n=== Crusade Rules ===\n");
  for (const section of data.crusade_rules.sections) {
    process.stdout.write(`  ${section.name} (${(section.text || '').length} chars)... `);
    const subs = await splitText(section.name, section.text);
    section.accordion = subs;
    console.log(`✅ ${subs.length} subsections`);
    await new Promise(r => setTimeout(r, 300));
  }

  // Save updated data
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf-8");

  // Now update general.ts
  const generalPath = path.join(__dirname, "..", "src", "data", "general.ts");
  let generalTs = fs.readFileSync(generalPath, "utf-8");

  const coreData = JSON.stringify(data.core_rules, null, 2);
  const crusadeData = JSON.stringify(data.crusade_rules, null, 2);

  const coreStart = generalTs.indexOf("export const CORE_RULES");
  const crusadeStart = generalTs.indexOf("export const CRUSADE_RULES");
  const commentaryStart = generalTs.indexOf("export const RULES_COMMENTARY");

  const header = generalTs.slice(0, coreStart);
  const commentarySection = generalTs.slice(commentaryStart);

  const newGeneralTs =
    header +
    "export const CORE_RULES: GeneralRulesDocument | null = " + coreData + ";\n\n" +
    "export const CRUSADE_RULES: GeneralRulesDocument | null = " + crusadeData + ";\n\n" +
    commentarySection;

  fs.writeFileSync(generalPath, newGeneralTs, "utf-8");

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const inputCost = (totalInputTokens * 3) / 1000000;
  const outputCost = (totalOutputTokens * 15) / 1000000;

  console.log("\n=========================");
  console.log("📊 FINAL STATS");
  console.log(`  API calls: ${totalCalls}`);
  console.log(`  Input tokens: ${totalInputTokens.toLocaleString()}`);
  console.log(`  Output tokens: ${totalOutputTokens.toLocaleString()}`);
  console.log(`  TOTAL COST: $${(inputCost + outputCost).toFixed(2)}`);
  console.log(`  Time: ${elapsed}s`);
  console.log("=========================");
}

main().catch(console.error);
