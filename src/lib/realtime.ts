// Supabase Realtime subscriptions for live multiplayer updates

import { supabase, isSupabaseConfigured } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface CampaignRealtimeCallbacks {
  onPlayerChange: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => void;
  onBattleChange: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => void;
  onUnitChange: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => void;
}

/**
 * Subscribe to live campaign changes.
 * Listens for INSERT/UPDATE/DELETE on players, battles, and units
 * scoped to a specific campaign_id.
 *
 * Returns the RealtimeChannel so the caller can unsubscribe on cleanup.
 */
export function subscribeToCampaign(
  campaignId: string,
  callbacks: CampaignRealtimeCallbacks,
  playerIds: string[] = [],
): RealtimeChannel {
  const channel = supabase
    .channel(`campaign-${campaignId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cc_campaign_players',
        filter: `campaign_id=eq.${campaignId}`,
      },
      (payload) => {
        callbacks.onPlayerChange({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: (payload.new ?? {}) as Record<string, unknown>,
          old: (payload.old ?? {}) as Record<string, unknown>,
        });
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cc_battles',
        filter: `campaign_id=eq.${campaignId}`,
      },
      (payload) => {
        callbacks.onBattleChange({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: (payload.new ?? {}) as Record<string, unknown>,
          old: (payload.old ?? {}) as Record<string, unknown>,
        });
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cc_crusade_units',
      },
      (payload) => {
        // Filter incoming unit events to only players in this campaign
        const incoming = (payload.new ?? payload.old ?? {}) as Record<string, unknown>;
        if (playerIds.length > 0 && incoming.player_id && !playerIds.includes(incoming.player_id as string)) {
          return; // Ignore units belonging to players outside this campaign
        }
        callbacks.onUnitChange({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: (payload.new ?? {}) as Record<string, unknown>,
          old: (payload.old ?? {}) as Record<string, unknown>,
        });
      },
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a campaign realtime channel.
 */
export function unsubscribeFromCampaign(channel: RealtimeChannel): void {
  if (!isSupabaseConfigured()) return;
  supabase.removeChannel(channel);
}
