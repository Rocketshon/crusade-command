-- CrusadeCommand Feature Additions Migration
-- Run this in the Supabase SQL Editor

-- Add status to units
ALTER TABLE cc_crusade_units ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready';
-- Add check constraint separately (IF NOT EXISTS not supported for constraints)
DO $$ BEGIN
  ALTER TABLE cc_crusade_units ADD CONSTRAINT cc_units_status_check
    CHECK (status IN ('ready', 'battle_scarred', 'recovering', 'destroyed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add faction legacy data (per-unit custom trackers)
ALTER TABLE cc_crusade_units ADD COLUMN IF NOT EXISTS faction_legacy JSONB NOT NULL DEFAULT '{}';

-- Add agendas to battles
ALTER TABLE cc_battles ADD COLUMN IF NOT EXISTS agendas JSONB NOT NULL DEFAULT '[]';

-- Add combat log to battles
ALTER TABLE cc_battles ADD COLUMN IF NOT EXISTS combat_log JSONB NOT NULL DEFAULT '[]';

-- Add announcements to campaigns
ALTER TABLE cc_campaigns ADD COLUMN IF NOT EXISTS announcements JSONB NOT NULL DEFAULT '[]';

-- Requisition log
CREATE TABLE IF NOT EXISTS cc_requisition_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES cc_campaign_players(id) ON DELETE CASCADE,
  requisition_name TEXT NOT NULL,
  rp_cost INT NOT NULL,
  target_unit_id UUID,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cc_reqlog_player ON cc_requisition_log(player_id);

ALTER TABLE cc_requisition_log ENABLE ROW LEVEL SECURITY;

-- RLS for requisition log (safe to re-create)
DO $$ BEGIN
  CREATE POLICY "ReqLog: read same campaign" ON cc_requisition_log FOR SELECT USING (
    player_id IN (
      SELECT cp.id FROM cc_campaign_players cp
      WHERE cp.campaign_id IN (
        SELECT campaign_id FROM cc_campaign_players WHERE user_id = auth.uid()
      )
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ReqLog: insert own" ON cc_requisition_log FOR INSERT WITH CHECK (
    player_id IN (SELECT id FROM cc_campaign_players WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Territories table
CREATE TABLE IF NOT EXISTS cc_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES cc_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  controlled_by UUID REFERENCES cc_campaign_players(id),
  position_x INT NOT NULL DEFAULT 0,
  position_y INT NOT NULL DEFAULT 0,
  bonus_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cc_territories_campaign ON cc_territories(campaign_id);

ALTER TABLE cc_territories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Territories: read as member" ON cc_territories FOR SELECT USING (
    campaign_id IN (SELECT campaign_id FROM cc_campaign_players WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Territories: insert as owner" ON cc_territories FOR INSERT WITH CHECK (
    campaign_id IN (SELECT id FROM cc_campaigns WHERE owner_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Territories: update as owner" ON cc_territories FOR UPDATE USING (
    campaign_id IN (SELECT id FROM cc_campaigns WHERE owner_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Territories: delete as owner" ON cc_territories FOR DELETE USING (
    campaign_id IN (SELECT id FROM cc_campaigns WHERE owner_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE cc_territories;
ALTER PUBLICATION supabase_realtime ADD TABLE cc_requisition_log;
