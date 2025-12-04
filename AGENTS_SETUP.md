# AI Agents Setup Guide

## Overview

The PRISM platform now includes AI-powered conversation agents that help users brainstorm and generate content ideas. Two agents are available:

1. **content_brainstormer** - Helps develop viral content ideas through interactive conversation
2. **idea_generator** - Generates fresh content ideas from scratch

## What Was Implemented

### Frontend Changes

1. **API Client (`src/api/apiClient.js`)**
   - Added `agents` API with methods:
     - `createConversation()` - Create new agent conversation
     - `listConversations()` - List conversations for an agent
     - `getConversation()` - Get specific conversation
     - `addMessage()` - Send message and get AI response
     - `deleteConversation()` - Delete a conversation
     - `subscribeToConversation()` - Real-time updates via polling

2. **Prism Client (`src/api/prismClient.js`)**
   - Exported `agents` API for use throughout the app

3. **IdeaInput Component (`src/components/dashboard/IdeaInput.jsx`)**
   - Fixed to use real `ContentCreationWorkflow` instead of dummy component
   - Properly imports and uses the full workflow

### Backend Changes

1. **Agents Route (`backend/src/routes/agents.js`)**
   - Full CRUD operations for agent conversations
   - AI response generation using OpenAI or Google Gemini
   - Conversation history management
   - Agent configuration system

2. **Server Configuration (`backend/src/server.js`)**
   - Mounted `/api/agents` route

3. **Database Migration (`backend/migrations/013_create_agent_conversations.sql`)**
   - Creates `agent_conversations` table
   - Indexes for performance
   - Auto-update triggers

## Required Setup

### 1. Run Database Migration

Execute the migration script in your Supabase database:

```sql
-- Run this in Supabase SQL Editor
\i backend/migrations/013_create_agent_conversations.sql
```

Or manually run the SQL from `backend/migrations/013_create_agent_conversations.sql`.

### 2. Configure AI API Keys

The agents require either OpenAI or Google Gemini API keys:

**Option A: OpenAI (Recommended)**
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

**Option B: Google Gemini**
```bash
GOOGLE_API_KEY=your_google_api_key_here
```

Add these to your DigitalOcean environment variables (or `.env` for local development).

See `AI_API_KEYS_SETUP.md` for detailed instructions.

### 3. Verify Agent Configuration

The agents are pre-configured in `backend/src/routes/agents.js`:

- **content_brainstormer**: Helps brainstorm viral content ideas
- **idea_generator**: Generates fresh content ideas

You can customize their instructions and tool access in the `AGENT_CONFIGS` object.

## How It Works

### Agent Conversation Flow

1. **User creates conversation** → `POST /api/agents/conversations`
   - Specifies agent name (`content_brainstormer` or `idea_generator`)
   - Optional metadata (name, description)

2. **User sends message** → `POST /api/agents/conversations/:id/messages`
   - Message is added to conversation history
   - AI generates response using agent's instructions
   - Response is added and conversation is updated

3. **Frontend polls for updates** → `GET /api/agents/conversations/:id`
   - Real-time updates via polling (every 2 seconds)
   - Can be upgraded to WebSockets or SSE for true real-time

### Agent Instructions

Each agent has specific instructions that guide its behavior:

**content_brainstormer:**
- Asks clarifying questions about brand, audience, goals
- Suggests trending formats and platforms
- Provides creative angles and hooks
- Helps refine ideas for viral potential

**idea_generator:**
- Generates multiple content ideas
- Considers current trends
- Suggests different platforms and formats
- Provides hooks and engagement strategies

## API Endpoints

### Conversations

- `GET /api/agents/conversations?agent_name=content_brainstormer` - List conversations
- `POST /api/agents/conversations` - Create conversation
- `GET /api/agents/conversations/:id` - Get conversation
- `DELETE /api/agents/conversations/:id` - Delete conversation

### Messages

- `POST /api/agents/conversations/:id/messages` - Send message and get AI response

## Frontend Usage

```javascript
import { prism } from '@/api/prismClient';

// Create conversation
const conversation = await prism.agents.createConversation({
  agent_name: 'content_brainstormer',
  metadata: { name: 'My Brainstorm Session' }
});

// Send message
await prism.agents.addMessage(conversation, {
  role: 'user',
  content: 'Help me create viral content about...'
});

// Subscribe to updates
const unsubscribe = prism.agents.subscribeToConversation(
  conversation.id,
  (data) => {
    setMessages(data.messages);
  }
);
```

## Testing

1. **Test Agent Creation:**
   - Go to Brainstorm page
   - Click "New Conversation"
   - Should create a conversation with `content_brainstormer` agent

2. **Test Message Sending:**
   - Type a message and send
   - Should receive AI response within a few seconds
   - Response should be relevant to the agent's role

3. **Test Conversation List:**
   - Create multiple conversations
   - Should see all conversations in sidebar
   - Should be able to switch between them

4. **Test Conversation Deletion:**
   - Delete a conversation
   - Should be removed from list

## Troubleshooting

### "AI service is not configured"
- **Solution:** Add `OPENAI_API_KEY` or `GOOGLE_API_KEY` to environment variables

### "Conversation not found"
- **Solution:** Ensure user is authenticated and conversation belongs to user

### "Invalid agent name"
- **Solution:** Use `content_brainstormer` or `idea_generator` only

### Slow responses
- **Solution:** 
  - Check AI API key is valid
  - Reduce conversation history length (currently limited to last 10 messages)
  - Consider upgrading to WebSockets for real-time updates

## Next Steps

1. ✅ Run database migration
2. ✅ Configure AI API keys
3. ✅ Test agents on Brainstorm page
4. ⏳ (Optional) Upgrade to WebSockets for real-time updates
5. ⏳ (Optional) Add more agents (e.g., `content_optimizer`, `trend_analyzer`)

## Files Modified

- `src/api/apiClient.js` - Added agents API
- `src/api/prismClient.js` - Exported agents
- `src/components/dashboard/IdeaInput.jsx` - Fixed to use real ContentCreationWorkflow
- `backend/src/routes/agents.js` - New agents route
- `backend/src/server.js` - Mounted agents route
- `backend/migrations/013_create_agent_conversations.sql` - Database migration

## Related Documentation

- `AI_API_KEYS_SETUP.md` - AI API key configuration
- `SUPABASE_STORAGE_SETUP.md` - Supabase setup guide
- Base44 documentation - Content creation flow

