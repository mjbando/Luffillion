BEGIN;

CREATE TABLE IF NOT EXISTS ranked_profiles (
  account_id uuid PRIMARY KEY REFERENCES captain_accounts(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  win_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  queued_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ranked_profiles_points_idx ON ranked_profiles(points);
CREATE INDEX IF NOT EXISTS ranked_profiles_queue_idx ON ranked_profiles(queued_at);
CREATE INDEX IF NOT EXISTS ranked_profiles_seen_idx ON ranked_profiles(last_seen_at);

CREATE TABLE IF NOT EXISTS ranked_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id uuid NOT NULL REFERENCES captain_accounts(id) ON DELETE CASCADE,
  to_account_id uuid NOT NULL REFERENCES captain_accounts(id) ON DELETE CASCADE,
  status varchar(16) NOT NULL DEFAULT 'pending',
  match_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS ranked_challenges_to_idx ON ranked_challenges(to_account_id, status);
CREATE INDEX IF NOT EXISTS ranked_challenges_from_idx ON ranked_challenges(from_account_id, status);

CREATE TABLE IF NOT EXISTS ranked_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id uuid NOT NULL REFERENCES captain_accounts(id) ON DELETE CASCADE,
  player2_id uuid NOT NULL REFERENCES captain_accounts(id) ON DELETE CASCADE,
  status varchar(16) NOT NULL DEFAULT 'active',
  winner_id uuid,
  is_draw integer NOT NULL DEFAULT 0,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ranked_matches_p1_idx ON ranked_matches(player1_id, status);
CREATE INDEX IF NOT EXISTS ranked_matches_p2_idx ON ranked_matches(player2_id, status);

COMMIT;