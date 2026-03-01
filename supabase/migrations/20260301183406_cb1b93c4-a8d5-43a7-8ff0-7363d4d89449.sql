
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS match_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS match_home_team text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS match_away_team text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS match_score text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS match_league text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cached_servers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS match_start_time timestamptz;
