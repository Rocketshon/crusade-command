import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, ChevronDown, ChevronRight, Search, Shield, Swords, BookOpen, Award, Zap } from "lucide-react";
import { getUnitsForFaction, getRulesForFaction } from '../../data';
import { getFaction, getDataFactionId } from '../../lib/factions';
import { FormattedRuleText, toTitleCase, getStratagemTypeColor, getEnhancementCardColors } from '../../lib/formatText';
import type { FactionId, DetachmentData, Datasheet } from '../../types';

// Determine accent color class based on faction color
function getAccentColor(color: string): string {
  const map: Record<string, string> = {
    blue: 'bg-blue-500', cyan: 'bg-cyan-400', slate: 'bg-slate-400',
    red: 'bg-red-500', amber: 'bg-amber-500', orange: 'bg-orange-500',
    green: 'bg-green-600', yellow: 'bg-yellow-600', purple: 'bg-purple-500',
    zinc: 'bg-zinc-400', lime: 'bg-lime-500', rose: 'bg-rose-500',
    stone: 'bg-stone-400', emerald: 'bg-emerald-400', violet: 'bg-violet-400',
    sky: 'bg-sky-500', indigo: 'bg-indigo-400',
  };
  return map[color] ?? 'bg-[#b8860b]';
}

export default function FactionCodex() {
  const { factionId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"army" | "detachments" | "datasheets" | "crusade">("army");
  const [expandedDetachments, setExpandedDetachments] = useState<string[]>([]);
  const [expandedEnhancements, setExpandedEnhancements] = useState<string[]>([]);
  const [expandedStratagems, setExpandedStratagems] = useState<string[]>([]);
  const [datasheetSearch, setDatasheetSearch] = useState("");

  // Load real data — use getDataFactionId to map chapters (e.g. space_wolves) to parent data (space_marines)
  const factionMeta = factionId ? getFaction(factionId as FactionId) : undefined;
  const dataFaction = factionId ? getDataFactionId(factionId as FactionId) : (factionId as FactionId);
  const rules = dataFaction ? getRulesForFaction(dataFaction) : undefined;
  const units = dataFaction ? getUnitsForFaction(dataFaction) : [];

  if (!factionMeta) {
    return (
      <div className="min-h-screen bg-[#faf6f0] flex flex-col p-6 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#8b7355] hover:text-[#b8860b] transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>

          <div className="text-center">
            <BookOpen className="w-16 h-16 text-[#8b7355] mx-auto mb-4" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-[#8b7355] mb-2">
              Codex Not Found
            </h1>
          </div>
        </div>
      </div>
    );
  }

  const accentColor = getAccentColor(factionMeta.color);
  const enhColors = getEnhancementCardColors(factionMeta.color);

  // Expand first detachment by default (in useEffect to avoid setState during render)
  useEffect(() => {
    if (expandedDetachments.length === 0 && rules?.detachments && rules.detachments.length > 0) {
      setExpandedDetachments([rules.detachments[0].name]);
    }
  }, [rules?.detachments]);

  const toggleDetachment = (detachmentName: string) => {
    setExpandedDetachments((prev) =>
      prev.includes(detachmentName)
        ? prev.filter((n) => n !== detachmentName)
        : [...prev, detachmentName]
    );
  };

  const toggleEnhancements = (detachmentName: string) => {
    setExpandedEnhancements((prev) =>
      prev.includes(detachmentName)
        ? prev.filter((n) => n !== detachmentName)
        : [...prev, detachmentName]
    );
  };

  const toggleStratagems = (detachmentName: string) => {
    setExpandedStratagems((prev) =>
      prev.includes(detachmentName)
        ? prev.filter((n) => n !== detachmentName)
        : [...prev, detachmentName]
    );
  };

  const handleDatasheetClick = (unit: Datasheet) => {
    navigate(`/datasheet/${factionId}/${encodeURIComponent(unit.name)}`);
  };

  const filteredDatasheets = useMemo(() => {
    const q = datasheetSearch.toLowerCase();
    return units.filter((ds) =>
      ds.name.toLowerCase().includes(q) ||
      ds.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [units, datasheetSearch]);

  return (
    <div className="min-h-screen bg-[#faf6f0] flex flex-col p-6 relative overflow-hidden pb-24">

      <div className="relative z-10 w-full max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#8b7355] hover:text-[#b8860b] transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        {/* Faction Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-4xl">{factionMeta.icon}</div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#2c2416] tracking-wider">
                {factionMeta.name}
              </h1>
              <p className="text-[#8b7355] text-sm">Codex: {rules?.faction ?? factionMeta.name}</p>
            </div>
          </div>
          <div className={`h-1 w-full ${accentColor} rounded-full`} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("army")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === "army"
                ? "bg-gradient-to-r from-[#b8860b] to-[#d4a017] text-white"
                : "border border-[#d4c5a9] bg-[#f5efe6] text-[#5c4a32] hover:border-[#b8860b]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Army Rule
            </div>
          </button>
          <button
            onClick={() => setActiveTab("detachments")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === "detachments"
                ? "bg-gradient-to-r from-[#b8860b] to-[#d4a017] text-white"
                : "border border-[#d4c5a9] bg-[#f5efe6] text-[#5c4a32] hover:border-[#b8860b]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4" />
              Detachments
            </div>
          </button>
          <button
            onClick={() => setActiveTab("datasheets")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === "datasheets"
                ? "bg-gradient-to-r from-[#b8860b] to-[#d4a017] text-white"
                : "border border-[#d4c5a9] bg-[#f5efe6] text-[#5c4a32] hover:border-[#b8860b]"
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Datasheets
            </div>
          </button>
          <button
            onClick={() => setActiveTab("crusade")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === "crusade"
                ? "bg-gradient-to-r from-[#b8860b] to-[#d4a017] text-white"
                : "border border-[#d4c5a9] bg-[#f5efe6] text-[#5c4a32] hover:border-[#b8860b]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Crusade
            </div>
          </button>
        </div>

        {/* Army Rule Tab */}
        {activeTab === "army" && (
          <div className="space-y-4">
            <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-6">
                <h2 className="text-xl font-bold text-[#b8860b] mb-4">Army Rules</h2>
                {rules?.army_rules && rules.army_rules.length > 0 ? (
                  rules.army_rules.map((rule, idx) => (
                    <div key={idx} className="mb-4 last:mb-0">
                      <FormattedRuleText text={rule} />
                    </div>
                  ))
                ) : (
                  <p className="text-[#8b7355] italic">No army rules available for this faction.</p>
                )}
            </div>
          </div>
        )}

        {/* Detachments Tab */}
        {activeTab === "detachments" && (
          <div className="space-y-4">
            {rules?.detachments && rules.detachments.length > 0 ? (
              rules.detachments.map((detachment: DetachmentData) => (
                <div
                  key={detachment.name}
                  className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6]"
                >
                  {/* Detachment Header */}
                  <button
                    onClick={() => toggleDetachment(detachment.name)}
                    className="w-full p-4 flex items-center justify-between hover:bg-[#b8860b]/5 transition-all"
                  >
                    <h2 className="text-lg font-bold text-[#2c2416]">{detachment.name}</h2>
                    {expandedDetachments.includes(detachment.name) ? (
                      <ChevronDown className="w-5 h-5 text-[#b8860b]" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-[#b8860b]" />
                    )}
                  </button>

                  {expandedDetachments.includes(detachment.name) && (
                    <div className="border-t border-[#b8860b]/10 p-4 space-y-4">
                      {/* Detachment Rule */}
                      <div>
                        <h3 className="text-sm font-semibold text-[#b8860b] mb-2">{detachment.rule.name}</h3>
                        <FormattedRuleText text={detachment.rule.text} />
                      </div>

                      {/* Enhancements */}
                      {detachment.enhancements.length > 0 && (
                        <div>
                          <button
                            onClick={() => toggleEnhancements(detachment.name)}
                            className="flex items-center justify-between w-full mb-2"
                          >
                            <h3 className="text-sm font-semibold text-[#5c4a32] uppercase tracking-wider">
                              Enhancements ({detachment.enhancements.length})
                            </h3>
                            {expandedEnhancements.includes(detachment.name) ? (
                              <ChevronDown className="w-4 h-4 text-[#b8860b]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[#b8860b]" />
                            )}
                          </button>
                          {expandedEnhancements.includes(detachment.name) && (
                            <div className="space-y-2">
                              {detachment.enhancements.map((enh, idx) => {
                                return (
                                <div
                                  key={idx}
                                  className={`rounded-sm border ${enhColors.card} p-3`}
                                >
                                  <div className="flex items-start justify-between gap-3 mb-1">
                                    <h4 className={`text-sm font-semibold ${enhColors.nameText}`}>{enh.name}</h4>
                                    <span className={`text-xs font-bold ${enhColors.costText} font-mono`}>{enh.cost} pts</span>
                                  </div>
                                  <FormattedRuleText text={enh.text} className="text-sm" />
                                </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Stratagems */}
                      {detachment.stratagems.length > 0 && (
                        <div>
                          <button
                            onClick={() => toggleStratagems(detachment.name)}
                            className="flex items-center justify-between w-full mb-2"
                          >
                            <h3 className="text-sm font-semibold text-[#5c4a32] uppercase tracking-wider">
                              Stratagems ({detachment.stratagems.length})
                            </h3>
                            {expandedStratagems.includes(detachment.name) ? (
                              <ChevronDown className="w-4 h-4 text-[#b8860b]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[#b8860b]" />
                            )}
                          </button>
                          {expandedStratagems.includes(detachment.name) && (
                            <div className="space-y-2">
                              {detachment.stratagems.map((strat, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-3"
                                >
                                  <div className="flex items-start justify-between gap-3 mb-1">
                                    <div className="flex items-center gap-2">
                                      <Zap className="w-3 h-3 text-purple-400" />
                                      <h4 className="text-sm font-semibold text-purple-400">{strat.name}</h4>
                                    </div>
                                    <span className="text-xs font-bold text-purple-500 font-mono">{strat.cp} CP</span>
                                  </div>
                                  <div className="mb-1">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStratagemTypeColor(strat.type)}`}>{strat.type}</span>
                                  </div>
                                  {strat.when && (
                                    <div className="text-xs text-[#8b7355] leading-relaxed mb-1">
                                      <span className="font-semibold text-[#5c4a32]">When: </span>{strat.when}
                                    </div>
                                  )}
                                  {strat.target && (
                                    <div className="text-xs text-[#8b7355] leading-relaxed mb-1">
                                      <span className="font-semibold text-[#5c4a32]">Target: </span>{strat.target}
                                    </div>
                                  )}
                                  {strat.effect && (
                                    <div className="text-xs text-[#8b7355] leading-relaxed">
                                      <span className="font-semibold text-[#5c4a32]">Effect: </span>{strat.effect}
                                    </div>
                                  )}
                                  {strat.restrictions && (
                                    <div className="text-xs text-amber-400/70 leading-relaxed mt-1">
                                      <span className="font-semibold">Restrictions: </span>{strat.restrictions}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-[#8b7355] text-sm">
                No detachments available for this faction.
              </div>
            )}
          </div>
        )}

        {/* Datasheets Tab */}
        {activeTab === "datasheets" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#b8860b]/50" />
              <input
                type="text"
                value={datasheetSearch}
                onChange={(e) => setDatasheetSearch(e.target.value)}
                placeholder="Search datasheets..."
                className="w-full bg-[#f5efe6] border border-[#d4c5a9] rounded-lg pl-11 pr-4 py-3 text-[#2c2416] placeholder:text-[#8b7355] focus:border-[#b8860b]/40 focus:outline-none focus:ring-2 focus:ring-[#b8860b]/20 transition-all"
              />
            </div>

            {/* Datasheet List */}
            <div className="space-y-2">
              {filteredDatasheets.map((unit) => (
                <button
                  key={unit.name}
                  onClick={() => handleDatasheetClick(unit)}
                  className="w-full rounded-sm border border-[#d4c5a9] bg-[#f5efe6] hover:border-[#b8860b] transition-all group"
                >
                  <div className="p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-[#2c2416]">
                          {unit.name}
                        </h3>
                        {unit.legends && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                            Legends
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {unit.keywords.slice(0, 4).map((kw, kwIdx) => (
                          <span
                            key={kwIdx}
                            className="px-1.5 py-0.5 rounded bg-[#e8dcc8] text-[10px] text-[#8b7355] border border-[#d4c5a9]/50"
                          >
                            {toTitleCase(kw)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {unit.points.length > 0 && (
                        <span className="text-sm font-bold text-[#b8860b] font-mono">
                          {unit.points[0].cost} pts
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-[#8b7355] group-hover:text-[#b8860b] transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {filteredDatasheets.length === 0 && (
              <div className="text-center py-8 text-[#8b7355] text-sm">
                No datasheets found
              </div>
            )}
          </div>
        )}

        {/* Crusade Tab */}
        {activeTab === "crusade" && (
          <div className="space-y-4">
            {rules?.crusade_rules && rules.crusade_rules.length > 0 ? (
              <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-6">
                <h2 className="text-xl font-bold text-amber-600 mb-4">Crusade Rules</h2>
                {rules.crusade_rules.map((cr, idx) => (
                  <div key={idx} className="mb-4 last:mb-0">
                    {cr.name && (
                      <h3 className="text-base font-semibold text-[#2c2416] mb-2">{cr.name}</h3>
                    )}
                    {cr.text && (
                      <FormattedRuleText text={cr.text} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-sm border border-[#d4c5a9] bg-[#f5efe6] p-6">
                <div className="text-center py-4">
                  <p className="text-[#8b7355] italic">No crusade rules available for this faction.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
