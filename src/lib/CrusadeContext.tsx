import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Campaign, CampaignPlayer, CrusadeUnit, Battle, FactionId } from '../types';
import * as storage from './storage';
import * as sync from './sync';
import { subscribeToCampaign, unsubscribeFromCampaign } from './realtime';
import { initOfflineQueue, queueMutation, flushQueue } from './offlineQueue';
import { isSupabaseConfigured } from './supabase';
import { useAuth } from './AuthContext';
import { getRankFromXP } from './ranks';
import { getFactionName, getFactionIcon } from './factions';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface CrusadeState {
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
  addBattleHonour: (unitId: string, honour: CrusadeUnit['battle_honours'][0]) => void;
  addBattleScar: (unitId: string, scar: CrusadeUnit['battle_scars'][0]) => void;
  removeBattleScar: (unitId: string, scarId: string) => void;
  markDestroyed: (unitId: string) => void;
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
  const [players, setPlayers] = useState<CampaignPlayer[]>([]);
  const [units, setUnits] = useState<CrusadeUnit[]>(() => storage.loadUnits());
  const [battles, setBattles] = useState<Battle[]>(() => storage.loadBattles());
  const [campaignHistory, setCampaignHistory] = useState<storage.ArchivedCampaign[]>(() => storage.loadCampaignHistory());

  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  // Persist on change (localStorage cache)
  useEffect(() => { if (campaign) storage.saveCampaign(campaign); }, [campaign]);
  useEffect(() => { if (currentPlayer) storage.savePlayer(currentPlayer); }, [currentPlayer]);
  useEffect(() => { storage.saveUnits(units); }, [units]);
  useEffect(() => { storage.saveBattles(battles); }, [battles]);

  // Initialize offline queue listener
  useEffect(() => { initOfflineQueue(); }, []);

  // Pull from cloud on auth change
  useEffect(() => {
    if (!authUser?.id || !isSupabaseConfigured()) return;
    let cancelled = false;

    (async () => {
      try {
        const cloudData = await sync.pullCampaignFromCloud(authUser.id);
        if (cancelled || !cloudData) return;
        if (cloudData.campaign) {
          setCampaign(cloudData.campaign);
          setCurrentPlayer(cloudData.player);
          setUnits(cloudData.units);
          setBattles(cloudData.battles);
          // Load other players in the campaign
          const { data: allPlayers } = await import('./supabase').then(m =>
            m.supabase.from('cc_campaign_players').select('*').eq('campaign_id', cloudData.campaign!.id)
          );
          if (allPlayers && !cancelled) setPlayers(allPlayers);
        } else {
          // No cloud campaign — try to migrate local data
          const localCampaign = storage.loadCampaign();
          if (localCampaign) {
            await sync.migrateLocalData(authUser.id);
          }
        }
        // Flush any pending offline mutations
        await flushQueue();
      } catch (err) {
        console.warn('Cloud sync failed, using local data:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [authUser?.id]);

  // Realtime subscriptions
  useEffect(() => {
    if (!campaign?.id || !isSupabaseConfigured()) return;

    const channel = subscribeToCampaign(campaign.id, {
      onPlayerChange: (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const updated = payload.new as unknown as CampaignPlayer;
          setPlayers(prev => {
            const exists = prev.find(p => p.id === updated.id);
            if (exists) return prev.map(p => p.id === updated.id ? updated : p);
            return [...prev, updated];
          });
          if (updated.user_id === authUser?.id) {
            setCurrentPlayer(updated);
          }
        }
      },
      onBattleChange: (payload) => {
        if (payload.eventType === 'INSERT') {
          const newBattle = payload.new as unknown as Battle;
          setBattles(prev => {
            if (prev.find(b => b.id === newBattle.id)) return prev;
            return [newBattle, ...prev];
          });
        }
      },
      onUnitChange: (payload) => {
        if (payload.eventType === 'INSERT') {
          const newUnit = payload.new as unknown as CrusadeUnit;
          setUnits(prev => {
            if (prev.find(u => u.id === newUnit.id)) return prev;
            return [...prev, newUnit];
          });
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as unknown as CrusadeUnit;
          setUnits(prev => prev.map(u => u.id === updated.id ? updated : u));
        } else if (payload.eventType === 'DELETE') {
          const deleted = payload.old as unknown as { id: string };
          setUnits(prev => prev.filter(u => u.id !== deleted.id));
        }
      },
    });
    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        unsubscribeFromCampaign(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [campaign?.id, authUser?.id]);

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
      sync.createCampaignCloud(newCampaign, player).then(ok => {
        if (!ok) alert('[DEBUG] Campaign cloud push failed — check console');
        else console.log('[Sync] Campaign pushed to cloud successfully');
      }).catch(err => alert('[DEBUG] Cloud push error: ' + err.message));
    } else {
      console.warn('[Sync] Skipped cloud push — configured:', isSupabaseConfigured(), 'authUser:', authUser?.id);
    }
  }, [authUser]);

  const joinCampaign = useCallback(async (code: string, playerName: string, factionId: FactionId): Promise<{ success: boolean; error?: string }> => {
    if (campaign) return { success: false, error: 'Leave your current campaign first.' };

    // Try Supabase first (real cross-device join)
    if (isSupabaseConfigured() && authUser?.id) {
      const result = await sync.joinCampaignCloud(code, authUser.id, playerName, factionId);
      if (result.success && result.campaign && result.player) {
        setCampaign(result.campaign);
        setCurrentPlayer(result.player);
        setPlayers(prev => [...prev, result.player!]);
        // Pull full data
        const cloudData = await sync.pullCampaignFromCloud(authUser.id);
        if (cloudData) {
          setUnits(cloudData.units);
          setBattles(cloudData.battles);
        }
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
      return { success: true };
    }
    return { success: false, error: 'Campaign not found. Check the join code.' };
  }, [authUser, campaign]);

  // Sync player to cloud whenever player state changes
  useEffect(() => {
    if (currentPlayer && isSupabaseConfigured()) {
      const timer = setTimeout(() => {
        sync.updatePlayerInCloud(currentPlayer).catch(console.warn);
      }, 1000); // Debounce 1s to avoid rapid-fire updates
      return () => clearTimeout(timer);
    }
  }, [currentPlayer]);

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
        status: 'ready',
        faction_legacy: {},
        created_at: new Date().toISOString(),
      };
      setUnits(prev => [...prev, unit]);
      // Push unit to cloud
      if (isSupabaseConfigured()) {
        sync.pushUnitToCloud(unit).catch(err => {
          console.warn('Cloud push failed, queuing:', err);
          queueMutation({ type: 'unit', action: 'create', data: unit });
        });
      }
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
      campaign, players, currentPlayer,
      createCampaign, joinCampaign, leaveCampaign, setDetachment,
      units, addUnit: addUnitFn, updateUnit: updateUnitFn, removeUnit: removeUnitFn,
      battles, logBattle, getPlayerBattles,
      awardXP, addBattleHonour, addBattleScar, removeBattleScar, markDestroyed, spendRequisition, awardRequisition,
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
