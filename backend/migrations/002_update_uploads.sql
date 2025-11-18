-- Add missing columns to uploads table
ALTER TABLE uploads 
ADD COLUMN IF NOT EXISTS filename TEXT,
ADD COLUMN IF NOT EXISTS size INTEGER,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_brand_id ON uploads(brand_id);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at);

-- Update existing records with default values
UPDATE uploads SET filename = 'unknown' WHERE filename IS NULL;
UPDATE uploads SET size = 0 WHERE size IS NULL;
UPDATE uploads SET metadata = '{}' WHERE metadata IS NULL;