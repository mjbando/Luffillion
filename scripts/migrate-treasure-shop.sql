-- Treasure shop + coin economy migration.
--
-- Run AFTER scripts/migrate-ranked.sql:
--   psql "$DATABASE_URL" -f scripts/migrate-treasure-shop.sql
--
-- Safe to run more than once. Every payout (live or backfilled) is recorded in
-- coin_ledger under a unique (account, source, ref) key, so a voyage, adventure
-- level or ranked win can never be paid twice. The backfill only
-- credits ledger rows it newly inserts.
--
-- Reward values mirror src/lib/coins.ts:
--   daily voyage +10, adventure level (first clear) +10, ranked win +10,
--   achievements pay bounty (berries) instead of coins.

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

-- Block live payouts until this transaction commits, so a reward earned while the
-- migration runs is either already in the ledger (and skipped here) or waits and
-- then conflicts harmlessly with the backfilled row.
LOCK TABLE coin_ledger IN EXCLUSIVE MODE;
LOCK TABLE coin_backfill_migrations IN EXCLUSIVE MODE;

DO $coin_backfill$
DECLARE
  -- An earlier draft of this script ('initial_rewards_v1') credited balances
  -- directly without a ledger. If it already ran, record the history in the
  -- ledger but don't pay it a second time.
  already_paid boolean := EXISTS (
    SELECT 1 FROM coin_backfill_migrations WHERE migration_key = 'initial_rewards_v1'
  );
BEGIN
  IF EXISTS (SELECT 1 FROM coin_backfill_migrations WHERE migration_key = 'coin_ledger_v1') THEN
    RAISE NOTICE 'Coin backfill already applied; nothing to do.';
    RETURN;
  END IF;

  CREATE TEMP TABLE coin_backfill_awards (
    account_id uuid NOT NULL,
    source varchar(16) NOT NULL,
    ref varchar(64) NOT NULL,
    amount integer NOT NULL
  ) ON COMMIT DROP;

  -- Daily voyages: one completed run per captain per day.
  INSERT INTO coin_backfill_awards
  SELECT account_id, 'daily', day_key, 10
  FROM runs
  WHERE account_id IS NOT NULL;

  -- Adventure: each level beaten (first clear only; replays never pay).
  IF to_regclass('public.adventure_clears') IS NOT NULL THEN
    INSERT INTO coin_backfill_awards
    SELECT account_id, 'adventure', level::text, 10
    FROM adventure_clears;
  END IF;

  -- Ranked: wins in finished ranked matches. Friendly battles and draws don't pay.
  IF to_regclass('public.ranked_matches') IS NOT NULL THEN
    INSERT INTO coin_backfill_awards
    SELECT winner_id, 'ranked', id::text, 10
    FROM ranked_matches
    WHERE status = 'finished'
      AND winner_id IS NOT NULL
      AND is_draw = 0
      AND COALESCE(state->>'mode', 'ranked') <> 'friendly'
      AND EXISTS (SELECT 1 FROM captain_accounts WHERE captain_accounts.id = ranked_matches.winner_id);
  END IF;

  -- Achievements pay bounty (berries), not coins, so they are not part of the coin backfill.

  -- Insert into the ledger, skipping anything already paid live, then credit
  -- exactly the newly recorded rows.
  WITH inserted AS (
    INSERT INTO coin_ledger (account_id, source, ref, amount)
    SELECT account_id, source, ref, amount FROM coin_backfill_awards
    ON CONFLICT (account_id, source, ref) DO NOTHING
    RETURNING account_id, amount
  ), totals AS (
    SELECT account_id, sum(amount)::integer AS total FROM inserted GROUP BY account_id
  )
  UPDATE captain_accounts AS account
  SET coins = account.coins + totals.total
  FROM totals
  WHERE account.id = totals.account_id
    AND NOT already_paid;

  INSERT INTO coin_backfill_migrations (migration_key) VALUES ('coin_ledger_v1');
  RAISE NOTICE 'Coin backfill applied (credited balances: %).', NOT already_paid;
END
$coin_backfill$;

COMMIT;
