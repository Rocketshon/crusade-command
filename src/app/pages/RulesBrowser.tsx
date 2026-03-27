import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Search, BookOpen, ChevronDown, ChevronRight, Shield } from "lucide-react";
import { CORE_RULES, CRUSADE_RULES } from '../../data/general';
import { getRulesForFaction } from '../../data';
import { getFactionName, getDataFactionId } from '../../lib/factions';
import type { RulesSection, FactionId } from '../../types';

/** Strip leading "N. " numbering from section names (e.g. "1. Command" -> "Command") */
function stripSectionNumber(name: string): string {
  return name.replace(/^\d+\.\s+/, '');
}

// Build rule items from a rules document's sections
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

/** Category groupings for core rules, keyed by group label.
 *  Values are the original section names (before stripping numbers). */
const CORE_RULE_GROUPS: { label: string; sectionNames: string[] }[] = [
  {
    label: "Getting Started",
    sectionNames: ["Introduction", "Books"],
  },
  {
    label: "Army Building",
    sectionNames: ["Armies", "Muster Your Army"],
  },
  {
    label: "Battlefield Setup",
    sectionNames: [
      "Battlefield",
      "Measuring Distances",
      "Determining Visibility",
      "Objective Markers",
      "Mission Map Key",
      "Example Battlefields",
      "Missions",
    ],
  },
  {
    label: "Game Phases",
    sectionNames: [
      "Sequencing",
      "1. Command",
      "2. Battle-shock",
      "1. Move Units",
      "2. Reinforcements",
      "Transports",
    ],
  },
  {
    label: "Shooting Phase",
    sectionNames: [
      "1. Hit Roll",
      "2. Wound Roll",
      "3. Allocate Attack",
      "4. Saving Throw",
      "5. Inflict Damage",
    ],
  },
  {
    label: "Fight Phase",
    sectionNames: [
      "1. Fights First",
      "2. Remaining Combats",
      "1. Pile In",
      "2. Make Melee Attacks",
      "3. Consolidate",
    ],
  },
  {
    label: "Terrain",
    sectionNames: [
      "Craters and Rubble",
      "Barricades and Fuel Pipes",
      "Battlefield Debris and Statuary",
      "Hills, Industrial Structures, Sealed Buildings and Armoured Containers",
      "Woods",
      "Ruins",
    ],
  },
  {
    label: "Dice & Sequencing",
    sectionNames: ["Dice"],
  },
];

/** Group rule items into categories. Items not in any group go into "Other". */
function groupCoreRules(items: RuleItem[]): { label: string; items: RuleItem[] }[] {
  const assigned = new Set<string>();
  const groups: { label: string; items: RuleItem[] }[] = [];

  for (const group of CORE_RULE_GROUPS) {
    const matching = items.filter((item) =>
      group.sectionNames.includes(item.originalName)
    );
    if (matching.length > 0) {
      groups.push({ label: group.label, items: matching });
      matching.forEach((m) => assigned.add(m.id));
    }
  }

  // Any items not assigned to a group
  const remaining = items.filter((item) => !assigned.has(item.id));
  if (remaining.length > 0) {
    groups.push({ label: "Other", items: remaining });
  }

  return groups;
}

export default function RulesBrowser() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('rules_expanded_sections');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist expanded sections to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('rules_expanded_sections', JSON.stringify(expandedSections));
    } catch { /* ignore */ }
  }, [expandedSections]);

  // Build rules from real data
  const coreRuleItems = useMemo(() => CORE_RULES ? buildRuleItems(CORE_RULES.sections, "core") : [], []);
  const crusadeRuleItems = useMemo(() => CRUSADE_RULES ? buildRuleItems(CRUSADE_RULES.sections, "crusade") : [], []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  // Filter rules based on search
  const filterBySearch = useCallback((items: RuleItem[]) => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle?.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredCoreRules = useMemo(() => filterBySearch(coreRuleItems), [filterBySearch, coreRuleItems]);
  const filteredCrusadeRules = useMemo(() => filterBySearch(crusadeRuleItems), [filterBySearch, crusadeRuleItems]);

  // Group core rules into categories
  const coreRuleGroups = useMemo(() => groupCoreRules(filteredCoreRules), [filteredCoreRules]);

  const handleRuleClick = (ruleId: string) => {
    navigate(`/rule/${ruleId}`);
  };

  /** Render a list of rule items as clickable rows */
  const renderRuleList = (rules: RuleItem[]) => (
    <>
      {rules.map((rule, idx) => (
        <button
          key={rule.id}
          onClick={() => handleRuleClick(rule.id)}
          className={`w-full p-3 pl-4 text-left hover:bg-[#b8860b]/5 transition-all ${
            idx !== rules.length - 1 ? "border-b border-[#d4c5a9]/60" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-[#2c2416]">{rule.title}</span>
              {rule.subtitle && (
                <span className="text-xs text-[#8b7355] ml-2">{rule.subtitle}</span>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-[#8b7355] flex-shrink-0" />
          </div>
        </button>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-[#faf6f0] flex flex-col p-6 relative overflow-hidden pb-24">
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#8b7355] hover:text-[#b8860b] transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="relative">
              <BookOpen className="w-12 h-12 text-[#b8860b]/80" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#2c2416] mb-2 tracking-wider">
            Rules Browser
          </h1>
          <p className="text-[#8b7355] text-sm">
            Quick reference for all game rules
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#b8860b]/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules..."
              className="w-full bg-[#f5efe6] border border-[#d4c5a9] rounded-lg pl-11 pr-4 py-3 text-[#2c2416] placeholder:text-[#8b7355] focus:border-[#b8860b]/50 focus:outline-none focus:ring-2 focus:ring-[#b8860b]/20 transition-all"
            />
          </div>
        </div>

        {/* Rules Sections */}
        <div className="space-y-4">
          {/* Core Rules Section — grouped by category */}
          <div className="relative overflow-hidden rounded-sm border border-[#d4c5a9] bg-[#f5efe6]">
            <button
              onClick={() => toggleSection("core")}
              className="w-full p-4 flex items-center justify-between hover:bg-[#b8860b]/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-[#b8860b]" strokeWidth={2} />
                <div className="text-left">
                  <h2 className="text-base font-semibold text-[#2c2416]">
                    Core Rules
                  </h2>
                  <p className="text-xs text-[#8b7355]">
                    {filteredCoreRules.length} sections
                  </p>
                </div>
              </div>
              {expandedSections.includes("core") ? (
                <ChevronDown className="w-5 h-5 text-[#b8860b]" />
              ) : (
                <ChevronRight className="w-5 h-5 text-[#b8860b]" />
              )}
            </button>

            {expandedSections.includes("core") && (
              <div className="border-t border-[#b8860b]/10">
                {coreRuleGroups.map((group) => (
                  <div key={group.label}>
                    {/* Group header */}
                    <div className="px-4 py-2 bg-[#e8dcc8]/80 border-b border-[#d4c5a9]/40">
                      <span className="text-[11px] font-bold text-[#b8860b]/80 uppercase tracking-widest">
                        {group.label}
                      </span>
                    </div>
                    {renderRuleList(group.items)}
                  </div>
                ))}
                {filteredCoreRules.length === 0 && (
                  <div className="p-4 text-center text-sm text-[#8b7355]">
                    No rules found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Crusade Rules Section */}
          <div className="relative overflow-hidden rounded-sm border border-[#d4c5a9] bg-[#f5efe6]">
            <button
              onClick={() => toggleSection("crusade")}
              className="w-full p-4 flex items-center justify-between hover:bg-[#b8860b]/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-amber-600" strokeWidth={2} />
                <div className="text-left">
                  <h2 className="text-base font-semibold text-[#2c2416]">
                    Crusade Rules
                  </h2>
                  <p className="text-xs text-[#8b7355]">
                    {filteredCrusadeRules.length} sections
                  </p>
                </div>
              </div>
              {expandedSections.includes("crusade") ? (
                <ChevronDown className="w-5 h-5 text-amber-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-amber-600" />
              )}
            </button>

            {expandedSections.includes("crusade") && (
              <div className="border-t border-[#b8860b]/10">
                {filteredCrusadeRules.map((rule, idx) => (
                  <button
                    key={rule.id}
                    onClick={() => handleRuleClick(rule.id)}
                    className={`w-full p-3 text-left hover:bg-[#b8860b]/5 transition-all ${
                      idx !== filteredCrusadeRules.length - 1 ? "border-b border-[#d4c5a9]/60" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[#2c2416]">
                        {rule.title}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#8b7355]" />
                    </div>
                  </button>
                ))}
                {filteredCrusadeRules.length === 0 && (
                  <div className="p-4 text-center text-sm text-[#8b7355]">
                    No rules found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Empty state when all filtered out */}
        {filteredCoreRules.length === 0 &&
          filteredCrusadeRules.length === 0 &&
          searchQuery.trim() && (
            <div className="text-center py-12 mt-6">
              <BookOpen className="w-16 h-16 text-[#b8860b]/30 mx-auto mb-4" strokeWidth={1} />
              <p className="text-[#8b7355] text-sm">
                No rules found matching "{searchQuery}"
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
