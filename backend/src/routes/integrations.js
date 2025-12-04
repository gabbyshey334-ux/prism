const router = require('express').Router()
const axios = require('axios')
const { GoogleGenerativeAI } = require('@google/generative-ai')

// Initialize Gemini AI for text generation
let genAIModel = null
let genAIVisionModel = null
const GOOGLE_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY
if (GOOGLE_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(GOOGLE_KEY)
    // Use newer model if available, fallback to gemini-pro
    const modelName = process.env.GOOGLE_MODEL || 'gemini-1.5-flash'
    genAIModel = genAI.getGenerativeModel({ model: modelName })
    genAIVisionModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }) // Vision-capable model
    console.log('✅ Google Gemini AI initialized with model:', modelName)
  } catch (e) {
    console.error('❌ Failed to initialize Gemini AI:', e.message)
  }
}

// LLM endpoint - supports both OpenAI and Google Gemini
router.post('/llm', async (req, res) => {
  try {
    const { prompt, response_json_schema, add_context_from_internet, file_urls } = req.body || {}
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    // Build enhanced prompt with context if requested
    let enhancedPrompt = prompt;
    if (add_context_from_internet) {
      enhancedPrompt = `${prompt}\n\nIMPORTANT: Use real-time internet context to provide accurate, current information. Research recent trends, news, and social media content when relevant.`;
    }

    // Add file context if images are provided
    if (file_urls && Array.isArray(file_urls) && file_urls.length > 0) {
      enhancedPrompt = `${enhancedPrompt}\n\nIMAGES PROVIDED (${file_urls.length}):\n${file_urls.map((url, i) => `Image ${i + 1}: ${url}`).join('\n')}\n\nAnalyze the content in these images and incorporate the visual information into your response.`;
    }

    // Try OpenAI first if available
    const openAIKey = process.env.OPENAI_API_KEY
    if (openAIKey) {
      try {
        const system = response_json_schema 
          ? 'You are a helpful assistant that returns valid JSON according to the provided schema.'
          : 'You are a helpful assistant that returns valid JSON according to instructions.'
        
        let userPrompt = enhancedPrompt
        if (response_json_schema) {
          userPrompt += `\n\nReturn ONLY valid JSON matching this schema: ${JSON.stringify(response_json_schema)}`
        } else {
          userPrompt += `\n\nReturn ONLY valid JSON.`
        }

        // Build messages array - support vision if images are provided
        const messages = [{ role: 'system', content: system }]
        
        if (file_urls && Array.isArray(file_urls) && file_urls.length > 0) {
          // Use vision API - build content array with images
          const content = [
            { type: 'text', text: userPrompt },
            ...file_urls.map(url => ({
              type: 'image_url',
              image_url: { url: url }
            }))
          ]
          messages.push({ role: 'user', content: content })
          // Use vision-capable model
          var model = process.env.OPENAI_VISION_MODEL || 'gpt-4o' // Use vision model for images
        } else {
          messages.push({ role: 'user', content: userPrompt })
          var model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
        }

        const { data } = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: model,
          messages: messages,
          temperature: 0.2,
          response_format: response_json_schema ? { type: 'json_object' } : undefined,
          max_tokens: file_urls && file_urls.length > 0 ? 4000 : 2000 // More tokens for vision
        }, {
          headers: { Authorization: `Bearer ${openAIKey}`, 'Content-Type': 'application/json' },
          timeout: file_urls && file_urls.length > 0 ? 60000 : 30000 // Longer timeout for vision
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
    const geminiModel = (file_urls && Array.isArray(file_urls) && file_urls.length > 0 && genAIVisionModel) 
      ? genAIVisionModel 
      : genAIModel
    
    if (geminiModel) {
      try {
        let fullPrompt = enhancedPrompt
        if (response_json_schema) {
          fullPrompt += `\n\nReturn ONLY valid JSON matching this schema: ${JSON.stringify(response_json_schema)}`
        } else {
          fullPrompt += `\n\nReturn ONLY valid JSON.`
        }

        // Note: Gemini vision requires base64 images, so for now we'll just use text prompt with image URLs
        // In production, you'd fetch images and convert to base64, or use OpenAI for vision
        const result = await geminiModel.generateContent(fullPrompt)
        
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
        // If vision failed, try without images
        if (file_urls && file_urls.length > 0 && genAIModel) {
          try {
            let fallbackPrompt = enhancedPrompt
            if (response_json_schema) {
              fallbackPrompt += `\n\nReturn ONLY valid JSON matching this schema: ${JSON.stringify(response_json_schema)}`
            } else {
              fallbackPrompt += `\n\nReturn ONLY valid JSON.`
            }
            const result = await genAIModel.generateContent(fallbackPrompt)
            const response = await result.response
            const text = response.text()
            const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/)
            const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text)
            return res.json(parsed)
          } catch (fallbackError) {
            console.error('Gemini fallback error:', fallbackError.message)
          }
        }
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
    const googleKey = GOOGLE_KEY
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
