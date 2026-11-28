-- Treasure shop + coin economy migration.
--
-- Run AFTER scripts/migrate-ranked.sql:
--   psql "$DATABASE_URL" -f scripts/migrate-treasure-shop.sql
--
-- Safe to run more than once. Every berry payout is recorded in coin_ledger under
-- a unique (account, source, ref) key, so nothing can ever be paid twice.
--
-- Berry rewards (src/lib/coins.ts): daily voyage +10, adventure level (first
-- clear) +10, ranked win +5, plus bounty milestones and ranked achievements.
-- Every captain starts with 0 berries; nothing earned before launch is backfilled.

BEGIN;

ALTER TABLE captain_accounts
  ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS character_unlocks (
  account_id uuid NOT NULL REFERENCES captain_accounts(id) ON DELETE CASCADE,
  character_id varchar(32) NOT NULL,
  source varchar(16) NOT NULL DEFAULT 'chest',
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, character_id)
);

CREATE TABLE IF NOT EXISTS treasure_chest_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES captain_accounts(id) ON DELETE CASCADE,
  chest_rarity varchar(16) NOT NULL,
  reward_rarity varchar(16) NOT NULL,
  character_id varchar(32) NOT NULL,
  duplicate_coins integer NOT NULL DEFAULT 0,
  cost integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS treasure_chest_openings_account_created_idx
  ON treasure_chest_openings(account_id, created_at);

-- Reward chests (ranked win-streak achievements) wait here until opened.
CREATE TABLE IF NOT EXISTS reward_chests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES captain_accounts(id) ON DELETE CASCADE,
  chest_rarity varchar(16) NOT NULL,
  source varchar(16) NOT NULL,
  ref varchar(48) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS reward_chests_account_source_ref_idx ON reward_chests(account_id, source, ref);
CREATE INDEX IF NOT EXISTS reward_chests_account_opened_idx ON reward_chests(account_id, opened_at);

-- Friends list for friendly battles.
CREATE TABLE IF NOT EXISTS ranked_friends (
  account_id uuid NOT NULL REFERENCES captain_accounts(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES captain_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, friend_id)
);
CREATE INDEX IF NOT EXISTS ranked_friends_friend_idx ON ranked_friends(friend_id);

-- Site-wide presence for the "captains online" counter.
CREATE TABLE IF NOT EXISTS site_presence (
  visitor_key varchar(64) PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_presence_seen_idx ON site_presence(last_seen_at);

CREATE TABLE IF NOT EXISTS coin_ledger (
  account_id uuid NOT NULL REFERENCES captain_accounts(id) ON DELETE CASCADE,
  source varchar(16) NOT NULL,
  ref varchar(64) NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, source, ref)
);

CREATE TABLE IF NOT EXISTS coin_backfill_migrations (
  migration_key varchar(64) PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- Berries (stored in captain_accounts.coins / coin_ledger) replace coins at launch.
-- Everyone starts at 0: there is deliberately NO historical backfill. If an older
-- version of this script already backfilled coins, they're wiped exactly once here.
WITH reset AS (
  INSERT INTO coin_backfill_migrations (migration_key) VALUES ('berries_reset_v1')
  ON CONFLICT (migration_key) DO NOTHING
  RETURNING migration_key
), wipe_ledger AS (
  DELETE FROM coin_ledger WHERE EXISTS (SELECT 1 FROM reset)
)
UPDATE captain_accounts SET coins = 0 WHERE EXISTS (SELECT 1 FROM reset) AND coins <> 0;

-- Past daily voyages replayed from the Archive. They count toward achievements and
-- bounty, never toward the daily leaderboard or Top 50 Scores.
CREATE TABLE IF NOT EXISTS archive_runs (
  account_id uuid NOT NULL REFERENCES captain_accounts(id) ON DELETE CASCADE,
  day_key varchar(10) NOT NULL,
  score integer NOT NULL,
  solved integer NOT NULL,
  niche integer NOT NULL DEFAULT 0,
  mistakes integer,
  legs jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, day_key)
);

-- Reward codes typed into the Treasure Shop, and who redeemed them (once per captain).
CREATE TABLE IF NOT EXISTS redeem_codes (
  code varchar(24) PRIMARY KEY,
  berries integer NOT NULL DEFAULT 0,
  chest_rarity varchar(16),
  chest_count integer NOT NULL DEFAULT 0,
  character_id varchar(32),
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  disabled_at timestamptz,
  created_by uuid REFERENCES captain_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS code_redemptions (
  account_id uuid NOT NULL REFERENCES captain_accounts(id) ON DELETE CASCADE,
  code varchar(24) NOT NULL REFERENCES redeem_codes(code) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, code)
);

-- The old achievement Jinbe was replaced by the Straw Hat Jinbe (jinbe-warlord). Captains who had
-- the old one (through the Grand Line Explorer achievement or a chest) get the new one, and anyone
-- wearing the old one now wears the new one.
INSERT INTO character_unlocks (account_id, character_id, source)
  SELECT account_id, 'jinbe-warlord', 'replaced' FROM achievement_unlocks WHERE achievement_id = 'grand-line-explorer'
  UNION
  SELECT account_id, 'jinbe-warlord', 'replaced' FROM character_unlocks WHERE character_id = 'jinbe'
  ON CONFLICT DO NOTHING;
UPDATE captain_accounts SET equipped_character = 'jinbe-warlord' WHERE equipped_character = 'jinbe';

COMMIT;
