const router = require('express').Router()
const axios = require('axios')
const { GoogleGenerativeAI } = require('@google/generative-ai')

// Initialize Gemini AI for text generation
let genAIModel = null
if (process.env.GOOGLE_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
    genAIModel = genAI.getGenerativeModel({ model: 'gemini-pro' })
    console.log('✅ Google Gemini AI initialized')
  } catch (e) {
    console.error('❌ Failed to initialize Gemini AI:', e.message)
  }
}

// LLM endpoint - supports both OpenAI and Google Gemini
router.post('/llm', async (req, res) => {
  try {
    const { prompt, response_json_schema } = req.body || {}
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    // Try OpenAI first if available
    const openAIKey = process.env.OPENAI_API_KEY
    if (openAIKey) {
      try {
        const system = response_json_schema 
          ? 'You are a helpful assistant that returns valid JSON according to the provided schema.'
          : 'You are a helpful assistant that returns valid JSON according to instructions.'
        
        let userPrompt = prompt
        if (response_json_schema) {
          userPrompt += `\n\nReturn ONLY valid JSON matching this schema: ${JSON.stringify(response_json_schema)}`
        } else {
          userPrompt += `\n\nReturn ONLY valid JSON.`
        }

        const { data } = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2,
          response_format: response_json_schema ? { type: 'json_object' } : undefined
        }, {
          headers: { Authorization: `Bearer ${openAIKey}`, 'Content-Type': 'application/json' },
          timeout: 30000
        })

        const content = data?.choices?.[0]?.message?.content || '{}'
        let parsed
        try { 
          parsed = JSON.parse(content)
        } catch { 
          // Try to extract JSON from markdown code blocks
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
          } else {
            parsed = { error: 'Failed to parse JSON response', raw: content }
          }
        }
        return res.json(parsed)
      } catch (openAIError) {
        console.error('OpenAI error:', openAIError.message)
        // Fall through to Gemini
      }
    }

    // Fallback to Google Gemini
    if (genAIModel) {
      try {
        let fullPrompt = prompt
        if (response_json_schema) {
          fullPrompt += `\n\nReturn ONLY valid JSON matching this schema: ${JSON.stringify(response_json_schema)}`
        } else {
          fullPrompt += `\n\nReturn ONLY valid JSON.`
        }

        const result = await genAIModel.generateContent(fullPrompt)
        const response = await result.response
        const text = response.text()
        
        let parsed
        try {
          // Try to extract JSON from response
          const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0])
          } else {
            parsed = JSON.parse(text)
          }
        } catch {
          parsed = { error: 'Failed to parse JSON response', raw: text }
        }
        return res.json(parsed)
      } catch (geminiError) {
        console.error('Gemini error:', geminiError.message)
      }
    }

    // If both fail, return error
    return res.status(500).json({ 
      error: 'AI service unavailable',
      message: 'Neither OpenAI nor Google Gemini API is configured or available'
    })
  } catch (e) {
    console.error('LLM endpoint error:', e)
    return res.status(500).json({ 
      error: 'llm_request_failed',
      message: e.message 
    })
  }
})

// Image generation endpoint
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt, width = 1024, height = 1024 } = req.body || {}
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    // Try OpenAI DALL-E first
    const openAIKey = process.env.OPENAI_API_KEY
    if (openAIKey) {
      try {
        const { data } = await axios.post('https://api.openai.com/v1/images/generations', {
          model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: `${width}x${height}`,
          quality: 'standard',
          response_format: 'url'
        }, {
          headers: { 
            Authorization: `Bearer ${openAIKey}`, 
            'Content-Type': 'application/json' 
          },
          timeout: 60000
        })

        const imageUrl = data?.data?.[0]?.url
        if (imageUrl) {
          return res.json({ 
            url: imageUrl,
            provider: 'openai'
          })
        }
      } catch (openAIError) {
        console.error('OpenAI image generation error:', openAIError.message)
        // Fall through to other providers
      }
    }

    // Try Google Gemini image generation (Imagen)
    const googleKey = process.env.GOOGLE_API_KEY
    if (googleKey) {
      try {
        // Note: Gemini doesn't have direct image generation, but we can use Imagen API
        // For now, return an error suggesting to use OpenAI
        return res.status(501).json({
          error: 'Image generation not fully implemented',
          message: 'Please configure OPENAI_API_KEY for image generation, or implement Imagen API'
        })
      } catch (geminiError) {
        console.error('Gemini image error:', geminiError.message)
      }
    }

    return res.status(500).json({
      error: 'Image generation unavailable',
      message: 'No image generation service is configured. Please set OPENAI_API_KEY.'
    })
  } catch (e) {
    console.error('Image generation error:', e)
    return res.status(500).json({
      error: 'image_generation_failed',
      message: e.message
    })
  }
})

module.exports = router