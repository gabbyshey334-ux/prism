-- Create agent_conversations table for AI agent conversations
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  agent_name TEXT NOT NULL CHECK (agent_name IN ('content_brainstormer', 'idea_generator')),
  metadata JSONB DEFAULT '{}',
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent_name ON agent_conversations(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_agent ON agent_conversations(user_id, agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_updated_at ON agent_conversations(updated_at DESC);

-- Create trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_agent_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_agent_conversations_updated_at ON agent_conversations;
CREATE TRIGGER update_agent_conversations_updated_at
BEFORE UPDATE ON agent_conversations
FOR EACH ROW
EXECUTE FUNCTION update_agent_conversations_updated_at();

-- Add RLS policies (if using Row Level Security)
-- ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own conversations
-- CREATE POLICY agent_conversations_user_policy ON agent_conversations
--   FOR ALL
--   USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

