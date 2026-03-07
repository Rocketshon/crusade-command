import type { FactionId, FactionMeta } from '../types';

export const FACTIONS: FactionMeta[] = [
  // --- Imperium ---
  { id: 'space_marines', name: 'Space Marines', icon: '⚔️', category: 'imperium', color: 'blue', hasChapters: true },
  { id: 'space_wolves', name: 'Space Wolves', icon: '🐺', category: 'imperium', color: 'cyan' },
  { id: 'grey_knights', name: 'Grey Knights', icon: '🛡️', category: 'imperium', color: 'slate' },
  { id: 'adepta_sororitas', name: 'Adepta Sororitas', icon: '🔥', category: 'imperium', color: 'red' },
  { id: 'adeptus_custodes', name: 'Adeptus Custodes', icon: '👑', category: 'imperium', color: 'amber' },
  { id: 'adeptus_mechanicus', name: 'Adeptus Mechanicus', icon: '⚙️', category: 'imperium', color: 'orange' },
  { id: 'astra_militarum', name: 'Astra Militarum', icon: '🎖️', category: 'imperium', color: 'green' },
  { id: 'imperial_knights', name: 'Imperial Knights', icon: '🏰', category: 'imperium', color: 'yellow' },
  { id: 'imperial_agents', name: 'Imperial Agents', icon: '🔍', category: 'imperium', color: 'purple' },
  { id: 'adeptus_titanicus', name: 'Adeptus Titanicus', icon: '🤖', category: 'imperium', color: 'zinc' },
  // --- Chaos ---
  { id: 'chaos_space_marines', name: 'Chaos Space Marines', icon: '😈', category: 'chaos', color: 'red' },
  { id: 'death_guard', name: 'Death Guard', icon: '🦠', category: 'chaos', color: 'lime' },
  { id: 'thousand_sons', name: 'Thousand Sons', icon: '📿', category: 'chaos', color: 'blue' },
  { id: 'world_eaters', name: 'World Eaters', icon: '💀', category: 'chaos', color: 'red' },
  { id: 'emperors_children', name: "Emperor's Children", icon: '🎭', category: 'chaos', color: 'purple' },
  { id: 'chaos_daemons', name: 'Chaos Daemons', icon: '👹', category: 'chaos', color: 'rose' },
  { id: 'chaos_knights', name: 'Chaos Knights', icon: '⛓️', category: 'chaos', color: 'stone' },
  // --- Xenos ---
  { id: 'aeldari', name: 'Aeldari', icon: '✨', category: 'xenos', color: 'emerald' },
  { id: 'drukhari', name: 'Drukhari', icon: '🗡️', category: 'xenos', color: 'violet' },
  { id: 'necrons', name: 'Necrons', icon: '💀', category: 'xenos', color: 'emerald' },
  { id: 'orks', name: 'Orks', icon: '🪓', category: 'xenos', color: 'green' },
  { id: 'tau_empire', name: "T'au Empire", icon: '🔵', category: 'xenos', color: 'sky' },
  { id: 'tyranids', name: 'Tyranids', icon: '🐛', category: 'xenos', color: 'purple' },
  { id: 'genestealer_cults', name: 'Genestealer Cults', icon: '🧬', category: 'xenos', color: 'indigo' },
  { id: 'leagues_of_votann', name: 'Leagues of Votann', icon: '⛏️', category: 'xenos', color: 'orange' },
  { id: 'unaligned_forces', name: 'Unaligned Forces', icon: '⚪', category: 'xenos', color: 'stone' },
];

export const FACTION_MAP = new Map<FactionId, FactionMeta>(
  FACTIONS.map(f => [f.id, f])
);

export function getFaction(id: FactionId): FactionMeta | undefined {
  return FACTION_MAP.get(id);
}

export function getFactionName(id: FactionId): string {
  return FACTION_MAP.get(id)?.name ?? id;
}

export function getFactionIcon(id: FactionId): string {
  return FACTION_MAP.get(id)?.icon ?? '⚪';
}

export function getFactionsByCategory(category: 'imperium' | 'chaos' | 'xenos'): FactionMeta[] {
  return FACTIONS.filter(f => f.category === category);
}

// Space Marine chapters that have their own detachments/rules
export interface ChapterMeta {
  id: string;
  name: string;
  icon: string;
  parentFactionId: FactionId;
  uniqueDatasheets: number;
  detachments: number;
}

// Map chapter IDs to the data faction key they use for unit lookups
const CHAPTER_DATA_MAP = new Map<string, FactionId>();

export function getDataFactionId(factionId: FactionId): FactionId {
  return (CHAPTER_DATA_MAP.get(factionId) as FactionId) ?? factionId;
}

export const SPACE_MARINE_CHAPTERS: ChapterMeta[] = [
  { id: 'space_wolves', name: 'Space Wolves', icon: '🐺', parentFactionId: 'space_marines', uniqueDatasheets: 12, detachments: 4 },
  { id: 'blood_angels', name: 'Blood Angels', icon: '🩸', parentFactionId: 'space_marines', uniqueDatasheets: 8, detachments: 3 },
  { id: 'dark_angels', name: 'Dark Angels', icon: '🗡️', parentFactionId: 'space_marines', uniqueDatasheets: 10, detachments: 4 },
  { id: 'black_templars', name: 'Black Templars', icon: '✝️', parentFactionId: 'space_marines', uniqueDatasheets: 5, detachments: 2 },
  { id: 'deathwatch', name: 'Deathwatch', icon: '🔭', parentFactionId: 'space_marines', uniqueDatasheets: 3, detachments: 1 },
  { id: 'ultramarines', name: 'Ultramarines', icon: '🔷', parentFactionId: 'space_marines', uniqueDatasheets: 4, detachments: 2 },
  { id: 'imperial_fists', name: 'Imperial Fists', icon: '✊', parentFactionId: 'space_marines', uniqueDatasheets: 2, detachments: 1 },
  { id: 'iron_hands', name: 'Iron Hands', icon: '🦾', parentFactionId: 'space_marines', uniqueDatasheets: 2, detachments: 1 },
  { id: 'salamanders', name: 'Salamanders', icon: '🔥', parentFactionId: 'space_marines', uniqueDatasheets: 3, detachments: 1 },
  { id: 'raven_guard', name: 'Raven Guard', icon: '🐦‍⬛', parentFactionId: 'space_marines', uniqueDatasheets: 2, detachments: 1 },
  { id: 'white_scars', name: 'White Scars', icon: '🏇', parentFactionId: 'space_marines', uniqueDatasheets: 2, detachments: 1 },
];

// Populate chapter -> data faction mapping
for (const ch of SPACE_MARINE_CHAPTERS) {
  CHAPTER_DATA_MAP.set(ch.id, ch.parentFactionId);
}
