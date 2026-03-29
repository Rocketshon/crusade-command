// ============================================================
// Warcaster — Crusade Rules Data
// Source: Wahapedia, Goonhammer, official GW materials
// Items marked ⚠️ should be verified against your codex
// ============================================================

// ---------------------------------------------------------------------------
// XP / Rank system (10th Edition, confirmed)
// ---------------------------------------------------------------------------

export interface RankInfo {
  name: string;
  minXP: number;
  honourSlotsTotal: number; // cumulative slots at this rank
  characterOnly: boolean;
  color: string;
}

export const XP_RANKS: RankInfo[] = [
  { name: 'Battle-ready',    minXP: 0,  honourSlotsTotal: 0, characterOnly: false, color: '#6b7280' },
  { name: 'Blooded',         minXP: 6,  honourSlotsTotal: 1, characterOnly: false, color: '#16a34a' },
  { name: 'Battle-hardened', minXP: 16, honourSlotsTotal: 2, characterOnly: false, color: '#2563eb' },
  { name: 'Heroic',          minXP: 31, honourSlotsTotal: 3, characterOnly: true,  color: '#9333ea' },
  { name: 'Legendary',       minXP: 51, honourSlotsTotal: 4, characterOnly: true,  color: '#d97706' },
];

export function getRank(xp: number, isCharacter: boolean, legendaryVeterans = false): RankInfo {
  const canAdvanceFull = isCharacter || legendaryVeterans;
  for (let i = XP_RANKS.length - 1; i >= 0; i--) {
    const rank = XP_RANKS[i];
    if (xp >= rank.minXP) {
      if (rank.characterOnly && !canAdvanceFull) continue;
      return rank;
    }
  }
  return XP_RANKS[0];
}

export function getHonourSlots(xp: number, isCharacter: boolean, legendaryVeterans = false): number {
  return getRank(xp, isCharacter, legendaryVeterans).honourSlotsTotal;
}

export function getNextRankXP(xp: number, isCharacter: boolean, legendaryVeterans = false): number | null {
  const canAdvanceFull = isCharacter || legendaryVeterans;
  for (const rank of XP_RANKS) {
    if (rank.characterOnly && !canAdvanceFull) continue;
    if (rank.minXP > xp) return rank.minXP;
  }
  return null; // already at max
}

export function getXPProgress(xp: number, isCharacter: boolean, legendaryVeterans = false): number {
  const currentRank = getRank(xp, isCharacter, legendaryVeterans);
  const nextXP = getNextRankXP(xp, isCharacter, legendaryVeterans);
  if (nextXP === null) return 1;
  const range = nextXP - currentRank.minXP;
  const progress = xp - currentRank.minXP;
  return Math.min(1, progress / range);
}

// ---------------------------------------------------------------------------
// Generic Requisitions (confirmed from Wahapedia)
// ---------------------------------------------------------------------------

export interface Requisition {
  id: string;
  name: string;
  rpCost: number;
  description: string;
}

export const GENERIC_REQUISITIONS: Requisition[] = [
  {
    id: 'increase_supply',
    name: 'Increase Supply Limit',
    rpCost: 1,
    description: '+200 points to your Supply Limit.',
  },
  {
    id: 'rearm_resupply',
    name: 'Rearm and Resupply',
    rpCost: 1,
    description: 'Change a unit\'s wargear options before a battle.',
  },
  {
    id: 'fresh_recruits',
    name: 'Fresh Recruits',
    rpCost: 1,
    description: 'Add models to an existing unit. Cost scales with number of Battle Honours (1 RP base + 1 per honour).',
  },
  {
    id: 'repair_recuperate',
    name: 'Repair and Recuperate',
    rpCost: 1,
    description: 'Remove one Battle Scar from a unit. Cost: 1 RP + 1 RP per Battle Honour on the unit (max 5 RP).',
  },
  {
    id: 'renowned_heroes',
    name: 'Renowned Heroes',
    rpCost: 1,
    description: 'Grant a CHARACTER unit an Enhancement. First costs 1 RP, second costs 2 RP, subsequent cost 3 RP each (max 3 enhancements per CHARACTER).',
  },
  {
    id: 'legendary_veterans',
    name: 'Legendary Veterans',
    rpCost: 3,
    description: 'Allows a non-CHARACTER unit to advance beyond Battle-hardened to Heroic and Legendary ranks, increasing max Battle Honours.',
  },
];

// Space Wolves specific requisitions
export const SW_REQUISITIONS: Requisition[] = [
  {
    id: 'sw_prospective_wolf_guard',
    name: 'Prospective Wolf Guard',
    rpCost: 1,
    description: 'Select an additional unit for Marked for Greatness this battle. Can only be used once per Oathsworn Campaign. ⚠️ Verify cost with codex.',
  },
  {
    id: 'sw_deeds_beyond_counting',
    name: 'Deeds Beyond Counting',
    rpCost: 1,
    description: 'Warlord takes one additional Agenda. Gain 3 Honour Points if successful; lose D3 Honour Points if failed. ⚠️ Verify cost with codex.',
  },
  {
    id: 'sw_pack_bonded',
    name: 'Pack Bonded',
    rpCost: 1,
    description: 'Spend 1 RP + 5 Honour Points to upgrade Blood Claws or Grey Hunters to the next tier (retaining XP and Battle Scars).',
  },
  {
    id: 'sw_warriors_of_legend',
    name: 'Warriors of Legend',
    rpCost: 1,
    description: 'At end of Oathsworn Campaign: grant one Legendary CHARACTER an additional Deed of Making (does not count toward Battle Honour limit).',
  },
];

// ---------------------------------------------------------------------------
// Agendas
// ---------------------------------------------------------------------------

export interface Agenda {
  id: string;
  name: string;
  description: string;
  bonusXPAmount?: number; // typical bonus XP per trigger
  awardedTo?: string; // who gets the XP
  honourPointsAmount?: number; // bonus honour points if applicable
  verified: boolean; // false = needs codex verification
}

export const GENERIC_AGENDAS: Agenda[] = [
  {
    id: 'dominate_battlezone',
    name: 'Dominate Battlezone',
    description: 'For each battlefield quarter where your units outnumber the enemy\'s, select one of those units to gain 2 XP.',
    bonusXPAmount: 2,
    verified: true,
  },
  {
    id: 'monster_hunting',
    name: 'Monster Hunting',
    description: 'Each time your models destroy an enemy MONSTER or VEHICLE (non-TRANSPORT), that unit gains 2 XP. 4 XP if the target is TITANIC.',
    bonusXPAmount: 2,
    verified: true,
  },
  {
    id: 'character_assassination',
    name: 'Character Assassination',
    description: 'Each time your models destroy an enemy CHARACTER unit, that unit gains 2 XP. 4 XP if the target was the opponent\'s WARLORD.',
    bonusXPAmount: 2,
    verified: true,
  },
];

export const SW_AGENDAS: Agenda[] = [
  {
    id: 'sw_first_into_fray',
    name: 'First into the Fray',
    description: 'The first unit to charge in each battle round gains 1 XP. If you charge in 4 or more of the 5 battle rounds, also gain 3 Honour Points.',
    bonusXPAmount: 1,
    honourPointsAmount: 3,
    verified: true,
  },
  {
    id: 'sw_show_them',
    name: 'Show Them How We Fight',
    description: 'Blood Claws units earn bonus XP for destroying enemy units while near a Wolf Guard unit. Earn Honour Points upon completing the condition. ⚠️ Verify exact XP amounts with codex.',
    bonusXPAmount: 2,
    honourPointsAmount: 2,
    verified: false,
  },
  {
    id: 'sw_circling_wolves',
    name: 'Circling Wolves',
    description: 'At battle end, if three of your surviving units form a triangle around an enemy unit, each gains 2 XP and you gain 4 Honour Points.',
    bonusXPAmount: 2,
    honourPointsAmount: 4,
    verified: true,
  },
  {
    id: 'sw_warriors_pride',
    name: 'Warrior\'s Pride',
    description: 'Select three Characters before battle. Each gains bonus XP for destroying MONSTERS or CHARACTERS. Extra XP if surviving and near an objective. ⚠️ Verify exact values with codex.',
    bonusXPAmount: 2,
    verified: false,
  },
  {
    id: 'sw_howls_vengeance',
    name: 'Howls of Vengeance',
    description: 'Your units gain bonus XP for destroying enemy units that previously destroyed your Space Wolves units. ⚠️ Verify exact values with codex.',
    bonusXPAmount: 2,
    verified: false,
  },
  {
    id: 'sw_audacious_boasts',
    name: 'Audacious Boasts',
    description: 'Your Warlord declares up to 10 different boasts before battle. Gain 1 XP per completed boast — but if any boast is failed, gain nothing. All or nothing.',
    bonusXPAmount: 1,
    verified: true,
  },
  {
    id: 'sw_heroic_challenge',
    name: 'Heroic Challenge',
    description: 'Gain Honour Points for destroying enemy CHARACTER models in melee combat. ⚠️ Verify exact values with codex.',
    honourPointsAmount: 2,
    verified: false,
  },
  {
    id: 'sw_mighty_trophies',
    name: 'Mighty Trophies',
    description: 'Your opponent nominates 5 of their units before battle. If you destroy 3 or more of them, earn XP and/or Honour Points. ⚠️ Verify exact values with codex.',
    bonusXPAmount: 2,
    verified: false,
  },
  {
    id: 'sw_oathkeeper',
    name: 'Oathkeeper',
    description: 'Complete your "Oath of the Moment" objectives during battle. Earn Honour Points for each one met. ⚠️ Verify exact values with codex.',
    honourPointsAmount: 2,
    verified: false,
  },
];

export const SM_AGENDAS: Agenda[] = [
  {
    id: 'sm_angels_of_death',
    name: 'Angels of Death',
    description: 'Table the opponent. All surviving units gain 2 XP and 2 Honour Points.',
    bonusXPAmount: 2,
    honourPointsAmount: 2,
    verified: true,
  },
  {
    id: 'sm_know_no_fear',
    name: 'Know No Fear',
    description: 'Units that never failed a Battle-shock test gain 1 XP. Units that were below half strength at some point and still passed gain 2 XP.',
    bonusXPAmount: 1,
    verified: true,
  },
  {
    id: 'sm_armoured_assault',
    name: 'Armoured Assault',
    description: 'Surviving VEHICLE units gain 1 XP. Destroyed VEHICLE units gain 1 XP if they destroyed 2+ enemy units.',
    bonusXPAmount: 1,
    verified: true,
  },
  {
    id: 'sm_quest_atonement',
    name: 'Quest of Atonement',
    description: 'Units with a Battle Scar: if they destroy an enemy CHARACTER, VEHICLE, or MONSTER — remove the scar and gain +5 XP bonus.',
    bonusXPAmount: 5,
    verified: true,
  },
];

export const CSM_AGENDAS: Agenda[] = [
  {
    id: 'csm_servants_darkness',
    name: 'Servants of Darkness',
    description: 'CSM faction agenda. ⚠️ Verify full rules with codex.',
    verified: false,
  },
];

export const DG_AGENDAS: Agenda[] = [
  {
    id: 'dg_sow_seeds',
    name: 'Sow the Seeds of Corruption',
    description: 'Nominate 3 objectives. Seed them with Death Guard Infantry. Seeding all 3 grants a Fecundity point; seeding 2 grants one on a 4+.',
    verified: true,
  },
  {
    id: 'dg_unwitting_vectors',
    name: 'Unwitting Vectors',
    description: 'One surviving Death Guard unit gains 3 XP based on surviving enemy units. ⚠️ Verify exact conditions with codex.',
    bonusXPAmount: 3,
    verified: false,
  },
  {
    id: 'dg_viral_harvest',
    name: 'Viral Harvest',
    description: 'Objectives in No Man\'s Land become Vector Targets. Death Guard Infantry harvest from them for up to 3 XP per objective (1 XP per harvest). ⚠️ Verify with codex.',
    bonusXPAmount: 3,
    verified: false,
  },
];

export const WE_AGENDAS: Agenda[] = [
  {
    id: 'we_blood_for_blood_god',
    name: 'Blood for the Blood God!',
    description: 'Each time an enemy unit is destroyed by a melee attack, that unit gains 1 XP (max 3 XP per battle).',
    bonusXPAmount: 1,
    verified: true,
  },
  {
    id: 'we_skulls_skull_throne',
    name: 'Skulls for the Skull Throne!',
    description: 'Each time a World Eaters model destroys an enemy CHARACTER or MONSTER with melee, that unit gains 2 XP (4 XP if it was the opponent\'s Warlord). Max 5 XP/battle. If 4+ XP gained, also gain 1 Skull Point.',
    bonusXPAmount: 2,
    verified: true,
  },
];

export const AM_AGENDAS: Agenda[] = [
  {
    id: 'am_advance_emperor',
    name: 'Advance, for the Emperor!',
    description: 'At battle end, select up to 6 Astra Militarum units wholly in the opponent\'s deployment zone. Each gains 1 XP. If your Warlord is one of these units, gain 1 Commendation Point.',
    bonusXPAmount: 1,
    verified: true,
  },
];

export function getAgendasForFaction(factionId: string): Agenda[] {
  const generic = GENERIC_AGENDAS;
  switch (factionId) {
    case 'space_wolves': return [...SW_AGENDAS, ...generic];
    case 'space_marines': return [...SM_AGENDAS, ...generic];
    case 'chaos_space_marines': return [...CSM_AGENDAS, ...generic];
    case 'death_guard': return [...DG_AGENDAS, ...generic];
    case 'world_eaters': return [...WE_AGENDAS, ...generic];
    case 'astra_militarum': return [...AM_AGENDAS, ...generic];
    default: return generic;
  }
}

// ---------------------------------------------------------------------------
// Space Wolves Deeds of Making (partial — verify with codex)
// ---------------------------------------------------------------------------

export interface DeedOfMaking {
  id: string;
  name: string;
  honourPointCost: number;
  description: string;
  verified: boolean;
}

export const SW_DEEDS_OF_MAKING: DeedOfMaking[] = [
  {
    id: 'sw_deed_savage_orator',
    name: 'Savage Orator',
    honourPointCost: 10,
    description: 'Units attached to this CHARACTER gain +1 to their Hit Rolls.',
    verified: true, // mentioned in Goonhammer review + user transcript
  },
  {
    id: 'sw_deed_beast_slayer',
    name: 'Beast Slayer',
    honourPointCost: 15,
    description: 'Re-roll wound rolls when attacking MONSTER units.',
    verified: true,
  },
  {
    id: 'sw_deed_death_cheat',
    name: 'Death Cheat',
    honourPointCost: 10,
    description: 'Re-roll Out of Action tests for this CHARACTER.',
    verified: true,
  },
  {
    id: 'sw_deed_wyrmslayer',
    name: 'Wyrmslayer',
    honourPointCost: 10,
    description: 'Special abilities for dealing with dread beasts. Hurricane of blows with thunder hammer. ⚠️ Verify full rules with codex.',
    verified: false,
  },
];

// ---------------------------------------------------------------------------
// Oathsworn Campaigns / Sagas (Space Wolves)
// ⚠️ Verify full bonus agendas with codex
// ---------------------------------------------------------------------------

export interface OathswornCampaign {
  id: string;
  name: string;
  description: string;
  bonusAgendaIds: string[];
  verified: boolean;
}

export const SW_OATHSWORN_CAMPAIGNS: OathswornCampaign[] = [
  {
    id: 'sw_saga_bold',
    name: 'Saga of the Bold',
    description: 'Theme of heroic defiance and glorious overkill. Characters and units they lead gain powerful buffs. ⚠️ Verify bonus agendas with codex.',
    bonusAgendaIds: ['sw_audacious_boasts', 'sw_heroic_challenge'],
    verified: false,
  },
  {
    id: 'sw_saga_beastslayer',
    name: 'Saga of the Beastslayer',
    description: 'Theme of hunting large prey — Monsters, Vehicles, Characters. After slaying enough beasts, gain Lethal Hits against these target types. ⚠️ Verify bonus agendas with codex.',
    bonusAgendaIds: ['sw_warriors_pride', 'sw_mighty_trophies'],
    verified: false,
  },
  {
    id: 'sw_saga_hunter',
    name: 'Saga of the Hunter',
    description: 'Theme of mobility, surgical strikes, and targeting weak enemy units. ⚠️ Verify bonus agendas with codex.',
    bonusAgendaIds: ['sw_oathkeeper', 'sw_circling_wolves'],
    verified: false,
  },
];

// ---------------------------------------------------------------------------
// Factions + Detachments
// ⚠️ Detachment lists are partial — verify full lists with codex
// ---------------------------------------------------------------------------

export type FactionMechanic =
  | 'honour_points'    // SW, SM
  | 'glory'            // CSM
  | 'virulence'        // Death Guard
  | 'skulls'           // World Eaters
  | 'commendations'    // Astra Militarum
  | 'none';

export interface CrusadeFaction {
  id: string;
  name: string;
  mechanic: FactionMechanic;
  mechanicLabel: string;
  detachments: string[];
  agendas: Agenda[];
  hasDeeds: boolean;
  hasOathswornCampaigns: boolean;
}

export const CRUSADE_FACTIONS: CrusadeFaction[] = [
  {
    id: 'space_wolves',
    name: 'Space Wolves',
    mechanic: 'honour_points',
    mechanicLabel: 'Honour Points',
    detachments: [
      'Stormlance Task Force',
      '⚠️ Other detachments — check codex supplement',
    ],
    agendas: [...SW_AGENDAS, ...GENERIC_AGENDAS],
    hasDeeds: true,
    hasOathswornCampaigns: true,
  },
  {
    id: 'space_marines',
    name: 'Space Marines',
    mechanic: 'honour_points',
    mechanicLabel: 'Honour Points',
    detachments: [
      'Gladius Task Force',
      'Spearhead Assault',
      'Anvil Siege Force',
      'Vanguard Spearhead',
      'Firestorm Assault Force',
      '1st Company Task Force',
      '⚠️ Chapter-specific detachments — check supplement',
    ],
    agendas: [...SM_AGENDAS, ...GENERIC_AGENDAS],
    hasDeeds: false,
    hasOathswornCampaigns: true,
  },
  {
    id: 'chaos_space_marines',
    name: 'Chaos Space Marines',
    mechanic: 'glory',
    mechanicLabel: 'Glory',
    detachments: [
      '⚠️ Verify detachment names with CSM codex',
    ],
    agendas: [...CSM_AGENDAS, ...GENERIC_AGENDAS],
    hasDeeds: false,
    hasOathswornCampaigns: false,
  },
  {
    id: 'death_guard',
    name: 'Death Guard',
    mechanic: 'virulence',
    mechanicLabel: 'Virulence Points',
    detachments: [
      '⚠️ Verify detachment names with Death Guard codex',
    ],
    agendas: [...DG_AGENDAS, ...GENERIC_AGENDAS],
    hasDeeds: false,
    hasOathswornCampaigns: false,
  },
  {
    id: 'world_eaters',
    name: 'World Eaters',
    mechanic: 'skulls',
    mechanicLabel: 'Skull Points',
    detachments: [
      '⚠️ Verify detachment names with World Eaters codex',
    ],
    agendas: [...WE_AGENDAS, ...GENERIC_AGENDAS],
    hasDeeds: false,
    hasOathswornCampaigns: false,
  },
  {
    id: 'astra_militarum',
    name: 'Astra Militarum',
    mechanic: 'commendations',
    mechanicLabel: 'Commendation Points',
    detachments: [
      '⚠️ Verify detachment names with Astra Militarum codex',
    ],
    agendas: [...AM_AGENDAS, ...GENERIC_AGENDAS],
    hasDeeds: false,
    hasOathswornCampaigns: false,
  },
];

export function getFactionById(id: string): CrusadeFaction | undefined {
  return CRUSADE_FACTIONS.find(f => f.id === id);
}

// ---------------------------------------------------------------------------
// Battle Honour types
// ---------------------------------------------------------------------------

export const BATTLE_HONOUR_TYPES = [
  { id: 'battle_trait',        label: 'Battle Trait',       description: 'Passive ability buff from your faction\'s Battle Traits table' },
  { id: 'weapon_enhancement',  label: 'Weapon Enhancement', description: 'Upgrade a specific weapon on the unit (from core Space Marines/Chaos codex)' },
  { id: 'crusade_relic',       label: 'Crusade Relic',      description: 'Powerful gear for CHARACTER units only' },
] as const;

export type BattleHonourType = (typeof BATTLE_HONOUR_TYPES)[number]['id'];

// ---------------------------------------------------------------------------
// Unit keyword groups (for determining which Battle Trait table to use)
// ---------------------------------------------------------------------------

export const UNIT_TYPE_GROUPS = [
  { id: 'character',      label: 'Character',               keywords: ['CHARACTER'] },
  { id: 'infantry',       label: 'Infantry',                keywords: ['INFANTRY'] },
  { id: 'vehicle',        label: 'Vehicle',                 keywords: ['VEHICLE'] },
  { id: 'beast',          label: 'Beast / Cavalry',         keywords: ['BEAST', 'CAVALRY', 'MOUNTED'] },
  { id: 'monster',        label: 'Monster',                 keywords: ['MONSTER'] },
  { id: 'wulfen_twc',     label: 'Wulfen / Thunderwolf',    keywords: ['WULFEN', 'THUNDERWOLF CAVALRY'] },
  { id: 'fly',            label: 'Fly',                     keywords: ['FLY'] },
] as const;

// ---------------------------------------------------------------------------
// CSM Glory mechanics
// ---------------------------------------------------------------------------

export const CSM_GLORY_CATEGORIES = [
  { id: 'personal',  label: 'Personal Glory',  description: 'Your Warband Champion\'s personal renown' },
  { id: 'dark_god',  label: 'Dark God Glory',  description: 'Favour from the Dark Gods' },
  { id: 'warfleet',  label: 'Warfleet Glory',  description: 'Your warband\'s naval and logistical strength' },
];

// ---------------------------------------------------------------------------
// Death Guard Plague config
// ⚠️ These are placeholder options — verify exact plague parts with codex
// ---------------------------------------------------------------------------

export const DG_PLAGUE_VECTORS = [
  'Miasma of Pestilence', 'Rot Flies', 'Bloated Corpse Explosion',
  '⚠️ Verify full Vector list with Death Guard codex',
];

export const DG_PLAGUE_INFECTIONS = [
  'Disgusting Resilience', 'Nurgle\'s Rot', 'Plague Wind',
  '⚠️ Verify full Infection list with Death Guard codex',
];

export const DG_PLAGUE_TERMINI = [
  'Terminal Decay', 'Nurgles Embrace', 'Blightful End',
  '⚠️ Verify full Terminus list with Death Guard codex',
];

// ---------------------------------------------------------------------------
// Weapon Enhancements
// These are Battle Honours that upgrade a specific weapon on a unit.
// Source: 10th Edition Core Crusade Rules + faction supplements
// ---------------------------------------------------------------------------

export type WeaponEnhancementAppliesTo = 'ranged' | 'melee' | 'both';

export interface WeaponEnhancement {
  id: string;
  name: string;
  appliesTo: WeaponEnhancementAppliesTo;
  effect: string;              // Short text shown on unit card
  rules: string;               // Full rules text
  verified: boolean;           // false = needs codex verification
  factionRestriction?: string; // undefined = generic (all factions)
}

// Generic weapon enhancements from core 10th Edition Crusade rules.
// Source: Leviathan supplement + Wahapedia. All confirmed.
export const GENERIC_WEAPON_ENHANCEMENTS: WeaponEnhancement[] = [
  // ---- Ranged ----
  {
    id: 'calibrated_sights',
    name: 'Calibrated Sights',
    appliesTo: 'ranged',
    effect: '+1 to Hit rolls',
    rules: 'Add 1 to Hit rolls made with this weapon.',
    verified: true,
  },
  {
    id: 'dum_dum_rounds',
    name: 'Dum-dum Rounds',
    appliesTo: 'ranged',
    effect: '[LETHAL HITS]',
    rules: 'This weapon gains the [LETHAL HITS] ability.',
    verified: true,
  },
  {
    id: 'helical_targeting_array',
    name: 'Helical Targeting Array',
    appliesTo: 'ranged',
    effect: '+1 to Wound rolls',
    rules: 'Add 1 to Wound rolls made with this weapon.',
    verified: true,
  },
  {
    id: 'ranged_master_crafted',
    name: 'Master-Crafted',
    appliesTo: 'ranged',
    effect: '+1 Damage',
    rules: 'Add 1 to the Damage characteristic of this weapon.',
    verified: true,
  },
  {
    id: 'ranged_relic',
    name: 'Relic',
    appliesTo: 'ranged',
    effect: '+1 Strength',
    rules: 'Add 1 to the Strength characteristic of this weapon.',
    verified: true,
  },
  // ---- Melee ----
  {
    id: 'tempered',
    name: 'Tempered',
    appliesTo: 'melee',
    effect: '+1 Attacks',
    rules: 'Add 1 to the Attacks characteristic of this weapon.',
    verified: true,
  },
  {
    id: 'sharp',
    name: 'Sharp',
    appliesTo: 'melee',
    effect: '+1 to Wound rolls',
    rules: 'Add 1 to Wound rolls made with this weapon.',
    verified: true,
  },
  {
    id: 'melee_master_crafted',
    name: 'Master-Crafted',
    appliesTo: 'melee',
    effect: '+1 Damage',
    rules: 'Add 1 to the Damage characteristic of this weapon.',
    verified: true,
  },
  {
    id: 'melee_relic',
    name: 'Relic',
    appliesTo: 'melee',
    effect: '+1 Strength',
    rules: 'Add 1 to the Strength characteristic of this weapon.',
    verified: true,
  },
  {
    id: 'blessed',
    name: 'Blessed',
    appliesTo: 'melee',
    effect: '[ANTI-CHAOS 4+]',
    rules: 'This weapon gains the [ANTI-CHAOS 4+] ability. ⚠️ Verify exact keyword with codex.',
    verified: false,
  },
];

// Faction-specific weapon enhancements — to be expanded per codex
// ⚠️ All entries need codex verification
export const FACTION_WEAPON_ENHANCEMENTS: WeaponEnhancement[] = [
  {
    id: 'sw_frostforged',
    name: 'Frostforged',
    appliesTo: 'melee',
    effect: '[DEVASTATING WOUNDS], Frost',
    rules: 'This weapon gains [DEVASTATING WOUNDS]. ⚠️ Verify with Space Wolves codex supplement.',
    verified: false,
    factionRestriction: 'space_wolves',
  },
  {
    id: 'sw_runecarved',
    name: 'Rune-Carved',
    appliesTo: 'both',
    effect: '[ANTI-DAEMON 4+]',
    rules: 'This weapon gains [ANTI-DAEMON 4+]. ⚠️ Verify with Space Wolves codex supplement.',
    verified: false,
    factionRestriction: 'space_wolves',
  },
  {
    id: 'csm_daemonforged',
    name: 'Daemon-Forged',
    appliesTo: 'melee',
    effect: '+1 Attacks, [SUSTAINED HITS 1]',
    rules: 'Add 1 to this weapon\'s Attacks. It gains [SUSTAINED HITS 1]. ⚠️ Verify with CSM codex.',
    verified: false,
    factionRestriction: 'chaos_space_marines',
  },
  {
    id: 'dg_plague_weapon',
    name: 'Plague Weapon',
    appliesTo: 'melee',
    effect: '[LETHAL HITS], [POISONED ATTACKS 4+]',
    rules: 'This weapon gains [LETHAL HITS] and [POISONED ATTACKS 4+]. ⚠️ Verify with Death Guard codex.',
    verified: false,
    factionRestriction: 'death_guard',
  },
  {
    id: 'we_blood_blessed',
    name: 'Blood-Blessed',
    appliesTo: 'melee',
    effect: '+1 Attacks while enemy is bleeding',
    rules: 'While the target is Below Half-strength, add 1 to this weapon\'s Attacks. ⚠️ Verify with World Eaters codex.',
    verified: false,
    factionRestriction: 'world_eaters',
  },
];

/**
 * Get all weapon enhancements applicable to a unit from a given faction,
 * filtered by weapon type.
 */
export function getWeaponEnhancements(
  factionId: string,
  weaponType: 'ranged' | 'melee',
): WeaponEnhancement[] {
  const generic = GENERIC_WEAPON_ENHANCEMENTS.filter(
    e => e.appliesTo === weaponType || e.appliesTo === 'both',
  );
  const faction = FACTION_WEAPON_ENHANCEMENTS.filter(
    e => e.factionRestriction === factionId && (e.appliesTo === weaponType || e.appliesTo === 'both'),
  );
  return [...generic, ...faction];
}

// ---------------------------------------------------------------------------
// Weapon Modifications — official stat buffs (confirmed from GW Crusade Rules PDF)
// Each unit selects TWO different modifications for one weapon.
// ---------------------------------------------------------------------------

export interface WeaponModification {
  id: string;
  name: string;
  effect: string;       // Short description (e.g. "+1 Strength")
  rulesText: string;    // Full rules text from the PDF
}

export const WEAPON_MODIFICATIONS: WeaponModification[] = [
  {
    id: 'finely_balanced',
    name: 'Finely Balanced',
    effect: '+1 Ballistic Skill or Weapon Skill',
    rulesText: 'Improve this weapon\'s Ballistic Skill or Weapon Skill characteristic by 1.',
  },
  {
    id: 'brutal',
    name: 'Brutal',
    effect: '+1 Strength',
    rulesText: 'Add 1 to this weapon\'s Strength characteristic.',
  },
  {
    id: 'armour_piercing',
    name: 'Armour Piercing',
    effect: '-1 AP (improved)',
    rulesText: 'Improve this weapon\'s Armour Penetration characteristic by 1.',
  },
  {
    id: 'master_worked',
    name: 'Master-Worked',
    effect: '+1 Damage',
    rulesText: 'Add 1 to this weapon\'s Damage characteristic.',
  },
  {
    id: 'heirloom',
    name: 'Heirloom',
    effect: '+1 Attacks',
    rulesText: 'Add 1 to this weapon\'s Attacks characteristic.',
  },
  {
    id: 'precise',
    name: 'Precise',
    effect: 'Critical Wounds gain [PRECISION]',
    rulesText: 'Each time a Critical Wound is scored for an attack made with this weapon, that attack has the [PRECISION] ability.',
  },
];

// ---------------------------------------------------------------------------
// Official Battle Scars — confirmed from GW Crusade Rules PDF Sep 2024
// ---------------------------------------------------------------------------

export interface OfficialBattleScar {
  id: string;
  name: string;
  effect: string;
  rulesText: string;
}

export const OFFICIAL_BATTLE_SCARS: OfficialBattleScar[] = [
  {
    id: 'crippling_damage',
    name: 'Crippling Damage',
    effect: 'Cannot Advance; -1" Move',
    rulesText: 'This unit cannot Advance and you must subtract 1" from the Move characteristic of models in this unit.',
  },
  {
    id: 'battle_weary',
    name: 'Battle-Weary',
    effect: '-1 to Battle-shock, Leadership, Desperate Escape & Out of Action tests',
    rulesText: 'Each time this unit takes a Battle-shock, Leadership, Desperate Escape or Out of Action test, subtract 1 from that test.',
  },
  {
    id: 'fatigued',
    name: 'Fatigued',
    effect: '-1 OC; no Charge bonus',
    rulesText: 'Subtract 1 from the Objective Control characteristic of models in this unit and this unit never receives a Charge bonus.',
  },
  {
    id: 'disgraced',
    name: 'Disgraced',
    effect: 'No Stratagems; cannot be Marked for Greatness',
    rulesText: 'You cannot use any Stratagems to affect this unit and this unit cannot be Marked for Greatness.',
  },
  {
    id: 'mark_of_shame',
    name: 'Mark of Shame',
    effect: 'No Attached units; no Aura abilities; cannot be Marked for Greatness',
    rulesText: 'This unit cannot form an Attached unit, it is unaffected by the Aura abilities of friendly units, and it cannot be Marked for Greatness.',
  },
  {
    id: 'deep_scars',
    name: 'Deep Scars',
    effect: 'Critical Hits automatically wound',
    rulesText: 'Each time a Critical Hit is scored against this unit, that attack automatically wounds this unit.',
  },
];
