import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Search, BookOpen, ChevronDown, ChevronRight, Shield } from "lucide-react";
import { CORE_RULES, CRUSADE_RULES } from '../../data/general';
import { getRulesForFaction } from '../../data';
import { getFactionName, getDataFactionId } from '../../lib/factions';
import type { RulesSection, FactionId } from '../../types';

function stripSectionNumber(name: string): string {
  return name.replace(/^\d+\.\s+/, '');
}

function buildRuleItems(sections: RulesSection[], category: string) {
  return sections.map((section, idx) => ({
    id: `${category}-${idx}`,
    title: stripSectionNumber(section.name),
    subtitle: section.subsections.length > 0 ? `${section.subsections.length} subsections` : undefined,
    category,
    originalName: section.name,
  }));
}

interface RuleItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  originalName: string;
}

const CORE_RULE_GROUPS: { label: string; sectionNames: string[] }[] = [
  { label: "Getting Started", sectionNames: ["Introduction", "Books"] },
  { label: "Army Building", sectionNames: ["Armies", "Muster Your Army"] },
  { label: "Battlefield Setup", sectionNames: ["Battlefield", "Measuring Distances", "Determining Visibility", "Objective Markers", "Mission Map Key", "Example Battlefields", "Missions"] },
  { label: "Game Phases", sectionNames: ["Sequencing", "1. Command", "2. Battle-shock", "1. Move Units", "2. Reinforcements", "Transports"] },
  { label: "Shooting Phase", sectionNames: ["1. Hit Roll", "2. Wound Roll", "3. Allocate Attack", "4. Saving Throw", "5. Inflict Damage"] },
  { label: "Fight Phase", sectionNames: ["1. Fights First", "2. Remaining Combats", "1. Pile In", "2. Make Melee Attacks", "3. Consolidate"] },
  { label: "Terrain", sectionNames: ["Craters and Rubble", "Barricades and Fuel Pipes", "Battlefield Debris and Statuary", "Hills, Industrial Structures, Sealed Buildings and Armoured Containers", "Woods", "Ruins"] },
  { label: "Dice & Sequencing", sectionNames: ["Dice"] },
];

function groupCoreRules(items: RuleItem[]): { label: string; items: RuleItem[] }[] {
  const assigned = new Set<string>();
  const groups: { label: string; items: RuleItem[] }[] = [];
  for (const group of CORE_RULE_GROUPS) {
    const matching = items.filter(item => group.sectionNames.includes(item.originalName));
    if (matching.length > 0) {
      groups.push({ label: group.label, items: matching });
      matching.forEach(m => assigned.add(m.id));
    }
  }
  const remaining = items.filter(item => !assigned.has(item.id));
  if (remaining.length > 0) groups.push({ label: "Other", items: remaining });
  return groups;
}

export default function RulesBrowser() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    try { const saved = sessionStorage.getItem('rules_expanded_sections'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  useEffect(() => {
    try { sessionStorage.setItem('rules_expanded_sections', JSON.stringify(expandedSections)); } catch { /* ignore */ }
  }, [expandedSections]);

  const coreRuleItems = useMemo(() => CORE_RULES ? buildRuleItems(CORE_RULES.sections, "core") : [], []);
  const crusadeRuleItems = useMemo(() => CRUSADE_RULES ? buildRuleItems(CRUSADE_RULES.sections, "crusade") : [], []);

  const toggleSection = (section: string) => setExpandedSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]);

  const filterBySearch = useCallback((items: RuleItem[]) => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q));
  }, [searchQuery]);

  const filteredCoreRules = useMemo(() => filterBySearch(coreRuleItems), [filterBySearch, coreRuleItems]);
  const filteredCrusadeRules = useMemo(() => filterBySearch(crusadeRuleItems), [filterBySearch, crusadeRuleItems]);
  const coreRuleGroups = useMemo(() => groupCoreRules(filteredCoreRules), [filteredCoreRules]);

  const handleRuleClick = (ruleId: string) => navigate(`/rule/${ruleId}`);

  const renderRuleList = (rules: RuleItem[]) => (
    <>
      {rules.map((rule, idx) => (
        <button
          key={rule.id}
          onClick={() => handleRuleClick(rule.id)}
          className={`w-full p-3 pl-4 text-left hover:bg-[var(--accent-gold)]/5 transition-all ${idx !== rules.length - 1 ? "border-b border-[var(--border-color)]/60" : ""}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-[var(--text-primary)]">{rule.title}</span>
              {rule.subtitle && <span className="text-xs text-[var(--text-secondary)] ml-2">{rule.subtitle}</span>}
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
          </div>
        </button>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col p-6 relative overflow-hidden pb-24">
      <div className="relative z-10 w-full max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" /><span className="text-sm">Back</span>
        </button>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <BookOpen className="w-12 h-12 text-[var(--accent-gold)]/80" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2 tracking-wider">Rules Browser</h1>
          <p className="text-[var(--text-secondary)] text-sm">Quick reference for all game rules</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--accent-gold)]/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules..."
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg pl-11 pr-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-gold)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/20 transition-all"
            />
          </div>
        </div>

        <div className="space-y-4">
          {/* Core Rules */}
          <div className="relative overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
            <button onClick={() => toggleSection("core")} className="w-full p-4 flex items-center justify-between hover:bg-[var(--accent-gold)]/5 transition-all">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-[var(--accent-gold)]" strokeWidth={2} />
                <div className="text-left">
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Core Rules</h2>
                  <p className="text-xs text-[var(--text-secondary)]">{filteredCoreRules.length} sections</p>
                </div>
              </div>
              {expandedSections.includes("core") ? <ChevronDown className="w-5 h-5 text-[var(--accent-gold)]" /> : <ChevronRight className="w-5 h-5 text-[var(--accent-gold)]" />}
            </button>

            {expandedSections.includes("core") && (
              <div className="border-t border-[var(--accent-gold)]/10">
                {coreRuleGroups.map(group => (
                  <div key={group.label}>
                    <div className="px-4 py-2 bg-[var(--bg-primary)] border-b border-[var(--border-color)]/40">
                      <span className="text-[11px] font-bold text-[var(--accent-gold)]/80 uppercase tracking-widest">{group.label}</span>
                    </div>
                    {renderRuleList(group.items)}
                  </div>
                ))}
                {filteredCoreRules.length === 0 && <div className="p-4 text-center text-sm text-[var(--text-secondary)]">No rules found</div>}
              </div>
            )}
          </div>

          {/* Crusade Rules */}
          <div className="relative overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
            <button onClick={() => toggleSection("crusade")} className="w-full p-4 flex items-center justify-between hover:bg-[var(--accent-gold)]/5 transition-all">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-[var(--accent-gold)]" strokeWidth={2} />
                <div className="text-left">
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Crusade Rules</h2>
                  <p className="text-xs text-[var(--text-secondary)]">{filteredCrusadeRules.length} sections</p>
                </div>
              </div>
              {expandedSections.includes("crusade") ? <ChevronDown className="w-5 h-5 text-[var(--accent-gold)]" /> : <ChevronRight className="w-5 h-5 text-[var(--accent-gold)]" />}
            </button>

            {expandedSections.includes("crusade") && (
              <div className="border-t border-[var(--accent-gold)]/10">
                {filteredCrusadeRules.map((rule, idx) => (
                  <button
                    key={rule.id}
                    onClick={() => handleRuleClick(rule.id)}
                    className={`w-full p-3 text-left hover:bg-[var(--accent-gold)]/5 transition-all ${idx !== filteredCrusadeRules.length - 1 ? "border-b border-[var(--border-color)]/60" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[var(--text-primary)]">{rule.title}</span>
                      <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                    </div>
                  </button>
                ))}
                {filteredCrusadeRules.length === 0 && <div className="p-4 text-center text-sm text-[var(--text-secondary)]">No rules found</div>}
              </div>
            )}
          </div>
        </div>

        {filteredCoreRules.length === 0 && filteredCrusadeRules.length === 0 && searchQuery.trim() && (
          <div className="text-center py-12 mt-6">
            <BookOpen className="w-16 h-16 text-[var(--accent-gold)]/30 mx-auto mb-4" strokeWidth={1} />
            <p className="text-[var(--text-secondary)] text-sm">No rules found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
