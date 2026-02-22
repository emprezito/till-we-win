
-- Create admin role enum
CREATE TYPE public.app_role AS ENUM ('admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check admin role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Convenience wrapper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- user_roles RLS policies
CREATE POLICY "Admins can view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Create site_config table (single-row settings)
CREATE TABLE public.site_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_name TEXT NOT NULL DEFAULT 'TIL WE WIN',
    ticker TEXT NOT NULL DEFAULT '$TWW',
    contract_address TEXT NOT NULL DEFAULT '',
    pumpfun_link TEXT NOT NULL DEFAULT '',
    livestream_url TEXT NOT NULL DEFAULT '',
    is_live BOOLEAN NOT NULL DEFAULT false,
    next_match_date TIMESTAMPTZ,
    opponent TEXT NOT NULL DEFAULT '',
    streams_completed INTEGER NOT NULL DEFAULT 0,
    matches_streamed INTEGER NOT NULL DEFAULT 0,
    epl_status TEXT NOT NULL DEFAULT 'In Progress',
    mission_start_date DATE NOT NULL DEFAULT '2025-01-01',
    twitter_link TEXT NOT NULL DEFAULT '',
    discord_link TEXT NOT NULL DEFAULT '',
    market_cap TEXT NOT NULL DEFAULT '',
    holder_count TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- site_config RLS: public read, admin write
CREATE POLICY "Anyone can read config" ON public.site_config
  FOR SELECT USING (true);
CREATE POLICY "Admins can update config" ON public.site_config
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can insert config" ON public.site_config
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- Create slides table
CREATE TABLE public.slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    slide_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;

-- slides RLS: public read, admin write
CREATE POLICY "Anyone can read slides" ON public.slides
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage slides" ON public.slides
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Insert default site_config row
INSERT INTO public.site_config (token_name, ticker, contract_address, pumpfun_link)
VALUES ('TIL WE WIN', '$TWW', '', '');

-- Insert sample slides
INSERT INTO public.slides (title, content, slide_order) VALUES
  ('MISSION BRIEFING', 'We livestream every Arsenal match until Arsenal wins the EPL. No breaks. No excuses. TIL WE WIN.', 1),
  ('THE TOKEN', '$TWW is the mission fuel. Every holder is part of the mission crew.', 2),
  ('THE COMMITMENT', 'Creator fee buyback program ensures long-term alignment with the community.', 3);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_site_config_updated_at
  BEFORE UPDATE ON public.site_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_slides_updated_at
  BEFORE UPDATE ON public.slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
