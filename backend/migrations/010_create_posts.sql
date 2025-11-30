-- Create posts table for scheduling and publishing
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  content_id UUID REFERENCES content(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'queued',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  connection_id UUID REFERENCES social_media_connections(id) ON DELETE SET NULL,
  caption TEXT,
  media_urls TEXT[],
  hashtags TEXT[],
  mentions TEXT[],
  post_metadata JSONB,
  metadata JSONB,
  posted_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  retry_delay_minutes INTEGER DEFAULT 15,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  error_log JSONB,
  platform_post_id TEXT,
  engagement_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_brand_id ON posts(brand_id);
CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);

-- RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON posts;
CREATE POLICY "Service role full access" ON posts FOR ALL USING (true) WITH CHECK (true);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
