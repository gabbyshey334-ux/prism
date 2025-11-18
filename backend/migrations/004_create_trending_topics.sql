-- Create trending_topics table with comprehensive schema
CREATE TABLE IF NOT EXISTS trending_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    brand_id UUID REFERENCES brands(id),
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL,
    source_url TEXT,
    source_date TIMESTAMP WITH TIME ZONE,
    trending_data TEXT,
    keywords TEXT[],
    viral_potential INTEGER CHECK (viral_potential >= 1 AND viral_potential <= 10),
    category TEXT,
    duration_estimate TEXT,
    brand_relevance TEXT,
    used BOOLEAN DEFAULT FALSE,
    hidden BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trending_topics_user_id ON trending_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_trending_topics_brand_id ON trending_topics(brand_id);
CREATE INDEX IF NOT EXISTS idx_trending_topics_source ON trending_topics(source);
CREATE INDEX IF NOT EXISTS idx_trending_topics_viral_potential ON trending_topics(viral_potential DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_used ON trending_topics(used);
CREATE INDEX IF NOT EXISTS idx_trending_topics_hidden ON trending_topics(hidden);
CREATE INDEX IF NOT EXISTS idx_trending_topics_expires_at ON trending_topics(expires_at);
CREATE INDEX IF NOT EXISTS idx_trending_topics_created_date ON trending_topics(created_date DESC);

-- Grant permissions
GRANT ALL ON trending_topics TO anon;
GRANT ALL ON trending_topics TO authenticated;

-- Create RLS policies
CREATE POLICY "Allow users to view their own trends" ON trending_topics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert their own trends" ON trending_topics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own trends" ON trending_topics FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own trends" ON trending_topics FOR DELETE TO authenticated USING (auth.uid() = user_id);