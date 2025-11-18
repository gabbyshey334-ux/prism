const router = require('express').Router()
const { supabaseAdmin } = require('../config/supabase')

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('content').select('*').order('created_date', { ascending: false })
    if (error) return res.status(400).json({ error: error.message })
    res.json(data || [])
  } catch (e) {
    res.status(500).json({ error: 'content_list_failed' })
  }
})

router.get('/filter', async (req, res) => {
  try {
    let query = supabaseAdmin.from('content').select('*')
    Object.entries(req.query).forEach(([key, val]) => {
      query = query.eq(key, val)
    })
    const { data, error } = await query
    if (error) return res.status(400).json({ error: error.message })
    res.json(data || [])
  } catch (e) {
    res.status(500).json({ error: 'content_filter_failed' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('content').insert(req.body).select('*').single()
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: 'content_create_failed' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabaseAdmin.from('content').update(req.body).eq('id', id).select('*').single()
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: 'content_update_failed' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { error } = await supabaseAdmin.from('content').delete().eq('id', id)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'content_delete_failed' })
  }
})

module.exports = router