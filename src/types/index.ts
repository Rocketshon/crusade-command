// ============================================================
// Crusade Command — Core Type Definitions
// ============================================================

// --- Factions ---
export type FactionId =
  | 'adepta_sororitas'
  | 'adeptus_custodes'
  | 'adeptus_mechanicus'
  | 'adeptus_titanicus'
  | 'aeldari'
  | 'astra_militarum'
  | 'chaos_daemons'
  | 'chaos_knights'
  | 'chaos_space_marines'
  | 'death_guard'
  | 'drukhari'
  | 'emperors_children'
  | 'genestealer_cults'
  | 'grey_knights'
  | 'imperial_agents'
  | 'imperial_knights'
  | 'leagues_of_votann'
  | 'necrons'
  | 'orks'
  | 'space_marines'
  | 'space_wolves'
  | 'tau_empire'
  | 'thousand_sons'
  | 'tyranids'
  | 'unaligned_forces'
  | 'world_eaters';

export interface FactionMeta {
  id: FactionId;
  name: string;
  icon: string;
  category: 'imperium' | 'chaos' | 'xenos';
  color: string;
  hasChapters?: boolean;
}

// --- Campaign ---
export interface Campaign {
  id: string;
  name: string;
  join_code: string;
  supply_limit: number;
  starting_rp: number;
  created_at: string;
  current_round: number;
  owner_id: string;
  announcements?: { id: string; text: string; created_at: string }[];
}

export interface CampaignPlayer {
  id: string;
  campaign_id: string;
  user_id: string;
  name: string;
  faction_id: FactionId;
  detachment_id?: string;
  supply_used: number;
  requisition_points: number;
  battles_played: number;
  battles_won: number;
  battles_lost: number;
  battles_drawn: number;
  created_at: string;
}

// --- Crusade Units ---
export type UnitRank = 'Battle-ready' | 'Blooded' | 'Battle-hardened' | 'Heroic' | 'Legendary';

export type UnitStatus = 'ready' | 'battle_scarred' | 'recovering' | 'destroyed';

export interface CrusadeUnit {
  id: string;
  player_id: string;
  datasheet_name: string;
  custom_name: string;
  points_cost: number;
  rank: UnitRank;
  experience_points: number;
  crusade_points: number;
  battles_played: number;
  battles_survived: number;
  model_count?: number;
  equipment: string;
  battle_honours: BattleHonour[];
  battle_scars: BattleScar[];
  notes: string;
  is_destroyed: boolean;
  is_warlord: boolean;
  status: UnitStatus;
  faction_legacy: Record<string, unknown>;
  created_at: string;
}

export interface BattleHonour {
  id: string;
  type: 'battle_trait' | 'weapon_enhancement' | 'psychic_fortitude' | 'crusade_relic';
  name: string;
  description: string;
}

export interface BattleScar {
  id: string;
  name: string;
  description: string;
}

// --- Battle ---
export interface Battle {
  id: string;
  campaign_id: string;
  player_id: string;
  opponent_id: string;
  opponent_name: string;
  opponent_faction: string;
  mission_name: string;
  battle_size: 'Combat Patrol' | 'Incursion' | 'Strike Force' | 'Onslaught';
  player_vp: number;
  opponent_vp: number;
  result: 'victory' | 'defeat' | 'draw';
  units_fielded: string[];
  marked_for_greatness: string | null;
  agendas: string[];
  combat_log: CombatEngagement[];
  notes: string;
  created_at: string;
}

// --- Combat Tracker ---
export interface CombatEngagement {
  id: string;
  turn: number;
  phase: 'shooting' | 'melee';
  attacker_unit_id: string;
  attacker_unit_name: string;
  attacker_weapon: string;
  defender_unit_id: string;
  defender_unit_name: string;
  defender_player_id: string;
  attacks: number;
  hits: number;
  wounds: number;
  failed_saves: number;
  damage_dealt: number;
  models_destroyed: number;
  timestamp: string;
}

// --- Territories ---
export interface Territory {
  id: string;
  campaign_id: string;
  name: string;
  controlled_by: string | null;
  position_x: number;
  position_y: number;
  bonus_text: string;
  created_at: string;
}

// --- Campaign Announcements ---
export interface Announcement {
  id: string;
  text: string;
  author: string;
  created_at: string;
}

// --- Datasheet types (from Wahapedia scraper) ---
export interface WeaponProfile {
  name: string;
  range: string;
  A: string;
  skill: string;
  S: string;
  AP: string;
  D: string;
  traits: string[];
}

export interface UnitStats {
  M: string;
  T: string;
  Sv: string;
  W: string;
  Ld: string;
  OC: string;
}

export interface PointsCost {
  models: string;
  cost: string;
}

export interface DatasheetAbilities {
  core: string[];
  faction: string[];
  other: [string, string][];
}

export interface Datasheet {
  name: string;
  legends: boolean;
  base_size?: string;
  faction: string;
  faction_id: FactionId;
  stats: Partial<UnitStats>;
  invuln: string | null;
  ranged_weapons: WeaponProfile[];
  melee_weapons: WeaponProfile[];
  abilities: DatasheetAbilities;
  wargear_abilities: (string | [string, string])[];
  wargear_options: string[];
  unit_composition: string;
  points: PointsCost[];
  leader: string;
  damaged: string;
  keywords: string[];
  faction_keywords: string[];
}

// --- Faction Rules types ---
export interface DetachmentRule {
  name: string;
  text: string;
}

export interface DetachmentEnhancement {
  name: string;
  cost: string;
  text: string;
}

export interface DetachmentStratagem {
  name: string;
  cp: string;
  type: string;
  when: string;
  target: string;
  effect: string;
  restrictions?: string;
}

export interface DetachmentData {
  name: string;
  rule: DetachmentRule;
  enhancements: DetachmentEnhancement[];
  stratagems: DetachmentStratagem[];
  other: unknown[];
}

export interface CrusadeRule {
  name: string;
  text: string;
  sub_sections?: Array<{ name: string; text: string }>;
}

export interface FactionRulesData {
  faction: string;
  faction_id: FactionId;
  army_rules: string[];
  detachments: DetachmentData[];
  crusade_rules?: CrusadeRule[];
  boarding_actions?: unknown[];
}

// --- General Rules types ---
export interface RulesSection {
  name: string;
  subsections: string[];
  text: string;
  accordion?: Array<{ title: string; text: string }>;
}

export interface GeneralRulesDocument {
  name: string;
  sections: RulesSection[];
}
