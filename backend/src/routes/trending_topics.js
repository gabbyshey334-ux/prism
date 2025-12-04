const router = require('express').Router()
const { supabaseAdmin } = require('../config/supabase')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { z } = require('zod')

// Initialize Gemini AI
let genAI = null
let model = null

const GOOGLE_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY
if (GOOGLE_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GOOGLE_KEY)
    model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    console.log('✅ Google Gemini AI initialized for trend generation')
  } catch (e) {
    console.error('❌ Failed to initialize Gemini AI for trends:', e.message)
  }
} else {
  console.warn('⚠️ GOOGLE_API_KEY not set - trend generation will use fallback')
}

// Schema validation for trend data - matches database schema
const trendSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  topic: z.string().min(1).max(200).optional(), // Legacy field, map to title
  description: z.string().min(1).max(5000).optional(),
  category: z.string().min(1).max(50).optional(),
  relevance_score: z.number().min(0).max(100).optional(),
  viral_potential: z.number().min(0).max(10).optional(),
  brand_context: z.string().max(500).optional(),
  brand_relevance: z.string().max(2000).optional(),
  source: z.string().max(100).optional(),
  source_url: z.string().url().optional().or(z.string().max(500)),
  source_date: z.string().datetime().optional(),
  trending_data: z.string().max(10000).optional(),
  keywords: z.array(z.string()).max(50).optional(),
  hashtags: z.array(z.string()).max(50).optional(),
  duration_estimate: z.string().max(100).optional(),
  expires_at: z.string().datetime().optional(),
  brand_id: z.string().uuid().optional(),
  user_id: z.string().optional(),
  platform: z.string().max(50).optional(),
  used: z.boolean().optional(),
  hidden: z.boolean().optional(),
  is_hidden: z.boolean().optional(),
  metadata: z.object({}).optional()
})

// Schema for LLM response validation
const llmTrendSchema = z.object({
  trends: z.array(z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    relevance_score: z.number().optional(),
    content_ideas: z.array(z.string()).optional(),
    hashtags: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional()
  })).min(1)
})

// Safe JSON parsing utility
function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

// Brand-aware LLM prompt generator
function generateBrandAwarePrompt(brandContext, niche, contentType) {
  return `
You are a social media trend analyst specializing in ${niche || 'content creation'}.
Brand Context: ${brandContext || 'General content creation'}
Content Type: ${contentType || 'various social media formats'}

Generate 5-7 current trending topics that would resonate with this brand and audience.
Each trend should include:
- A compelling title that grabs attention
- A detailed description explaining the trend
- Category classification (e.g., educational, entertaining, promotional, behind-the-scenes)
- Relevance score (0-100) based on current popularity
- 3-5 content ideas for leveraging this trend
- Relevant hashtags (5-8)
- Key SEO keywords (3-5)

Return ONLY valid JSON in this exact format:
{
  "trends": [
    {
      "title": "Trend Title",
      "description": "Detailed trend description",
      "category": "Category Name",
      "relevance_score": 85,
      "content_ideas": ["Idea 1", "Idea 2", "Idea 3"],
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }
  ]
}

Focus on actionable, brand-relevant trends that can drive engagement.`
}

// Fallback trend generation
function generateFallbackTrends(brandContext, niche) {
  const categories = ['Educational', 'Entertaining', 'Behind-the-Scenes', 'Product-Focused', 'Community-Building']
  const baseTrends = [
    {
      title: 'Authentic Storytelling',
      description: 'Share genuine stories that connect with your audience on a personal level',
      category: 'Educational',
      relevance_score: 75,
      content_ideas: ['Share your brand origin story', 'Highlight customer success stories', 'Show behind-the-scenes moments'],
      hashtags: ['#authenticity', '#storytelling', '#brandstory'],
      keywords: ['authentic content', 'brand storytelling', 'audience connection']
    },
    {
      title: 'Interactive Content',
      description: 'Create polls, Q&As, and interactive stories to boost engagement',
      category: 'Entertaining',
      relevance_score: 80,
      content_ideas: ['Instagram polls', 'Ask-me-anything sessions', 'Interactive quizzes'],
      hashtags: ['#interactive', '#engagement', '#poll'],
      keywords: ['interactive content', 'audience engagement', 'social media polls']
    },
    {
      title: 'Value-First Approach',
      description: 'Focus on providing value before asking for anything in return',
      category: 'Educational',
      relevance_score: 85,
      content_ideas: ['Free tips and tutorials', 'Industry insights', 'Problem-solving content'],
      hashtags: ['#valuefirst', '#educational', '#tips'],
      keywords: ['value-driven content', 'educational marketing', 'helpful content']
    }
  ]
  
  return {
    trends: baseTrends.map(trend => ({
      ...trend,
      brand_context: brandContext || 'General content creation'
    }))
  }
}

router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      search, 
      is_hidden, 
      min_relevance, 
      max_relevance,
      limit = 50,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query

    let query = supabaseAdmin.from('trending_topics').select('*')

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    if (is_hidden !== undefined) {
      query = query.eq('is_hidden', is_hidden === 'true')
    }
    
    if (min_relevance) {
      query = query.gte('relevance_score', parseInt(min_relevance))
    }
    
    if (max_relevance) {
      query = query.lte('relevance_score', parseInt(max_relevance))
    }

    // Apply sorting
    if (['created_at', 'updated_at', 'relevance_score', 'title'].includes(sort_by)) {
      query = query.order(sort_by, { ascending: sort_order === 'asc' })
    }

    // Apply pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    const { data, error, count } = await query
    
    if (error) {
      console.error('Database query error:', error)
      return res.status(400).json({ 
        error: 'Failed to fetch trending topics',
        details: error.message 
      })
    }

    res.json({
      trends: data || [],
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  } catch (e) {
    console.error('Trends list error:', e)
    res.status(500).json({ 
      error: 'trending_topics_list_failed',
      message: 'An unexpected error occurred while fetching trends'
    })
  }
})

router.post('/', async (req, res) => {
  try {
    // Map legacy 'topic' to 'title' if needed
    if (req.body.topic && !req.body.title) {
      req.body.title = req.body.topic
    }
    
    // Validate input data
    const validationResult = trendSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'validation_failed',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      })
    }

    // Prepare data for insertion - only include fields that exist in schema
    const trendData = {
      title: validationResult.data.title || validationResult.data.topic,
      description: validationResult.data.description,
      category: validationResult.data.category,
      relevance_score: validationResult.data.relevance_score || 0,
      viral_potential: validationResult.data.viral_potential || 0,
      brand_context: validationResult.data.brand_context,
      brand_relevance: validationResult.data.brand_relevance,
      source: validationResult.data.source,
      source_url: validationResult.data.source_url,
      source_date: validationResult.data.source_date,
      trending_data: validationResult.data.trending_data,
      keywords: validationResult.data.keywords || [],
      hashtags: validationResult.data.hashtags || [],
      duration_estimate: validationResult.data.duration_estimate,
      expires_at: validationResult.data.expires_at,
      brand_id: validationResult.data.brand_id,
      user_id: validationResult.data.user_id,
      platform: validationResult.data.platform,
      used: validationResult.data.used || false,
      hidden: validationResult.data.hidden || false,
      is_hidden: validationResult.data.is_hidden || false
    }
    
    // Remove null/undefined values
    Object.keys(trendData).forEach(key => {
      if (trendData[key] === null || trendData[key] === undefined) {
        delete trendData[key]
      }
    })

    const { data, error } = await supabaseAdmin
      .from('trending_topics')
      .insert(trendData)
      .select('*')
      .single()

    if (error) {
      console.error('Database insert error:', error)
      return res.status(400).json({ 
        error: 'trend_creation_failed',
        details: error.message 
      })
    }

    res.status(201).json({
      success: true,
      trend: data,
      message: 'Trend created successfully'
    })
  } catch (e) {
    console.error('Trend creation error:', e)
    res.status(500).json({ 
      error: 'trending_topics_create_failed',
      message: 'An unexpected error occurred while creating the trend'
    })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // Validate input data
    const validationResult = trendSchema.partial().safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'validation_failed',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      })
    }

    const { data, error } = await supabaseAdmin
      .from('trending_topics')
      .update(validationResult.data)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Database update error:', error)
      return res.status(400).json({ 
        error: 'trend_update_failed',
        details: error.message 
      })
    }

    if (!data) {
      return res.status(404).json({ 
        error: 'trend_not_found',
        message: 'Trend not found'
      })
    }

    res.json({
      success: true,
      trend: data,
      message: 'Trend updated successfully'
    })
  } catch (e) {
    console.error('Trend update error:', e)
    res.status(500).json({ 
      error: 'trending_topics_update_failed',
      message: 'An unexpected error occurred while updating the trend'
    })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // Check if trend exists first
    const { data: existingTrend } = await supabaseAdmin
      .from('trending_topics')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingTrend) {
      return res.status(404).json({ 
        error: 'trend_not_found',
        message: 'Trend not found'
      })
    }

    const { error } = await supabaseAdmin
      .from('trending_topics')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database delete error:', error)
      return res.status(400).json({ 
        error: 'trend_deletion_failed',
        details: error.message 
      })
    }

    res.json({ 
      success: true,
      message: 'Trend deleted successfully'
    })
  } catch (e) {
    console.error('Trend deletion error:', e)
    res.status(500).json({ 
      error: 'trending_topics_delete_failed',
      message: 'An unexpected error occurred while deleting the trend'
    })
  }
})

// LLM Research Endpoint - Enhanced with brand-aware prompting
router.post('/research', async (req, res) => {
  try {
    console.log('Trend research request received:', {
      method: req.method,
      url: req.originalUrl,
      body: { ...req.body, brand_context: req.body.brand_context?.substring(0, 100) + '...' }
    });

    const { brand_context, niche, content_type, count = 5 } = req.body

    if (!brand_context) {
      console.warn('Trend research failed: missing brand_context');
      return res.status(400).json({
        error: 'validation_failed',
        message: 'Brand context is required for trend research'
      })
    }

    const prompt = generateBrandAwarePrompt(brand_context, niche, content_type)
    
    // Try to use Gemini AI if available
    if (model) {
      try {
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        
        // Extract JSON from response
        let trendsData
        try {
          // Try to extract JSON from the response
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            trendsData = safeJsonParse(jsonMatch[0])
          } else {
            trendsData = safeJsonParse(text)
          }
        } catch (parseError) {
          console.error('JSON parsing error:', parseError)
          trendsData = null
        }

        // Validate LLM response
        if (trendsData) {
          const validationResult = llmTrendSchema.safeParse(trendsData)
          if (validationResult.success) {
            // Limit to requested count
            const limitedTrends = validationResult.data.trends.slice(0, count)
            
            // Add brand context to each trend
            const enhancedTrends = limitedTrends.map(trend => ({
              ...trend,
              brand_context: brand_context,
              is_hidden: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))

            return res.json({
              success: true,
              trends: enhancedTrends,
              source: 'llm',
              message: 'Trends generated successfully using AI'
            })
          }
        }
        
        // Fallback to manual trends if LLM response is invalid
        console.log('LLM response invalid, using fallback trends')
      } catch (llmError) {
        console.error('LLM generation error:', llmError)
        // Fall through to fallback
      }
    }
    
    // Use fallback trends if AI failed or is not available
    const fallbackTrends = generateFallbackTrends(brand_context, niche)
    const enhancedFallbackTrends = fallbackTrends.trends.slice(0, count).map(trend => ({
      ...trend,
      is_hidden: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    res.json({
      success: true,
      trends: enhancedFallbackTrends,
      source: model ? 'fallback' : 'no_ai_configured',
      message: model ? 'Using fallback trends due to AI response issues' : 'Using fallback trends - AI not configured'
    })

  } catch (e) {
    console.error('Trend research error:', {
      error: e.message,
      stack: e.stack,
      method: req.method,
      url: req.originalUrl,
      body: req.body
    });
    res.status(500).json({
      error: 'trend_research_failed',
      message: e.message || 'An unexpected error occurred during trend research'
    })
  }
})

// Bulk create trends (for LLM research results)
router.post('/bulk', async (req, res) => {
  try {
    const { trends } = req.body

    if (!Array.isArray(trends) || trends.length === 0) {
      return res.status(400).json({
        error: 'validation_failed',
        message: 'Trends array is required and must not be empty'
      })
    }

    // Validate and normalize each trend
    const validatedTrends = []
    for (const trend of trends) {
      // Map legacy 'topic' to 'title' if needed
      if (trend.topic && !trend.title) {
        trend.title = trend.topic
      }
      
      const validationResult = trendSchema.safeParse(trend)
      if (!validationResult.success) {
        console.error('Trend validation error:', validationResult.error.errors)
        return res.status(400).json({
          error: 'validation_failed',
          message: `Invalid trend data: ${validationResult.error.errors[0]?.message || 'Unknown validation error'}`,
          details: validationResult.error.errors
        })
      }
      
      // Prepare data for insertion - only include fields that exist in schema
      const trendData = {
        title: validationResult.data.title || validationResult.data.topic,
        description: validationResult.data.description,
        category: validationResult.data.category,
        relevance_score: validationResult.data.relevance_score || 0,
        viral_potential: validationResult.data.viral_potential || 0,
        brand_context: validationResult.data.brand_context,
        brand_relevance: validationResult.data.brand_relevance,
        source: validationResult.data.source,
        source_url: validationResult.data.source_url,
        source_date: validationResult.data.source_date,
        trending_data: validationResult.data.trending_data,
        keywords: validationResult.data.keywords || [],
        hashtags: validationResult.data.hashtags || [],
        duration_estimate: validationResult.data.duration_estimate,
        expires_at: validationResult.data.expires_at,
        brand_id: validationResult.data.brand_id,
        user_id: validationResult.data.user_id,
        platform: validationResult.data.platform,
        used: validationResult.data.used || false,
        hidden: validationResult.data.hidden || false,
        is_hidden: validationResult.data.is_hidden || false
      }
      
      // Remove null/undefined values
      Object.keys(trendData).forEach(key => {
        if (trendData[key] === null || trendData[key] === undefined) {
          delete trendData[key]
        }
      })
      
      validatedTrends.push(trendData)
    }

    const { data, error } = await supabaseAdmin
      .from('trending_topics')
      .insert(validatedTrends)
      .select('*')

    if (error) {
      console.error('Bulk insert error:', error)
      return res.status(400).json({
        error: 'bulk_creation_failed',
        details: error.message
      })
    }

    res.status(201).json({
      success: true,
      trends: data,
      count: data.length,
      message: 'Trends created successfully'
    })
  } catch (e) {
    console.error('Bulk trend creation error:', e)
    res.status(500).json({
      error: 'bulk_trend_creation_failed',
      message: 'An unexpected error occurred during bulk trend creation'
    })
  }
})

// Hide/restore trend
router.patch('/:id/hide', async (req, res) => {
  try {
    const { id } = req.params
    const { is_hidden } = req.body

    if (typeof is_hidden !== 'boolean') {
      return res.status(400).json({
        error: 'validation_failed',
        message: 'is_hidden must be a boolean value'
      })
    }

    const { data, error } = await supabaseAdmin
      .from('trending_topics')
      .update({ is_hidden, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Hide/restore error:', error)
      return res.status(400).json({
        error: 'hide_restore_failed',
        details: error.message
      })
    }

    if (!data) {
      return res.status(404).json({
        error: 'trend_not_found',
        message: 'Trend not found'
      })
    }

    res.json({
      success: true,
      trend: data,
      message: is_hidden ? 'Trend hidden successfully' : 'Trend restored successfully'
    })
  } catch (e) {
    console.error('Hide/restore trend error:', e)
    res.status(500).json({
      error: 'hide_restore_failed',
      message: 'An unexpected error occurred while hiding/restoring the trend'
    })
  }
})

// Get single trend by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabaseAdmin
      .from('trending_topics')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Single trend fetch error:', error)
      return res.status(400).json({
        error: 'trend_fetch_failed',
        details: error.message
      })
    }

    if (!data) {
      return res.status(404).json({
        error: 'trend_not_found',
        message: 'Trend not found'
      })
    }

    res.json({
      success: true,
      trend: data
    })
  } catch (e) {
    console.error('Single trend error:', e)
    res.status(500).json({
      error: 'trend_fetch_failed',
      message: 'An unexpected error occurred while fetching the trend'
    })
  }
})

module.exports = router
