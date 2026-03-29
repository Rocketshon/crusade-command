import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { syncArmiesToIDB, recoverArmiesFromIDB, initDB } from './offlineStore';
// Inline rank calculation (was in ranks.ts)
function getRankFromXP(xp: number): string {
  if (xp >= 51) return 'Legendary';
  if (xp >= 31) return 'Heroic';
  if (xp >= 16) return 'Battle-hardened';
  if (xp >= 6) return 'Blooded';
  return 'Battle-ready';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ArmyMode = 'standard' | 'crusade' | null;

export interface BattleHonour {
  id: string;
  name: string;
  type: string; // 'battle_trait' | 'weapon_enhancement' | 'crusade_relic'
  // Weapon enhancement fields (populated when type === 'weapon_enhancement')
  weaponName?: string;        // Which weapon is enhanced (from datasheet)
  weaponType?: 'ranged' | 'melee';
  enhancementId?: string;     // ID from GENERIC/FACTION_WEAPON_ENHANCEMENTS
  enhancementEffect?: string; // Short effect text
}

export interface BattleScar {
  id: string;
  name: string;
  effect: string;
}

export interface ArmyUnit {
  id: string;
  datasheet_name: string;
  custom_name: string;
  points_cost: number;
  faction_id: string;
  wargear_notes: string;       // Loadout / wargear notes
  is_character: boolean;
  is_warlord: boolean;
  // Crusade fields
  experience_points: number;
  crusade_points: number;
  battles_played: number;
  battles_survived: number;
  total_kills: number;
  legendary_veterans: boolean; // Unlocked via 3 RP requisition
  rank: string;
  battle_honours: BattleHonour[];
  battle_scars: BattleScar[];
  is_destroyed: boolean;
}

export interface CrusadeBattleRecord {
  id: string;
  date: string;
  result: 'win' | 'loss' | 'draw';
  opponent?: string;
  missionName?: string;
  rpGained: number;
  notes?: string;
  unitResults: {
    unitId: string;
    survived: boolean;
    kills: number;
    xpGained: number;
    markedForGreatness: boolean;
  }[];
}

export interface CrusadeCampaignData {
  rp: number;
  wins: number;
  losses: number;
  draws: number;
  oathswornCampaignId?: string;
  battles: CrusadeBattleRecord[];
  // Faction-specific mechanic points
  factionPoints: number;        // honour points / skulls / virulence / glory / commendations
  factionPointsLabel: string;   // e.g. "Honour Points"
  // CSM has 3 glory categories
  csmGlory?: { personal: number; darkGod: number; warfleet: number };
}

export interface SavedArmy {
  id: string;
  name: string;
  mode: ArmyMode;
  factionId: string | null;
  detachmentName: string | null;
  supplyLimit: number;
  units: ArmyUnit[];
  crusade?: CrusadeCampaignData;
  createdAt: string;
  updatedAt: string;
}

interface ArmyState {
  mode: ArmyMode;
  factionId: string | null;
  detachmentName: string | null;
  supplyLimit: number;
  army: ArmyUnit[];
  crusade: CrusadeCampaignData | undefined;
  // Multi-army
  savedArmies: SavedArmy[];
  activeArmyId: string | null;
  setMode: (mode: ArmyMode) => void;
  setFaction: (factionId: string | null) => void;
  setDetachment: (name: string | null) => void;
  setSupplyLimit: (limit: number) => void;
  addUnit: (params: {
    datasheetName: string;
    pointsCost: number;
    factionId?: string;
    isCharacter?: boolean;
    wargearNotes?: string;
  }) => void;
  removeUnit: (unitId: string) => void;
  updateUnit: (unitId: string, updates: Partial<ArmyUnit>) => void;
  clearArmy: () => void;
  // Crusade — unit actions
  awardXP: (unitId: string, xp: number) => void;
  addBattleHonour: (unitId: string, honour: Omit<BattleHonour, 'id'>) => void;
  removeBattleHonour: (unitId: string, honourId: string) => void;
  addBattleScar: (unitId: string, scar: Omit<BattleScar, 'id'>) => void;
  removeBattleScar: (unitId: string, scarId: string) => void;
  setWarlord: (unitId: string) => void;
  buyLegendaryVeterans: (unitId: string) => void;
  // Crusade — campaign actions
  recordBattle: (battle: Omit<CrusadeBattleRecord, 'id' | 'date'>) => void;
  spendRP: (amount: number) => void;
  gainRP: (amount: number) => void;
  updateFactionPoints: (delta: number) => void;
  updateCSMGlory: (category: 'personal' | 'darkGod' | 'warfleet', delta: number) => void;
  initCrusadeCampaign: (params: {
    factionId: string;
    detachmentName: string;
    supplyLimit: number;
    startingRP: number;
    oathswornCampaignId?: string;
    factionPointsLabel: string;
  }) => void;
  // Multi-army actions
  createArmy: (name: string, armyMode?: ArmyMode) => string;
  deleteArmy: (armyId: string) => void;
  switchArmy: (armyId: string) => void;
  renameArmy: (armyId: string, name: string) => void;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const KEYS = {
  mode: 'army_mode',
  faction: 'army_faction',
  detachment: 'army_detachment',
  supplyLimit: 'army_supply_limit',
  units: 'army_units',
  savedArmies: 'army_saved_lists',
  activeArmyId: 'army_active_id',
} as const;

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Migration: convert old single-army localStorage to saved army
// ---------------------------------------------------------------------------

function migrateOldData(): { savedArmies: SavedArmy[]; activeArmyId: string | null } {
  const existingSaved = loadJSON<SavedArmy[]>(KEYS.savedArmies, []);
  const existingActiveId = loadJSON<string | null>(KEYS.activeArmyId, null);

  if (existingSaved.length > 0) {
    // Migrate: strip pointsCap from any saved armies that have it
    const migrated = existingSaved.map((a: SavedArmy & { pointsCap?: number }) => {
      const { pointsCap: _pc, ...rest } = a;
      return rest as SavedArmy;
    });
    return { savedArmies: migrated, activeArmyId: existingActiveId };
  }

  const oldMode = loadJSON<ArmyMode>(KEYS.mode, null);
  const oldFaction = loadJSON<string | null>(KEYS.faction, null);
  const oldDetachment = loadJSON<string | null>(KEYS.detachment, null);
  const oldUnits = loadJSON<ArmyUnit[]>(KEYS.units, []);
  const oldSupplyLimit = loadJSON<number>(KEYS.supplyLimit, 1000);
  const hasOldData = oldMode !== null || oldUnits.length > 0;

  if (!hasOldData) {
    return { savedArmies: [], activeArmyId: null };
  }

  const migratedId = crypto.randomUUID();
  const now = new Date().toISOString();
  const migratedArmy: SavedArmy = {
    id: migratedId,
    name: 'My Army',
    mode: oldMode,
    factionId: oldFaction,
    detachmentName: oldDetachment,
    supplyLimit: oldSupplyLimit,
    units: oldUnits,
    createdAt: now,
    updatedAt: now,
  };

  const savedArmies = [migratedArmy];
  saveJSON(KEYS.savedArmies, savedArmies);
  saveJSON(KEYS.activeArmyId, migratedId);
  return { savedArmies, activeArmyId: migratedId };
}

function defaultCrusadeData(params: {
  factionPointsLabel: string;
  oathswornCampaignId?: string;
  startingRP?: number;
}): CrusadeCampaignData {
  return {
    rp: params.startingRP ?? 5,
    wins: 0, losses: 0, draws: 0,
    oathswornCampaignId: params.oathswornCampaignId,
    battles: [],
    factionPoints: 0,
    factionPointsLabel: params.factionPointsLabel,
    csmGlory: { personal: 0, darkGod: 0, warfleet: 0 },
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ArmyContext = createContext<ArmyState | null>(null);

export function ArmyProvider({ children }: { children: ReactNode }) {
  const migrated = useRef(migrateOldData()).current;

  const [savedArmies, setSavedArmies] = useState<SavedArmy[]>(migrated.savedArmies);
  const [activeArmyId, setActiveArmyId] = useState<string | null>(migrated.activeArmyId);

  const activeArmy = migrated.savedArmies.find(a => a.id === migrated.activeArmyId);

  const [mode, setModeState] = useState<ArmyMode>(() => activeArmy?.mode ?? loadJSON<ArmyMode>(KEYS.mode, null));
  const [factionId, setFactionState] = useState<string | null>(() => activeArmy?.factionId ?? null);
  const [detachmentName, setDetachmentState] = useState<string | null>(() => activeArmy?.detachmentName ?? null);
  const [supplyLimit, setSupplyLimitState] = useState<number>(() => activeArmy?.supplyLimit ?? 1000);
  const [army, setArmy] = useState<ArmyUnit[]>(() => activeArmy?.units ?? []);
  const [crusade, setCrusade] = useState<CrusadeCampaignData | undefined>(() => activeArmy?.crusade);

  useEffect(() => { saveJSON(KEYS.mode, mode); }, [mode]);
  useEffect(() => { saveJSON(KEYS.faction, factionId); }, [factionId]);
  useEffect(() => { saveJSON(KEYS.detachment, detachmentName); }, [detachmentName]);
  useEffect(() => { saveJSON(KEYS.supplyLimit, supplyLimit); }, [supplyLimit]);
  useEffect(() => { saveJSON(KEYS.units, army); }, [army]);
  useEffect(() => { saveJSON(KEYS.savedArmies, savedArmies); }, [savedArmies]);
  useEffect(() => { saveJSON(KEYS.activeArmyId, activeArmyId); }, [activeArmyId]);

  useEffect(() => {
    syncArmiesToIDB(savedArmies).catch(() => {});
  }, [savedArmies]);

  useEffect(() => {
    if (savedArmies.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        await initDB();
        const recovered = await recoverArmiesFromIDB<SavedArmy>();
        if (cancelled || recovered.length === 0) return;
        setSavedArmies(recovered);
        const first = recovered[0];
        setActiveArmyId(first.id);
        setModeState(first.mode);
        setFactionState(first.factionId);
        setDetachmentState(first.detachmentName);
        setSupplyLimitState(first.supplyLimit);
        setArmy(first.units);
        setCrusade(first.crusade);
      } catch { /* IndexedDB unavailable */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync active army state back to savedArmies
  useEffect(() => {
    if (!activeArmyId) return;
    setSavedArmies(prev => prev.map(a =>
      a.id === activeArmyId
        ? { ...a, mode, factionId, detachmentName, supplyLimit, units: army, crusade, updatedAt: new Date().toISOString() }
        : a
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, factionId, detachmentName, supplyLimit, army, crusade, activeArmyId]);

  const setMode = useCallback((m: ArmyMode) => setModeState(m), []);
  const setFaction = useCallback((id: string | null) => setFactionState(id), []);
  const setDetachment = useCallback((name: string | null) => setDetachmentState(name), []);
  const setSupplyLimit = useCallback((limit: number) => setSupplyLimitState(limit), []);

  const addUnit = useCallback((params: {
    datasheetName: string;
    pointsCost: number;
    factionId?: string;
    isCharacter?: boolean;
    wargearNotes?: string;
  }) => {
    const unit: ArmyUnit = {
      id: crypto.randomUUID(),
      datasheet_name: params.datasheetName,
      custom_name: params.datasheetName,
      points_cost: params.pointsCost,
      faction_id: params.factionId ?? factionId ?? '',
      wargear_notes: params.wargearNotes ?? '',
      is_character: params.isCharacter ?? false,
      is_warlord: false,
      experience_points: 0,
      crusade_points: 0,
      battles_played: 0,
      battles_survived: 0,
      total_kills: 0,
      legendary_veterans: false,
      rank: 'Battle-ready',
      battle_honours: [],
      battle_scars: [],
      is_destroyed: false,
    };
    setArmy(prev => [...prev, unit]);
  }, [factionId]);

  const removeUnit = useCallback((unitId: string) => {
    setArmy(prev => prev.filter(u => u.id !== unitId));
  }, []);

  const updateUnit = useCallback((unitId: string, updates: Partial<ArmyUnit>) => {
    setArmy(prev => prev.map(u => u.id === unitId ? { ...u, ...updates } : u));
  }, []);

  const clearArmy = useCallback(() => {
    if (activeArmyId) {
      setSavedArmies(prev => prev.filter(a => a.id !== activeArmyId));
    }
    setActiveArmyId(null);
    setModeState(null);
    setFactionState(null);
    setDetachmentState(null);
    setSupplyLimitState(1000);
    setArmy([]);
    setCrusade(undefined);
  }, [activeArmyId]);

  // ---- Crusade: unit actions ----

  const awardXP = useCallback((unitId: string, xp: number) => {
    setArmy(prev => prev.map(u => {
      if (u.id !== unitId) return u;
      const newXP = u.experience_points + xp;
      return { ...u, experience_points: newXP, rank: getRankFromXP(newXP), crusade_points: u.crusade_points + xp };
    }));
  }, []);

  const addBattleHonour = useCallback((unitId: string, honour: Omit<BattleHonour, 'id'>) => {
    setArmy(prev => prev.map(u => {
      if (u.id !== unitId) return u;
      return {
        ...u,
        battle_honours: [...u.battle_honours, { id: crypto.randomUUID(), ...honour }],
        crusade_points: u.crusade_points + 1,
      };
    }));
  }, []);

  const removeBattleHonour = useCallback((unitId: string, honourId: string) => {
    setArmy(prev => prev.map(u => {
      if (u.id !== unitId) return u;
      return {
        ...u,
        battle_honours: u.battle_honours.filter(h => h.id !== honourId),
        crusade_points: Math.max(0, u.crusade_points - 1),
      };
    }));
  }, []);

  const addBattleScar = useCallback((unitId: string, scar: Omit<BattleScar, 'id'>) => {
    setArmy(prev => prev.map(u => {
      if (u.id !== unitId) return u;
      return {
        ...u,
        battle_scars: [...u.battle_scars, { id: crypto.randomUUID(), ...scar }],
        crusade_points: Math.max(0, u.crusade_points - 1),
      };
    }));
  }, []);

  const removeBattleScar = useCallback((unitId: string, scarId: string) => {
    setArmy(prev => prev.map(u => {
      if (u.id !== unitId) return u;
      return {
        ...u,
        battle_scars: u.battle_scars.filter(s => s.id !== scarId),
        crusade_points: u.crusade_points + 1,
      };
    }));
  }, []);

  const setWarlord = useCallback((unitId: string) => {
    setArmy(prev => prev.map(u => ({ ...u, is_warlord: u.id === unitId })));
  }, []);

  const buyLegendaryVeterans = useCallback((unitId: string) => {
    setArmy(prev => prev.map(u => u.id === unitId ? { ...u, legendary_veterans: true } : u));
    setCrusade(prev => prev ? { ...prev, rp: Math.max(0, prev.rp - 3) } : prev);
  }, []);

  // ---- Crusade: campaign actions ----

  const initCrusadeCampaign = useCallback((params: {
    factionId: string;
    detachmentName: string;
    supplyLimit: number;
    startingRP: number;
    oathswornCampaignId?: string;
    factionPointsLabel: string;
  }) => {
    setFactionState(params.factionId);
    setDetachmentState(params.detachmentName);
    setSupplyLimitState(params.supplyLimit);
    setCrusade(defaultCrusadeData({
      factionPointsLabel: params.factionPointsLabel,
      oathswornCampaignId: params.oathswornCampaignId,
      startingRP: params.startingRP,
    }));
  }, []);

  const recordBattle = useCallback((battle: Omit<CrusadeBattleRecord, 'id' | 'date'>) => {
    const record: CrusadeBattleRecord = {
      ...battle,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };

    // Apply unit results
    setArmy(prev => prev.map(u => {
      const result = battle.unitResults.find(r => r.unitId === u.id);
      if (!result) return u;
      const newXP = u.experience_points + result.xpGained;
      return {
        ...u,
        experience_points: newXP,
        rank: getRankFromXP(newXP),
        crusade_points: u.crusade_points + result.xpGained,
        battles_played: u.battles_played + 1,
        battles_survived: u.battles_survived + (result.survived ? 1 : 0),
        total_kills: u.total_kills + result.kills,
      };
    }));

    setCrusade(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rp: Math.min(10, prev.rp + battle.rpGained),
        wins: prev.wins + (battle.result === 'win' ? 1 : 0),
        losses: prev.losses + (battle.result === 'loss' ? 1 : 0),
        draws: prev.draws + (battle.result === 'draw' ? 1 : 0),
        battles: [record, ...prev.battles],
      };
    });
  }, []);

  const spendRP = useCallback((amount: number) => {
    setCrusade(prev => prev ? { ...prev, rp: Math.max(0, prev.rp - amount) } : prev);
  }, []);

  const gainRP = useCallback((amount: number) => {
    setCrusade(prev => prev ? { ...prev, rp: Math.min(10, prev.rp + amount) } : prev);
  }, []);

  const updateFactionPoints = useCallback((delta: number) => {
    setCrusade(prev => prev ? { ...prev, factionPoints: Math.max(0, prev.factionPoints + delta) } : prev);
  }, []);

  const updateCSMGlory = useCallback((category: 'personal' | 'darkGod' | 'warfleet', delta: number) => {
    setCrusade(prev => {
      if (!prev?.csmGlory) return prev;
      return {
        ...prev,
        csmGlory: { ...prev.csmGlory, [category]: Math.max(0, prev.csmGlory[category] + delta) },
      };
    });
  }, []);

  // ---- Multi-army actions ----

  const createArmy = useCallback((name: string, armyMode?: ArmyMode): string => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newArmy: SavedArmy = {
      id, name,
      mode: armyMode ?? null,
      factionId: null, detachmentName: null,
      supplyLimit: 1000, units: [],
      createdAt: now, updatedAt: now,
    };
    setSavedArmies(prev => [...prev, newArmy]);
    setActiveArmyId(id);
    setModeState(newArmy.mode);
    setFactionState(null);
    setDetachmentState(null);
    setSupplyLimitState(1000);
    setArmy([]);
    setCrusade(undefined);
    return id;
  }, []);

  const deleteArmy = useCallback((armyId: string) => {
    setSavedArmies(prev => {
      const remaining = prev.filter(a => a.id !== armyId);
      if (armyId === activeArmyId) {
        if (remaining.length > 0) {
          const next = remaining[0];
          setActiveArmyId(next.id);
          setModeState(next.mode);
          setFactionState(next.factionId);
          setDetachmentState(next.detachmentName);
          setSupplyLimitState(next.supplyLimit);
          setArmy(next.units);
          setCrusade(next.crusade);
        } else {
          setActiveArmyId(null);
          setModeState(null);
          setFactionState(null);
          setDetachmentState(null);
          setSupplyLimitState(1000);
          setArmy([]);
          setCrusade(undefined);
        }
      }
      return remaining;
    });
  }, [activeArmyId]);

  const switchArmy = useCallback((armyId: string) => {
    setSavedArmies(prev => {
      const target = prev.find(a => a.id === armyId);
      if (!target) return prev;
      setActiveArmyId(target.id);
      setModeState(target.mode);
      setFactionState(target.factionId);
      setDetachmentState(target.detachmentName);
      setSupplyLimitState(target.supplyLimit);
      setArmy(target.units);
      setCrusade(target.crusade);
      return prev;
    });
  }, []);

  const renameArmy = useCallback((armyId: string, name: string) => {
    setSavedArmies(prev => prev.map(a =>
      a.id === armyId ? { ...a, name, updatedAt: new Date().toISOString() } : a
    ));
  }, []);

  const value = useMemo<ArmyState>(() => ({
    mode, factionId, detachmentName, supplyLimit, army, crusade,
    savedArmies, activeArmyId,
    setMode, setFaction, setDetachment, setSupplyLimit,
    addUnit, removeUnit, updateUnit, clearArmy,
    awardXP, addBattleHonour, removeBattleHonour, addBattleScar, removeBattleScar,
    setWarlord, buyLegendaryVeterans,
    recordBattle, spendRP, gainRP, updateFactionPoints, updateCSMGlory, initCrusadeCampaign,
    createArmy, deleteArmy, switchArmy, renameArmy,
  }), [
    mode, factionId, detachmentName, supplyLimit, army, crusade,
    savedArmies, activeArmyId,
    setMode, setFaction, setDetachment, setSupplyLimit,
    addUnit, removeUnit, updateUnit, clearArmy,
    awardXP, addBattleHonour, removeBattleHonour, addBattleScar, removeBattleScar,
    setWarlord, buyLegendaryVeterans,
    recordBattle, spendRP, gainRP, updateFactionPoints, updateCSMGlory, initCrusadeCampaign,
    createArmy, deleteArmy, switchArmy, renameArmy,
  ]);

  return (
    <ArmyContext.Provider value={value}>
      {children}
    </ArmyContext.Provider>
  );
}

export function useArmy(): ArmyState {
  const ctx = useContext(ArmyContext);
  if (!ctx) throw new Error('useArmy must be used within ArmyProvider');
  return ctx;
}
