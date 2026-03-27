# Warcaster API Contracts

## Database Schema

### cc_profiles
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, FK → auth.users(id) |
| display_name | TEXT | NOT NULL, DEFAULT '' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

Maps to: `UserSession` in `src/types/index.ts`

### cc_campaigns
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| name | TEXT | NOT NULL |
| join_code | TEXT | NOT NULL, UNIQUE |
| supply_limit | INTEGER | NOT NULL, DEFAULT 1000 |
| starting_rp | INTEGER | NOT NULL, DEFAULT 5 |
| current_round | INTEGER | NOT NULL, DEFAULT 1 |
| owner_id | UUID | FK → auth.users(id) |
| announcements | JSONB | DEFAULT '[]' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

Maps to: `Campaign` in `src/types/index.ts`

### cc_campaign_players
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| campaign_id | UUID | FK → cc_campaigns(id), NOT NULL |
| user_id | UUID | FK → auth.users(id), NOT NULL |
| name | TEXT | NOT NULL |
| faction_id | TEXT | NOT NULL |
| detachment_id | TEXT | NULLABLE |
| supply_used | INTEGER | NOT NULL, DEFAULT 0 |
| requisition_points | INTEGER | NOT NULL, DEFAULT 5 |
| battles_played | INTEGER | NOT NULL, DEFAULT 0 |
| battles_won | INTEGER | NOT NULL, DEFAULT 0 |
| battles_lost | INTEGER | NOT NULL, DEFAULT 0 |
| battles_drawn | INTEGER | NOT NULL, DEFAULT 0 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

Maps to: `CampaignPlayer` in `src/types/index.ts`

### cc_crusade_units
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| player_id | UUID | FK → cc_campaign_players(id), NOT NULL |
| datasheet_name | TEXT | NOT NULL |
| custom_name | TEXT | NOT NULL, DEFAULT '' |
| points_cost | INTEGER | NOT NULL, DEFAULT 0 |
| rank | TEXT | NOT NULL, DEFAULT 'Battle-ready' |
| experience_points | INTEGER | NOT NULL, DEFAULT 0 |
| crusade_points | INTEGER | NOT NULL, DEFAULT 0 |
| battles_played | INTEGER | NOT NULL, DEFAULT 0 |
| battles_survived | INTEGER | NOT NULL, DEFAULT 0 |
| model_count | INTEGER | NULLABLE |
| equipment | TEXT | NOT NULL, DEFAULT '' |
| battle_honours | JSONB | DEFAULT '[]' |
| battle_scars | JSONB | DEFAULT '[]' |
| notes | TEXT | NOT NULL, DEFAULT '' |
| is_destroyed | BOOLEAN | NOT NULL, DEFAULT false |
| is_warlord | BOOLEAN | NOT NULL, DEFAULT false |
| status | TEXT | NOT NULL, DEFAULT 'ready' |
| faction_legacy | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

Maps to: `CrusadeUnit` in `src/types/index.ts`

### cc_battles
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| campaign_id | UUID | FK → cc_campaigns(id), NOT NULL |
| player_id | UUID | FK → cc_campaign_players(id), NOT NULL |
| opponent_id | UUID | NOT NULL |
| opponent_name | TEXT | NOT NULL |
| opponent_faction | TEXT | NOT NULL |
| mission_name | TEXT | NOT NULL |
| battle_size | TEXT | NOT NULL |
| player_vp | INTEGER | NOT NULL, DEFAULT 0 |
| opponent_vp | INTEGER | NOT NULL, DEFAULT 0 |
| result | TEXT | NOT NULL |
| units_fielded | JSONB | DEFAULT '[]' |
| marked_for_greatness | UUID | NULLABLE |
| agendas | JSONB | DEFAULT '[]' |
| combat_log | JSONB | DEFAULT '[]' |
| notes | TEXT | NOT NULL, DEFAULT '' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

Maps to: `Battle` in `src/types/index.ts`

### cc_territories
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| campaign_id | UUID | FK → cc_campaigns(id), NOT NULL |
| name | TEXT | NOT NULL |
| controlled_by | UUID | NULLABLE, FK → cc_campaign_players(id) |
| position_x | FLOAT | NOT NULL, DEFAULT 0 |
| position_y | FLOAT | NOT NULL, DEFAULT 0 |
| bonus_text | TEXT | NOT NULL, DEFAULT '' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

Maps to: `Territory` in `src/types/index.ts`

### cc_requisition_log
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| player_id | UUID | FK → cc_campaign_players(id), NOT NULL |
| campaign_id | UUID | FK → cc_campaigns(id), NOT NULL |
| type | TEXT | NOT NULL |
| name | TEXT | NOT NULL |
| rp_cost | INTEGER | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

## RLS Policies

All tables use Row Level Security. General rules:

- **SELECT**: Users can read rows where they are a participant (via `cc_campaign_players.user_id = auth.uid()` joined to the relevant campaign)
- **INSERT**: Users can insert rows where `user_id = auth.uid()` or where they own the campaign
- **UPDATE**: Users can update their own rows (`user_id = auth.uid()`) or rows they own via campaign ownership
- **DELETE**: Only campaign owners can delete campaign-level resources

## Sync Protocol

### Push (client → cloud)
- `pushCampaignToCloud(campaign)` → UPSERT cc_campaigns
- `pushPlayerToCloud(player)` → UPSERT cc_campaign_players
- `pushUnitToCloud(unit)` → UPSERT cc_crusade_units
- `pushBattleToCloud(battle)` → UPSERT cc_battles

### Pull (cloud → client)
- `pullCampaignFromCloud(userId)` → SELECT from cc_campaign_players WHERE user_id, then join to get campaign, all players, all units, all battles

### Realtime
- Subscribe to cc_campaign_players, cc_battles, cc_crusade_units changes filtered by campaign_id
- Handled in `src/lib/realtime.ts`

### Offline Queue
- Mutations made while offline are queued in localStorage via `src/lib/offlineQueue.ts`
- Queue flushes automatically when connection is restored
- Queue items typed as `QueuedMutation` in `src/types/index.ts`
