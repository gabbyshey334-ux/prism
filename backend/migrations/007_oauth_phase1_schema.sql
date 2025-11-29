-- PRISM Phase 1: OAuth System and Core Infrastructure
-- Complete database schema for all entities

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- OAuth States table (CSRF protection with 10-minute expiration)
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    brand_id UUID,
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT oauth_states_platform_check CHECK (platform IN ('tiktok', 'facebook', 'instagram', 'linkedin', 'youtube', 'threads', 'bluesky'))
);

-- Index for state token lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_token ON oauth_states(state_token);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

-- Social Media Connections table
CREATE TABLE IF NOT EXISTS social_media_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    brand_id UUID,
    platform TEXT NOT NULL,
    platform_user_id TEXT,
    platform_username TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    profile_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT social_media_connections_platform_check CHECK (platform IN ('tiktok', 'facebook', 'instagram', 'linkedin', 'youtube', 'threads', 'bluesky'))
);

-- Indexes for social media connections
CREATE INDEX IF NOT EXISTS idx_social_media_connections_user ON social_media_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_social_media_connections_brand ON social_media_connections(brand_id);
CREATE INDEX IF NOT EXISTS idx_social_media_connections_platform ON social_media_connections(platform);
CREATE INDEX IF NOT EXISTS idx_social_media_connections_active ON social_media_connections(is_active);

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    industry TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_user ON brands(user_id);
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands(is_active);

-- Content table
CREATE TABLE IF NOT EXISTS content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    brand_id UUID,
    title TEXT,
    description TEXT,
    content_type TEXT,
    content_data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'draft',
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_user ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_brand ON content(brand_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_scheduled ON content(scheduled_for);

-- Trending Topics table
CREATE TABLE IF NOT EXISTS trending_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    relevance_score INTEGER DEFAULT 0,
    brand_context TEXT,
    content_ideas JSONB DEFAULT '[]',
    hashtags JSONB DEFAULT '[]',
    keywords JSONB DEFAULT '[]',
    is_hidden BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trending_topics_category ON trending_topics(category);
CREATE INDEX IF NOT EXISTS idx_trending_topics_relevance ON trending_topics(relevance_score);
CREATE INDEX IF NOT EXISTS idx_trending_topics_hidden ON trending_topics(is_hidden);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    brand_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    template_type TEXT,
    content_structure JSONB DEFAULT '{}',
    cesdk_scene TEXT,
    placeholders JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_brand ON templates(brand_id);
CREATE INDEX IF NOT EXISTS idx_templates_active ON templates(is_active);

-- Brand Settings table
CREATE TABLE IF NOT EXISTS brand_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL UNIQUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT brand_settings_brand_fk FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_brand_settings_brand ON brand_settings(brand_id);

-- Autolist Settings table
CREATE TABLE IF NOT EXISTS autolist_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL,
    platform TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT autolist_settings_brand_fk FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_autolist_settings_brand ON autolist_settings(brand_id);
CREATE INDEX IF NOT EXISTS idx_autolist_settings_platform ON autolist_settings(platform);

-- Uploads table
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    brand_id UUID,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    storage_path TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_brand ON uploads(brand_id);
CREATE INDEX IF NOT EXISTS idx_uploads_type ON uploads(file_type);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trending_topics_updated_at BEFORE UPDATE ON trending_topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_settings_updated_at BEFORE UPDATE ON brand_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_autolist_settings_updated_at BEFORE UPDATE ON autolist_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uploads_updated_at BEFORE UPDATE ON uploads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_media_connections_updated_at BEFORE UPDATE ON social_media_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired OAuth states (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM oauth_states
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies (if using Supabase Auth)
-- Enable RLS on tables
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE autolist_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users can view own brands" ON brands
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own content" ON content
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own templates" ON templates
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own uploads" ON uploads
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own connections" ON social_media_connections
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own brand settings" ON brand_settings
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM brands WHERE brands.id = brand_settings.brand_id AND brands.user_id = auth.uid()::text
    ));

CREATE POLICY "Users can view own autolist settings" ON autolist_settings
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM brands WHERE brands.id = autolist_settings.brand_id AND brands.user_id = auth.uid()::text
    ));

-- Comments for documentation
COMMENT ON TABLE oauth_states IS 'OAuth state tokens for CSRF protection (10-minute expiration)';
COMMENT ON TABLE social_media_connections IS 'Social media platform OAuth connections';
COMMENT ON TABLE brands IS 'User brands/organizations';
COMMENT ON TABLE content IS 'Social media content posts';
COMMENT ON TABLE trending_topics IS 'AI-generated trending topics';
COMMENT ON TABLE templates IS 'Content templates with CE.SDK scenes';
COMMENT ON TABLE brand_settings IS 'Brand-specific settings';
COMMENT ON TABLE autolist_settings IS 'Autolist settings per platform';
COMMENT ON TABLE uploads IS 'File uploads stored in Firebase Storage';

