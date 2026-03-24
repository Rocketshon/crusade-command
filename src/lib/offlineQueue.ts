// Offline mutation queue — queues writes when offline, replays when back online

import {
  pushCampaignToCloud,
  pushPlayerToCloud,
  pushUnitToCloud,
  pushBattleToCloud,
  deleteUnitFromCloud,
  updatePlayerInCloud,
  updateUnitInCloud,
} from './sync';
import { isSupabaseConfigured } from './supabase';
import type { Campaign, CampaignPlayer, CrusadeUnit, Battle } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueuedMutation {
  id: string;
  type: 'campaign' | 'player' | 'unit' | 'battle';
  action: 'create' | 'update' | 'delete';
  data: unknown;
  timestamp: number;
}

const QUEUE_KEY = 'crusade_sync_queue';

// ---------------------------------------------------------------------------
// Queue CRUD
// ---------------------------------------------------------------------------

/** Read the queue from localStorage. */
function readQueue(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedMutation[];
  } catch {
    return [];
  }
}

/** Write the queue to localStorage. */
function writeQueue(queue: QueuedMutation[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[OfflineQueue] Failed to write queue:', e);
  }
}

/** Add a mutation to the queue. */
export function queueMutation(
  mutation: Omit<QueuedMutation, 'id' | 'timestamp'>,
): void {
  const queue = readQueue();
  queue.push({
    ...mutation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  writeQueue(queue);
}

/** Get all pending mutations (ordered by timestamp). */
export function getPendingMutations(): QueuedMutation[] {
  return readQueue().sort((a, b) => a.timestamp - b.timestamp);
}

/** Remove a single mutation from the queue after it succeeds. */
export function clearMutation(id: string): void {
  const queue = readQueue().filter(m => m.id !== id);
  writeQueue(queue);
}

/** Clear every mutation in the queue. */
export function clearAllMutations(): void {
  writeQueue([]);
}

// ---------------------------------------------------------------------------
// Flush — replay queued mutations against Supabase
// ---------------------------------------------------------------------------

/**
 * Process all pending mutations in order.
 * Successful mutations are removed; failed ones remain for retry.
 */
export async function flushQueue(): Promise<{ succeeded: number; failed: number }> {
  if (!isSupabaseConfigured()) return { succeeded: 0, failed: 0 };
  if (!navigator.onLine) return { succeeded: 0, failed: 0 };

  const pending = getPendingMutations();
  let succeeded = 0;
  let failed = 0;

  for (const mutation of pending) {
    const ok = await processMutation(mutation);
    if (ok) {
      clearMutation(mutation.id);
      succeeded++;
    } else {
      failed++;
      break;  // Stop processing — preserve ordering
    }
  }

  if (succeeded > 0) {
    console.log(`[OfflineQueue] Flushed ${succeeded} mutations (${failed} failed)`);
  }

  return { succeeded, failed };
}

/** Dispatch a single mutation to the correct sync function. */
async function processMutation(mutation: QueuedMutation): Promise<boolean> {
  try {
    switch (mutation.type) {
      case 'campaign':
        if (mutation.action === 'create' || mutation.action === 'update') {
          return await pushCampaignToCloud(mutation.data as Campaign);
        }
        break;

      case 'player':
        if (mutation.action === 'create') {
          return await pushPlayerToCloud(mutation.data as CampaignPlayer);
        }
        if (mutation.action === 'update') {
          return await updatePlayerInCloud(mutation.data as CampaignPlayer);
        }
        break;

      case 'unit':
        if (mutation.action === 'create' || mutation.action === 'update') {
          return await pushUnitToCloud(mutation.data as CrusadeUnit);
        }
        if (mutation.action === 'delete') {
          const unitData = mutation.data as { id: string };
          return await deleteUnitFromCloud(unitData.id);
        }
        break;

      case 'battle':
        if (mutation.action === 'create' || mutation.action === 'update') {
          return await pushBattleToCloud(mutation.data as Battle);
        }
        break;
    }

    // Unknown combination — discard to avoid infinite retries
    console.warn('[OfflineQueue] Unknown mutation type/action:', mutation.type, mutation.action);
    return true;
  } catch (e) {
    console.error('[OfflineQueue] processMutation error:', e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Auto-flush on reconnect
// ---------------------------------------------------------------------------

let listenerAttached = false;
let onlineHandler: (() => void) | null = null;

/** Attach the online event listener (call once at app startup). */
export function initOfflineQueue(): () => void {
  if (listenerAttached) return () => {};
  listenerAttached = true;
  onlineHandler = () => {
    console.log('[OfflineQueue] Back online — flushing queue');
    flushQueue();
  };
  window.addEventListener('online', onlineHandler);
  return () => {
    if (onlineHandler) window.removeEventListener('online', onlineHandler);
    listenerAttached = false;
    onlineHandler = null;
  };
}
