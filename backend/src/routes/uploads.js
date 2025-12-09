const router = require('express').Router()
const { supabaseAdmin } = require('../config/supabase')
const multer = require('multer')
const { extractAuth } = require('../middleware/extractAuth')
const { v5: uuidv5 } = require('uuid') // Add this dependency

// Apply auth extraction to all routes
router.use(extractAuth)

// UUID namespace for consistent Firebase ID -> UUID conversion
const FIREBASE_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

// Helper function to convert Firebase Auth ID to UUID
const firebaseIdToUuid = (firebaseId) => {
  if (!firebaseId) return null
  // Generate deterministic UUID from Firebase ID
  return uuidv5(firebaseId, FIREBASE_NAMESPACE)
}

// Configure multer for memory storage (we'll upload directly to Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ]
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`))
    }
  }
})

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/csv'
]

// IMPORTANT: Set your Supabase Storage bucket name here
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'files'

const validateUploadData = (data) => {
  const errors = []
  
  if (!data.user_id) {
    errors.push('user_id is required')
  }
  
  if (!data.storage_path) {
    errors.push('storage_path is required')
  }
  
  if (data.mime_type && !ALLOWED_MIME_TYPES.includes(data.mime_type)) {
    errors.push(`Invalid mime_type: ${data.mime_type}`)
  }
  
  return errors
}

router.get('/', async (req, res) => {
  try {
    const { user_id, brand_id, mime_type, limit = 50, offset = 0 } = req.query
    
    let query = supabaseAdmin.from('uploads').select('*')
    
    if (user_id) {
      // Convert Firebase ID to UUID if needed
      const uuid = firebaseIdToUuid(user_id)
      query = query.eq('user_id', uuid)
    }
    
    if (brand_id) {
      query = query.eq('brand_id', brand_id)
    }
    
    if (mime_type) {
      query = query.eq('mime_type', mime_type)
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
    
    if (error) {
      console.error('Uploads list error:', error)
      return res.status(400).json({ 
        error: 'uploads_list_failed',
        message: error.message 
      })
    }
    
    res.json({
      uploads: data || [],
      total: data?.length || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  } catch (e) {
    console.error('Uploads list exception:', e)
    res.status(500).json({ 
      error: 'uploads_list_failed',
      message: 'Failed to retrieve uploads'
    })
  }
})

// File upload endpoint - uploads file to Supabase Storage and creates metadata record
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Upload request received')
    
    if (!req.file) {
      console.error('❌ No file provided in request')
      return res.status(400).json({
        error: 'validation_failed',
        message: 'No file provided'
      })
    }

    // Extract user ID from auth token (Firebase) or request
    const firebaseUserId = req.user?.uid || req.userId || req.body.user_id
    if (!firebaseUserId) {
      console.error('❌ No user ID found')
      return res.status(401).json({
        error: 'unauthorized',
        message: 'User authentication required. Please ensure you are logged in.'
      })
    }

    // Convert Firebase ID to UUID for database storage
    const userId = firebaseIdToUuid(firebaseUserId)

    const file = req.file
    const brandId = req.body.brand_id || null

    console.log('📤 Processing file upload:', {
      fileName: file.originalname,
      size: file.size,
      type: file.mimetype,
      firebaseUserId,
      userId,
      brandId
    })

    // Generate unique file path
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')
    const filePath = `uploads/${firebaseUserId}/${timestamp}_${randomString}_${sanitizedName}`

    console.log('📤 Uploading to Supabase Storage:', { bucket: STORAGE_BUCKET, path: filePath })

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
        metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          userId: firebaseUserId,
          brandId: brandId || null
        }
      })

    if (uploadError) {
      console.error('❌ Supabase storage upload error:', uploadError)
      if (uploadError.message?.includes('Bucket not found')) {
        return res.status(500).json({
          error: 'storage_upload_failed',
          message: `Storage bucket "${STORAGE_BUCKET}" not found. Please create it in Supabase Dashboard > Storage.`,
          help: `Go to https://supabase.com/dashboard → Your Project → Storage → New Bucket → Name: "${STORAGE_BUCKET}" → Make it Public`
        })
      }
      return res.status(500).json({
        error: 'storage_upload_failed',
        message: uploadError.message || 'Failed to upload file to storage'
      })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    console.log('✅ File uploaded successfully:', publicUrl)

    // Determine file type
    let fileType = 'document'
    if (file.mimetype.startsWith('image/')) {
      fileType = 'image'
    } else if (file.mimetype.startsWith('video/')) {
      fileType = 'video'
    }

    // Create metadata record in uploads table with UUID
    const uploadRecord = {
      user_id: userId, // UUID format
      brand_id: brandId,
      file_name: file.originalname,
      file_url: publicUrl,
      file_type: fileType,
      mime_type: file.mimetype,
      file_size: file.size,
      storage_path: filePath,
      metadata: {
        original_name: file.originalname,
        uploaded_at: new Date().toISOString(),
        content_type: file.mimetype,
        firebase_user_id: firebaseUserId // Store original Firebase ID in metadata
      }
    }

    const { data: dbData, error: dbError } = await supabaseAdmin
      .from('uploads')
      .insert(uploadRecord)
      .select('*')
      .single()

    if (dbError) {
      console.error('❌ Database insert error:', dbError)
      // Try to delete the uploaded file if database insert fails
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([filePath])
      return res.status(500).json({
        error: 'database_insert_failed',
        message: dbError.message || 'Failed to create upload record'
      })
    }

    console.log('✅ Upload complete:', { id: dbData.id, url: publicUrl })

    res.status(201).json({
      file_url: publicUrl,
      storage_path: filePath,
      metadata: {
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        uploaded_at: new Date().toISOString()
      },
      upload_id: dbData.id,
      ...dbData
    })
  } catch (e) {
    console.error('❌ File upload exception:', e)
    res.status(500).json({
      error: 'upload_failed',
      message: e.message || 'Failed to upload file'
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabaseAdmin.from('uploads').select('*').eq('id', id).single()
    
    if (error) {
      console.error('Upload get error:', error)
      return res.status(400).json({ 
        error: 'uploads_get_failed',
        message: error.message 
      })
    }
    
    if (!data) {
      return res.status(404).json({ 
        error: 'upload_not_found',
        message: 'Upload not found'
      })
    }
    
    res.json(data)
  } catch (e) {
    console.error('Upload get exception:', e)
    res.status(500).json({ 
      error: 'uploads_get_failed',
      message: 'Failed to retrieve upload'
    })
  }
})

// Metadata-only endpoint (for backward compatibility)
router.post('/', async (req, res) => {
  try {
    const uploadData = req.body
    
    // Convert Firebase ID to UUID if present
    if (uploadData.user_id && typeof uploadData.user_id === 'string' && uploadData.user_id.length > 36) {
      uploadData.user_id = firebaseIdToUuid(uploadData.user_id)
    }
    
    const validationErrors = validateUploadData(uploadData)
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'validation_failed',
        message: 'Validation failed',
        errors: validationErrors 
      })
    }
    
    const { data, error } = await supabaseAdmin
      .from('uploads')
      .insert(uploadData)
      .select('*')
      .single()
    
    if (error) {
      console.error('Upload create error:', error)
      return res.status(400).json({ 
        error: 'uploads_create_failed',
        message: error.message 
      })
    }
    
    res.status(201).json(data)
  } catch (e) {
    console.error('Upload create exception:', e)
    res.status(500).json({ 
      error: 'uploads_create_failed',
      message: 'Failed to create upload'
    })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body
    
    if (updateData.mime_type && !ALLOWED_MIME_TYPES.includes(updateData.mime_type)) {
      return res.status(400).json({ 
        error: 'validation_failed',
        message: `Invalid mime_type: ${updateData.mime_type}`
      })
    }
    
    const { data, error } = await supabaseAdmin
      .from('uploads')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()
    
    if (error) {
      console.error('Upload update error:', error)
      return res.status(400).json({ 
        error: 'uploads_update_failed',
        message: error.message 
      })
    }
    
    if (!data) {
      return res.status(404).json({ 
        error: 'upload_not_found',
        message: 'Upload not found'
      })
    }
    
    res.json(data)
  } catch (e) {
    console.error('Upload update exception:', e)
    res.status(500).json({ 
      error: 'uploads_update_failed',
      message: 'Failed to update upload'
    })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const { data: existingUpload, error: fetchError } = await supabaseAdmin
      .from('uploads')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError || !existingUpload) {
      return res.status(404).json({ 
        error: 'upload_not_found',
        message: 'Upload not found'
      })
    }
    
    const { error } = await supabaseAdmin
      .from('uploads')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Upload delete error:', error)
      return res.status(400).json({ 
        error: 'uploads_delete_failed',
        message: error.message 
      })
    }
    
    res.json({ 
      success: true,
      message: 'Upload deleted successfully',
      deleted_upload: existingUpload
    })
  } catch (e) {
    console.error('Upload delete exception:', e)
    res.status(500).json({ 
      error: 'uploads_delete_failed',
      message: 'Failed to delete upload'
    })
  }
})

router.get('/stats/summary', async (req, res) => {
  try {
    const { user_id, brand_id } = req.query
    
    let query = supabaseAdmin.from('uploads').select('*', { count: 'exact' })
    
    if (user_id) {
      const uuid = firebaseIdToUuid(user_id)
      query = query.eq('user_id', uuid)
    }
    
    if (brand_id) {
      query = query.eq('brand_id', brand_id)
    }
    
    const { count, error } = await query
    
    if (error) {
      console.error('Upload stats error:', error)
      return res.status(400).json({ 
        error: 'uploads_stats_failed',
        message: error.message 
      })
    }
    
    const { data: mimeTypeData, error: mimeError } = await supabaseAdmin
      .from('uploads')
      .select('mime_type')
    
    if (user_id) {
      mimeTypeData?.filter(row => row.user_id === user_id)
    }
    
    if (brand_id) {
      mimeTypeData?.filter(row => row.brand_id === brand_id)
    }
    
    const mimeTypeCounts = {}
    mimeTypeData?.forEach(row => {
      if (row.mime_type) {
        mimeTypeCounts[row.mime_type] = (mimeTypeCounts[row.mime_type] || 0) + 1
      }
    })
    
    res.json({
      total_uploads: count || 0,
      mime_type_breakdown: mimeTypeCounts,
      storage_limits: {
        max_file_size: MAX_FILE_SIZE,
        allowed_types: ALLOWED_MIME_TYPES
      }
    })
  } catch (e) {
    console.error('Upload stats exception:', e)
    res.status(500).json({ 
      error: 'uploads_stats_failed',
      message: 'Failed to retrieve upload statistics'
    })
  }
})

module.exports = router