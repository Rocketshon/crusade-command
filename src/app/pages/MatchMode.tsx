import { useState, useMemo } from 'react';
import { ArrowLeft, Search, Shield, Zap, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useArmy } from '../../lib/ArmyContext';
import { getUnitsForFaction } from '../../data';
import { getDataFactionId, FACTIONS } from '../../lib/factions';
import { toTitleCase, FormattedRuleText } from '../../lib/formatText';
import type { FactionId, Datasheet } from '../../types';
import WeaponStatTable from '../components/WeaponStatTable';

// ---------------------------------------------------------------------------
// Your Army Tab
// ---------------------------------------------------------------------------

function YourArmyTab() {
  const { army, factionId, detachmentName } = useArmy();
  const factionMeta = factionId ? FACTIONS.find((f) => f.id === factionId) : null;

  const datasheetLookup = useMemo(() => {
    if (!factionId) return new Map<string, Datasheet>();
    const units = getUnitsForFaction(getDataFactionId(factionId as FactionId));
    const map = new Map<string, Datasheet>();
    for (const u of units) map.set(u.name, u);
    return map;
  }, [factionId]);

  if (!factionId || army.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[var(--text-secondary)] mb-2">No army loaded.</p>
        <p className="text-xs text-[#555]">Go to the Army tab to build a list first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Army info header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-4 mb-2">
        <div className="flex items-center gap-2 mb-1">
          {factionMeta && <span className="text-lg">{factionMeta.icon}</span>}
          <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">{factionMeta?.name ?? factionId}</h3>
        </div>
        {detachmentName && (
          <p className="text-xs text-[var(--accent-gold)]">{detachmentName}</p>
        )}
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          {army.length} unit{army.length !== 1 ? 's' : ''} &middot;{' '}
          {army.reduce((s, u) => s + u.points_cost, 0).toLocaleString()} pts
        </p>
      </div>

      {/* Unit cards */}
      {army.map((unit) => {
        const ds = datasheetLookup.get(unit.datasheet_name);
        return (
          <div
            key={unit.id}
            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">{unit.custom_name}</h4>
              <span className="text-xs font-semibold text-[var(--accent-gold)]">{unit.points_cost} pts</span>
            </div>
            {ds && (
              <>
                {/* Stats row */}
                {ds.stats && Object.keys(ds.stats).length > 0 && (
                  <div className="flex gap-2 mb-2">
                    {Object.entries(ds.stats).map(([stat, value]) => (
                      <div key={stat} className="text-center px-2 py-1 bg-[var(--bg-primary)] rounded">
                        <div className="text-[10px] text-[var(--text-secondary)] uppercase">{stat}</div>
                        <div className="text-xs font-bold text-[var(--text-primary)] font-mono">{value}</div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Weapons */}
                {ds.ranged_weapons.length > 0 && (
                  <WeaponStatTable weapons={ds.ranged_weapons} type="ranged" compact />
                )}
                {ds.melee_weapons.length > 0 && (
                  <WeaponStatTable weapons={ds.melee_weapons} type="melee" compact />
                )}
                {/* Abilities */}
                {ds.abilities.core.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ds.abilities.core.map((a, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] bg-[var(--accent-gold)]/10">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opponent Datasheet View
// ---------------------------------------------------------------------------

function OpponentDatasheetDetail({ datasheet, onBack }: { datasheet: Datasheet; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to units
      </button>

      {/* Unit Header */}
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] font-serif">{datasheet.name}</h2>
        <p className="text-xs text-[var(--accent-gold)]">{datasheet.faction}</p>

        {/* Points */}
        {datasheet.points.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {datasheet.points.map((tier, idx) => (
              <span key={idx} className="px-2 py-1 text-xs rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                {tier.models}: <span className="text-[var(--accent-gold)] font-bold">{tier.cost} pts</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {datasheet.stats && Object.keys(datasheet.stats).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(datasheet.stats).map(([stat, value]) => (
            <div key={stat} className="flex-1 min-w-[60px] text-center px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg">
              <div className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase">{stat}</div>
              <div className="text-lg font-bold text-[var(--text-primary)] font-mono">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Invuln */}
      {datasheet.invuln && (
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-[var(--text-secondary)]">Invulnerable Save:</span>
          <span className="text-base font-bold text-blue-400">{datasheet.invuln}</span>
        </div>
      )}

      {/* Weapons */}
      {datasheet.ranged_weapons.length > 0 && (
        <WeaponStatTable weapons={datasheet.ranged_weapons} type="ranged" />
      )}
      {datasheet.melee_weapons.length > 0 && (
        <WeaponStatTable weapons={datasheet.melee_weapons} type="melee" />
      )}

      {/* Abilities */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-1">
          <Zap className="w-4 h-4 text-amber-500" />
          Abilities
        </h3>

        {datasheet.abilities.core.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {datasheet.abilities.core.map((a, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-xs font-semibold">
                {a}
              </span>
            ))}
          </div>
        )}

        {datasheet.abilities.faction.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {datasheet.abilities.faction.map((a, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full border border-[var(--accent-gold)]/20 text-[var(--text-secondary)] bg-[var(--bg-primary)] text-xs">
                {a}
              </span>
            ))}
          </div>
        )}

        {datasheet.abilities.other.map((ability, idx) => (
          <div key={idx} className="mb-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-3">
            <h4 className="text-xs font-bold text-[var(--accent-gold)] mb-1">{ability[0]}</h4>
            <FormattedRuleText text={ability[1]} className="text-xs" />
          </div>
        ))}
      </div>

      {/* Keywords */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Keywords</h3>
        <div className="flex flex-wrap gap-1">
          {datasheet.keywords.map((kw, i) => (
            <span key={i} className="px-2 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs">
              {toTitleCase(kw)}
            </span>
          ))}
        </div>
        {datasheet.faction_keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {datasheet.faction_keywords.map((kw, i) => (
              <span key={i} className="px-2 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--accent-gold)] text-xs">
                {toTitleCase(kw)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Leader */}
      {datasheet.leader && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Leader</h3>
          <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-3">
            <FormattedRuleText text={datasheet.leader} className="text-xs" />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opponent's Army Tab
// ---------------------------------------------------------------------------

function OpponentArmyTab() {
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<Datasheet | null>(null);

  const categories = useMemo(() => [
    { label: 'Imperium', factions: FACTIONS.filter((f) => f.category === 'imperium') },
    { label: 'Chaos', factions: FACTIONS.filter((f) => f.category === 'chaos') },
    { label: 'Xenos', factions: FACTIONS.filter((f) => f.category === 'xenos') },
  ], []);

  const units = useMemo(() => {
    if (!selectedFaction) return [];
    const dataFaction = getDataFactionId(selectedFaction as FactionId);
    return getUnitsForFaction(dataFaction);
  }, [selectedFaction]);

  const filteredUnits = useMemo(() => {
    if (!search.trim()) return units;
    const q = search.toLowerCase();
    return units.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [units, search]);

  // Viewing a specific datasheet
  if (selectedUnit) {
    return (
      <OpponentDatasheetDetail
        datasheet={selectedUnit}
        onBack={() => setSelectedUnit(null)}
      />
    );
  }

  // Faction picker
  if (!selectedFaction) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-[var(--text-secondary)] text-center">
          Pick your opponent's faction to look up their units.
        </p>
        {categories.map((cat) => (
          <div key={cat.label}>
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">{cat.label}</h3>
            <div className="grid grid-cols-2 gap-2">
              {cat.factions.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFaction(f.id)}
                  className="flex items-center gap-2 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg
                             hover:border-[var(--accent-gold)] transition-colors text-left
                             focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                >
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Unit browser
  const factionMeta = FACTIONS.find((f) => f.id === selectedFaction);

  return (
    <div className="space-y-4">
      {/* Faction header + back */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => { setSelectedFaction(null); setSearch(''); }}
          className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Factions
        </button>
        <div className="flex items-center gap-2">
          {factionMeta && <span className="text-lg">{factionMeta.icon}</span>}
          <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">{factionMeta?.name}</h3>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search units..."
          className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm
                     placeholder:text-[#555] focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
        />
      </div>

      {/* Units list */}
      <div className="space-y-2">
        {filteredUnits.length === 0 && (
          <p className="text-xs text-[#555] text-center py-8">
            {search ? 'No units match your search.' : 'No units available for this faction.'}
          </p>
        )}
        {filteredUnits.map((unit) => {
          const pts = unit.points.length > 0 ? unit.points[0].cost : '?';
          return (
            <button
              key={unit.name}
              onClick={() => setSelectedUnit(unit)}
              className="w-full text-left p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg
                         hover:border-[var(--accent-gold)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)]">{unit.name}</span>
                <span className="text-xs font-semibold text-[var(--accent-gold)]">{pts} pts</span>
              </div>
              {/* Quick keywords preview */}
              <div className="flex flex-wrap gap-1 mt-1">
                {unit.keywords.slice(0, 4).map((kw, i) => (
                  <span key={i} className="text-[10px] text-[var(--text-secondary)]">{toTitleCase(kw)}</span>
                ))}
                {unit.keywords.length > 4 && (
                  <span className="text-[10px] text-[#555]">+{unit.keywords.length - 4} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main MatchMode
// ---------------------------------------------------------------------------

type Tab = 'your' | 'opponent';

export default function MatchMode() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('opponent');

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-xl font-bold text-[var(--accent-gold)]">Match Mode</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] mb-6">
        {([
          { key: 'your' as Tab, label: 'Your Army' },
          { key: 'opponent' as Tab, label: "Opponent's Army" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'text-[var(--accent-gold)] border-[var(--accent-gold)]'
                : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'your' ? <YourArmyTab /> : <OpponentArmyTab />}
    </div>
  );
}
