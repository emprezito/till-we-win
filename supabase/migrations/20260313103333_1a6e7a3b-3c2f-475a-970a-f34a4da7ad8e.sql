
CREATE TABLE public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  function_name text NOT NULL DEFAULT 'arsenal-live',
  key_index integer NOT NULL DEFAULT 0,
  endpoint text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'success',
  skipped boolean NOT NULL DEFAULT false,
  skip_reason text
);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view api logs" ON public.api_usage_logs
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Service role can insert logs" ON public.api_usage_logs
  FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);

CREATE INDEX idx_api_usage_created_at ON public.api_usage_logs (created_at DESC);
