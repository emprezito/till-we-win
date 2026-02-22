
ALTER TABLE public.site_config
ADD COLUMN enable_auto_stream boolean NOT NULL DEFAULT true,
ADD COLUMN manual_override_stream_url text NOT NULL DEFAULT '';
