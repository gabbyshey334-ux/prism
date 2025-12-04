const router = require('express').Router();
const { supabaseAdmin } = require('../config/supabase');
const { extractAuth } = require('../middleware/extractAuth');
const { z } = require('zod');

router.use(extractAuth);

// Agent configurations
const AGENT_CONFIGS = {
  content_brainstormer: {
    name: 'content_brainstormer',
    description: 'AI assistant that helps users brainstorm viral content ideas',
    instructions: `You are a creative content strategist specializing in viral social media content. Your role is to help users develop engaging, shareable content ideas.

When helping users:
- Ask clarifying questions about their brand, audience, and goals
- Suggest trending formats and platforms
- Provide creative angles and hooks
- Help refine ideas to maximize viral potential
- Reference relevant trends and best practices
- Be conversational, helpful, and encouraging

You have access to:
- Content entities (to reference existing ideas)
- Trending topics (to suggest relevant trends)
- Brand information (to tailor suggestions)

Always be creative, practical, and focused on engagement.`,
    tool_configs: [
      { entity_name: 'Content', allowed_operations: ['read'] },
      { entity_name: 'TrendingTopic', allowed_operations: ['read'] },
      { entity_name: 'Brand', allowed_operations: ['read'] }
    ]
  },
  idea_generator: {
    name: 'idea_generator',
    description: 'AI agent that helps users generate fresh content ideas from scratch',
    instructions: `You are a creative content idea generator. Your role is to help users come up with fresh, original content ideas.

When generating ideas:
- Consider current trends and what's working
- Suggest multiple angles and formats
- Think about different platforms and their unique strengths
- Provide specific, actionable ideas
- Include hooks, angles, and engagement strategies
- Be creative and think outside the box

You have access to:
- Trending topics (to generate relevant ideas)
- Brand information (to tailor suggestions)

Always provide multiple options and explain why each idea has potential.`,
    tool_configs: [
      { entity_name: 'TrendingTopic', allowed_operations: ['read'] },
      { entity_name: 'Brand', allowed_operations: ['read'] }
    ]
  }
};

// Schema for conversation creation
const createConversationSchema = z.object({
  agent_name: z.enum(['content_brainstormer', 'idea_generator']),
  metadata: z.object({
    name: z.string().optional(),
    description: z.string().optional()
  }).optional()
});

// Schema for message
const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1)
});

/**
 * GET /api/agents/conversations
 * List conversations for a specific agent
 */
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user?.uid || req.userId;
    if (!userId) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'User authentication required'
      });
    }

    const { agent_name } = req.query;
    if (!agent_name || !AGENT_CONFIGS[agent_name]) {
      return res.status(400).json({
        error: 'invalid_agent',
        message: `Invalid agent name. Must be one of: ${Object.keys(AGENT_CONFIGS).join(', ')}`
      });
    }

    const { data, error } = await supabaseAdmin
      .from('agent_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_name', agent_name)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return res.status(500).json({
        error: 'database_error',
        message: 'Failed to fetch conversations'
      });
    }

    // Parse messages from JSON
    const conversations = (data || []).map(conv => ({
      ...conv,
      messages: typeof conv.messages === 'string' ? JSON.parse(conv.messages) : (conv.messages || [])
    }));

    res.json(conversations);
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({
      error: 'server_error',
      message: error.message
    });
  }
});

/**
 * POST /api/agents/conversations
 * Create a new conversation
 */
router.post('/conversations', async (req, res) => {
  try {
    const userId = req.user?.uid || req.userId;
    if (!userId) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'User authentication required'
      });
    }

    const validation = createConversationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'validation_failed',
        message: validation.error.errors[0].message
      });
    }

    const { agent_name, metadata = {} } = validation.data;
    const agentConfig = AGENT_CONFIGS[agent_name];

    // Create conversation record
    const conversationData = {
      user_id: userId,
      agent_name: agent_name,
      metadata: metadata || {},
      messages: JSON.stringify([]),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('agent_conversations')
      .insert(conversationData)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return res.status(500).json({
        error: 'database_error',
        message: 'Failed to create conversation'
      });
    }

    res.status(201).json({
      ...data,
      messages: []
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      error: 'server_error',
      message: error.message
    });
  }
});

/**
 * GET /api/agents/conversations/:id
 * Get a specific conversation
 */
router.get('/conversations/:id', async (req, res) => {
  try {
    const userId = req.user?.uid || req.userId;
    if (!userId) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'User authentication required'
      });
    }

    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('agent_conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'not_found',
          message: 'Conversation not found'
        });
      }
      console.error('Error fetching conversation:', error);
      return res.status(500).json({
        error: 'database_error',
        message: 'Failed to fetch conversation'
      });
    }

    res.json({
      ...data,
      messages: typeof data.messages === 'string' ? JSON.parse(data.messages) : (data.messages || [])
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      error: 'server_error',
      message: error.message
    });
  }
});

/**
 * POST /api/agents/conversations/:id/messages
 * Add a message to a conversation and get AI response
 */
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const userId = req.user?.uid || req.userId;
    if (!userId) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'User authentication required'
      });
    }

    const { id } = req.params;
    const { role, content, conversation_history = [] } = req.body;

    // Validate message
    const messageValidation = messageSchema.safeParse({ role, content });
    if (!messageValidation.success) {
      return res.status(400).json({
        error: 'validation_failed',
        message: messageValidation.error.errors[0].message
      });
    }

    // Get conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('agent_conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Conversation not found'
      });
    }

    const agentConfig = AGENT_CONFIGS[conversation.agent_name];
    if (!agentConfig) {
      return res.status(400).json({
        error: 'invalid_agent',
        message: 'Invalid agent configuration'
      });
    }

    // Parse existing messages
    let messages = typeof conversation.messages === 'string' 
      ? JSON.parse(conversation.messages) 
      : (conversation.messages || []);

    // Add user message
    const userMessage = { role, content, timestamp: new Date().toISOString() };
    messages.push(userMessage);

    // Generate AI response using LLM
    const { InvokeLLM } = require('../routes/integrations');
    
    // Build prompt with agent instructions and conversation history
    const historyText = messages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n');
    const prompt = `${agentConfig.instructions}

Conversation History:
${historyText}

User: ${content}

Respond as the ${agentConfig.name} agent. Be helpful, creative, and engaging.`;

    let aiResponse;
    try {
      // Call LLM endpoint logic directly
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const axios = require('axios');
      
      const GOOGLE_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
      const OPENAI_KEY = process.env.OPENAI_API_KEY;

      if (OPENAI_KEY) {
        const { data } = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: agentConfig.instructions },
            ...messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
          ],
          temperature: 0.7
        }, {
          headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' }
        });
        aiResponse = data?.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response.';
      } else if (GOOGLE_KEY) {
        const genAI = new GoogleGenerativeAI(GOOGLE_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        aiResponse = result.response.text();
      } else {
        aiResponse = 'AI service is not configured. Please set OPENAI_API_KEY or GOOGLE_API_KEY.';
      }
    } catch (llmError) {
      console.error('LLM error:', llmError);
      aiResponse = 'I apologize, but I encountered an error generating a response. Please try again.';
    }

    // Add AI response
    const assistantMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    };
    messages.push(assistantMessage);

    // Update conversation
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('agent_conversations')
      .update({
        messages: JSON.stringify(messages),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating conversation:', updateError);
      return res.status(500).json({
        error: 'database_error',
        message: 'Failed to update conversation'
      });
    }

    res.json({
      ...updated,
      messages: messages
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({
      error: 'server_error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/agents/conversations/:id
 * Delete a conversation
 */
router.delete('/conversations/:id', async (req, res) => {
  try {
    const userId = req.user?.uid || req.userId;
    if (!userId) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'User authentication required'
      });
    }

    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('agent_conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting conversation:', error);
      return res.status(500).json({
        error: 'database_error',
        message: 'Failed to delete conversation'
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      error: 'server_error',
      message: error.message
    });
  }
});

module.exports = router;

