import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, BookOpen, Shield, Award, ChevronDown, ChevronRight } from "lucide-react";
import { CORE_RULES, CRUSADE_RULES } from '../../data/general';
import { getRulesForFaction } from '../../data';
import { getFaction, getFactionName, getDataFactionId } from '../../lib/factions';
import { FormattedRuleText, getStratagemTypeColor, getEnhancementCardColors } from '../../lib/formatText';
import type { RulesSection, DetachmentEnhancement, DetachmentStratagem, DetachmentData, CrusadeRule, FactionId } from '../../types';

type FactionData =
  | { type: 'army_rules'; rules: string[] }
  | { type: 'detachment'; detachment: DetachmentData }
  | { type: 'crusade_rules'; rules: CrusadeRule[] | undefined };

function lookupRule(
  ruleId: string,
  factionId?: string
): { title: string; source: string; sourceType: string; section: RulesSection | null; factionData?: FactionData } | null {
  if (ruleId.startsWith('core-') && CORE_RULES) {
    const idx = parseInt(ruleId.replace('core-', ''), 10);
    if (isNaN(idx)) return null;
    const section = CORE_RULES.sections[idx];
    if (section) return { title: section.name, source: 'Core Rules', sourceType: 'core', section };
  }
  if (ruleId.startsWith('crusade-') && CRUSADE_RULES) {
    const idx = parseInt(ruleId.replace('crusade-', ''), 10);
    if (isNaN(idx)) return null;
    const section = CRUSADE_RULES.sections[idx];
    if (section) return { title: section.name, source: 'Crusade Rules', sourceType: 'crusade', section };
  }
  if (ruleId.startsWith('faction-') && factionId) {
    const factionRules = getRulesForFaction(getDataFactionId(factionId as FactionId));
    if (!factionRules) return null;
    const factionName = getFactionName(factionId as FactionId);
    if (ruleId === 'faction-army-rules') return { title: 'Army Rules', source: factionName, sourceType: 'faction', section: null, factionData: { type: 'army_rules', rules: factionRules.army_rules } };
    if (ruleId.startsWith('faction-det-')) {
      const idx = parseInt(ruleId.replace('faction-det-', ''), 10);
      if (isNaN(idx)) return null;
      const det = factionRules.detachments[idx];
      if (det) return { title: det.name, source: factionName, sourceType: 'faction', section: null, factionData: { type: 'detachment', detachment: det } };
    }
    if (ruleId === 'faction-crusade') return { title: 'Faction Crusade Rules', source: factionName, sourceType: 'faction', section: null, factionData: { type: 'crusade_rules', rules: factionRules.crusade_rules } };
  }
  return null;
}

function parseTextWithSectionHeaders(text: string): { header?: string; text: string }[] {
  if (!text) return [];
  const parts = text.split(/\[([A-Za-z0-9][A-Za-z0-9\s&,.'()\-\u2013]+)\]/);
  const result: { header?: string; text: string }[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;
    if (i % 2 === 1) {
      const nextText = (i + 1 < parts.length) ? parts[i + 1].trim() : '';
      if (nextText) { result.push({ header: part, text: nextText }); i++; }
      else result.push({ header: part, text: '' });
    } else result.push({ text: part });
  }
  return result;
}

export default function RuleDetail() {
  const { ruleId } = useParams();
  const navigate = useNavigate();
  const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(new Set());

  const rule = ruleId ? lookupRule(ruleId) : null;

  useEffect(() => { setExpandedSubsections(new Set()); }, [ruleId]);

  const toggleSubsection = (key: string) => {
    setExpandedSubsections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (!rule) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col p-6 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-6">
            <ArrowLeft className="w-5 h-5" /><span className="text-sm">Back</span>
          </button>
          <div className="text-center">
            <BookOpen className="w-16 h-16 text-[var(--text-secondary)] mx-auto mb-4" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-[var(--text-secondary)] mb-2">Rule Not Found</h1>
            <p className="text-[var(--text-secondary)] text-sm">The requested rule could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  const getSourceIcon = () => {
    switch (rule.sourceType) {
      case "core": return <BookOpen className="w-4 h-4" />;
      case "crusade": return <Award className="w-4 h-4" />;
      case "faction": return <Shield className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getSourceColor = () => {
    switch (rule.sourceType) {
      case "core": return "bg-[var(--accent-gold)]/10 border-[var(--accent-gold)]/30 text-[var(--accent-gold)]";
      case "crusade": return "bg-amber-500/10 border-amber-500/30 text-amber-500";
      case "faction": return "bg-blue-500/10 border-blue-500/30 text-blue-500";
      default: return "bg-[var(--accent-gold)]/10 border-[var(--accent-gold)]/30 text-[var(--accent-gold)]";
    }
  };

  const renderSection = (section: RulesSection) => {
    const items = section.accordion && section.accordion.length > 0
      ? section.accordion
      : section.subsections.length > 0
        ? section.subsections.map(sub => ({ title: sub, text: extractSubsectionText(section.text, sub) || '' }))
        : [{ title: section.name, text: (section.text || '').replace(/\[TABLE:\s*\[[\s\S]*?\]\]\s*/g, '').replace(/\[[A-Za-z][^\]]*\]/g, '').trim() }];
    const validItems = items.filter(item => item.text && item.text.trim().length > 0);
    if (validItems.length === 0) return <div className="text-center py-8 text-[var(--text-secondary)]">No content available for this section.</div>;

    return (
      <div className="relative overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
        {validItems.map((item, idx) => {
          const key = `acc-${idx}`;
          const isExpanded = expandedSubsections.has(key);
          return (
            <div key={idx} className={idx !== validItems.length - 1 ? "border-b border-[var(--border-color)]/60" : ""}>
              <button onClick={() => toggleSubsection(key)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--accent-gold)]/5 transition-all">
                <span className="text-sm text-[var(--accent-gold)] font-medium text-left">{item.title}</span>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--accent-gold)] flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />}
              </button>
              {isExpanded && (
                <div className="px-4 pb-3 border-t border-[var(--border-color)]/30">
                  <div className="pt-3"><FormattedRuleText text={item.text} className="text-sm" /></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderFactionData = () => {
    if (!rule.factionData) return null;
    if (rule.factionData.type === 'army_rules') {
      return (
        <div className="space-y-4">
          {rule.factionData.rules.map((ruleText: string, idx: number) => (
            <div key={idx} className="relative overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <FormattedRuleText text={ruleText} />
            </div>
          ))}
        </div>
      );
    }
    if (rule.factionData.type === 'detachment') {
      const det = rule.factionData.detachment;
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-wide mb-3">{det.rule.name}</h2>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><FormattedRuleText text={det.rule.text} /></div>
          </div>
          {det.enhancements.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-wide mb-3">Enhancements</h2>
              <div className="space-y-3">
                {det.enhancements.map((enh: DetachmentEnhancement, idx: number) => {
                  const enhColors = getEnhancementCardColors('emerald');
                  return (
                    <div key={idx} className={`rounded-lg border ${enhColors.card} p-4`}>
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
          {det.stratagems.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-wide mb-3">Stratagems</h2>
              <div className="space-y-3">
                {det.stratagems.map((strat: DetachmentStratagem, idx: number) => (
                  <div key={idx} className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-sm font-bold text-purple-400">{strat.name}</h3>
                      <span className="text-xs font-bold text-purple-500 font-mono">{strat.cp} CP</span>
                    </div>
                    <div className="mb-2"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStratagemTypeColor(strat.type)}`}>{strat.type}</span></div>
                    {strat.when && <p className="text-[var(--text-tertiary)] text-sm leading-relaxed mb-1"><span className="font-semibold">When: </span>{strat.when}</p>}
                    {strat.target && <p className="text-[var(--text-tertiary)] text-sm leading-relaxed mb-1"><span className="font-semibold">Target: </span>{strat.target}</p>}
                    {strat.effect && <p className="text-[var(--text-tertiary)] text-sm leading-relaxed"><span className="font-semibold">Effect: </span>{strat.effect}</p>}
                    {strat.restrictions && <div><span className="text-red-500 font-semibold text-xs">Restrictions: </span><span className="text-xs text-[var(--text-secondary)]">{strat.restrictions}</span></div>}
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
            <div key={idx} className="rounded-lg border border-amber-500/20 bg-[var(--bg-card)] p-4">
              {cr.name && <h3 className="text-base font-bold text-[var(--accent-gold)] mb-2">{cr.name}</h3>}
              {cr.sub_sections && cr.sub_sections.length > 0 ? (
                <div className="space-y-4">
                  {cr.text && <div className="mb-3"><FormattedRuleText text={cr.text} /></div>}
                  {cr.sub_sections.map((sub: { name: string; text: string }, subIdx: number) => (
                    <div key={subIdx}>
                      {subIdx > 0 && <div className="border-t border-amber-500/10 my-3" />}
                      <h3 className="text-sm font-bold text-[var(--accent-gold)] mb-2 tracking-wide">{sub.name}</h3>
                      <FormattedRuleText text={sub.text} />
                    </div>
                  ))}
                </div>
              ) : renderCrusadeText(cr.text)}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderCrusadeText = (text: string) => {
    if (!text) return null;
    const hasSectionHeaders = /\[([A-Z][A-Za-z\s&,'-]+)\]/.test(text);
    if (!hasSectionHeaders) return <FormattedRuleText text={text} />;
    const sections = parseTextWithSectionHeaders(text);
    return (
      <div className="space-y-3">
        {sections.map((section, idx) => (
          <div key={idx}>
            {idx > 0 && section.header && <div className="border-t border-amber-500/10 my-3" />}
            {section.header && <h3 className="text-sm font-bold text-[var(--accent-gold)] mb-2 tracking-wide">{section.header}</h3>}
            {section.text && <FormattedRuleText text={section.text} />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col p-6 relative overflow-hidden pb-24">
      <div className="relative z-10 w-full max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" /><span className="text-sm">Back to Rules</span>
        </button>

        <div className="mb-6">
          <div className="mb-3">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${getSourceColor()} text-xs font-semibold uppercase tracking-wider`}>
              {getSourceIcon()}{rule.source}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-wider mb-4">{rule.title}</h1>
        </div>

        <div className="space-y-6">
          {rule.section && renderSection(rule.section)}
          {rule.factionData && renderFactionData()}
        </div>
      </div>
    </div>
  );
}

function extractSubsectionText(fullText: string, subsectionName: string): string | null {
  if (!fullText || !subsectionName) return null;
  const markerPattern = new RegExp(`\\[${escapeRegex(subsectionName)}\\]`, 'i');
  const match = fullText.match(markerPattern);
  if (!match || match.index === undefined) return null;
  const startIdx = match.index + match[0].length;
  const remaining = fullText.slice(startIdx);
  const nextMarker = remaining.match(/\[(?:TABLE:|[A-Z][A-Za-z\s&,]+\])/);
  const endIdx = nextMarker && nextMarker.index !== undefined ? nextMarker.index : remaining.length;
  let extracted = remaining.slice(0, endIdx).trim();
  extracted = extracted.replace(/\[|\]/g, '');
  extracted = extracted.replace(/\s{2,}/g, ' ').trim();
  return extracted || null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
