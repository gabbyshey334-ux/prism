-- Enhanced Social Posting System Database Schema

-- Enhanced posts table with comprehensive metadata
ALTER TABLE posts ADD COLUMN IF NOT EXISTS provider_post_id text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS provider_user_id text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS caption text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls text[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_types text[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hashtags text[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS mentions text[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS links text[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_metadata jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS error_log jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 3;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS posted_by uuid;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS engagement_metrics jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS platform_specific jsonb;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_platform_status ON posts(platform, status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_brand_id ON posts(brand_id);
CREATE INDEX IF NOT EXISTS idx_posts_provider_post_id ON posts(provider_post_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);

-- Enhanced oauth_tokens table with comprehensive metadata
-- First, check if expires_in column exists and add it if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='oauth_tokens' AND column_name='expires_in') THEN
        ALTER TABLE oauth_tokens ADD COLUMN expires_in integer;
    END IF;
END $$;

ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS account_id text;
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS account_name text;
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS account_username text;
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS account_profile_image text;
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS scopes text[];
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS refresh_token_expires_at timestamp with time zone;
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS token_type text DEFAULT 'Bearer';
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS is_valid boolean DEFAULT true;
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS last_refreshed_at timestamp with time zone;

-- Create indexes for oauth tokens
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_platform_account ON oauth_tokens(platform, account_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_is_valid ON oauth_tokens(is_valid);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires ON oauth_tokens(expires_in);

-- Platform-specific posting requirements table
CREATE TABLE IF NOT EXISTS platform_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL UNIQUE,
  required_scopes text[] NOT NULL,
  max_media_count integer DEFAULT 1,
  max_caption_length integer DEFAULT 2200,
  supports_video boolean DEFAULT false,
  supports_stories boolean DEFAULT false,
  supports_reels boolean DEFAULT false,
  min_video_duration integer,
  max_video_duration integer,
  max_video_size bigint,
  max_image_size bigint,
  supported_image_formats text[] DEFAULT ARRAY['jpg', 'jpeg', 'png'],
  supported_video_formats text[] DEFAULT ARRAY['mp4', 'mov'],
  aspect_ratio_requirements jsonb,
  posting_restrictions jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert platform requirements
INSERT INTO platform_requirements (
  platform, required_scopes, max_media_count, max_caption_length, 
  supports_video, supports_stories, supports_reels, max_video_size, max_image_size,
  supported_image_formats, supported_video_formats, aspect_ratio_requirements
) VALUES 
('facebook', ARRAY['pages_manage_posts', 'pages_read_engagement']::text[], 10, 63206, true, true, true, 10737418240, 41943040, ARRAY['jpg', 'jpeg', 'png', 'gif']::text[], ARRAY['mp4', 'mov']::text[], '{"square": "1:1", "landscape": "16:9", "portrait": "9:16"}'),
('instagram', ARRAY['instagram_basic', 'instagram_content_publish']::text[], 10, 2200, true, true, true, 10737418240, 8388608, ARRAY['jpg', 'jpeg', 'png']::text[], ARRAY['mp4', 'mov']::text[], '{"square": "1:1", "landscape": "16:9", "portrait": "4:5", "story": "9:16"}'),
('tiktok', ARRAY['user.info.basic', 'video.upload']::text[], 1, 2200, true, false, false, 268435456, 8388608, ARRAY['jpg', 'jpeg', 'png']::text[], ARRAY['mp4', 'mov']::text[], '{"portrait": "9:16"}'),
('linkedin', ARRAY['w_member_social', 'r_liteprofile']::text[], 1, 3000, true, false, false, 5368709120, 104857600, ARRAY['jpg', 'jpeg', 'png']::text[], ARRAY['mp4', 'mov']::text[], '{"landscape": "16:9", "square": "1:1"}'),
('youtube', ARRAY['https://www.googleapis.com/auth/youtube.upload']::text[], 1, 5000, true, false, false, 128849018880, 8388608, ARRAY['jpg', 'jpeg', 'png']::text[], ARRAY['mp4', 'mov', 'avi', 'wmv']::text[], '{"landscape": "16:9"}'),
('threads', ARRAY['threads_basic', 'threads_content_publish']::text[], 1, 500, false, false, false, 0, 8388608, ARRAY['jpg', 'jpeg', 'png']::text[], ARRAY[]::text[], '{"square": "1:1"}'),
('bluesky', ARRAY[]::text[], 4, 300, true, false, false, 1048576, 8388608, ARRAY['jpg', 'jpeg', 'png', 'gif']::text[], ARRAY['mp4']::text[], '{"square": "1:1", "landscape": "16:9"}');

-- Posting queue table for scheduled posts
CREATE TABLE IF NOT EXISTS posting_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  priority integer DEFAULT 5,
  scheduled_at timestamp with time zone NOT NULL,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_count integer DEFAULT 0,
  last_error text,
  processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'retry')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for posting queue
CREATE INDEX IF NOT EXISTS idx_posting_queue_scheduled_at ON posting_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posting_queue_processing_status ON posting_queue(processing_status);
CREATE INDEX IF NOT EXISTS idx_posting_queue_platform ON posting_queue(platform);

-- Media assets table for managing uploaded media
CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brand_id uuid,
  original_filename text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  dimensions jsonb,
  duration integer, -- for videos in seconds
  thumbnail_path text,
  platform_specific_data jsonb,
  is_processed boolean DEFAULT false,
  processing_error text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for media assets
CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON media_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_brand_id ON media_assets(brand_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets(created_at);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;