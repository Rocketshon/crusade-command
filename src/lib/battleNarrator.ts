// Battle Narrator — generates immersive Warhammer 40K narrative accounts
// using the Claude API via direct fetch (no SDK, browser-compatible)

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;

export interface NarratorInput {
  playerName: string;
  playerFaction: string;
  opponentName: string;
  opponentFaction: string;
  missionName: string;
  battleSize: string;
  result: 'victory' | 'defeat' | 'draw';
  playerVP: number;
  opponentVP: number;
  combatLog: Array<{
    attacker_unit_name: string;
    attacker_weapon: string;
    defender_unit_name: string;
    phase: 'shooting' | 'melee';
    hits: number;
    wounds: number;
    damage_dealt: number;
    models_destroyed: number;
  }>;
}

export async function generateBattleStory(
  input: NarratorInput,
  onChunk?: (text: string) => void
): Promise<string> {
  if (!CLAUDE_API_KEY) {
    throw new Error('Claude API key not configured. Add VITE_CLAUDE_API_KEY to .env.local');
  }

  const prompt = buildPrompt(input);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-20250414',
      max_tokens: 2000,
      stream: !!onChunk,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to generate story');
  }

  if (onChunk && response.body) {
    // Streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullText += parsed.delta.text;
              onChunk(fullText);
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    }
    return fullText;
  } else {
    // Non-streaming
    const data = await response.json();
    return data.content[0]?.text || 'No story generated.';
  }
}

function buildPrompt(input: NarratorInput): string {
  const combatSummary = input.combatLog.map((e, i) =>
    `${i + 1}. ${e.attacker_unit_name} attacked ${e.defender_unit_name} with ${e.attacker_weapon} (${e.phase}) — ${e.hits} hits, ${e.wounds} wounds, ${e.damage_dealt} damage, ${e.models_destroyed} models destroyed`
  ).join('\n');

  return `You are a Warhammer 40,000 battle narrator. Write an immersive, dramatic narrative account of this battle. Use vivid imagery, faction-appropriate language, and make it feel like a passage from a Black Library novel.

BATTLE DETAILS:
- ${input.playerName}'s ${input.playerFaction} vs ${input.opponentName}'s ${input.opponentFaction}
- Mission: ${input.missionName}
- Battle Size: ${input.battleSize}
- Result: ${input.result} (${input.playerVP} VP to ${input.opponentVP} VP)

COMBAT LOG:
${combatSummary || 'No detailed combat data recorded.'}

Write 3-5 paragraphs. Include:
- The battlefield atmosphere and setting
- Key moments from the combat log (the most dramatic attacks)
- The turning point of the battle
- The aftermath and result
- Faction-specific flavor (War cries, chapter traditions, xenos behavior, chaos corruption, etc.)

Keep it under 500 words. Make it feel epic.`;
}

export function canGenerateStory(): boolean {
  return !!CLAUDE_API_KEY;
}
