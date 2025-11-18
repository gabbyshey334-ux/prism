const router = require('express').Router()
const { supabaseAdmin } = require('../config/supabase')

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('social_connections').select('*').order('created_at', { ascending: false })
    if (error) return res.status(400).json({ error: error.message })
    res.json(data || [])
  } catch (e) {
    res.status(500).json({ error: 'connections_list_failed' })
  }
})

router.get('/filter', async (req, res) => {
  try {
    let query = supabaseAdmin.from('social_connections').select('*')
    Object.entries(req.query).forEach(([key, val]) => {
      query = query.eq(key, val)
    })
    const { data, error } = await query
    if (error) return res.status(400).json({ error: error.message })
    res.json(data || [])
  } catch (e) {
    res.status(500).json({ error: 'connections_filter_failed' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('social_connections').insert(req.body).select('*').single()
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: 'connection_create_failed' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { error } = await supabaseAdmin.from('social_connections').delete().eq('id', id)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'connection_delete_failed' })
  }
})

module.exports = router