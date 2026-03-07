import { useParams, useNavigate } from "react-router";
import { ArrowLeft, BookOpen, Shield, Award } from "lucide-react";
import { CORE_RULES, CRUSADE_RULES } from '../../data/general';
import { getRulesForFaction } from '../../data';
import { useCrusade } from '../../lib/CrusadeContext';
import { getFactionName } from '../../lib/factions';
import { FormattedRuleText, toTitleCase, getStratagemTypeColor } from '../../lib/formatText';
import type { RulesSection } from '../../types';

// Parse a rule ID like "core-5" or "crusade-2" or "faction-det-1" etc.
function lookupRule(
  ruleId: string,
  factionId?: string
): { title: string; source: string; sourceType: string; section: RulesSection | null; factionData?: any } | null {
  // Core rules: "core-{index}"
  if (ruleId.startsWith('core-') && CORE_RULES) {
    const idx = parseInt(ruleId.replace('core-', ''), 10);
    const section = CORE_RULES.sections[idx];
    if (section) {
      return { title: section.name, source: 'Core Rules', sourceType: 'core', section };
    }
  }

  // Crusade rules: "crusade-{index}"
  if (ruleId.startsWith('crusade-') && CRUSADE_RULES) {
    const idx = parseInt(ruleId.replace('crusade-', ''), 10);
    const section = CRUSADE_RULES.sections[idx];
    if (section) {
      return { title: section.name, source: 'Crusade Rules', sourceType: 'crusade', section };
    }
  }

  // Faction rules
  if (ruleId.startsWith('faction-') && factionId) {
    const factionRules = getRulesForFaction(factionId as any);
    if (!factionRules) return null;
    const factionName = getFactionName(factionId as any);

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

// Clean rules text: remove [TABLE:...] blocks & [Section] refs, split into paragraphs/bullets
function cleanRuleText(text: string): { paragraphs: string[]; bullets: string[] } {
  if (!text) return { paragraphs: [], bullets: [] };

  // Remove [TABLE: ...] blocks (nested brackets)
  let cleaned = text.replace(/\[TABLE:\s*\[[\s\S]*?\]\]\s*/g, '');
  // Remove section references like [Unit Coherency]
  cleaned = cleaned.replace(/\[([A-Za-z][A-Za-z\s&,]+)\]\s*/g, '');
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

export default function RuleDetail() {
  const { ruleId } = useParams();
  const navigate = useNavigate();
  const { currentPlayer } = useCrusade();

  const rule = ruleId ? lookupRule(ruleId, currentPlayer?.faction_id) : null;

  if (!rule) {
    return (
      <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>

          <div className="text-center">
            <BookOpen className="w-16 h-16 text-stone-600 mx-auto mb-4" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-stone-400 mb-2">
              Rule Not Found
            </h1>
            <p className="text-stone-600 text-sm">
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
  const renderSection = (section: RulesSection) => {
    const parsed = cleanRuleText(section.text);
    return (
      <div className="space-y-6">
        {/* Main text content */}
        {parsed.paragraphs.length > 0 && (
          <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <div className="relative space-y-2">
              {parsed.paragraphs.map((p, idx) => (
                <p key={idx} className="text-stone-300 leading-relaxed">{p}</p>
              ))}
            </div>
          </div>
        )}

        {/* Bullet points */}
        {parsed.bullets.length > 0 && (
          <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <ul className="relative space-y-2">
              {parsed.bullets.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-stone-300">
                  <span className="text-emerald-500 mt-1.5">•</span>
                  <span className="flex-1 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Subsections */}
        {section.subsections.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-stone-200 tracking-wide">
              Subsections
            </h2>
            <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <ul className="relative space-y-2">
                {section.subsections.map((sub, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-stone-300">
                    <span className="text-emerald-500 mt-1.5">•</span>
                    <span className="flex-1 leading-relaxed">{sub}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
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
              className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-4"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
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
            <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
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
                {det.enhancements.map((enh: any, idx: number) => (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-sm font-bold text-emerald-400">{enh.name}</h3>
                      <span className="text-xs font-bold text-emerald-500 font-mono">{enh.cost} pts</span>
                    </div>
                    <FormattedRuleText text={enh.text} className="text-sm" />
                  </div>
                ))}
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
                {det.stratagems.map((strat: any, idx: number) => (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-stone-950 p-4"
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
          {rule.factionData.rules.map((cr: any, idx: number) => (
            <div
              key={idx}
              className="relative overflow-hidden rounded-lg border border-amber-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-4"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
              <div className="relative">
                {cr.name && (
                  <h3 className="text-base font-bold text-amber-400 mb-2">{cr.name}</h3>
                )}
                <FormattedRuleText text={cr.text} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden pb-8">
      {/* Dark ambient glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-600/5 rounded-full blur-[100px] pointer-events-none" />

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
