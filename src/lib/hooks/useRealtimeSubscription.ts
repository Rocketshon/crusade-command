import { useEffect, useRef } from 'react';
import type { CampaignPlayer, CrusadeUnit, Battle } from '../../types';
import { subscribeToCampaign, unsubscribeFromCampaign } from '../realtime';
import { isSupabaseConfigured } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeCallbacks {
  setPlayers: React.Dispatch<React.SetStateAction<CampaignPlayer[]>>;
  setCurrentPlayer: React.Dispatch<React.SetStateAction<CampaignPlayer | null>>;
  setBattles: React.Dispatch<React.SetStateAction<Battle[]>>;
  setUnits: React.Dispatch<React.SetStateAction<CrusadeUnit[]>>;
}

/**
 * Manages realtime subscription to campaign changes via Supabase.
 * Uses a playerIdsRef internally so it doesn't re-subscribe on every player change.
 * Fixes P1-5: cc_crusade_units subscription filters by player IDs using the ref.
 */
export function useRealtimeSubscription(
  campaignId: string | undefined,
  authUserId: string | undefined,
  playerIds: string[],
  callbacks: RealtimeCallbacks,
) {
  const { setPlayers, setCurrentPlayer, setBattles, setUnits } = callbacks;
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  // Keep playerIds in a ref so subscription callback always has latest IDs
  // without triggering re-subscription (P1-5 fix)
  const playerIdsRef = useRef<string[]>([]);
  useEffect(() => {
    playerIdsRef.current = playerIds;
  }, [playerIds]);

  useEffect(() => {
    if (!campaignId || !isSupabaseConfigured()) return;

    const channel = subscribeToCampaign(campaignId, {
      onPlayerChange: (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const updated = payload.new as unknown as CampaignPlayer;
          setPlayers(prev => {
            const exists = prev.find(p => p.id === updated.id);
            if (exists) return prev.map(p => p.id === updated.id ? updated : p);
            return [...prev, updated];
          });
          if (updated.user_id === authUserId) {
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
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as unknown as Battle;
          setBattles(prev => prev.map(b => b.id === updated.id ? updated : b));
        }
      },
      onUnitChange: (payload) => {
        // Read playerIds at callback time, not at subscribe time (Bug 4 fix)
        const currentPlayerIds = playerIdsRef.current;
        const incoming = (payload.new ?? payload.old ?? {}) as Record<string, unknown>;
        if (currentPlayerIds.length > 0 && incoming.player_id && !currentPlayerIds.includes(incoming.player_id as string)) {
          return; // Ignore units belonging to players outside this campaign
        }

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
  }, [campaignId, authUserId, setPlayers, setCurrentPlayer, setBattles, setUnits]);
}
