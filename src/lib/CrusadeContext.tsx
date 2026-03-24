import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Campaign, CampaignPlayer, CrusadeUnit, Battle, FactionId } from '../types';
import * as storage from './storage';
import * as sync from './sync';
import { initOfflineQueue, queueMutation } from './offlineQueue';
import { isSupabaseConfigured } from './supabase';
import { useAuth } from './AuthContext';
import { getRankFromXP } from './ranks';
import { getFactionName, getFactionIcon } from './factions';
import { useSyncEffect } from './hooks/useSyncEffect';
import { useRealtimeSubscription } from './hooks/useRealtimeSubscription';
import { trackEvent } from './telemetry';

interface CrusadeState {
  // Sync status
  syncing: boolean;

  // Campaign
  campaign: Campaign | null;
  players: CampaignPlayer[];
  currentPlayer: CampaignPlayer | null;

  // Actions — Campaign
  createCampaign: (name: string, supplyLimit: number, startingRp: number, playerName: string, factionId: FactionId) => void;
  joinCampaign: (code: string, playerName: string, factionId: FactionId) => Promise<{ success: boolean; error?: string }>;
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
  recordBattleParticipation: (unitId: string, survived: boolean) => void;
  addBattleHonour: (unitId: string, honour: CrusadeUnit['battle_honours'][0]) => void;
  addBattleScar: (unitId: string, scar: CrusadeUnit['battle_scars'][0]) => void;
  removeBattleScar: (unitId: string, scarId: string) => void;
  markDestroyed: (unitId: string) => void;
  updateBattle: (battleId: string, updates: Partial<Battle>) => void;
  spendRequisition: (amount: number) => boolean;
  awardRequisition: (amount: number) => void;

  // CM Actions
  updateCampaignSettings: (updates: Partial<Campaign>) => void;
  removePlayer: (playerId: string) => void;
  postAnnouncement: (text: string) => void;

  // Campaign History
  campaignHistory: storage.ArchivedCampaign[];
}

const CrusadeContext = createContext<CrusadeState | null>(null);

export function CrusadeProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(() => storage.loadCampaign());
  const [currentPlayer, setCurrentPlayer] = useState<CampaignPlayer | null>(() => storage.loadPlayer());
  const [players, setPlayers] = useState<CampaignPlayer[]>(() =>
    storage.safeGetItem<CampaignPlayer[]>(storage.STORAGE_KEYS.ALL_PLAYERS, [])
  );
  const [units, setUnits] = useState<CrusadeUnit[]>(() => storage.loadUnits());
  const [battles, setBattles] = useState<Battle[]>(() => storage.loadBattles());
  const [campaignHistory, setCampaignHistory] = useState<storage.ArchivedCampaign[]>(() => storage.loadCampaignHistory());

  // Ref to track current player for TOCTOU-safe reads (Bug 2 fix)
  const currentPlayerRef = useRef(currentPlayer);
  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);

  // Initialize offline queue listener
  useEffect(() => {
    const cleanup = initOfflineQueue();
    return cleanup;
  }, []);

  // Sync effects: localStorage persistence, cloud pull on auth, debounced player sync
  const syncSetters = useMemo(() => ({
    setCampaign, setCurrentPlayer, setPlayers, setUnits, setBattles,
  }), []);

  const { syncing } = useSyncEffect(campaign, currentPlayer, players, units, battles, authUser, syncSetters);

  // Realtime subscriptions (extracted hook handles playerIdsRef internally)
  const playerIds = useMemo(() => players.map(p => p.id), [players]);
  const realtimeCallbacks = useMemo(() => ({
    setPlayers, setCurrentPlayer, setBattles, setUnits,
  }), []);

  useRealtimeSubscription(campaign?.id, authUser?.id, playerIds, realtimeCallbacks);

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
      owner_id: authUser?.id ?? storage.generateId(),
    };

    const player: CampaignPlayer = {
      id: storage.generateId(),
      campaign_id: newCampaign.id,
      user_id: authUser?.id ?? '',
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

    // Push to cloud
    if (isSupabaseConfigured() && authUser?.id) {
      sync.createCampaignCloud(newCampaign, player).catch(console.warn);
    }

    trackEvent('campaign_created');
  }, [authUser]);

  const joinCampaign = useCallback(async (code: string, playerName: string, factionId: FactionId): Promise<{ success: boolean; error?: string }> => {
    if (campaign) return { success: false, error: 'Leave your current campaign first.' };

    // Try Supabase first (real cross-device join)
    if (isSupabaseConfigured() && authUser?.id) {
      const result = await sync.joinCampaignCloud(code, authUser.id, playerName, factionId);
      if (result.success && result.campaign && result.player) {
        setCampaign(result.campaign);
        setCurrentPlayer(result.player);
        // Pull full data (includes the complete player list)
        const cloudData = await sync.pullCampaignFromCloud(authUser.id);
        if (cloudData) {
          if (cloudData.players) {
            setPlayers(cloudData.players);
          } else {
            setPlayers(prev => [...prev, result.player!]);
          }
          setUnits(cloudData.units);
          setBattles(cloudData.battles);
        } else {
          setPlayers(prev => [...prev, result.player!]);
        }
        trackEvent('campaign_joined');
        return { success: true };
      }
      if (result.error) return { success: false, error: result.error };
    }

    // Fallback: local-only join
    const existingCampaign = storage.loadCampaign();
    if (existingCampaign && existingCampaign.join_code === code.toUpperCase()) {
      const player: CampaignPlayer = {
        id: storage.generateId(),
        campaign_id: existingCampaign.id,
        user_id: authUser?.id ?? '',
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
      trackEvent('campaign_joined');
      return { success: true };
    }
    return { success: false, error: 'Campaign not found. Check the join code.' };
  }, [authUser, campaign]);

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

    // Leave campaign in cloud
    if (isSupabaseConfigured() && prevPlayer) {
      sync.leaveCampaignCloud(prevPlayer.id).catch(console.warn);
    }

    setCampaign(null);
    setCurrentPlayer(null);
    storage.clearCampaign();
    setPlayers([]);
    setUnits([]);
    setBattles([]);
  }, [campaign, currentPlayer]);

  const addUnitFn = useCallback((datasheetName: string, customName: string, pointsCost: number, equipment: string, modelCount?: number) => {
    const cp = currentPlayerRef.current;
    if (!cp) return;
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
      status: 'ready',
      faction_legacy: {},
      created_at: new Date().toISOString(),
    };
    setUnits(prev => [...prev, unit]);
    setCurrentPlayer(prev => {
      if (!prev) return prev;
      return { ...prev, supply_used: (prev.supply_used || 0) + pointsCost };
    });
    // Push unit to cloud
    if (isSupabaseConfigured()) {
      sync.pushUnitToCloud(unit).catch(err => {
        console.warn('Cloud push failed, queuing:', err);
        queueMutation({ type: 'unit', action: 'create', data: unit });
      });
    }
    trackEvent('unit_added', { faction: cp.faction_id || '' });
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
      const updated = prev.map(u => u.id === unitId ? { ...u, ...updates } : u);
      // Push update to cloud
      const updatedUnit = updated.find(u => u.id === unitId);
      if (isSupabaseConfigured() && updatedUnit) {
        sync.updateUnitInCloud(updatedUnit).catch(err => {
          console.warn('Cloud push failed, queuing:', err);
          queueMutation({ type: 'unit', action: 'update', data: updatedUnit });
        });
      }
      return updated;
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
      // Delete from cloud
      if (isSupabaseConfigured()) {
        sync.deleteUnitFromCloud(unitId).catch(err => {
          console.warn('Cloud delete failed, queuing:', err);
          queueMutation({ type: 'unit', action: 'delete', data: { id: unitId } });
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
    trackEvent('battle_logged');

    // Push battle to cloud
    if (isSupabaseConfigured()) {
      sync.pushBattleToCloud(battle).catch(err => {
        console.warn('Cloud push failed, queuing:', err);
        queueMutation({ type: 'battle', action: 'create', data: battle });
      });
    }

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
      // Update crusade_points: increment by XP gained
      return { ...u, experience_points: newXP, rank: newRank, crusade_points: u.crusade_points + xp };
    }));
  }, []);

  const recordBattleParticipation = useCallback((unitId: string, survived: boolean) => {
    setUnits(prev => prev.map(u => {
      if (u.id !== unitId) return u;
      return {
        ...u,
        battles_played: u.battles_played + 1,
        battles_survived: survived ? u.battles_survived + 1 : u.battles_survived,
      };
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

  // P2-5 fix: single setBattles call instead of two
  const updateBattle = useCallback((battleId: string, updates: Partial<Battle>) => {
    setBattles(prev => {
      const updated = prev.map(b => b.id === battleId ? { ...b, ...updates } : b);
      // Push to cloud outside the setter
      const battle = updated.find(b => b.id === battleId);
      if (battle && isSupabaseConfigured()) {
        sync.pushBattleToCloud(battle).catch(console.warn);
      }
      return updated;
    });
  }, []);

  const spendRequisition = useCallback((amount: number): boolean => {
    const cp = currentPlayerRef.current;
    if (!cp || cp.requisition_points < amount) return false;
    setCurrentPlayer(prev => {
      if (!prev || prev.requisition_points < amount) return prev;
      return { ...prev, requisition_points: prev.requisition_points - amount };
    });
    return true;
  }, []);

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

  const updateCampaignSettings = useCallback((updates: Partial<Campaign>) => {
    setCampaign(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      // Persist to cloud
      if (isSupabaseConfigured()) {
        sync.pushCampaignToCloud(updated).catch(console.warn);
      }
      return updated;
    });
  }, []);

  const removePlayerFn = useCallback((playerId: string) => {
    // Remove player from local state
    setPlayers(prev => prev.filter(p => p.id !== playerId));
    // Purge the removed player's units from local state
    setUnits(prev => prev.filter(u => u.player_id !== playerId));
    // Remove from cloud
    if (isSupabaseConfigured()) {
      sync.leaveCampaignCloud(playerId).catch(console.warn);
    }
  }, []);

  const postAnnouncement = useCallback((text: string) => {
    setCampaign(prev => {
      if (!prev) return prev;
      const announcement = {
        id: storage.generateId(),
        text,
        created_at: new Date().toISOString(),
      };
      const updated = {
        ...prev,
        announcements: [announcement, ...(prev.announcements ?? [])],
      };
      // Persist to cloud
      if (isSupabaseConfigured()) {
        sync.pushCampaignToCloud(updated).catch(console.warn);
      }
      return updated;
    });
  }, []);

  return (
    <CrusadeContext.Provider value={{
      syncing,
      campaign, players, currentPlayer,
      createCampaign, joinCampaign, leaveCampaign, setDetachment,
      units, addUnit: addUnitFn, updateUnit: updateUnitFn, removeUnit: removeUnitFn,
      battles, logBattle, getPlayerBattles,
      awardXP, recordBattleParticipation, addBattleHonour, addBattleScar, removeBattleScar, markDestroyed, updateBattle, spendRequisition, awardRequisition,
      updateCampaignSettings, removePlayer: removePlayerFn, postAnnouncement,
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
