import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
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

export interface ArmyUnit {
  id: string;
  datasheet_name: string;
  custom_name: string;
  points_cost: number;
  faction_id: string;
  // Standard fields
  role?: string;
  // Crusade fields
  experience_points: number;
  crusade_points: number;
  battles_played: number;
  battles_survived: number;
  rank: string;
  battle_honours: { id: string; name: string; type: string }[];
  battle_scars: { id: string; name: string; effect: string }[];
  is_destroyed: boolean;
}

interface ArmyState {
  mode: ArmyMode;
  factionId: string | null;
  pointsCap: number;
  supplyLimit: number;
  army: ArmyUnit[];
  setMode: (mode: ArmyMode) => void;
  setFaction: (factionId: string) => void;
  setPointsCap: (cap: number) => void;
  setSupplyLimit: (limit: number) => void;
  addUnit: (datasheetName: string, pointsCost: number, role?: string) => void;
  removeUnit: (unitId: string) => void;
  updateUnit: (unitId: string, updates: Partial<ArmyUnit>) => void;
  clearArmy: () => void;
  // Crusade-specific
  awardXP: (unitId: string, xp: number) => void;
  addBattleHonour: (unitId: string, honour: { name: string; type: string }) => void;
  addBattleScar: (unitId: string, scar: { name: string; effect: string }) => void;
  removeBattleScar: (unitId: string, scarId: string) => void;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const KEYS = {
  mode: 'army_mode',
  faction: 'army_faction',
  pointsCap: 'army_points_cap',
  supplyLimit: 'army_supply_limit',
  units: 'army_units',
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
// Context
// ---------------------------------------------------------------------------

const ArmyContext = createContext<ArmyState | null>(null);

export function ArmyProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ArmyMode>(() => loadJSON<ArmyMode>(KEYS.mode, null));
  const [factionId, setFactionState] = useState<string | null>(() => loadJSON<string | null>(KEYS.faction, null));
  const [pointsCap, setPointsCapState] = useState<number>(() => loadJSON<number>(KEYS.pointsCap, 2000));
  const [supplyLimit, setSupplyLimitState] = useState<number>(() => loadJSON<number>(KEYS.supplyLimit, 1000));
  const [army, setArmy] = useState<ArmyUnit[]>(() => loadJSON<ArmyUnit[]>(KEYS.units, []));

  // Persist to localStorage on changes
  useEffect(() => { saveJSON(KEYS.mode, mode); }, [mode]);
  useEffect(() => { saveJSON(KEYS.faction, factionId); }, [factionId]);
  useEffect(() => { saveJSON(KEYS.pointsCap, pointsCap); }, [pointsCap]);
  useEffect(() => { saveJSON(KEYS.supplyLimit, supplyLimit); }, [supplyLimit]);
  useEffect(() => { saveJSON(KEYS.units, army); }, [army]);

  const setMode = useCallback((m: ArmyMode) => setModeState(m), []);
  const setFaction = useCallback((id: string) => setFactionState(id), []);
  const setPointsCap = useCallback((cap: number) => setPointsCapState(cap), []);
  const setSupplyLimit = useCallback((limit: number) => setSupplyLimitState(limit), []);

  const addUnit = useCallback((datasheetName: string, pointsCost: number, role?: string) => {
    const unit: ArmyUnit = {
      id: crypto.randomUUID(),
      datasheet_name: datasheetName,
      custom_name: datasheetName,
      points_cost: pointsCost,
      faction_id: factionId ?? '',
      role,
      experience_points: 0,
      crusade_points: 0,
      battles_played: 0,
      battles_survived: 0,
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
    setArmy([]);
    setModeState(null);
    setFactionState(null);
    setPointsCapState(2000);
    setSupplyLimitState(1000);
  }, []);

  const awardXP = useCallback((unitId: string, xp: number) => {
    setArmy(prev => prev.map(u => {
      if (u.id !== unitId) return u;
      const newXP = u.experience_points + xp;
      return { ...u, experience_points: newXP, rank: getRankFromXP(newXP), crusade_points: u.crusade_points + xp };
    }));
  }, []);

  const addBattleHonour = useCallback((unitId: string, honour: { name: string; type: string }) => {
    setArmy(prev => prev.map(u => {
      if (u.id !== unitId) return u;
      return {
        ...u,
        battle_honours: [...u.battle_honours, { id: crypto.randomUUID(), ...honour }],
        crusade_points: u.crusade_points + 1,
      };
    }));
  }, []);

  const addBattleScar = useCallback((unitId: string, scar: { name: string; effect: string }) => {
    setArmy(prev => prev.map(u => {
      if (u.id !== unitId) return u;
      return {
        ...u,
        battle_scars: [...u.battle_scars, { id: crypto.randomUUID(), ...scar }],
        crusade_points: u.crusade_points - 1,
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

  const value = useMemo<ArmyState>(() => ({
    mode, factionId, pointsCap, supplyLimit, army,
    setMode, setFaction, setPointsCap, setSupplyLimit,
    addUnit, removeUnit, updateUnit, clearArmy,
    awardXP, addBattleHonour, addBattleScar, removeBattleScar,
  }), [
    mode, factionId, pointsCap, supplyLimit, army,
    setMode, setFaction, setPointsCap, setSupplyLimit,
    addUnit, removeUnit, updateUnit, clearArmy,
    awardXP, addBattleHonour, addBattleScar, removeBattleScar,
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
