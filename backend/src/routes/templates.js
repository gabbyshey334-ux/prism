const router = require('express').Router()
const { supabaseAdmin } = require('../config/supabase')

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('templates').select('*')
    if (error) return res.status(400).json({ error: error.message })
    res.json(data || [])
  } catch (e) {
    res.status(500).json({ error: 'templates_list_failed' })
  }
})

router.get('/filter', async (req, res) => {
  try {
    let query = supabaseAdmin.from('templates').select('*')
    Object.entries(req.query).forEach(([key, val]) => {
      query = query.eq(key, val)
    })
    const { data, error } = await query
    if (error) return res.status(400).json({ error: error.message })
    res.json(data || [])
  } catch (e) {
    res.status(500).json({ error: 'templates_filter_failed' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabaseAdmin.from('templates').select('*').eq('id', id).single()
    if (error) return res.status(400).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'template_not_found' })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: 'templates_get_failed' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    if (!name) {
      return res.status(400).json({ error: 'missing_required_fields' })
    }
    const { data, error } = await supabaseAdmin.from('templates').insert(req.body).select('*').single()
    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json(data)
  } catch (e) {
    res.status(500).json({ error: 'templates_create_failed' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ error: 'missing_id' })
    const { data, error } = await supabaseAdmin.from('templates').update(req.body).eq('id', id).select('*').single()
    if (error) return res.status(400).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'template_not_found' })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: 'templates_update_failed' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ error: 'missing_id' })
    const { error } = await supabaseAdmin.from('templates').delete().eq('id', id)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'templates_delete_failed' })
  }
})

module.exports = router