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

CREATE TABLE IF NOT EXISTS coin_backfill_migrations (
  migration_key varchar(64) PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

DO $coin_backfill$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM coin_backfill_migrations WHERE migration_key = 'initial_rewards_v1') THEN
    UPDATE captain_accounts AS account
    SET coins = account.coins
      + COALESCE((SELECT count(*)::integer * 10 FROM runs WHERE runs.account_id = account.id), 0)
      + COALESCE((SELECT count(*)::integer * 10 FROM adventure_attempts
          WHERE adventure_attempts.account_id = account.id AND adventure_attempts.status = 'passed'), 0)
      + COALESCE((SELECT count(*)::integer * 10 FROM ranked_matches
          WHERE ranked_matches.winner_id = account.id
            AND ranked_matches.status = 'finished'
            AND COALESCE(ranked_matches.state->>'mode', 'ranked') <> 'friendly'), 0)
      + COALESCE((SELECT sum(CASE achievement_id
          WHEN 'first-voyage' THEN 25
          WHEN 'perfect-run' THEN 25
          WHEN 'no-mistakes' THEN 50
          WHEN 'daily-dedication' THEN 25
          WHEN 'unstoppable' THEN 250
          WHEN 'rookie-pirate' THEN 25
          WHEN 'rising-supernova' THEN 100
          WHEN 'yonko-status' THEN 100
          WHEN 'pirate-king' THEN 250
          WHEN 'encyclopedia' THEN 50
          WHEN 'grand-line-explorer' THEN 50
          WHEN 'deep-lore' THEN 100
          WHEN 'the-will-of-d' THEN 250
          WHEN 'one-in-a-luffillion' THEN 50
          WHEN 'laugh-tale' THEN 100
          ELSE 0
        END) FROM achievement_unlocks WHERE achievement_unlocks.account_id = account.id), 0);

    INSERT INTO coin_backfill_migrations (migration_key) VALUES ('initial_rewards_v1');
  END IF;
END
$coin_backfill$;

COMMIT;