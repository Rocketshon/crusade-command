// Cloud sync engine — bridges localStorage and Supabase
// Offline-first: writes to localStorage instantly, then syncs to Supabase async

import { supabase, isSupabaseConfigured } from './supabase';
import * as storage from './storage';
import type { Campaign, CampaignPlayer, CrusadeUnit, Battle } from '../types';

// ---------------------------------------------------------------------------
// Push helpers — send local data to Supabase
// ---------------------------------------------------------------------------

/** Push a campaign to Supabase (upsert). */
export async function pushCampaignToCloud(campaign: Campaign): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from('cc_campaigns').upsert({
      id: campaign.id,
      name: campaign.name,
      join_code: campaign.join_code,
      supply_limit: campaign.supply_limit,
      starting_rp: campaign.starting_rp,
      current_round: campaign.current_round,
      owner_id: campaign.owner_id,
      created_at: campaign.created_at,
      announcements: campaign.announcements ?? [],
    });
    if (error) {
      console.error('[Sync] pushCampaignToCloud error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Sync] pushCampaignToCloud exception:', e);
    return false;
  }
}

/** Push a player row to Supabase (upsert). */
export async function pushPlayerToCloud(player: CampaignPlayer): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from('cc_campaign_players').upsert({
      id: player.id,
      campaign_id: player.campaign_id,
      user_id: player.user_id,
      name: player.name,
      faction_id: player.faction_id,
      detachment_id: player.detachment_id ?? null,
      supply_used: player.supply_used,
      requisition_points: player.requisition_points,
      battles_played: player.battles_played,
      battles_won: player.battles_won,
      battles_lost: player.battles_lost,
      battles_drawn: player.battles_drawn,
      created_at: player.created_at,
    });
    if (error) {
      console.error('[Sync] pushPlayerToCloud error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Sync] pushPlayerToCloud exception:', e);
    return false;
  }
}

/** Push a unit to Supabase (upsert). */
export async function pushUnitToCloud(unit: CrusadeUnit): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from('cc_crusade_units').upsert({
      id: unit.id,
      player_id: unit.player_id,
      datasheet_name: unit.datasheet_name,
      custom_name: unit.custom_name,
      points_cost: unit.points_cost,
      rank: unit.rank,
      experience_points: unit.experience_points,
      crusade_points: unit.crusade_points,
      battles_played: unit.battles_played,
      battles_survived: unit.battles_survived,
      model_count: unit.model_count ?? null,
      equipment: unit.equipment,
      battle_honours: unit.battle_honours,
      battle_scars: unit.battle_scars,
      notes: unit.notes,
      is_destroyed: unit.is_destroyed,
      is_warlord: unit.is_warlord,
      status: unit.status ?? 'ready',
      faction_legacy: unit.faction_legacy ?? {},
      created_at: unit.created_at,
    });
    if (error) {
      console.error('[Sync] pushUnitToCloud error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Sync] pushUnitToCloud exception:', e);
    return false;
  }
}

/** Push a battle to Supabase (upsert). */
export async function pushBattleToCloud(battle: Battle): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from('cc_battles').upsert({
      id: battle.id,
      campaign_id: battle.campaign_id,
      player_id: battle.player_id,
      opponent_id: battle.opponent_id,
      opponent_name: battle.opponent_name,
      opponent_faction: battle.opponent_faction,
      mission_name: battle.mission_name,
      battle_size: battle.battle_size,
      player_vp: battle.player_vp,
      opponent_vp: battle.opponent_vp,
      result: battle.result,
      units_fielded: battle.units_fielded,
      marked_for_greatness: battle.marked_for_greatness,
      notes: battle.notes,
      agendas: battle.agendas ?? [],
      combat_log: battle.combat_log ?? [],
      created_at: battle.created_at,
    });
    if (error) {
      console.error('[Sync] pushBattleToCloud error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Sync] pushBattleToCloud exception:', e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Pull helpers — fetch data from Supabase
// ---------------------------------------------------------------------------

/** Pull all campaign data from Supabase for a given user. */
export async function pullCampaignFromCloud(userId: string): Promise<{
  campaign: Campaign | null;
  player: CampaignPlayer | null;
  players: CampaignPlayer[];
  units: CrusadeUnit[];
  battles: Battle[];
} | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    // Find the player row for this user
    const { data: playerRow, error: playerErr } = await supabase
      .from('cc_campaign_players')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (playerErr) {
      console.error('[Sync] pullCampaignFromCloud player error:', playerErr.message);
      return null;
    }
    if (!playerRow) return { campaign: null, player: null, players: [], units: [], battles: [] };

    const player = playerRow as CampaignPlayer;

    // Fetch the campaign
    const { data: campaignRow, error: campaignErr } = await supabase
      .from('cc_campaigns')
      .select('*')
      .eq('id', player.campaign_id)
      .single();

    if (campaignErr) {
      console.error('[Sync] pullCampaignFromCloud campaign error:', campaignErr.message);
      return null;
    }

    const campaign = campaignRow as Campaign;

    // Fetch ALL players in this campaign (full rows to avoid a second round-trip)
    const { data: allPlayers } = await supabase
      .from('cc_campaign_players')
      .select('*')
      .eq('campaign_id', campaign.id);
    const allPlayerRows = (allPlayers ?? []) as CampaignPlayer[];
    const allPlayerIds = allPlayerRows.map((p) => p.id);

    // Fetch units for ALL players in the campaign
    const { data: unitRows, error: unitErr } = await supabase
      .from('cc_crusade_units')
      .select('*')
      .in('player_id', allPlayerIds.length > 0 ? allPlayerIds : ['__none__']);

    if (unitErr) {
      console.error('[Sync] pullCampaignFromCloud units error:', unitErr.message);
      return null;
    }

    // Fetch battles for the entire campaign
    const { data: battleRows, error: battleErr } = await supabase
      .from('cc_battles')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false });

    if (battleErr) {
      console.error('[Sync] pullCampaignFromCloud battles error:', battleErr.message);
      return null;
    }

    return {
      campaign,
      player,
      players: allPlayerRows,
      units: (unitRows ?? []) as CrusadeUnit[],
      battles: (battleRows ?? []) as Battle[],
    };
  } catch (e) {
    console.error('[Sync] pullCampaignFromCloud exception:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Campaign join / create / leave
// ---------------------------------------------------------------------------

/** Join a campaign by join code (cross-device multiplayer). */
export async function joinCampaignCloud(
  joinCode: string,
  userId: string,
  playerName: string,
  factionId: string,
): Promise<{ success: boolean; campaign?: Campaign; player?: CampaignPlayer; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' };
  }
  try {
    // Look up campaign by join code
    const { data: campaignRow, error: findErr } = await supabase
      .from('cc_campaigns')
      .select('*')
      .eq('join_code', joinCode.toUpperCase().trim())
      .maybeSingle();

    if (findErr) {
      return { success: false, error: findErr.message };
    }
    if (!campaignRow) {
      return { success: false, error: 'No campaign found with that join code' };
    }

    const campaign = campaignRow as Campaign;

    // Check if the user is already in this campaign
    const { data: existingPlayer } = await supabase
      .from('cc_campaign_players')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingPlayer) {
      return {
        success: true,
        campaign,
        player: existingPlayer as CampaignPlayer,
      };
    }

    // Create a new player row
    const newPlayer: CampaignPlayer = {
      id: crypto.randomUUID(),
      campaign_id: campaign.id,
      user_id: userId,
      name: playerName,
      faction_id: factionId as CampaignPlayer['faction_id'],
      supply_used: 0,
      requisition_points: campaign.starting_rp,
      battles_played: 0,
      battles_won: 0,
      battles_lost: 0,
      battles_drawn: 0,
      created_at: new Date().toISOString(),
    };

    const { error: insertErr } = await supabase
      .from('cc_campaign_players')
      .insert(newPlayer);

    if (insertErr) {
      return { success: false, error: insertErr.message };
    }

    return { success: true, campaign, player: newPlayer };
  } catch (e) {
    console.error('[Sync] joinCampaignCloud exception:', e);
    return { success: false, error: String(e) };
  }
}

/** Create a campaign in Supabase and add the owner as the first player. */
export async function createCampaignCloud(
  campaign: Campaign,
  player: CampaignPlayer,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error: campErr } = await supabase.from('cc_campaigns').insert({
      id: campaign.id,
      name: campaign.name,
      join_code: campaign.join_code,
      supply_limit: campaign.supply_limit,
      starting_rp: campaign.starting_rp,
      current_round: campaign.current_round,
      owner_id: campaign.owner_id,
      created_at: campaign.created_at,
      announcements: campaign.announcements ?? [],
    });
    if (campErr) {
      console.error('[Sync] createCampaignCloud campaign error:', campErr.message);
      return false;
    }

    const { error: playerErr } = await supabase.from('cc_campaign_players').insert({
      id: player.id,
      campaign_id: player.campaign_id,
      user_id: player.user_id,
      name: player.name,
      faction_id: player.faction_id,
      detachment_id: player.detachment_id ?? null,
      supply_used: player.supply_used,
      requisition_points: player.requisition_points,
      battles_played: player.battles_played,
      battles_won: player.battles_won,
      battles_lost: player.battles_lost,
      battles_drawn: player.battles_drawn,
      created_at: player.created_at,
    });
    if (playerErr) {
      console.error('[Sync] createCampaignCloud player error:', playerErr.message);
      return false;
    }

    return true;
  } catch (e) {
    console.error('[Sync] createCampaignCloud exception:', e);
    return false;
  }
}

/** Leave a campaign (remove player from Supabase). */
export async function leaveCampaignCloud(playerId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    // Delete the player's units first
    const { error: unitErr } = await supabase
      .from('cc_crusade_units')
      .delete()
      .eq('player_id', playerId);
    if (unitErr) {
      console.error('[Sync] leaveCampaignCloud units error:', unitErr.message);
      return false;
    }

    // Delete the player's battles
    const { error: battleErr } = await supabase
      .from('cc_battles')
      .delete()
      .eq('player_id', playerId);
    if (battleErr) {
      console.error('[Sync] leaveCampaignCloud battles error:', battleErr.message);
      return false;
    }

    // Delete the player row
    const { error: playerErr } = await supabase
      .from('cc_campaign_players')
      .delete()
      .eq('id', playerId);
    if (playerErr) {
      console.error('[Sync] leaveCampaignCloud player error:', playerErr.message);
      return false;
    }

    return true;
  } catch (e) {
    console.error('[Sync] leaveCampaignCloud exception:', e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Individual update / delete
// ---------------------------------------------------------------------------

/** Delete a unit from Supabase. */
export async function deleteUnitFromCloud(unitId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase
      .from('cc_crusade_units')
      .delete()
      .eq('id', unitId);
    if (error) {
      console.error('[Sync] deleteUnitFromCloud error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Sync] deleteUnitFromCloud exception:', e);
    return false;
  }
}

/** Update a player in Supabase. */
export async function updatePlayerInCloud(player: CampaignPlayer): Promise<boolean> {
  return pushPlayerToCloud(player);
}

/** Update a unit in Supabase. */
export async function updateUnitInCloud(unit: CrusadeUnit): Promise<boolean> {
  return pushUnitToCloud(unit);
}

// ---------------------------------------------------------------------------
// Full sync & migration
// ---------------------------------------------------------------------------

/**
 * Full sync: pull from cloud, write to localStorage.
 * Then push any local-only data that isn't yet in the cloud.
 */
export async function syncAll(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const cloudData = await pullCampaignFromCloud(userId);
    if (!cloudData) return;

    // If we have cloud data, write it to localStorage
    if (cloudData.campaign) {
      storage.saveCampaign(cloudData.campaign);
    }
    if (cloudData.player) {
      storage.savePlayer(cloudData.player);
    }
    if (cloudData.units.length > 0) {
      storage.saveUnits(cloudData.units);
    }
    if (cloudData.battles.length > 0) {
      storage.saveBattles(cloudData.battles);
    }

    // Push any local data that might be newer / local-only
    const localCampaign = storage.loadCampaign();
    const localPlayer = storage.loadPlayer();
    const localUnits = storage.loadUnits();
    const localBattles = storage.loadBattles();

    // Push local units not present in cloud
    const cloudUnitIds = new Set(cloudData.units.map(u => u.id));
    for (const unit of localUnits) {
      if (!cloudUnitIds.has(unit.id)) {
        await pushUnitToCloud(unit);
      }
    }

    // Push local battles not present in cloud
    const cloudBattleIds = new Set(cloudData.battles.map(b => b.id));
    for (const battle of localBattles) {
      if (!cloudBattleIds.has(battle.id)) {
        await pushBattleToCloud(battle);
      }
    }

    // Push campaign/player if we have them locally but not in cloud
    if (localCampaign && !cloudData.campaign) {
      await pushCampaignToCloud(localCampaign);
    }
    if (localPlayer && !cloudData.player) {
      await pushPlayerToCloud(localPlayer);
    }
  } catch (e) {
    console.error('[Sync] syncAll exception:', e);
  }
}

/**
 * Migrate existing localStorage data to Supabase (one-time).
 * Re-maps owner_id / user_id to the authenticated Supabase user UUID.
 */
export async function migrateLocalData(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const localCampaign = storage.loadCampaign();
    const localPlayer = storage.loadPlayer();
    const localUnits = storage.loadUnits();
    const localBattles = storage.loadBattles();

    if (!localCampaign && !localPlayer) {
      // Nothing to migrate
      return true;
    }

    // Re-map owner/user IDs to the Supabase user
    if (localCampaign) {
      localCampaign.owner_id = userId;
      storage.saveCampaign(localCampaign);
      await pushCampaignToCloud(localCampaign);
    }

    if (localPlayer) {
      localPlayer.user_id = userId;
      storage.savePlayer(localPlayer);
      await pushPlayerToCloud(localPlayer);
    }

    // Push all units (they reference player_id, which stays the same)
    for (const unit of localUnits) {
      await pushUnitToCloud(unit);
    }

    // Push all battles
    for (const battle of localBattles) {
      await pushBattleToCloud(battle);
    }

    return true;
  } catch (e) {
    console.error('[Sync] migrateLocalData exception:', e);
    return false;
  }
}
