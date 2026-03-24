import { useNavigate } from "react-router";
import { ArrowLeft, Shield, ChevronRight } from "lucide-react";
import { SPACE_MARINE_CHAPTERS, getDataFactionId } from '../../lib/factions';
import { getUnitsForFaction, getRulesForFaction } from '../../data';
import type { FactionId } from '../../types';

// Color mappings for chapters
const CHAPTER_COLORS: Record<string, { bgGlow: string }> = {
  space_wolves: { bgGlow: 'from-cyan-400/10' },
  blood_angels: { bgGlow: 'from-red-500/10' },
  dark_angels: { bgGlow: 'from-green-700/10' },
  black_templars: { bgGlow: 'from-stone-400/10' },
  deathwatch: { bgGlow: 'from-slate-400/10' },
  ultramarines: { bgGlow: 'from-blue-500/10' },
  imperial_fists: { bgGlow: 'from-yellow-600/10' },
  iron_hands: { bgGlow: 'from-slate-500/10' },
  salamanders: { bgGlow: 'from-orange-500/10' },
  raven_guard: { bgGlow: 'from-slate-600/10' },
  white_scars: { bgGlow: 'from-red-400/10' },
};

export default function SpaceMarinesChapters() {
  const navigate = useNavigate();

  // Build chapter list from real data
  const chapters = SPACE_MARINE_CHAPTERS.map((ch) => {
    const dataId = getDataFactionId(ch.id as FactionId);
    const datasheets = getUnitsForFaction(dataId)?.length ?? ch.uniqueDatasheets;
    const detachments = getRulesForFaction(dataId)?.detachments.length ?? ch.detachments;
    const bgGlow = CHAPTER_COLORS[ch.id]?.bgGlow ?? 'from-blue-400/10';
    return {
      ...ch,
      datasheets,
      detachments,
      bgGlow,
    };
  });

  const handleChapterClick = (chapter: (typeof chapters)[0]) => {
    navigate(`/codex/${chapter.id}`);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden pb-24">

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate("/codex")}
          className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back to Codex Library</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <div className="relative">
              <Shield className="w-12 h-12 text-blue-500/80" strokeWidth={1.5} />
              <div className="absolute inset-0 blur-md">
                <Shield className="w-12 h-12 text-blue-500/40" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 mb-2 tracking-wider drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            Space Marines
          </h1>
          <p className="text-stone-400 text-sm">
            Choose Your Chapter
          </p>
        </div>

        {/* Chapter List */}
        <div className="space-y-3">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => handleChapterClick(chapter)}
              className="w-full rounded-sm border border-stone-700/60 bg-stone-900 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${chapter.bgGlow} to-transparent opacity-50`} />
              <div className="relative p-4 flex items-center gap-4">
                <div className="text-3xl">{chapter.icon}</div>
                <div className="flex-1 text-left">
                  <h3 className="text-base font-semibold text-stone-100 mb-1">
                    {chapter.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-stone-400">
                    <span>{chapter.datasheets} datasheets</span>
                    <span>•</span>
                    <span>{chapter.detachments} detachments</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-500 group-hover:text-emerald-500 transition-colors" />
              </div>
            </button>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-stone-500 leading-relaxed">
            Each chapter has access to their own unique datasheets, detachments, and rules.
            Select a chapter to view its full codex.
          </p>
        </div>
      </div>
    </div>
  );
}
