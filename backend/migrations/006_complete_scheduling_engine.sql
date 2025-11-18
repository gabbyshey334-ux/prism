-- Create post_logs table for comprehensive logging
CREATE TABLE post_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'created', 'scheduled', 'processing', 'posted', 'failed', 'retry_scheduled', 'retry_attempt', 'cancelled'
  status VARCHAR(50) NOT NULL,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_post_logs_post_id ON post_logs(post_id);
CREATE INDEX idx_post_logs_event_type ON post_logs(event_type);
CREATE INDEX idx_post_logs_created_at ON post_logs(created_at DESC);
CREATE INDEX idx_post_logs_post_event ON post_logs(post_id, event_type);

-- Add recurring job fields to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS recurrence_rule TEXT; -- RRULE format or custom cron expression
ALTER TABLE posts ADD COLUMN IF NOT EXISTS repeat_interval VARCHAR(20); -- 'daily', 'weekly', 'monthly', 'custom'
ALTER TABLE posts ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS recurrence_end_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES posts(id);

-- Add retry configuration fields
ALTER TABLE posts ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS retry_delay_minutes INTEGER DEFAULT 15;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS processing_lock UUID;

-- Add performance indexes
CREATE INDEX idx_posts_status_scheduled ON posts(status, scheduled_at) WHERE status = 'queued';
CREATE INDEX idx_posts_next_retry ON posts(next_retry_at) WHERE status = 'retry';
CREATE INDEX idx_posts_is_recurring ON posts(is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX idx_posts_processing_lock ON posts(processing_lock);
CREATE INDEX idx_posts_parent_post_id ON posts(parent_post_id);

-- Create a separate recurring_posts table for better organization
CREATE TABLE recurring_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  recurrence_rule TEXT NOT NULL, -- RRULE format
  repeat_interval VARCHAR(20) NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE,
  last_generated_at TIMESTAMP WITH TIME ZONE,
  next_generation_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recurring_post_instances for tracking generated posts
CREATE TABLE recurring_post_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_post_id UUID NOT NULL REFERENCES recurring_posts(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for recurring tables
CREATE INDEX idx_recurring_posts_brand_id ON recurring_posts(brand_id);
CREATE INDEX idx_recurring_posts_next_generation ON recurring_posts(next_generation_at) WHERE is_active = TRUE;
CREATE INDEX idx_recurring_post_instances_recurring_id ON recurring_post_instances(recurring_post_id);
CREATE INDEX idx_recurring_post_instances_post_id ON recurring_post_instances(post_id);
CREATE INDEX idx_recurring_post_instances_scheduled_for ON recurring_post_instances(scheduled_for);

-- Add rate limiting columns to brands table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS rate_limit_posts_per_hour INTEGER DEFAULT 10;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS rate_limit_posts_per_day INTEGER DEFAULT 100;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS concurrent_posts_limit INTEGER DEFAULT 2;

-- Create rate limiting tracking table
CREATE TABLE brand_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  posts_this_hour INTEGER DEFAULT 0,
  posts_this_day INTEGER DEFAULT 0,
  hour_window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  day_window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(brand_id, platform)
);

-- Add RLS policies for post_logs
ALTER TABLE post_logs ENABLE ROW LEVEL SECURITY;

-- Users can view logs for posts they own through brand membership
CREATE POLICY "Users can view post logs for their brand posts" ON post_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts 
      JOIN brands ON posts.brand_id = brands.id
      JOIN brand_members ON brands.id = brand_members.brand_id
      WHERE posts.id = post_logs.post_id 
      AND brand_members.user_id = auth.uid()
    )
  );

-- Service role can create logs
CREATE POLICY "Service role can create post logs" ON post_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_logs.post_id
    )
  );

-- Add RLS policies for recurring_posts
ALTER TABLE recurring_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recurring posts for their brands" ON recurring_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brands
      JOIN brand_members ON brands.id = brand_members.brand_id
      WHERE brands.id = recurring_posts.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage recurring posts for their brands" ON recurring_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brands
      JOIN brand_members ON brands.id = brand_members.brand_id
      WHERE brands.id = recurring_posts.brand_id
      AND brand_members.user_id = auth.uid()
      AND brand_members.role IN ('admin', 'owner')
    )
  );