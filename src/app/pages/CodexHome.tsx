import { useNavigate } from "react-router";
import { useMemo, useCallback, useState } from "react";
import { ArrowLeft, ChevronRight, BookOpen, Search, X } from "lucide-react";
import { FACTIONS, getDataFactionId } from '../../lib/factions';
import { getUnitsForFaction, getRulesForFaction } from '../../data';
import type { FactionId } from '../../types';

// Color mappings for faction display
const COLOR_MAP: Record<string, { color: string; bgGlow: string }> = {
  blue: { color: 'text-blue-500', bgGlow: 'from-blue-500/10' },
  cyan: { color: 'text-cyan-400', bgGlow: 'from-cyan-400/10' },
  slate: { color: 'text-slate-400', bgGlow: 'from-slate-400/10' },
  red: { color: 'text-red-500', bgGlow: 'from-red-500/10' },
  amber: { color: 'text-amber-500', bgGlow: 'from-amber-500/10' },
  orange: { color: 'text-orange-500', bgGlow: 'from-orange-500/10' },
  green: { color: 'text-green-600', bgGlow: 'from-green-600/10' },
  yellow: { color: 'text-yellow-600', bgGlow: 'from-yellow-600/10' },
  purple: { color: 'text-purple-500', bgGlow: 'from-purple-500/10' },
  zinc: { color: 'text-zinc-400', bgGlow: 'from-zinc-400/10' },
  lime: { color: 'text-lime-500', bgGlow: 'from-lime-500/10' },
  rose: { color: 'text-rose-500', bgGlow: 'from-rose-500/10' },
  stone: { color: 'text-stone-400', bgGlow: 'from-stone-400/10' },
  emerald: { color: 'text-emerald-400', bgGlow: 'from-emerald-400/10' },
  violet: { color: 'text-violet-400', bgGlow: 'from-violet-400/10' },
  sky: { color: 'text-sky-500', bgGlow: 'from-sky-500/10' },
  indigo: { color: 'text-indigo-400', bgGlow: 'from-indigo-400/10' },
};

function getFactionColors(colorKey: string) {
  return COLOR_MAP[colorKey] ?? { color: 'text-stone-400', bgGlow: 'from-stone-400/10' };
}

export default function CodexHome() {
  const navigate = useNavigate();

  // Build faction list dynamically from real data
  const factionList = useMemo(() => FACTIONS.map((f) => {
    const colors = getFactionColors(f.color);
    const dataId = getDataFactionId(f.id);
    const datasheets = getUnitsForFaction(dataId).length;
    const detachments = getRulesForFaction(dataId)?.detachments?.length ?? 0;
    return {
      id: f.id,
      name: f.name,
      icon: f.icon,
      category: f.category,
      hasChapters: f.hasChapters ?? false,
      datasheets,
      detachments,
      ...colors,
    };
  }), []);

  const [searchQuery, setSearchQuery] = useState('');

  // Global unit search across all factions
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const results: { name: string; factionId: string; factionName: string; factionIcon: string; keywords: string[] }[] = [];
    for (const f of FACTIONS) {
      const dataId = getDataFactionId(f.id);
      const units = getUnitsForFaction(dataId);
      for (const unit of units) {
        if (results.length >= 30) break;
        if (
          unit.name.toLowerCase().includes(q) ||
          unit.keywords?.some((k: string) => k.toLowerCase().includes(q))
        ) {
          results.push({
            name: unit.name,
            factionId: f.id,
            factionName: f.name,
            factionIcon: f.icon,
            keywords: unit.keywords ?? [],
          });
        }
      }
      if (results.length >= 30) break;
    }
    return results;
  }, [searchQuery]);

  const handleFactionClick = useCallback((faction: (typeof factionList)[0]) => {
    if (faction.hasChapters) {
      navigate("/space-marines-chapters");
    } else {
      navigate(`/codex/${faction.id}`);
    }
  }, [navigate, factionList]);

  // Group factions
  const imperiumFactions = useMemo(() => factionList.filter((f) => f.category === "imperium"), [factionList]);
  const chaosFactions = useMemo(() => factionList.filter((f) => f.category === "chaos"), [factionList]);
  const xenosFactions = useMemo(() => factionList.filter((f) => f.category === "xenos"), [factionList]);

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
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <div className="relative">
              <BookOpen className="w-12 h-12 text-[#b8860b]/80" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#2c2416] mb-2 tracking-wider">
            Codex Library
          </h1>
          <p className="text-[#8b7355] text-sm">
            Browse all faction codexes
          </p>
        </div>

        {/* Global Unit Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b7355]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search units across all factions..."
              className="w-full pl-10 pr-10 py-3 rounded-sm border border-[#d4c5a9] bg-[#f5efe6] text-[#2c2416] text-sm placeholder:text-[#8b7355]/60 focus:outline-none focus:border-[#b8860b] transition-colors"
              inputMode="search"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b7355] hover:text-[#2c2416]"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-[#8b7355]">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found</p>
              {searchResults.map((result, idx) => (
                <button
                  key={`${result.factionId}-${result.name}-${idx}`}
                  onClick={() => navigate(`/datasheet/${result.factionId}/${encodeURIComponent(result.name)}`)}
                  className="w-full text-left rounded-sm border border-[#d4c5a9] bg-[#f5efe6] hover:border-[#b8860b] transition-all p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{result.factionIcon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[#2c2416] truncate">{result.name}</h4>
                      <p className="text-xs text-[#8b7355]">{result.factionName}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8b7355] flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="mt-3 text-sm text-[#8b7355] text-center">No units found for "{searchQuery}"</p>
          )}
        </div>

        {/* Imperium */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[#8b7355] uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="text-amber-500">⚜️</span>
            Imperium
          </h2>
          <div className="space-y-3">
            {imperiumFactions.map((faction) => (
              <button
                key={faction.id}
                onClick={() => handleFactionClick(faction)}
                className="w-full relative overflow-hidden rounded-sm border border-[#d4c5a9] bg-[#f5efe6] hover:border-[#b8860b] transition-all group"
              >
                <div className="relative p-4 flex items-center gap-4">
                  <div className="text-3xl">{faction.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-[#2c2416]">
                        {faction.name}
                      </h3>
                      {faction.hasChapters && (
                        <span className="text-xs text-[#b8860b]/70 italic">
                          View Chapters
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#8b7355]">
                      <span>{faction.datasheets} datasheets</span>
                      <span>•</span>
                      <span>{faction.detachments} detachments</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#8b7355] group-hover:text-[#b8860b] transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chaos */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[#8b7355] uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="text-red-500">🔥</span>
            Chaos
          </h2>
          <div className="space-y-3">
            {chaosFactions.map((faction) => (
              <button
                key={faction.id}
                onClick={() => handleFactionClick(faction)}
                className="w-full relative overflow-hidden rounded-sm border border-[#d4c5a9] bg-[#f5efe6] hover:border-[#b8860b] transition-all group"
              >
                <div className="relative p-4 flex items-center gap-4">
                  <div className="text-3xl">{faction.icon}</div>
                  <div className="flex-1 text-left">
                    <h3 className="text-base font-semibold text-[#2c2416] mb-1">
                      {faction.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-[#8b7355]">
                      <span>{faction.datasheets} datasheets</span>
                      <span>•</span>
                      <span>{faction.detachments} detachments</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#8b7355] group-hover:text-[#b8860b] transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Xenos */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[#8b7355] uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="text-purple-500">👽</span>
            Xenos
          </h2>
          <div className="space-y-3">
            {xenosFactions.map((faction) => (
              <button
                key={faction.id}
                onClick={() => handleFactionClick(faction)}
                className="w-full relative overflow-hidden rounded-sm border border-[#d4c5a9] bg-[#f5efe6] hover:border-[#b8860b] transition-all group"
              >
                <div className="relative p-4 flex items-center gap-4">
                  <div className="text-3xl">{faction.icon}</div>
                  <div className="flex-1 text-left">
                    <h3 className="text-base font-semibold text-[#2c2416] mb-1">
                      {faction.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-[#8b7355]">
                      <span>{faction.datasheets} datasheets</span>
                      <span>•</span>
                      <span>{faction.detachments} detachments</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#8b7355] group-hover:text-[#b8860b] transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
