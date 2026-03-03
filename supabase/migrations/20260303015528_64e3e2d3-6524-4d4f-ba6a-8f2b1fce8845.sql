
-- Table to store recorded match replays
CREATE TABLE public.match_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_title TEXT NOT NULL,
  home_team TEXT NOT NULL DEFAULT '',
  away_team TEXT NOT NULL DEFAULT '',
  score TEXT NOT NULL DEFAULT '',
  league TEXT NOT NULL DEFAULT '',
  match_date TIMESTAMP WITH TIME ZONE,
  recording_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  file_size_mb NUMERIC(10,2),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.match_recordings ENABLE ROW LEVEL SECURITY;

-- Anyone can view recordings
CREATE POLICY "Anyone can view recordings"
ON public.match_recordings
FOR SELECT
USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage recordings"
ON public.match_recordings
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Index for expiry cleanup queries
CREATE INDEX idx_recordings_expires_at ON public.match_recordings(expires_at);
