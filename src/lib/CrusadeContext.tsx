import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Campaign, CampaignPlayer, CrusadeUnit, Battle, FactionId, UnitRank } from '../types';
import * as storage from './storage';
import { getRankFromXP } from './ranks';
import { getFactionName, getFactionIcon } from './factions';

interface CrusadeState {
  // Auth
  user: storage.UserSession | null;
  setUser: (user: storage.UserSession | null) => void;

  // Campaign
  campaign: Campaign | null;
  players: CampaignPlayer[];
  currentPlayer: CampaignPlayer | null;

  // Actions — Campaign
  createCampaign: (name: string, supplyLimit: number, startingRp: number, playerName: string, factionId: FactionId) => void;
  joinCampaign: (code: string, playerName: string, factionId: FactionId) => { success: boolean; error?: string };
  leaveCampaign: () => void;
  setDetachment: (detachmentId: string) => void;

  // Actions — Roster
  units: CrusadeUnit[];
  addUnit: (datasheetName: string, customName: string, pointsCost: number, equipment: string, modelCount?: number) => void;
  updateUnit: (unitId: string, updates: Partial<CrusadeUnit>) => void;
  removeUnit: (unitId: string) => void;

  // Actions — Battles
  battles: Battle[];
  logBattle: (battle: Omit<Battle, 'id' | 'created_at'>) => string; // returns battle id
  getPlayerBattles: (playerId: string) => Battle[];

  // Actions — Post-Battle
  awardXP: (unitId: string, xp: number) => void;
  addBattleHonour: (unitId: string, honour: CrusadeUnit['battle_honours'][0]) => void;
  addBattleScar: (unitId: string, scar: CrusadeUnit['battle_scars'][0]) => void;
  removeBattleScar: (unitId: string, scarId: string) => void;
  markDestroyed: (unitId: string) => void;
  spendRequisition: (amount: number) => boolean;
  awardRequisition: (amount: number) => void;

  // Campaign History
  campaignHistory: storage.ArchivedCampaign[];
}

const CrusadeContext = createContext<CrusadeState | null>(null);

export function CrusadeProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<storage.UserSession | null>(() => storage.loadUser());
  const [campaign, setCampaign] = useState<Campaign | null>(() => storage.loadCampaign());
  const [currentPlayer, setCurrentPlayer] = useState<CampaignPlayer | null>(() => storage.loadPlayer());
  const [players, setPlayers] = useState<CampaignPlayer[]>([]);
  const [units, setUnits] = useState<CrusadeUnit[]>(() => storage.loadUnits());
  const [battles, setBattles] = useState<Battle[]>(() => storage.loadBattles());
  const [campaignHistory, setCampaignHistory] = useState<storage.ArchivedCampaign[]>(() => storage.loadCampaignHistory());

  // Persist on change
  useEffect(() => { if (campaign) storage.saveCampaign(campaign); }, [campaign]);
  useEffect(() => { if (currentPlayer) storage.savePlayer(currentPlayer); }, [currentPlayer]);
  useEffect(() => { storage.saveUnits(units); }, [units]);
  useEffect(() => { storage.saveBattles(battles); }, [battles]);

  const setUser = useCallback((u: storage.UserSession | null) => {
    setUserState(u);
    if (u) storage.saveUser(u);
    else storage.clearUser();
  }, []);

  const createCampaign = useCallback((
    name: string, supplyLimit: number, startingRp: number, playerName: string, factionId: FactionId
  ) => {
    const newCampaign: Campaign = {
      id: storage.generateId(),
      name,
      join_code: storage.generateJoinCode(),
      supply_limit: supplyLimit,
      starting_rp: startingRp,
      created_at: new Date().toISOString(),
      current_round: 1,
      owner_id: user?.id ?? storage.generateId(),
    };

    const player: CampaignPlayer = {
      id: storage.generateId(),
      campaign_id: newCampaign.id,
      user_id: user?.id ?? '',
      name: playerName,
      faction_id: factionId,
      supply_used: 0,
      requisition_points: startingRp,
      battles_played: 0,
      battles_won: 0,
      battles_lost: 0,
      battles_drawn: 0,
      created_at: new Date().toISOString(),
    };

    setCampaign(newCampaign);
    setCurrentPlayer(player);
    setPlayers([player]);
    setUnits([]);
    setBattles([]);
  }, [user]);

  const joinCampaign = useCallback((code: string, playerName: string, factionId: FactionId) => {
    // Guard: cannot join if already in a campaign
    if (campaign) return { success: false, error: 'Leave your current campaign first.' };
    // For local-first: check if a campaign with this code exists
    const existingCampaign = storage.loadCampaign();
    if (existingCampaign && existingCampaign.join_code === code.toUpperCase()) {
      const player: CampaignPlayer = {
        id: storage.generateId(),
        campaign_id: existingCampaign.id,
        user_id: user?.id ?? '',
        name: playerName,
        faction_id: factionId,
        supply_used: 0,
        requisition_points: existingCampaign.starting_rp,
        battles_played: 0,
        battles_won: 0,
        battles_lost: 0,
        battles_drawn: 0,
        created_at: new Date().toISOString(),
      };
      setCurrentPlayer(player);
      setPlayers(prev => [...prev, player]);
      setCampaign(existingCampaign);
      return { success: true };
    }
    return { success: false, error: 'Campaign not found. Check the join code.' };
  }, [user, campaign]);

  const leaveCampaign = useCallback(() => {
    // Read current state for archiving before clearing
    const prevCampaign = campaign;
    const prevPlayer = currentPlayer;

    if (prevCampaign && prevPlayer) {
      const archive: storage.ArchivedCampaign = {
        id: prevCampaign.id,
        name: prevCampaign.name,
        faction_id: prevPlayer.faction_id,
        faction_name: getFactionName(prevPlayer.faction_id),
        faction_icon: getFactionIcon(prevPlayer.faction_id),
        start_date: prevCampaign.created_at,
        end_date: new Date().toISOString(),
        wins: prevPlayer.battles_won,
        losses: prevPlayer.battles_lost,
        draws: prevPlayer.battles_drawn,
        total_battles: prevPlayer.battles_played,
      };
      storage.archiveCampaign(archive);
      setCampaignHistory(storage.loadCampaignHistory());
    }

    setCampaign(null);
    setCurrentPlayer(null);
    // Clear storage to prevent stale data from useEffect persistence
    storage.clearCampaign();
    setPlayers([]);
    setUnits([]);
    setBattles([]);
  }, [campaign, currentPlayer]);

  const addUnitFn = useCallback((datasheetName: string, customName: string, pointsCost: number, equipment: string, modelCount?: number) => {
    setCurrentPlayer(cp => {
      if (!cp) return cp;
      const unit: CrusadeUnit = {
        id: storage.generateId(),
        player_id: cp.id,
        datasheet_name: datasheetName,
        custom_name: customName || datasheetName,
        points_cost: pointsCost,
        model_count: modelCount,
        rank: 'Battle-ready',
        experience_points: 0,
        crusade_points: 0,
        battles_played: 0,
        battles_survived: 0,
        equipment,
        battle_honours: [],
        battle_scars: [],
        notes: '',
        is_destroyed: false,
        is_warlord: false,
        created_at: new Date().toISOString(),
      };
      setUnits(prev => [...prev, unit]);
      return { ...cp, supply_used: (cp.supply_used || 0) + pointsCost };
    });
  }, []);

  const updateUnitFn = useCallback((unitId: string, updates: Partial<CrusadeUnit>) => {
    setUnits(prev => {
      const oldUnit = prev.find(u => u.id === unitId);
      if (oldUnit && updates.points_cost !== undefined && updates.points_cost !== oldUnit.points_cost) {
        const delta = updates.points_cost - oldUnit.points_cost;
        setCurrentPlayer(cp => {
          if (!cp) return cp;
          return { ...cp, supply_used: Math.max(0, (cp.supply_used || 0) + delta) };
        });
      }
      return prev.map(u => u.id === unitId ? { ...u, ...updates } : u);
    });
  }, []);

  const removeUnitFn = useCallback((unitId: string) => {
    setUnits(prev => {
      const unit = prev.find(u => u.id === unitId);
      if (unit) {
        setCurrentPlayer(cp => {
          if (!cp) return cp;
          return { ...cp, supply_used: Math.max(0, (cp.supply_used || 0) - unit.points_cost) };
        });
      }
      return prev.filter(u => u.id !== unitId);
    });
  }, []);

  const logBattle = useCallback((battleData: Omit<Battle, 'id' | 'created_at'>) => {
    const battle: Battle = {
      ...battleData,
      id: storage.generateId(),
      created_at: new Date().toISOString(),
    };
    setBattles(prev => [battle, ...prev]);

    // Update player stats using functional updater to avoid stale closure
    setCurrentPlayer(cp => {
      if (!cp) return cp;
      const updated = { ...cp };
      updated.battles_played += 1;
      if (battle.result === 'victory') updated.battles_won += 1;
      else if (battle.result === 'defeat') updated.battles_lost += 1;
      else updated.battles_drawn += 1;
      return updated;
    });

    return battle.id;
  }, []);

  const getPlayerBattles = useCallback((playerId: string) => {
    return battles.filter(b => b.player_id === playerId);
  }, [battles]);

  const awardXP = useCallback((unitId: string, xp: number) => {
    setUnits(prev => prev.map(u => {
      if (u.id !== unitId) return u;
      const newXP = u.experience_points + xp;
      const newRank = getRankFromXP(newXP);
      return { ...u, experience_points: newXP, rank: newRank };
    }));
  }, []);

  const addBattleHonour = useCallback((unitId: string, honour: CrusadeUnit['battle_honours'][0]) => {
    setUnits(prev => prev.map(u => {
      if (u.id !== unitId) return u;
      return { ...u, battle_honours: [...u.battle_honours, honour], crusade_points: u.crusade_points + 1 };
    }));
  }, []);

  const addBattleScar = useCallback((unitId: string, scar: CrusadeUnit['battle_scars'][0]) => {
    setUnits(prev => prev.map(u => {
      if (u.id !== unitId) return u;
      return { ...u, battle_scars: [...u.battle_scars, scar], crusade_points: u.crusade_points - 1 };
    }));
  }, []);

  const removeBattleScar = useCallback((unitId: string, scarId: string) => {
    setUnits(prev => prev.map(u => {
      if (u.id !== unitId) return u;
      return {
        ...u,
        battle_scars: u.battle_scars.filter(s => s.id !== scarId),
        crusade_points: u.crusade_points + 1,
      };
    }));
  }, []);

  const markDestroyed = useCallback((unitId: string) => {
    setUnits(prev => prev.map(u => u.id === unitId ? { ...u, is_destroyed: true } : u));
  }, []);

  const spendRequisition = useCallback((amount: number) => {
    if (!currentPlayer || currentPlayer.requisition_points < amount) return false;
    setCurrentPlayer(cp => {
      if (!cp || cp.requisition_points < amount) return cp;
      return { ...cp, requisition_points: cp.requisition_points - amount };
    });
    return true;
  }, [currentPlayer]);

  const awardRequisition = useCallback((amount: number) => {
    setCurrentPlayer(cp => {
      if (!cp) return cp;
      return { ...cp, requisition_points: cp.requisition_points + amount };
    });
  }, []);

  const setDetachment = useCallback((detachmentId: string) => {
    setCurrentPlayer(cp => {
      if (!cp) return cp;
      return { ...cp, detachment_id: detachmentId };
    });
  }, []);

  return (
    <CrusadeContext.Provider value={{
      user, setUser,
      campaign, players, currentPlayer,
      createCampaign, joinCampaign, leaveCampaign, setDetachment,
      units, addUnit: addUnitFn, updateUnit: updateUnitFn, removeUnit: removeUnitFn,
      battles, logBattle, getPlayerBattles,
      awardXP, addBattleHonour, addBattleScar, removeBattleScar, markDestroyed, spendRequisition, awardRequisition,
      campaignHistory,
    }}>
      {children}
    </CrusadeContext.Provider>
  );
}

export function useCrusade() {
  const ctx = useContext(CrusadeContext);
  if (!ctx) throw new Error('useCrusade must be used within CrusadeProvider');
  return ctx;
}
