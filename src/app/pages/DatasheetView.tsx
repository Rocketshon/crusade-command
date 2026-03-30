import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Plus, Shield, Zap, Globe, Loader2, ChevronDown } from "lucide-react";
import { getUnitsForFaction } from '../../data';
import { getFaction, getDataFactionId } from '../../lib/factions';
import { useArmy } from '../../lib/ArmyContext';
import { toTitleCase, FormattedRuleText } from '../../lib/formatText';
import { translateText, SUPPORTED_LANGUAGES } from '../../lib/apiServices';
import type { FactionId, Datasheet } from '../../types';
import WeaponStatTable from '../components/WeaponStatTable';

export default function DatasheetView() {
  const { factionId, datasheetName } = useParams<{ factionId: string; datasheetName: string }>();
  const navigate = useNavigate();
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const addSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addUnit, mode } = useArmy();

  // Translation state
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedAbilities, setTranslatedAbilities] = useState<Record<string, string>>({});
  const [translationLang, setTranslationLang] = useState<string | null>(null);

  const handleTranslate = async (langCode: string) => {
    setShowLangPicker(false);
    setTranslating(true);
    setTranslationLang(langCode);
    try {
      const textsToTranslate: Record<string, string> = {};
      if (datasheet) {
        datasheet.abilities.other.forEach(([name, text], idx) => {
          textsToTranslate[`ability-${idx}`] = `${name}: ${text}`;
        });
      }
      const results: Record<string, string> = {};
      for (const [key, text] of Object.entries(textsToTranslate)) {
        const translated = await translateText(text, langCode);
        if (translated) results[key] = translated;
      }
      setTranslatedAbilities(results);
      if (Object.keys(results).length === 0) {
        toast.error('Translation failed');
      }
    } catch {
      toast.error('Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  useEffect(() => {
    return () => { if (addSuccessTimer.current) clearTimeout(addSuccessTimer.current); };
  }, []);

  const units = factionId ? getUnitsForFaction(getDataFactionId(factionId as FactionId)) : [];
  const datasheet: Datasheet | undefined = datasheetName
    ? units.find((u) => u.name === decodeURIComponent(datasheetName))
    : undefined;
  const factionMeta = factionId ? getFaction(factionId as FactionId) : undefined;

  if (!datasheet) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col p-6 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-6">
            <ArrowLeft className="w-5 h-5" /><span className="text-sm">Back</span>
          </button>
          <div className="text-center"><h1 className="text-xl font-bold text-[var(--text-secondary)] mb-2">Datasheet Not Found</h1></div>
        </div>
      </div>
    );
  }

  const handleAddToArmy = () => {
    if (!mode) { toast.error("Start building an army first"); return; }
    if (datasheet) {
      const pointsCost = datasheet.points.length > 0 ? parseInt(datasheet.points[0].cost, 10) || 0 : 0;
      addUnit({ datasheetName: datasheet.name, pointsCost, isCharacter: datasheet.keywords.includes('CHARACTER') });
      setShowAddSuccess(true);
      toast.success(`${datasheet.name} added to army (${pointsCost} pts)`);
      addSuccessTimer.current = setTimeout(() => setShowAddSuccess(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col p-6 relative overflow-hidden pb-24">
      <div className="relative z-10 w-full max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" /><span className="text-sm">Back to Codex</span>
        </button>

        {/* Unit Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-wider mb-2">{datasheet.name}</h1>
            {/* Translate button */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowLangPicker(v => !v)}
                disabled={translating}
                className="w-9 h-9 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--accent-gold)]/40 transition-colors disabled:opacity-50"
                aria-label="Translate"
              >
                {translating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              </button>
              {showLangPicker && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleTranslate(lang.code)}
                      className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--accent-gold)]/10 transition-colors"
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-[var(--accent-gold)] text-sm mb-3">{datasheet.faction}</p>

          {/* Points Costs */}
          {datasheet.points.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {datasheet.points.map((tier, idx) => (
                <div key={idx} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
                  <span className="text-[var(--text-secondary)] text-xs">{tier.models} models:</span>
                  <span className="text-[var(--accent-gold)] text-sm font-bold ml-2 font-mono">{tier.cost} pts</span>
                </div>
              ))}
            </div>
          )}

          {/* Stats - gold header row */}
          {datasheet.stats && Object.keys(datasheet.stats).length > 0 && (
            <div className="rounded-lg border border-[var(--accent-gold)]/30 overflow-hidden mb-2">
              <div className="grid gap-px bg-[var(--accent-gold)]/20" style={{ gridTemplateColumns: `repeat(${Object.keys(datasheet.stats).length}, 1fr)` }}>
                {Object.entries(datasheet.stats).map(([stat, value]) => (
                  <div key={stat} className="bg-[var(--bg-card)]">
                    <div className="text-center px-2 py-1 bg-[var(--accent-gold)]/10 border-b border-[var(--accent-gold)]/20">
                      <div className="text-[10px] text-[var(--accent-gold)] font-semibold uppercase">{stat}</div>
                    </div>
                    <div className="text-center px-2 py-2">
                      <div className="text-lg font-bold text-[var(--text-primary)]">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invulnerable Save */}
          {datasheet.invuln && (
            <div className="flex items-center gap-2 mt-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-[var(--text-secondary)]">Invulnerable Save:</span>
              <span className="text-base font-bold text-blue-400">{datasheet.invuln}</span>
            </div>
          )}
        </div>

        {datasheet.ranged_weapons.length > 0 && <div className="mb-6"><WeaponStatTable weapons={datasheet.ranged_weapons} type="ranged" /></div>}
        {datasheet.melee_weapons.length > 0 && <div className="mb-6"><WeaponStatTable weapons={datasheet.melee_weapons} type="melee" /></div>}

        {/* Abilities */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />Abilities
          </h2>

          {datasheet.abilities.core.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Core</h3>
              <div className="flex flex-wrap gap-2">
                {datasheet.abilities.core.map((ability: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 rounded-full border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] text-xs font-semibold">{ability}</span>
                ))}
              </div>
            </div>
          )}

          {datasheet.abilities.faction.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Faction</h3>
              <div className="flex flex-wrap gap-2">
                {datasheet.abilities.faction.map((factionAbility: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--accent-gold)] text-xs font-semibold">{factionAbility}</span>
                ))}
              </div>
            </div>
          )}

          {datasheet.abilities.other.map((ability: [string, string], idx: number) => (
            <div key={idx} className="mb-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <h3 className="text-sm font-bold text-[var(--accent-gold)] mb-2">{ability[0]}</h3>
              <FormattedRuleText text={ability[1]} className="text-xs" />
              {translatedAbilities[`ability-${idx}`] && (
                <div className="mt-2 pt-2 border-t border-[var(--border-color)]/50">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    {SUPPORTED_LANGUAGES.find(l => l.code === translationLang)?.name ?? 'Translation'}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] italic">{translatedAbilities[`ability-${idx}`]}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {datasheet.unit_composition && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Unit Composition</h2>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <p className="text-sm text-[var(--text-tertiary)] whitespace-pre-line">{datasheet.unit_composition}</p>
            </div>
          </div>
        )}

        {datasheet.wargear_options.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Wargear Options</h2>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text-tertiary)]">
                {datasheet.wargear_options.map((opt: string, idx: number) => <li key={idx}>{opt}</li>)}
              </ul>
            </div>
          </div>
        )}

        {datasheet.wargear_abilities.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Wargear Abilities</h2>
            <div className="space-y-2">
              {datasheet.wargear_abilities.map((ability, idx: number) => {
                if (typeof ability === 'string') return <p key={idx} className="text-xs text-[var(--text-tertiary)]">{ability}</p>;
                return (
                  <div key={idx} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                    <h3 className="text-sm font-bold text-[var(--accent-gold)] mb-1">{ability[0]}</h3>
                    <p className="text-xs text-[var(--text-tertiary)]">{ability[1]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {datasheet.damaged && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Damaged Profile</h2>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <FormattedRuleText text={datasheet.damaged} className="text-sm text-amber-400" />
            </div>
          </div>
        )}

        {/* Keywords */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {datasheet.keywords.map((keyword: string, idx: number) => (
              <span key={idx} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-tertiary)] text-xs font-semibold">{toTitleCase(keyword)}</span>
            ))}
          </div>
          {datasheet.faction_keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {datasheet.faction_keywords.map((keyword: string, idx: number) => (
                <span key={idx} className="px-3 py-1.5 rounded-lg border border-[var(--accent-gold)]/20 bg-[var(--accent-gold)]/5 text-[var(--accent-gold)] text-xs font-semibold">{toTitleCase(keyword)}</span>
              ))}
            </div>
          )}
        </div>

        {datasheet.leader && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Leader</h2>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <FormattedRuleText text={datasheet.leader} className="text-sm text-purple-400" />
            </div>
          </div>
        )}
      </div>

      {/* Add buttons */}
      <div className="relative z-10 w-full max-w-2xl mx-auto mt-6 space-y-3">
        <button
          onClick={handleAddToArmy}
          disabled={showAddSuccess || !mode}
          className={`w-full py-4 rounded-lg font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            showAddSuccess
              ? "bg-[var(--accent-gold)] text-[var(--bg-primary)]"
              : "bg-[var(--accent-gold)] text-[var(--bg-primary)] hover:opacity-90"
          }`}
        >
          {showAddSuccess ? (
            <span className="flex items-center justify-center gap-2">Added to Army</span>
          ) : (
            <span className="flex items-center justify-center gap-2"><Plus className="w-5 h-5" />Add to Army</span>
          )}
        </button>

      </div>
    </div>
  );
}
