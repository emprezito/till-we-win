
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname text NOT NULL DEFAULT 'Gooner',
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read messages" ON public.chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert messages" ON public.chat_messages
  FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
