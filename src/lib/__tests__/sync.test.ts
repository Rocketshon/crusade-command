import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase module before importing sync functions
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

import {
  pushCampaignToCloud,
  pushUnitToCloud,
  pushBattleToCloud,
  joinCampaignCloud,
  pullCampaignFromCloud,
} from '../sync';
import { supabase, isSupabaseConfigured } from '../supabase';
import type { Campaign, CrusadeUnit, Battle } from '../../types';

// Helper to get the mock chain and configure its terminal method
function mockFromChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue(resolvedValue),
    upsert: vi.fn().mockResolvedValue(resolvedValue),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
    single: vi.fn().mockResolvedValue(resolvedValue),
  };
  vi.mocked(supabase.from).mockReturnValue(chain as never);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isSupabaseConfigured).mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// pushCampaignToCloud
// ---------------------------------------------------------------------------
describe('pushCampaignToCloud', () => {
  it('calls supabase.from("cc_campaigns").upsert with campaign data', async () => {
    const chain = mockFromChain({ data: null, error: null });

    const campaign: Campaign = {
      id: 'camp-1',
      name: 'Test Campaign',
      join_code: 'ABC123',
      supply_limit: 1000,
      starting_rp: 5,
      created_at: '2024-01-01',
      current_round: 1,
      owner_id: 'owner-1',
      announcements: [],
    };

    const result = await pushCampaignToCloud(campaign);

    expect(supabase.from).toHaveBeenCalledWith('cc_campaigns');
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'camp-1',
        name: 'Test Campaign',
        join_code: 'ABC123',
        supply_limit: 1000,
        starting_rp: 5,
        current_round: 1,
        owner_id: 'owner-1',
        announcements: [],
      }),
    );
    expect(result).toBe(true);
  });

  it('returns false when supabase is not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);

    const campaign: Campaign = {
      id: 'camp-1',
      name: 'Test',
      join_code: 'ABC123',
      supply_limit: 1000,
      starting_rp: 5,
      created_at: '2024-01-01',
      current_round: 1,
      owner_id: 'owner-1',
    };

    const result = await pushCampaignToCloud(campaign);
    expect(result).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns false on upsert error', async () => {
    const chain = mockFromChain({ data: null, error: null });
    chain.upsert.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const campaign: Campaign = {
      id: 'camp-1',
      name: 'Test',
      join_code: 'ABC123',
      supply_limit: 1000,
      starting_rp: 5,
      created_at: '2024-01-01',
      current_round: 1,
      owner_id: 'owner-1',
    };

    const result = await pushCampaignToCloud(campaign);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pushUnitToCloud
// ---------------------------------------------------------------------------
describe('pushUnitToCloud', () => {
  it('includes status and faction_legacy fields', async () => {
    const chain = mockFromChain({ data: null, error: null });

    const unit: CrusadeUnit = {
      id: 'unit-1',
      player_id: 'player-1',
      datasheet_name: 'Intercessors',
      custom_name: 'Alpha Squad',
      points_cost: 80,
      rank: 'Battle-ready',
      experience_points: 5,
      crusade_points: 1,
      battles_played: 2,
      battles_survived: 2,
      equipment: 'Bolt rifles',
      battle_honours: [],
      battle_scars: [],
      notes: '',
      is_destroyed: false,
      is_warlord: true,
      status: 'battle_scarred',
      faction_legacy: { chapter: 'Ultramarines' },
      created_at: '2024-01-01',
    };

    const result = await pushUnitToCloud(unit);

    expect(supabase.from).toHaveBeenCalledWith('cc_crusade_units');
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'unit-1',
        status: 'battle_scarred',
        faction_legacy: { chapter: 'Ultramarines' },
        is_warlord: true,
        experience_points: 5,
      }),
    );
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// pushBattleToCloud
// ---------------------------------------------------------------------------
describe('pushBattleToCloud', () => {
  it('includes agendas and combat_log fields', async () => {
    const chain = mockFromChain({ data: null, error: null });

    const battle: Battle = {
      id: 'battle-1',
      campaign_id: 'camp-1',
      player_id: 'player-1',
      opponent_id: 'opp-1',
      opponent_name: 'Warboss',
      opponent_faction: 'orks',
      mission_name: 'Supply Drop',
      battle_size: 'Strike Force',
      player_vp: 45,
      opponent_vp: 30,
      result: 'victory',
      units_fielded: ['unit-1'],
      marked_for_greatness: 'unit-1',
      agendas: ['Secure Ground', 'Thin Their Ranks'],
      combat_log: [
        {
          id: 'eng-1',
          turn: 1,
          phase: 'shooting',
          attacker_unit_id: 'unit-1',
          attacker_unit_name: 'Alpha Squad',
          attacker_weapon: 'Bolt rifles',
          defender_unit_id: 'opp-unit-1',
          defender_unit_name: 'Boyz',
          defender_player_id: 'opp-1',
          attacks: 10,
          hits: 7,
          wounds: 5,
          failed_saves: 4,
          damage_dealt: 4,
          models_destroyed: 4,
          timestamp: '2024-01-01T12:00:00Z',
        },
      ],
      notes: 'Victory!',
      created_at: '2024-01-01',
    };

    const result = await pushBattleToCloud(battle);

    expect(supabase.from).toHaveBeenCalledWith('cc_battles');
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'battle-1',
        agendas: ['Secure Ground', 'Thin Their Ranks'],
        combat_log: expect.arrayContaining([
          expect.objectContaining({
            id: 'eng-1',
            turn: 1,
            phase: 'shooting',
            models_destroyed: 4,
          }),
        ]),
      }),
    );
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// joinCampaignCloud
// ---------------------------------------------------------------------------
describe('joinCampaignCloud', () => {
  it('queries by join_code', async () => {
    // First call: lookup campaign by join code — return a campaign
    // Second call: check existing player — return null (not found)
    // Third call: insert new player — return success
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation((() => {
      callCount++;
      if (callCount === 1) {
        // cc_campaigns lookup
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'camp-1',
                  name: 'Found Campaign',
                  join_code: 'ABC123',
                  supply_limit: 1000,
                  starting_rp: 5,
                  current_round: 1,
                  owner_id: 'other-user',
                  created_at: '2024-01-01',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (callCount === 2) {
        // cc_campaign_players check existing
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      // cc_campaign_players insert
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }) as never);

    const result = await joinCampaignCloud('ABC123', 'user-1', 'TestPlayer', 'space_marines');

    expect(result.success).toBe(true);
    expect(result.campaign).toBeDefined();
    expect(result.campaign!.join_code).toBe('ABC123');
    expect(result.player).toBeDefined();
  });

  it('returns error when no campaign found', async () => {
    mockFromChain({ data: null, error: null });

    const result = await joinCampaignCloud('XXXXXX', 'user-1', 'TestPlayer', 'space_marines');

    expect(result.success).toBe(false);
    expect(result.error).toBe('No campaign found with that join code');
  });
});

// ---------------------------------------------------------------------------
// pullCampaignFromCloud
// ---------------------------------------------------------------------------
describe('pullCampaignFromCloud', () => {
  it('fetches campaign, players, units, battles', async () => {
    const mockPlayer = {
      id: 'player-1',
      campaign_id: 'camp-1',
      user_id: 'user-1',
      name: 'TestPlayer',
      faction_id: 'space_marines',
      supply_used: 0,
      requisition_points: 5,
      battles_played: 0,
      battles_won: 0,
      battles_lost: 0,
      battles_drawn: 0,
      created_at: '2024-01-01',
    };

    const mockCampaign = {
      id: 'camp-1',
      name: 'Cloud Campaign',
      join_code: 'CLOUD1',
      supply_limit: 1000,
      starting_rp: 5,
      current_round: 2,
      owner_id: 'user-1',
      created_at: '2024-01-01',
    };

    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation((() => {
      callCount++;
      if (callCount === 1) {
        // cc_campaign_players — find player by user_id
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockPlayer, error: null }),
              }),
            }),
          }),
        };
      }
      if (callCount === 2) {
        // cc_campaigns — fetch campaign by id
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
            }),
          }),
        };
      }
      if (callCount === 3) {
        // cc_campaign_players — all players in campaign
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [mockPlayer], error: null }),
          }),
        };
      }
      if (callCount === 4) {
        // cc_crusade_units — units for all players
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'unit-1', player_id: 'player-1', datasheet_name: 'Intercessors' }],
              error: null,
            }),
          }),
        };
      }
      // cc_battles — battles for campaign
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'battle-1', campaign_id: 'camp-1' }],
              error: null,
            }),
          }),
        }),
      };
    }) as never);

    const result = await pullCampaignFromCloud('user-1');

    expect(result).not.toBeNull();
    expect(result!.campaign).toBeDefined();
    expect(result!.campaign!.name).toBe('Cloud Campaign');
    expect(result!.player).toBeDefined();
    expect(result!.player!.id).toBe('player-1');
    expect(result!.players).toHaveLength(1);
    expect(result!.units).toHaveLength(1);
    expect(result!.battles).toHaveLength(1);
  });

  it('returns null when supabase is not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);

    const result = await pullCampaignFromCloud('user-1');
    expect(result).toBeNull();
  });

  it('returns empty collections when user has no player row', async () => {
    mockFromChain({ data: null, error: null });

    const result = await pullCampaignFromCloud('user-1');

    expect(result).not.toBeNull();
    expect(result!.campaign).toBeNull();
    expect(result!.player).toBeNull();
    expect(result!.players).toEqual([]);
    expect(result!.units).toEqual([]);
    expect(result!.battles).toEqual([]);
  });
});
