
-- Source types enum
CREATE TYPE public.source_type AS ENUM ('telegram', 'rss', 'web');

-- Post statuses
CREATE TYPE public.post_status AS ENUM ('pending', 'published', 'failed', 'skipped');

-- Channels table
CREATE TABLE public.channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  telegram_chat_id TEXT,
  telegram_bot_token TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  publish_interval_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own channels" ON public.channels
  FOR ALL USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Sources table (linked to channels)
CREATE TABLE public.sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  source_type source_type NOT NULL,
  url TEXT,
  telegram_source_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_parsed_at TIMESTAMPTZ,
  posts_collected INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sources" ON public.sources
  FOR ALL USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON public.sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Parsed content (raw content from sources)
CREATE TABLE public.parsed_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  original_text TEXT NOT NULL,
  processed_text TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  source_url TEXT,
  source_date TIMESTAMPTZ,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parsed_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own parsed content" ON public.parsed_content
  FOR ALL USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Scheduled posts
CREATE TABLE public.scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content_id UUID REFERENCES public.parsed_content(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]'::jsonb,
  scheduled_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  status post_status NOT NULL DEFAULT 'pending',
  telegram_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scheduled posts" ON public.scheduled_posts
  FOR ALL USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_scheduled_posts_updated_at BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Indexes for performance
CREATE INDEX idx_sources_channel_id ON public.sources(channel_id);
CREATE INDEX idx_parsed_content_channel_id ON public.parsed_content(channel_id);
CREATE INDEX idx_parsed_content_source_id ON public.parsed_content(source_id);
CREATE INDEX idx_scheduled_posts_channel_id ON public.scheduled_posts(channel_id);
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_at ON public.scheduled_posts(scheduled_at);
CREATE INDEX idx_channels_user_id ON public.channels(user_id);
