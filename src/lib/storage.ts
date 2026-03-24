// Local storage helpers for offline-first approach

import type { Campaign, CampaignPlayer, CrusadeUnit, Battle, ArchivedCampaign, UserSession } from '../types';

export const STORAGE_KEYS = {
  CAMPAIGN: 'crusade_campaign',
  PLAYER: 'crusade_player',
  UNITS: 'crusade_units',
  BATTLES: 'crusade_battles',
  CAMPAIGN_HISTORY: 'crusade_history',
  USER: 'crusade_user',
  ALL_PLAYERS: 'crusade_all_players',
  DICE_MODE: 'crusade_dice_mode',
  REQUISITION_HISTORY: 'crusade_requisition_history',
  TUTORIAL_COMPLETED: 'crusade_tutorial_completed',
} as const;

/** Safely write to localStorage with quota error handling */
export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`[Storage] Failed to write "${key}":`, e);
    // QuotaExceededError — notify the user
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      // Dispatch a custom event so the app can show a toast
      window.dispatchEvent(new CustomEvent('crusade:storage-full'));
    }
  }
}

/** Safely read and parse JSON from localStorage, returning fallback on any error */
export function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    if (data === null) return fallback;
    return JSON.parse(data) as T;
  } catch (e) {
    console.error(`[Storage] Failed to read/parse "${key}":`, e);
    return fallback;
  }
}

// --- Campaign ---
export function saveCampaign(campaign: Campaign): void {
  safeSetItem(STORAGE_KEYS.CAMPAIGN, JSON.stringify(campaign));
}

export function loadCampaign(): Campaign | null {
  return safeGetItem<Campaign | null>(STORAGE_KEYS.CAMPAIGN, null);
}

export function clearCampaign(): void {
  localStorage.removeItem(STORAGE_KEYS.CAMPAIGN);
  localStorage.removeItem(STORAGE_KEYS.PLAYER);
  localStorage.removeItem(STORAGE_KEYS.UNITS);
  localStorage.removeItem(STORAGE_KEYS.BATTLES);

  // Clean up battle story keys
  Object.keys(localStorage)
    .filter(k => k.startsWith('crusade_battle_story_'))
    .forEach(k => localStorage.removeItem(k));
}

// --- Player ---
export function savePlayer(player: CampaignPlayer): void {
  safeSetItem(STORAGE_KEYS.PLAYER, JSON.stringify(player));
}

export function loadPlayer(): CampaignPlayer | null {
  return safeGetItem<CampaignPlayer | null>(STORAGE_KEYS.PLAYER, null);
}

// --- Units (Order of Battle) ---
export function saveUnits(units: CrusadeUnit[]): void {
  safeSetItem(STORAGE_KEYS.UNITS, JSON.stringify(units));
}

export function loadUnits(): CrusadeUnit[] {
  return safeGetItem<CrusadeUnit[]>(STORAGE_KEYS.UNITS, []);
}

export function addUnit(unit: CrusadeUnit): void {
  const units = loadUnits();
  units.push(unit);
  saveUnits(units);
}

export function updateUnit(unitId: string, updates: Partial<CrusadeUnit>): void {
  const units = loadUnits();
  const idx = units.findIndex(u => u.id === unitId);
  if (idx >= 0) {
    units[idx] = { ...units[idx], ...updates };
    saveUnits(units);
  }
}

export function removeUnit(unitId: string): void {
  const units = loadUnits().filter(u => u.id !== unitId);
  saveUnits(units);
}

// --- Battles ---
export function saveBattles(battles: Battle[]): void {
  safeSetItem(STORAGE_KEYS.BATTLES, JSON.stringify(battles));
}

export function loadBattles(): Battle[] {
  return safeGetItem<Battle[]>(STORAGE_KEYS.BATTLES, []);
}

export function addBattle(battle: Battle): void {
  const battles = loadBattles();
  battles.unshift(battle); // newest first
  saveBattles(battles);
}

// --- Campaign History ---
export type { ArchivedCampaign } from '../types';

export function saveCampaignHistory(history: ArchivedCampaign[]): void {
  safeSetItem(STORAGE_KEYS.CAMPAIGN_HISTORY, JSON.stringify(history));
}

export function loadCampaignHistory(): ArchivedCampaign[] {
  return safeGetItem<ArchivedCampaign[]>(STORAGE_KEYS.CAMPAIGN_HISTORY, []);
}

export function archiveCampaign(archive: ArchivedCampaign): void {
  const history = loadCampaignHistory();
  history.unshift(archive);
  saveCampaignHistory(history);
}

// --- User session ---
export type { UserSession } from '../types';

export function saveUser(user: UserSession): void {
  safeSetItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function loadUser(): UserSession | null {
  return safeGetItem<UserSession | null>(STORAGE_KEYS.USER, null);
}

export function clearUser(): void {
  localStorage.removeItem(STORAGE_KEYS.USER);
}

// --- Utilities ---
export function generateId(): string {
  return crypto.randomUUID();
}

export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
