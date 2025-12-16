const router = require('express').Router()
const axios = require('axios')
const { GoogleGenerativeAI } = require('@google/generative-ai')

// Initialize Gemini AI for text generation
let genAIModel = null
let genAIVisionModel = null
const GOOGLE_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

// Log AI service availability on startup with detailed debugging
console.log('🤖 AI Service Configuration:')
console.log('  OpenAI Key Present:', OPENAI_KEY ? '✅ YES' : '❌ NO')
console.log('  OpenAI Key Length:', OPENAI_KEY ? OPENAI_KEY.length : 0)
console.log('  OpenAI Key Preview:', OPENAI_KEY ? `${OPENAI_KEY.substring(0, 7)}...` : 'N/A')
console.log('  Google Key Present:', GOOGLE_KEY ? '✅ YES' : '❌ NO')
console.log('  Google Key Length:', GOOGLE_KEY ? GOOGLE_KEY.length : 0)
console.log('  Google Key Preview:', GOOGLE_KEY ? `${GOOGLE_KEY.substring(0, 7)}...` : 'N/A')
console.log('  Environment Variables Check:')
console.log('    process.env.OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET')
console.log('    process.env.GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'SET' : 'NOT SET')
console.log('    process.env.GOOGLE_AI_API_KEY:', process.env.GOOGLE_AI_API_KEY ? 'SET' : 'NOT SET')

if (!OPENAI_KEY && !GOOGLE_KEY) {
  console.error('⚠️  WARNING: No AI service configured! Add OPENAI_API_KEY or GOOGLE_API_KEY to environment variables.')
  console.error('   See AI_API_KEYS_SETUP.md for setup instructions.')
  console.error('   Make sure to restart the backend after adding environment variables in DigitalOcean.')
} else {
  console.log('✅ At least one AI service is configured')
}

if (GOOGLE_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(GOOGLE_KEY)
    // Use newer model if available, fallback to gemini-pro
    const modelName = process.env.GOOGLE_MODEL || 'gemini-1.5-flash'
    genAIModel = genAI.getGenerativeModel({ model: modelName })
    genAIVisionModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) // Vision-capable model (faster/cheaper)
    console.log('✅ Google Gemini AI initialized with model:', modelName)
  } catch (e) {
    console.error('❌ Failed to initialize Gemini AI:', e.message)
  }
}

// LLM endpoint - supports both OpenAI and Google Gemini
router.post('/llm', async (req, res) => {
  try {
    const { prompt, response_json_schema, add_context_from_internet, file_urls } = req.body || {}
    let geminiErrorMsg = null

    console.log('🔵 LLM Request received:', {
      promptLength: prompt?.length || 0,
      hasSchema: !!response_json_schema,
      needsInternet: !!add_context_from_internet,
      imageCount: file_urls?.length || 0
    })

    if (!prompt) {
      console.error('❌ No prompt provided')
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

    // ========================================
    // TRY OPENAI FIRST (Preferred)
    // ========================================
    let openAIFailed = false
    let openAIErrorReason = null

    if (OPENAI_KEY) {
      console.log('🔵 Attempting OpenAI...')
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
        let model

        if (file_urls && Array.isArray(file_urls) && file_urls.length > 0) {
          console.log('🔵 Using OpenAI Vision (gpt-4o) for image analysis')
          // Use vision API - build content array with images
          const content = [
            { type: 'text', text: userPrompt },
            ...file_urls.map(url => ({
              type: 'image_url',
              image_url: { url: url }
            }))
          ]
          messages.push({ role: 'user', content: content })
          model = process.env.OPENAI_VISION_MODEL || 'gpt-4o' // Use vision model for images
        } else {
          console.log('🔵 Using OpenAI text model (gpt-4o-mini)')
          messages.push({ role: 'user', content: userPrompt })
          model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
        }

        const { data } = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: model,
          messages: messages,
          temperature: 0.7,
          response_format: response_json_schema ? { type: 'json_object' } : undefined,
          max_tokens: file_urls && file_urls.length > 0 ? 4000 : 2000
        }, {
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: file_urls && file_urls.length > 0 ? 90000 : 45000 // Longer timeout for vision
        })

        const content = data?.choices?.[0]?.message?.content || '{}'
        console.log('✅ OpenAI response received:', content.substring(0, 200))

        let parsed
        try {
          parsed = JSON.parse(content)
        } catch {
          // Try to extract JSON from markdown code blocks
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
          } else {
            console.warn('⚠️  Failed to parse JSON, returning raw content')
            parsed = { error: 'Failed to parse JSON response', raw: content }
          }
        }

        console.log('✅ OpenAI request successful')
        return res.json(parsed)
      } catch (openAIError) {
        console.error('❌ OpenAI error:', openAIError.response?.data || openAIError.message)

        // Handle specific OpenAI errors
        if (openAIError.response?.status === 401) {
          console.error('❌ OpenAI API key is invalid')
          return res.status(401).json({
            error: 'invalid_api_key',
            message: 'OpenAI API key is invalid. Please check your OPENAI_API_KEY environment variable.'
          })
        }

        openAIFailed = true
        if (openAIError.response?.status === 429) {
          console.error('❌ OpenAI rate limit exceeded - falling back to Google Gemini')
          openAIErrorReason = 'rate_limit'
          // Don't return immediately - fall through to Gemini fallback
        } else if (openAIError.response?.data?.error?.code === 'insufficient_quota') {
          console.error('❌ OpenAI quota exceeded')
          return res.status(402).json({
            error: 'quota_exceeded',
            message: 'OpenAI API quota exceeded. Please check your billing at platform.openai.com'
          })
        } else {
          console.log('🔵 OpenAI error - falling back to Google Gemini...')
          openAIErrorReason = 'error'
        }
        // Fall through to Gemini for rate limits and other errors
      }
    }

    // ========================================
    // FALLBACK TO GOOGLE GEMINI
    // ========================================
    // Helper function to fetch image and convert to base64
    const fetchImageAsBase64 = async (imageUrl) => {
      try {
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        })
        const buffer = Buffer.from(response.data)
        const base64 = buffer.toString('base64')
        // Determine MIME type from URL or response headers
        const contentType = response.headers['content-type'] ||
          (imageUrl.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' :
            imageUrl.match(/\.png$/i) ? 'image/png' :
              imageUrl.match(/\.gif$/i) ? 'image/gif' :
                imageUrl.match(/\.webp$/i) ? 'image/webp' : 'image/jpeg')
        return {
          inlineData: {
            data: base64,
            mimeType: contentType
          }
        }
      } catch (error) {
        console.error(`❌ Failed to fetch image ${imageUrl}:`, error.message)
        throw error
      }
    }

    const geminiModel = (file_urls && Array.isArray(file_urls) && file_urls.length > 0 && genAIVisionModel)
      ? genAIVisionModel
      : genAIModel

    if (geminiModel) {
      console.log('🔵 Attempting Google Gemini...')
      try {
        let fullPrompt = enhancedPrompt
        if (response_json_schema) {
          fullPrompt += `\n\nReturn ONLY valid JSON matching this schema: ${JSON.stringify(response_json_schema)}`
        } else {
          fullPrompt += `\n\nReturn ONLY valid JSON.`
        }

        // Build content array for Gemini - support vision if images are provided
        let content
        if (file_urls && Array.isArray(file_urls) && file_urls.length > 0 && genAIVisionModel) {
          console.log('🔵 Using Gemini Vision for image analysis')
          // Fetch images and convert to base64
          const imageParts = []
          for (const url of file_urls) {
            try {
              const imagePart = await fetchImageAsBase64(url)
              imageParts.push(imagePart)
            } catch (error) {
              console.warn(`⚠️  Skipping image ${url} due to fetch error:`, error.message)
            }
          }

          if (imageParts.length === 0) {
            throw new Error('Failed to fetch any images for vision analysis')
          }

          // Gemini vision format: array with text and image parts
          content = [fullPrompt, ...imageParts]
        } else {
          // Text-only prompt
          content = fullPrompt
        }

        const result = await geminiModel.generateContent(content)

        const response = await result.response
        const text = response.text()

        console.log('✅ Gemini response received:', text.substring(0, 200))

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
          console.warn('⚠️  Failed to parse Gemini JSON, returning raw')
          parsed = { error: 'Failed to parse JSON response', raw: text }
        }

        console.log('✅ Gemini request successful')
        return res.json(parsed)
      } catch (geminiError) {
        console.error('❌ Gemini error:', geminiError.message)

        // If vision failed, try without images
        if (file_urls && file_urls.length > 0 && genAIModel) {
          console.log('🔵 Retrying Gemini without vision...')
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

            console.log('✅ Gemini fallback successful')
            return res.json(parsed)
          } catch (fallbackError) {
            console.error('❌ Gemini fallback error:', fallbackError.message)
            // Capture the specific error from Gemini to return to user if everything fails
            geminiErrorMsg = fallbackError.message
          }
        } else {
          // Capture the specific error from Gemini to return to user if everything fails
          geminiErrorMsg = geminiError.message
        }
      }
    }

    // ========================================
    // BOTH FAILED - RETURN ERROR
    // ========================================
    console.error('❌ All AI services failed or unavailable')
    console.error('   Debug Info:')
    console.error('     OPENAI_KEY present:', !!OPENAI_KEY)
    console.error('     GOOGLE_KEY present:', !!GOOGLE_KEY)
    console.error('     OPENAI_KEY length:', OPENAI_KEY?.length || 0)
    console.error('     GOOGLE_KEY length:', GOOGLE_KEY?.length || 0)
    console.error('     process.env.OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET')
    console.error('     process.env.GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'SET' : 'NOT SET')

    // Build helpful error message
    let errorMessage = 'AI service unavailable'

    if (openAIFailed && OPENAI_KEY && GOOGLE_KEY) {
      if (openAIErrorReason === 'rate_limit') {
        errorMessage = 'OpenAI rate limit exceeded and Google Gemini fallback also failed. Please try again in a moment.'
      } else {
        errorMessage = 'OpenAI request failed and Google Gemini fallback also failed. Please try again.'
      }
    } else if (!OPENAI_KEY && !GOOGLE_KEY) {
      errorMessage = 'Neither OpenAI nor Google Gemini API is configured or available'
    } else if (!GOOGLE_KEY && openAIFailed) {
      errorMessage = 'OpenAI request failed and no fallback service (Google Gemini) is configured'
    }

    return res.status(500).json({
      error: 'AI service unavailable',
      message: errorMessage,
      help: 'Please add OPENAI_API_KEY or GOOGLE_API_KEY to your environment variables in DigitalOcean. See AI_API_KEYS_SETUP.md for instructions.',
      fallback_attempted: openAIFailed && !!GOOGLE_KEY,
      debug: {
        openai_configured: !!OPENAI_KEY,
        google_configured: !!GOOGLE_KEY,
        openai_key_length: OPENAI_KEY?.length || 0,
        google_key_length: GOOGLE_KEY?.length || 0,
        env_check: {
          OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
          GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? 'SET' : 'NOT SET',
          GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY ? 'SET' : 'NOT SET'
        },
        gemini_error: geminiErrorMsg
      }
    })
  } catch (e) {
    console.error('❌ LLM endpoint error:', e)
    return res.status(500).json({
      error: 'llm_request_failed',
      message: e.message
    })
  }
})

// ========================================
// IMAGE GENERATION ENDPOINT
// ========================================
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt, width = 1024, height = 1024 } = req.body || {}

    console.log('🎨 Image generation request:', {
      prompt: prompt?.substring(0, 100),
      size: `${width}x${height}`
    })

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    // ========================================
    // TRY OPENAI DALL-E
    // ========================================
    if (OPENAI_KEY) {
      console.log('🎨 Attempting OpenAI DALL-E 3...')
      try {
        // DALL-E 3 only supports specific sizes
        let size = '1024x1024' // Default
        if (width === 1024 && height === 1792) size = '1024x1792'
        else if (width === 1792 && height === 1024) size = '1792x1024'

        const { data } = await axios.post('https://api.openai.com/v1/images/generations', {
          model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: size,
          quality: 'standard',
          response_format: 'url'
        }, {
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 90000 // 90 seconds for image generation
        })

        const imageUrl = data?.data?.[0]?.url
        if (imageUrl) {
          console.log('✅ Image generated successfully')
          return res.json({
            url: imageUrl,
            revised_prompt: data?.data?.[0]?.revised_prompt,
            provider: 'openai'
          })
        }
      } catch (openAIError) {
        console.error('❌ OpenAI image generation error:', openAIError.response?.data || openAIError.message)

        // Handle specific errors
        if (openAIError.response?.status === 401) {
          return res.status(401).json({
            error: 'invalid_api_key',
            message: 'OpenAI API key is invalid'
          })
        }

        if (openAIError.response?.data?.error?.code === 'insufficient_quota') {
          return res.status(402).json({
            error: 'quota_exceeded',
            message: 'OpenAI API quota exceeded'
          })
        }

        // Fall through to other providers
      }
    }

    // ========================================
    // NO OTHER IMAGE PROVIDERS AVAILABLE
    // ========================================
    console.error('❌ No image generation service available')
    return res.status(500).json({
      error: 'Image generation unavailable',
      message: 'No image generation service is configured. Please set OPENAI_API_KEY for DALL-E 3 image generation.',
      help: 'Add OPENAI_API_KEY to your DigitalOcean environment variables'
    })
  } catch (e) {
    console.error('❌ Image generation error:', e)
    return res.status(500).json({
      error: 'image_generation_failed',
      message: e.message
    })
  }
})

module.exports = router