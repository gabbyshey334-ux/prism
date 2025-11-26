-- ============================================================================
-- PRISM APP - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- Run this in Supabase SQL Editor to set up the complete database
-- This will drop all existing tables and recreate them fresh
-- ============================================================================

-- Drop all existing tables (except brands if you want to keep it)
-- WARNING: This will delete ALL data!
-- ============================================================================

DROP TABLE IF EXISTS autolist_settings CASCADE;
DROP TABLE IF EXISTS brand_settings CASCADE;
DROP TABLE IF EXISTS brand_content CASCADE;
DROP TABLE IF EXISTS content CASCADE;
DROP TABLE IF EXISTS trending_topics CASCADE;
DROP TABLE IF EXISTS social_media_connections CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS uploads CASCADE;
DROP TABLE IF EXISTS oauth_states CASCADE;

-- Uncomment the line below if you want to delete brands table too
-- DROP TABLE IF EXISTS brands CASCADE;

-- ============================================================================
-- 1. BRANDS TABLE
-- ============================================================================
-- Stores brand information for each user

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  website_url TEXT,
  primary_color TEXT DEFAULT '#88925D',
  logo_url TEXT,
  rss_feeds TEXT[], -- Array of RSS feed URLs
  news_topics TEXT[], -- Array of topics for AI-driven news search
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands(user_id);

-- ============================================================================
-- 2. BRAND SETTINGS TABLE
-- ============================================================================
-- Stores platform-specific settings for each brand

CREATE TABLE IF NOT EXISTS brand_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'twitter', 'general'
  brand_voice TEXT,
  tone TEXT,
  posting_frequency TEXT,
  best_times TEXT[],
  content_pillars TEXT[],
  hashtag_strategy TEXT,
  target_audience TEXT,
  content_goals TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(brand_id, platform)
);

-- Index for faster brand queries
CREATE INDEX IF NOT EXISTS idx_brand_settings_brand_id ON brand_settings(brand_id);

-- ============================================================================
-- 3. CONTENT TABLE
-- ============================================================================
-- Stores generated content ideas and posts

CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT,
  description TEXT,
  content_type TEXT, -- 'idea', 'post', 'video', 'story', etc.
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'published', 'archived'
  source TEXT, -- 'brainstorm', 'trends', 'generate', 'manual'
  media_urls TEXT[],
  scheduled_for TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at DESC);

-- ============================================================================
-- 4. BRAND_CONTENT TABLE (Junction Table)
-- ============================================================================
-- Links content to brands with platform-specific generated content

CREATE TABLE IF NOT EXISTS brand_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  selected_platforms TEXT[], -- Array of platforms: ['instagram', 'facebook', 'tiktok']
  generated_content JSONB, -- Platform-specific generated content: {"instagram": "text...", "facebook": "text..."}
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'posted'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_id, brand_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brand_content_content_id ON brand_content(content_id);
CREATE INDEX IF NOT EXISTS idx_brand_content_brand_id ON brand_content(brand_id);

-- ============================================================================
-- 5. SOCIAL MEDIA CONNECTIONS TABLE
-- ============================================================================
-- Stores OAuth tokens and connection info for social media platforms

CREATE TABLE IF NOT EXISTS social_media_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'twitter'
  platform_user_id TEXT,
  platform_username TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[],
  profile_data JSONB, -- Store profile info like name, avatar, follower count
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform, platform_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_connections_user_id ON social_media_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_brand_id ON social_media_connections(brand_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_platform ON social_media_connections(platform);

-- ============================================================================
-- 6. AUTOLIST SETTINGS TABLE
-- ============================================================================
-- Stores autoposting queue settings for each brand/platform

CREATE TABLE IF NOT EXISTS autolist_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'instagram', 'facebook', 'tiktok', etc.
  is_enabled BOOLEAN DEFAULT false,
  post_frequency TEXT, -- 'daily', 'twice_daily', 'weekly', etc.
  post_times TEXT[], -- Array of times: ['09:00', '17:00']
  timezone TEXT DEFAULT 'UTC',
  queue_content_ids UUID[], -- Array of content IDs in queue order
  auto_schedule BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(brand_id, platform)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_autolist_settings_brand_id ON autolist_settings(brand_id);

-- ============================================================================
-- 7. TRENDING TOPICS TABLE
-- ============================================================================
-- Stores trending topics and hashtags for content inspiration

CREATE TABLE IF NOT EXISTS trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  platform TEXT, -- 'instagram', 'tiktok', 'twitter', 'general'
  topic TEXT NOT NULL,
  description TEXT,
  hashtags TEXT[],
  relevance_score INTEGER DEFAULT 0,
  volume INTEGER, -- Trend volume/popularity
  source TEXT, -- 'api', 'manual', 'ai_generated'
  category TEXT, -- 'fashion', 'tech', 'lifestyle', etc.
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trending_topics_user_id ON trending_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_trending_topics_platform ON trending_topics(platform);
CREATE INDEX IF NOT EXISTS idx_trending_topics_created_at ON trending_topics(created_at DESC);

-- ============================================================================
-- 8. TEMPLATES TABLE
-- ============================================================================
-- Stores reusable content templates

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT, -- 'post', 'caption', 'story', 'hashtag_set'
  platform TEXT, -- Target platform or 'all'
  content TEXT NOT NULL,
  variables JSONB, -- Template variables: {"product_name": "", "cta": ""}
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_brand_id ON templates(brand_id);

-- ============================================================================
-- 9. UPLOADS TABLE
-- ============================================================================
-- Stores uploaded media file metadata

CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- 'image', 'video', 'document'
  mime_type TEXT,
  file_size BIGINT, -- Size in bytes
  storage_path TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- For videos, duration in seconds
  thumbnail_url TEXT,
  tags TEXT[],
  alt_text TEXT,
  metadata JSONB, -- Additional metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_brand_id ON uploads(brand_id);
CREATE INDEX IF NOT EXISTS idx_uploads_file_type ON uploads(file_type);

-- ============================================================================
-- 10. OAUTH_STATES TABLE
-- ============================================================================
-- Temporary storage for OAuth state tokens (for security)

CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT UNIQUE NOT NULL,
  user_id TEXT,
  platform TEXT NOT NULL,
  redirect_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on all tables

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE autolist_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role full access" ON brands;
DROP POLICY IF EXISTS "Service role full access" ON brand_settings;
DROP POLICY IF EXISTS "Service role full access" ON content;
DROP POLICY IF EXISTS "Service role full access" ON brand_content;
DROP POLICY IF EXISTS "Service role full access" ON social_media_connections;
DROP POLICY IF EXISTS "Service role full access" ON autolist_settings;
DROP POLICY IF EXISTS "Service role full access" ON trending_topics;
DROP POLICY IF EXISTS "Service role full access" ON templates;
DROP POLICY IF EXISTS "Service role full access" ON uploads;
DROP POLICY IF EXISTS "Service role full access" ON oauth_states;

-- Create permissive policies for service role (backend with SERVICE_ROLE key)
-- These allow the backend to perform all operations

CREATE POLICY "Service role full access" ON brands
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON brand_settings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON content
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON brand_content
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON social_media_connections
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON autolist_settings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON trending_topics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON templates
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON uploads
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON oauth_states
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables that have updated_at
DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brand_settings_updated_at ON brand_settings;
CREATE TRIGGER update_brand_settings_updated_at
  BEFORE UPDATE ON brand_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_updated_at ON content;
CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brand_content_updated_at ON brand_content;
CREATE TRIGGER update_brand_content_updated_at
  BEFORE UPDATE ON brand_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_connections_updated_at ON social_media_connections;
CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON social_media_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_autolist_settings_updated_at ON autolist_settings;
CREATE TRIGGER update_autolist_settings_updated_at
  BEFORE UPDATE ON autolist_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired OAuth states (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
-- Additional indexes for common query patterns

-- Content queries by status and date
CREATE INDEX IF NOT EXISTS idx_content_status_date ON content(status, created_at DESC);

-- Social connections active status
CREATE INDEX IF NOT EXISTS idx_social_connections_active ON social_media_connections(is_active, user_id);

-- Template favorites
CREATE INDEX IF NOT EXISTS idx_templates_favorite ON templates(is_favorite, user_id);

-- ============================================================================
-- SAMPLE DATA (OPTIONAL - Comment out if not needed)
-- ============================================================================
-- Uncomment below to insert sample data for testing

/*
-- Sample brand
INSERT INTO brands (user_id, name, description, website_url, primary_color)
VALUES 
  ('sample-user-id', 'Sample Brand', 'A sample brand for testing', 'https://example.com', '#88925D');

-- Sample brand settings
INSERT INTO brand_settings (brand_id, platform, brand_voice, tone, target_audience)
SELECT 
  id, 
  'instagram', 
  'Friendly and approachable', 
  'Casual but professional', 
  'Young professionals aged 25-35'
FROM brands WHERE name = 'Sample Brand' LIMIT 1;
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the schema was created correctly

-- Check all tables exist
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PRISM APP DATABASE SCHEMA CREATED SUCCESSFULLY!';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Tables created: brands, brand_settings, content, brand_content,';
  RAISE NOTICE '                social_media_connections, autolist_settings,';
  RAISE NOTICE '                trending_topics, templates, uploads, oauth_states';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS enabled on all tables';
  RAISE NOTICE 'Indexes created for performance';
  RAISE NOTICE 'Triggers added for auto-updating timestamps';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify SUPABASE_SERVICE_KEY is set in backend environment';
  RAISE NOTICE '2. Deploy backend code';
  RAISE NOTICE '3. Test brand creation in your app';
  RAISE NOTICE '============================================================================';
END $$;
