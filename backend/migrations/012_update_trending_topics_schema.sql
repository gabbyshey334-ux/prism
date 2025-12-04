-- Migration: Update trending_topics table to match code expectations
-- This adds all missing columns that the application code expects

BEGIN;

-- Add missing columns to trending_topics table
ALTER TABLE trending_topics
  -- Rename 'topic' to 'title' for consistency with code, or add title and keep topic
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS trending_data TEXT,
  ADD COLUMN IF NOT EXISTS keywords TEXT[],
  ADD COLUMN IF NOT EXISTS viral_potential INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS brand_relevance TEXT,
  ADD COLUMN IF NOT EXISTS brand_context TEXT,
  ADD COLUMN IF NOT EXISTS duration_estimate TEXT,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Migrate existing 'topic' data to 'title' if title is null
UPDATE trending_topics 
SET title = topic 
WHERE title IS NULL AND topic IS NOT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_trending_topics_title ON trending_topics(title);
CREATE INDEX IF NOT EXISTS idx_trending_topics_brand_id ON trending_topics(brand_id);
CREATE INDEX IF NOT EXISTS idx_trending_topics_viral_potential ON trending_topics(viral_potential);
CREATE INDEX IF NOT EXISTS idx_trending_topics_source_url ON trending_topics(source_url);
CREATE INDEX IF NOT EXISTS idx_trending_topics_used ON trending_topics(used);
CREATE INDEX IF NOT EXISTS idx_trending_topics_hidden ON trending_topics(hidden);
CREATE INDEX IF NOT EXISTS idx_trending_topics_is_hidden ON trending_topics(is_hidden);

-- Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_trending_topics_updated_at ON trending_topics;
CREATE TRIGGER update_trending_topics_updated_at
  BEFORE UPDATE ON trending_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ensure update_updated_at_column function exists (create if it doesn't)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;

