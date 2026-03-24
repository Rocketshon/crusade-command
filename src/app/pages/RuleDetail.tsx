import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, BookOpen, Shield, Award, ChevronDown, ChevronRight } from "lucide-react";
import { CORE_RULES, CRUSADE_RULES } from '../../data/general';
import { getRulesForFaction } from '../../data';
import { useCrusade } from '../../lib/CrusadeContext';
import { getFaction, getFactionName, getDataFactionId } from '../../lib/factions';
import { FormattedRuleText, getStratagemTypeColor, getEnhancementCardColors } from '../../lib/formatText';
import type { RulesSection, DetachmentEnhancement, DetachmentStratagem, DetachmentData, CrusadeRule, FactionId } from '../../types';

type FactionData =
  | { type: 'army_rules'; rules: string[] }
  | { type: 'detachment'; detachment: DetachmentData }
  | { type: 'crusade_rules'; rules: CrusadeRule[] | undefined };

// Parse a rule ID like "core-5" or "crusade-2" or "faction-det-1" etc.
function lookupRule(
  ruleId: string,
  factionId?: string
): { title: string; source: string; sourceType: string; section: RulesSection | null; factionData?: FactionData } | null {
  // Core rules: "core-{index}"
  if (ruleId.startsWith('core-') && CORE_RULES) {
    const idx = parseInt(ruleId.replace('core-', ''), 10);
    if (isNaN(idx)) return null;
    const section = CORE_RULES.sections[idx];
    if (section) {
      return { title: section.name, source: 'Core Rules', sourceType: 'core', section };
    }
  }

  // Crusade rules: "crusade-{index}"
  if (ruleId.startsWith('crusade-') && CRUSADE_RULES) {
    const idx = parseInt(ruleId.replace('crusade-', ''), 10);
    if (isNaN(idx)) return null;
    const section = CRUSADE_RULES.sections[idx];
    if (section) {
      return { title: section.name, source: 'Crusade Rules', sourceType: 'crusade', section };
    }
  }

  // Faction rules
  if (ruleId.startsWith('faction-') && factionId) {
    const factionRules = getRulesForFaction(getDataFactionId(factionId as FactionId));
    if (!factionRules) return null;
    const factionName = getFactionName(factionId as FactionId);

    if (ruleId === 'faction-army-rules') {
      return {
        title: 'Army Rules',
        source: factionName,
        sourceType: 'faction',
        section: null,
        factionData: { type: 'army_rules', rules: factionRules.army_rules },
      };
    }

    if (ruleId.startsWith('faction-det-')) {
      const idx = parseInt(ruleId.replace('faction-det-', ''), 10);
      if (isNaN(idx)) return null;
      const det = factionRules.detachments[idx];
      if (det) {
        return {
          title: det.name,
          source: factionName,
          sourceType: 'faction',
          section: null,
          factionData: { type: 'detachment', detachment: det },
        };
      }
    }

    if (ruleId === 'faction-crusade') {
      return {
        title: 'Faction Crusade Rules',
        source: factionName,
        sourceType: 'faction',
        section: null,
        factionData: { type: 'crusade_rules', rules: factionRules.crusade_rules },
      };
    }
  }

  return null;
}

// Clean rules text: remove [TABLE:...] blocks, remove stray brackets, split into paragraphs/bullets
function cleanRuleText(text: string): { paragraphs: string[]; bullets: string[] } {
  if (!text) return { paragraphs: [], bullets: [] };

  // Remove [TABLE: ...] blocks (nested brackets)
  let cleaned = text.replace(/\[TABLE:\s*\[[\s\S]*?\]\]\s*/g, '');
  // Remove section references like [Unit Coherency] but preserve text
  cleaned = cleaned.replace(/\[([A-Za-z][A-Za-z\s&,]+)\]\s*/g, '');
  // Remove any remaining stray brackets
  cleaned = cleaned.replace(/\[|\]/g, '');
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  const paragraphs: string[] = [];
  const bullets: string[] = [];

  // Split on " - " at the beginning of lines for bullet points
  const lines = cleaned.split(/\n|(?= - )/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('- ')) {
      bullets.push(trimmed.slice(2));
    } else {
      paragraphs.push(trimmed);
    }
  }

  return { paragraphs, bullets };
}

/**
 * Parse text that contains [Section Name] patterns into sections with headers.
 * Returns an array of { header?: string; text: string } blocks.
 */
function parseTextWithSectionHeaders(text: string): { header?: string; text: string }[] {
  if (!text) return [];

  // Split on [SectionName] patterns, keeping the section name
  // Matches headers like [Hit Roll Mechanics], [1. Select Battle Size], [CORE CONCEPTS], [Hints and TipsWobbly Models]
  const parts = text.split(/\[([A-Za-z0-9][A-Za-z0-9\s&,.'()\-–]+)\]/);
  const result: { header?: string; text: string }[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    // Odd indices are captured group (section names)
    if (i % 2 === 1) {
      // This is a section header; the next part (if any) is its text
      const nextText = (i + 1 < parts.length) ? parts[i + 1].trim() : '';
      if (nextText) {
        result.push({ header: part, text: nextText });
        i++; // skip next since we consumed it
      } else {
        result.push({ header: part, text: '' });
      }
    } else {
      // Leading text before any section header
      result.push({ text: part });
    }
  }

  return result;
}

export default function RuleDetail() {
  const { ruleId } = useParams();
  const navigate = useNavigate();
  const { currentPlayer } = useCrusade();
  const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(new Set());

  const rule = ruleId ? lookupRule(ruleId, currentPlayer?.faction_id) : null;

  useEffect(() => {
    setExpandedSubsections(new Set());
  }, [ruleId]);

  const toggleSubsection = (key: string) => {
    setExpandedSubsections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (!rule) {
    return (
      <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>

          <div className="text-center">
            <BookOpen className="w-16 h-16 text-stone-500 mx-auto mb-4" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-stone-400 mb-2">
              Rule Not Found
            </h1>
            <p className="text-stone-500 text-sm">
              The requested rule could not be found.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getSourceIcon = () => {
    switch (rule.sourceType) {
      case "core":
        return <BookOpen className="w-4 h-4" />;
      case "crusade":
        return <Award className="w-4 h-4" />;
      case "faction":
        return <Shield className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getSourceColor = () => {
    switch (rule.sourceType) {
      case "core":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "crusade":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      case "faction":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      default:
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    }
  };

  // Render a general rules section (core or crusade)
  // ALL content rendered as clickable accordion dropdowns — no walls of text
  const renderSection = (section: RulesSection) => {
    // Use pre-split accordion data if available
    const items = section.accordion && section.accordion.length > 0
      ? section.accordion
      : section.subsections.length > 0
        ? section.subsections.map(sub => ({
            title: sub,
            text: extractSubsectionText(section.text, sub) || ''
          }))
        : [{ title: section.name, text: (section.text || '').replace(/\[TABLE:\s*\[[\s\S]*?\]\]\s*/g, '').replace(/\[[A-Za-z][^\]]*\]/g, '').trim() }];

    // Filter out empty items
    const validItems = items.filter(item => item.text && item.text.trim().length > 0);

    if (validItems.length === 0) {
      return (
        <div className="text-center py-8 text-stone-500">
          No content available for this section.
        </div>
      );
    }

    return (
      <div className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900">
        {validItems.map((item, idx) => {
          const key = `acc-${idx}`;
          const isExpanded = expandedSubsections.has(key);

          return (
            <div key={idx} className={idx !== validItems.length - 1 ? "border-b border-stone-800/60" : ""}>
              <button
                onClick={() => toggleSubsection(key)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-emerald-500/5 transition-all"
              >
                <span className="text-sm text-emerald-400 font-medium text-left">{item.title}</span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-stone-500 flex-shrink-0" />
                )}
              </button>
              {isExpanded && (
                <div className="px-4 pb-3 border-t border-stone-800/30">
                  <div className="pt-3">
                    <FormattedRuleText text={item.text} className="text-sm" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render faction-specific rule data
  const renderFactionData = () => {
    if (!rule.factionData) return null;

    if (rule.factionData.type === 'army_rules') {
      return (
        <div className="space-y-4">
          {rule.factionData.rules.map((ruleText: string, idx: number) => (
            <div
              key={idx}
              className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 p-4"
            >
              <div className="relative">
                <FormattedRuleText text={ruleText} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (rule.factionData.type === 'detachment') {
      const det = rule.factionData.detachment;
      return (
        <div className="space-y-6">
          {/* Detachment Rule */}
          <div>
            <h2 className="text-xl font-bold text-stone-200 tracking-wide mb-3">
              {det.rule.name}
            </h2>
            <div className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 p-4">
              <div className="relative">
                <FormattedRuleText text={det.rule.text} />
              </div>
            </div>
          </div>

          {/* Enhancements */}
          {det.enhancements.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-stone-200 tracking-wide mb-3">
                Enhancements
              </h2>
              <div className="space-y-3">
                {det.enhancements.map((enh: DetachmentEnhancement, idx: number) => {
                  const factionMeta = currentPlayer?.faction_id ? getFaction(currentPlayer.faction_id as FactionId) : undefined;
                  const enhColors = getEnhancementCardColors(factionMeta?.color ?? 'emerald');
                  return (
                  <div
                    key={idx}
                    className={`relative overflow-hidden rounded-sm border ${enhColors.card} p-4`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className={`text-sm font-bold ${enhColors.nameText}`}>{enh.name}</h3>
                      <span className={`text-xs font-bold ${enhColors.costText} font-mono`}>{enh.cost} pts</span>
                    </div>
                    <FormattedRuleText text={enh.text} className="text-sm" />
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stratagems */}
          {det.stratagems.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-stone-200 tracking-wide mb-3">
                Stratagems
              </h2>
              <div className="space-y-3">
                {det.stratagems.map((strat: DetachmentStratagem, idx: number) => (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-sm border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-stone-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-sm font-bold text-purple-400">{strat.name}</h3>
                      <span className="text-xs font-bold text-purple-500 font-mono">{strat.cp} CP</span>
                    </div>
                    <div className="mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStratagemTypeColor(strat.type)}`}>{strat.type}</span>
                    </div>
                    {strat.when && (
                      <p className="text-stone-300 text-sm leading-relaxed mb-1">
                        <span className="font-semibold">When: </span>{strat.when}
                      </p>
                    )}
                    {strat.target && (
                      <p className="text-stone-300 text-sm leading-relaxed mb-1">
                        <span className="font-semibold">Target: </span>{strat.target}
                      </p>
                    )}
                    {strat.effect && (
                      <p className="text-stone-300 text-sm leading-relaxed">
                        <span className="font-semibold">Effect: </span>{strat.effect}
                      </p>
                    )}
                    {strat.restrictions && (
                      <div>
                        <span className="text-red-400 font-semibold text-xs">Restrictions: </span>
                        <span className="text-xs text-stone-400">{strat.restrictions}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (rule.factionData.type === 'crusade_rules') {
      return (
        <div className="space-y-4">
          {rule.factionData.rules?.map((cr: CrusadeRule, idx: number) => (
            <div
              key={idx}
              className="relative overflow-hidden rounded-sm border border-amber-500/20 bg-stone-900 p-4"
            >
              <div className="relative">
                {cr.name && (
                  <h3 className="text-base font-bold text-amber-400 mb-2">{cr.name}</h3>
                )}
                {/* Render sub_sections if present */}
                {cr.sub_sections && cr.sub_sections.length > 0 ? (
                  <div className="space-y-4">
                    {/* Main text if any */}
                    {cr.text && (
                      <div className="mb-3">
                        <FormattedRuleText text={cr.text} />
                      </div>
                    )}
                    {/* Sub-sections with headers */}
                    {cr.sub_sections.map((sub: { name: string; text: string }, subIdx: number) => (
                      <div key={subIdx}>
                        {subIdx > 0 && (
                          <div className="border-t border-amber-500/10 my-3" />
                        )}
                        <h3 className="text-sm font-bold text-emerald-400 mb-2 tracking-wide">
                          {sub.name}
                        </h3>
                        <FormattedRuleText text={sub.text} />
                      </div>
                    ))}
                  </div>
                ) : (
                  /* No sub_sections: check for [Section Name] patterns in text */
                  renderCrusadeText(cr.text)
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  /** Render crusade rule text, parsing [Section Name] patterns as headers */
  const renderCrusadeText = (text: string) => {
    if (!text) return null;

    // Check if text contains [SectionName] patterns
    const hasSectionHeaders = /\[([A-Z][A-Za-z\s&,'-]+)\]/.test(text);

    if (!hasSectionHeaders) {
      return <FormattedRuleText text={text} />;
    }

    const sections = parseTextWithSectionHeaders(text);
    return (
      <div className="space-y-3">
        {sections.map((section, idx) => (
          <div key={idx}>
            {idx > 0 && section.header && (
              <div className="border-t border-amber-500/10 my-3" />
            )}
            {section.header && (
              <h3 className="text-sm font-bold text-emerald-400 mb-2 tracking-wide">
                {section.header}
              </h3>
            )}
            {section.text && <FormattedRuleText text={section.text} />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden pb-24">
      <div className="relative z-10 w-full max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back to Rules</span>
        </button>

        {/* Rule Header */}
        <div className="mb-6">
          <div className="mb-3">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${getSourceColor()} text-xs font-semibold uppercase tracking-wider`}>
              {getSourceIcon()}
              {rule.source}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] mb-4">
            {rule.title}
          </h1>
        </div>

        {/* Rule Content */}
        <div className="space-y-6">
          {rule.section && renderSection(rule.section)}
          {rule.factionData && renderFactionData()}
        </div>
      </div>
    </div>
  );
}

/**
 * Extract the text content for a named subsection from the parent section's full text.
 * Looks for [SubsectionName] markers and returns the text that follows until the next marker.
 */
function extractSubsectionText(fullText: string, subsectionName: string): string | null {
  if (!fullText || !subsectionName) return null;

  // Find the [SubsectionName] marker
  const markerPattern = new RegExp(`\\[${escapeRegex(subsectionName)}\\]`, 'i');
  const match = fullText.match(markerPattern);
  if (!match || match.index === undefined) return null;

  const startIdx = match.index + match[0].length;

  // Find the next [SectionName] marker or TABLE marker or end of text
  const remaining = fullText.slice(startIdx);
  const nextMarker = remaining.match(/\[(?:TABLE:|[A-Z][A-Za-z\s&,]+\])/);
  const endIdx = nextMarker && nextMarker.index !== undefined ? nextMarker.index : remaining.length;

  let extracted = remaining.slice(0, endIdx).trim();
  // Clean up stray brackets
  extracted = extracted.replace(/\[|\]/g, '');
  // Clean up multiple spaces
  extracted = extracted.replace(/\s{2,}/g, ' ').trim();

  return extracted || null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
