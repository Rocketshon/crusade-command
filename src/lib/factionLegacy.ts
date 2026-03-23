// ============================================================
// Faction Legacy — Faction-specific Crusade tracker configs
// ============================================================

export interface FactionLegacyTracker {
  key: string;
  label: string;
  type: 'counter' | 'progress' | 'grid' | 'toggle_list';
  description: string;
  max?: number;
  options?: string[];
}

export interface FactionLegacyConfig {
  faction_id: string;
  trackers: FactionLegacyTracker[];
}

const FACTION_LEGACY_CONFIGS: FactionLegacyConfig[] = [
  {
    faction_id: 'world_eaters',
    trackers: [
      {
        key: 'skull_points',
        label: 'Skull Points',
        type: 'counter',
        description: 'Earned by destroying enemy units in melee combat.',
      },
    ],
  },
  {
    faction_id: 'death_guard',
    trackers: [
      {
        key: 'plague_fecundity',
        label: 'Fecundity',
        type: 'progress',
        description: 'Plague vector: fecundity level.',
        max: 7,
      },
      {
        key: 'plague_density',
        label: 'Density',
        type: 'progress',
        description: 'Plague vector: density level.',
        max: 7,
      },
      {
        key: 'plague_vulnerability',
        label: 'Vulnerability',
        type: 'progress',
        description: 'Plague vector: vulnerability level.',
        max: 7,
      },
    ],
  },
  {
    faction_id: 'space_marines',
    trackers: [
      {
        key: 'honour_points',
        label: 'Honour Points',
        type: 'counter',
        description: 'Earned through acts of valour and heroic deeds.',
      },
    ],
  },
  {
    faction_id: 'space_wolves',
    trackers: [
      {
        key: 'honour_points',
        label: 'Honour Points',
        type: 'counter',
        description: 'Earned through acts of valour and heroic deeds.',
      },
    ],
  },
  {
    faction_id: 'necrons',
    trackers: [
      {
        key: 'awakening_system_1',
        label: 'Awakening System I',
        type: 'progress',
        description: 'First awakening protocol progress.',
        max: 5,
      },
      {
        key: 'awakening_system_2',
        label: 'Awakening System II',
        type: 'progress',
        description: 'Second awakening protocol progress.',
        max: 5,
      },
      {
        key: 'awakening_system_3',
        label: 'Awakening System III',
        type: 'progress',
        description: 'Third awakening protocol progress.',
        max: 5,
      },
    ],
  },
  {
    faction_id: 'grey_knights',
    trackers: [
      {
        key: 'augurium_grid',
        label: 'Augurium Grid',
        type: 'grid',
        description: '3x3 grid of toggleable psychic augury cells.',
      },
    ],
  },
  {
    faction_id: 'thousand_sons',
    trackers: [
      {
        key: 'cabal_points',
        label: 'Cabal Points',
        type: 'counter',
        description: 'Accumulated sorcerous power from rituals.',
      },
      {
        key: 'cult_rank',
        label: 'Cult Rank',
        type: 'progress',
        description: 'Progress through the ranks of the cult.',
        max: 9,
      },
    ],
  },
  {
    faction_id: 'tyranids',
    trackers: [
      {
        key: 'biomass_tally',
        label: 'Biomass Tally',
        type: 'counter',
        description: 'Total biomass consumed by this organism.',
      },
      {
        key: 'devouring_progress',
        label: 'Devouring Progress',
        type: 'progress',
        description: 'Progress toward the Great Devouring.',
        max: 10,
      },
    ],
  },
  {
    faction_id: 'aeldari',
    trackers: [
      {
        key: 'threads_of_fate',
        label: 'Threads of Fate',
        type: 'toggle_list',
        description: 'Active fate threads woven by the Farseers.',
        options: [
          'The Blade Reforged',
          'The Shield Unbroken',
          'The Path Foreseen',
          'The Weave Unravelled',
          'The Storm Unleashed',
          'The Stars Aligned',
        ],
      },
    ],
  },
];

export function getFactionLegacyConfig(factionId: string): FactionLegacyConfig | null {
  return FACTION_LEGACY_CONFIGS.find(c => c.faction_id === factionId) ?? null;
}
