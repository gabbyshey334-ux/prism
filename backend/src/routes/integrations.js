const router = require('express').Router()
const axios = require('axios')

router.post('/llm', async (req, res) => {
  try {
    const { prompt } = req.body || {}
    const key = process.env.OPENAI_API_KEY
    if (!key) {
      return res.json({ trends: [] })
    }

    const system = 'You are a helpful assistant that returns valid JSON according to instructions.'
    const userPrompt = `${prompt}\n\nReturn ONLY valid JSON.`

    const { data } = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
    }, {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
    })

    const content = data?.choices?.[0]?.message?.content || '{}'
    let parsed
    try { parsed = JSON.parse(content) } catch { parsed = { trends: [] } }
    return res.json(parsed)
  } catch (e) {
    return res.status(200).json({ trends: [] })
  }
})

module.exports = router