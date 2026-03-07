import type { ReactNode } from 'react';

/**
 * Title-case a string: "INFANTRY" -> "Infantry", "CHAOS SPACE MARINES" -> "Chaos Space Marines"
 * Handles ALL CAPS Wahapedia keywords, already-capitalized text, and lowercase text.
 */
export function toTitleCase(str: string): string {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(/[\s]+/)
    .map((word) => {
      // Keep small connecting words lowercase (except first word)
      const smallWords = ['of', 'the', 'and', 'in', 'on', 'for', 'a', 'an', 'to'];
      if (smallWords.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    // Ensure first character is always uppercase
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Detect garbage content scraped from Wahapedia (JS code, ads, nav snippets).
 */
function isGarbageContent(text: string): boolean {
  return (
    /\$\((?:window|this|'|"|document)/.test(text) ||
    /Disable\s+Ads/i.test(text) ||
    /Boosty/i.test(text) ||
    /^\s*Contents\s+Books\s+Army\s+Rules/i.test(text) ||
    /^Army List Datasheets collated/i.test(text) ||
    /^\s*\d+\.\s*Select\s+Warlord\b/.test(text)
  );
}

/**
 * Render inline keywords: ALL CAPS phrases (2+ chars) wrapped in bold emerald spans.
 */
function renderInlineKeywords(text: string, key: string | number): ReactNode {
  // Match [KEYWORD] patterns and standalone ALL CAPS keywords (2+ words or single keyword)
  const parts = text.split(/(\[[A-Z][A-Z\s\-]+\d*\])/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) => {
        if (/^\[[A-Z][A-Z\s\-]+\d*\]$/.test(part)) {
          return <span key={`${key}-${i}`} className="text-emerald-400 font-semibold">{part}</span>;
        }
        return part;
      })}
    </>
  );
}

/**
 * Find ALL CAPS header positions in continuous text.
 * Headers are 2+ ALL CAPS words (8+ chars total) that appear after sentence-ending
 * punctuation and are followed by normal sentence text.
 */
function findAllCapsHeaders(text: string): { start: number; end: number; header: string }[] {
  const headers: { start: number; end: number; header: string }[] = [];
  // Match sequences of ALL CAPS words (including hyphens/apostrophes)
  const regex = /([A-Z][A-Z']{1,}(?:[\s\-]+[A-Z']{2,})+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const header = match[1].trim();
    if (header.length < 8) continue;
    const words = header.split(/[\s\-]+/);
    if (words.length < 2) continue;

    // Must be preceded by sentence-ending punctuation or be at text start
    if (match.index > 0) {
      const before = text.slice(Math.max(0, match.index - 3), match.index);
      if (!/[.!?:]\s*$/.test(before)) continue;
    }

    // Must be followed by normal text (capital + lowercase = sentence start)
    const afterPos = match.index + match[0].length;
    const after = text.slice(afterPos, afterPos + 3);
    if (!/^\s+[A-Z][a-z]/.test(after)) continue;

    headers.push({ start: match.index, end: afterPos, header });
  }
  return headers;
}

/**
 * Find Title Case sub-headers (e.g. "Protector Imperative", "Dacatarai Stance").
 * These are 2-4 title-cased words after sentence-ending punctuation.
 */
function findTitleCaseHeaders(text: string): { start: number; end: number; header: string }[] {
  const headers: { start: number; end: number; header: string }[] = [];
  // Common sentence-starting words to exclude from header detection
  const sentenceStarters = new Set([
    'each', 'this', 'that', 'the', 'if', 'when', 'while', 'you', 'any', 'all',
    'no', 'one', 'in', 'at', 'for', 'a', 'an', 'before', 'after', 'until',
    'during', 'select', 'keep', 'roll', 'add', 'subtract', 'improve', 'once',
    'unless', 'note', 'only', 'to', 'instead', 'models', 'units', 'weapons',
  ]);

  // Match 2-5 title-cased words (with optional small connectors like "of", "the")
  const regex = /([A-Z][a-z]+(?:[\s]+(?:of|the|and|in|on|for|to|into)[\s]+[A-Z][a-z]+|[\s]+[A-Z][a-z]+){1,4})/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const header = match[1].trim();
    const words = header.split(/\s+/);
    const firstWord = words[0].toLowerCase();

    // Skip if first word is a common sentence starter
    if (sentenceStarters.has(firstWord)) continue;
    // Must be preceded by sentence-ending punctuation
    if (match.index > 0) {
      const before = text.slice(Math.max(0, match.index - 3), match.index);
      if (!/[.!?:]\s*$/.test(before)) continue;
    }
    // Must be followed by more text (another sentence)
    const afterPos = match.index + match[0].length;
    const after = text.slice(afterPos, afterPos + 3);
    if (!/^\s+[A-Z]/.test(after)) continue;
    // Header should be reasonably short (a name, not a sentence)
    if (header.length > 50) continue;

    headers.push({ start: match.index, end: afterPos, header });
  }
  return headers;
}

/**
 * Break long paragraph text at sentence boundaries for readability.
 */
function breakLongParagraph(text: string, maxLen: number = 350): string[] {
  if (text.length <= maxLen) return [text];

  const paragraphs: string[] = [];
  // Split at sentence boundaries: period + space + Capital letter
  const sentences = text.split(/(?<=\.)\s+(?=[A-Z])/);
  let current = '';

  for (const s of sentences) {
    if (current.length + s.length > maxLen && current.length > 80) {
      paragraphs.push(current.trim());
      current = s;
    } else {
      current += (current ? ' ' : '') + s;
    }
  }
  if (current.trim()) paragraphs.push(current.trim());
  return paragraphs;
}

type TextSection = { type: 'heading' | 'paragraph'; text: string };

/**
 * Split continuous text (no newlines) into structured sections by detecting headers.
 */
function splitContinuousText(text: string): TextSection[] {
  // Find all headers (ALL CAPS and Title Case)
  const capsHeaders = findAllCapsHeaders(text);
  const titleHeaders = findTitleCaseHeaders(text);

  // Merge and sort by position, preferring ALL CAPS if overlapping
  const allHeaders = [...capsHeaders, ...titleHeaders]
    .sort((a, b) => a.start - b.start)
    .filter((h, i, arr) => i === 0 || h.start >= arr[i - 1].end);

  if (allHeaders.length === 0) {
    // No headers found — just break into readable paragraphs
    return breakLongParagraph(text).map(t => ({ type: 'paragraph' as const, text: t }));
  }

  const sections: TextSection[] = [];
  let cursor = 0;

  for (const h of allHeaders) {
    // Text before this header → paragraph(s)
    if (h.start > cursor) {
      const before = text.slice(cursor, h.start).trim();
      if (before) {
        for (const p of breakLongParagraph(before)) {
          sections.push({ type: 'paragraph', text: p });
        }
      }
    }
    sections.push({ type: 'heading', text: h.header });
    cursor = h.end;
  }

  // Remaining text after last header
  if (cursor < text.length) {
    const remaining = text.slice(cursor).trim();
    if (remaining) {
      for (const p of breakLongParagraph(remaining)) {
        sections.push({ type: 'paragraph', text: p });
      }
    }
  }

  return sections;
}

/**
 * Parse Wahapedia rules text into structured ReactNode elements.
 * Handles continuous text (no newlines), ALL CAPS headers, Title Case headers,
 * bullet points, garbage filtering, and sentence-based paragraph breaks.
 */
export function parseRuleText(text: string): ReactNode[] {
  if (!text) return [];

  // Filter garbage content (scraped JS, ads, navigation)
  if (isGarbageContent(text)) return [];

  const elements: ReactNode[] = [];
  let keyIdx = 0;

  // If text has newlines, split on them first
  const blocks = text.includes('\n')
    ? text.split(/\n\n|\n/).filter(p => p.trim())
    : [text];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Bullet point
    const bulletMatch = trimmed.match(/^[■•\-\*]\s*(.*)/);
    if (bulletMatch) {
      elements.push(
        <div key={keyIdx++} className="flex items-start gap-2 ml-2 my-1">
          <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
          <span className="text-stone-300 text-xs leading-relaxed">{bulletMatch[1]}</span>
        </div>
      );
      continue;
    }

    // Short ALL CAPS line = standalone heading
    if (trimmed.length < 60 && trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
      elements.push(
        <h4 key={keyIdx++} className="text-xs font-bold text-emerald-400 uppercase tracking-wide mt-3 mb-1">
          {toTitleCase(trimmed.replace(/:$/, ''))}
        </h4>
      );
      continue;
    }

    // Short line ending with ":" = heading
    if (trimmed.endsWith(':') && trimmed.length < 80) {
      elements.push(
        <h4 key={keyIdx++} className="text-xs font-bold text-emerald-400 uppercase tracking-wide mt-3 mb-1">
          {toTitleCase(trimmed.replace(/:$/, ''))}
        </h4>
      );
      continue;
    }

    // For longer continuous text, split into sections
    const sections = splitContinuousText(trimmed);
    for (const section of sections) {
      if (section.type === 'heading') {
        elements.push(
          <h4 key={keyIdx++} className="text-xs font-bold text-emerald-400 uppercase tracking-wide mt-3 mb-1">
            {toTitleCase(section.text)}
          </h4>
        );
      } else {
        elements.push(
          <p key={keyIdx++} className="text-xs text-stone-300 leading-relaxed mb-2">
            {renderInlineKeywords(section.text, keyIdx)}
          </p>
        );
      }
    }
  }

  return elements;
}

/**
 * Render a rules text block as formatted content.
 * Drop-in replacement for `<p className="whitespace-pre-line">{text}</p>`
 */
export function FormattedRuleText({ text, className }: { text: string; className?: string }) {
  const elements = parseRuleText(text);
  if (elements.length === 0) return null;
  return <div className={className}>{elements}</div>;
}

/**
 * Color map for battle size badges
 */
export function getBattleSizeColor(size: string): string {
  switch (size) {
    case 'Combat Patrol':
      return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
    case 'Incursion':
      return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400';
    case 'Strike Force':
      return 'bg-amber-500/20 border-amber-500/30 text-amber-400';
    case 'Onslaught':
      return 'bg-red-500/20 border-red-500/30 text-red-400';
    default:
      return 'bg-stone-700 text-stone-300';
  }
}

/**
 * Color map for stratagem type badges
 */
export function getStratagemTypeColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('battle tactic')) return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400';
  if (t.includes('strategic ploy')) return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
  if (t.includes('epic deed')) return 'bg-amber-500/20 border-amber-500/30 text-amber-400';
  if (t.includes('wargear')) return 'bg-orange-500/20 border-orange-500/30 text-orange-400';
  return 'bg-purple-500/20 border-purple-500/30 text-purple-400';
}

/**
 * Display-friendly result label with consistent formatting
 */
export function getResultLabel(result: 'victory' | 'defeat' | 'draw'): string {
  const map: Record<string, string> = {
    victory: 'Victory',
    defeat: 'Defeat',
    draw: 'Draw',
  };
  return map[result] || result;
}

/**
 * Format a W-L-D record string
 */
export function formatRecord(wins: number, losses: number, draws: number): string {
  return `${wins}W - ${losses}L - ${draws}D`;
}
