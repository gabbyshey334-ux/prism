const { supabaseAdmin } = require('../config/supabase');
const { OAuthTokenManager } = require('../routes/social_posting');
const logger = require('./logger');

// Post status enumeration
const POST_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  POSTED: 'posted',
  FAILED: 'failed',
  RETRY: 'retry',
  PENDING: 'pending'
};

// Platform requirements validation
const PLATFORM_REQUIREMENTS = {
  facebook: {
    minCaptionLength: 1,
    maxCaptionLength: 63206,
    maxMediaCount: 50,
    supportedMediaTypes: ['image', 'video'],
    maxVideoSize: 10737418240, // 10GB
    maxImageSize: 10485760, // 10MB
    requiresBusinessAccount: false
  },
  instagram: {
    minCaptionLength: 1,
    maxCaptionLength: 2200,
    maxMediaCount: 10,
    supportedMediaTypes: ['image', 'video'],
    maxVideoSize: 1073741824, // 1GB
    maxImageSize: 8388608, // 8MB
    requiresBusinessAccount: true,
    aspectRatios: ['1:1', '4:5', '16:9']
  },
  tiktok: {
    minCaptionLength: 1,
    maxCaptionLength: 2200,
    maxMediaCount: 1,
    supportedMediaTypes: ['video'],
    maxVideoSize: 104857600, // 100MB
    maxVideoLength: 60, // seconds
    requiresBusinessAccount: false
  },
  linkedin: {
    minCaptionLength: 1,
    maxCaptionLength: 3000,
    maxMediaCount: 9,
    supportedMediaTypes: ['image', 'video'],
    maxVideoSize: 524288000, // 500MB
    maxImageSize: 104857600, // 100MB
    requiresBusinessAccount: false
  },
  youtube: {
    minCaptionLength: 1,
    maxCaptionLength: 5000,
    maxMediaCount: 1,
    supportedMediaTypes: ['video'],
    maxVideoSize: 128849018880, // 120GB
    requiresBusinessAccount: true
  },
  threads: {
    minCaptionLength: 1,
    maxCaptionLength: 500,
    maxMediaCount: 1,
    supportedMediaTypes: ['image', 'video'],
    maxVideoSize: 5242880, // 5MB
    maxImageSize: 5242880, // 5MB
    requiresBusinessAccount: false
  },
  bluesky: {
    minCaptionLength: 1,
    maxCaptionLength: 300,
    maxMediaCount: 4,
    supportedMediaTypes: ['image'],
    maxImageSize: 1048576, // 1MB
    requiresBusinessAccount: false
  }
};

// Main publish function
async function publishPost(postId) {
  let post;
  let logData = {
    postId,
    events: [],
    startTime: new Date().toISOString()
  };
  
  try {
    // Log start of publishing process
    await logPostEvent(postId, 'processing', 'Starting post publication');
    
    // Get post details
    logger.debug('Fetching post details', { postId });
    const { data: postData, error: postError } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError || !postData) {
      throw new Error(`Post not found: ${postId}`);
    }
    
    post = postData;
    logData.post = { id: post.id, platform: post.platform, status: post.status };
    
    // Update post status to processing
    logger.debug('Updating post status to processing', { postId });
    const { error: processingError } = await supabaseAdmin
      .from('posts')
      .update({ 
        status: POST_STATUS.PROCESSING,
        processing_started_at: new Date().toISOString()
      })
      .eq('id', postId);
    
    if (processingError) {
      throw new Error(`Failed to update post status: ${processingError.message}`);
    }
    
    await logPostEvent(postId, 'processing', 'Post status updated to processing');
    
    // Validate platform requirements
    await validatePlatformRequirements(post);
    
    // Get OAuth token for the platform
    logger.debug('Getting OAuth token', { platform: post.platform });
    const token = await OAuthTokenManager.getValidToken(post.platform);
    logData.token = { platform: token.platform, account_id: token.account_id };
    
    await logPostEvent(postId, 'processing', 'OAuth token retrieved successfully');
    
    // Check rate limits
    await checkRateLimits(post.brand_id, post.platform);
    
    // Publish to platform
    logger.info('Publishing to platform', { postId, platform: post.platform });
    const result = await publishToPlatform(postId, post.platform, post, token);
    
    logData.publishResult = {
      provider_post_id: result.provider_post_id,
      provider_user_id: result.provider_user_id,
      platform: post.platform
    };
    
    // Update post with success data
    logger.debug('Updating post with success data', { postId });
    const { error: updateError } = await supabaseAdmin
      .from('posts')
      .update({
        status: POST_STATUS.POSTED,
        posted_at: new Date().toISOString(),
        provider_post_id: result.provider_post_id,
        provider_user_id: result.provider_user_id,
        platform_specific: result.platform_specific,
        error_log: null,
        last_error: null,
        retry_count: 0,
        processing_started_at: null,
        processing_lock: null
      })
      .eq('id', postId);
    
    if (updateError) {
      throw new Error(`Failed to update post success status: ${updateError.message}`);
    }
    
    // Update rate limits
    await updateRateLimits(post.brand_id, post.platform);
    
    await logPostEvent(postId, 'posted', 'Post published successfully', {
      provider_post_id: result.provider_post_id,
      provider_user_id: result.provider_user_id,
      platform_specific: result.platform_specific
    });
    
    logger.info(`Post ${postId} published successfully to ${post.platform}`, {
      provider_post_id: result.provider_post_id
    });
    
    return result;
    
  } catch (error) {
    logger.error(`Failed to publish post ${postId}:`, error);
    
    // Determine retry strategy
    const retryCount = post?.retry_count || 0;
    const maxRetries = post?.max_retries || 3;
    const shouldRetry = retryCount < maxRetries;
    const newStatus = shouldRetry ? POST_STATUS.RETRY : POST_STATUS.FAILED;
    
    // Calculate next retry time if applicable
    let nextRetryAt = null;
    if (shouldRetry) {
      const retryDelay = post?.retry_delay_minutes || 15;
      nextRetryAt = new Date(Date.now() + (retryDelay * 60 * 1000));
    }
    
    // Update post with error data
    try {
      await supabaseAdmin
        .from('posts')
        .update({
          status: newStatus,
          error_log: {
            error: error.message,
            timestamp: new Date().toISOString(),
            retry_count: retryCount + 1,
            stack: error.stack
          },
          last_error: error.message,
          retry_count: retryCount + 1,
          next_retry_at: nextRetryAt,
          processing_started_at: null,
          processing_lock: null
        })
        .eq('id', postId);
    } catch (updateError) {
      logger.error(`Failed to update post error status:`, updateError);
    }
    
    // Log error event
    await logPostEvent(postId, newStatus, error.message, {
      error: error.message,
      stack: error.stack,
      retry_count: retryCount + 1,
      max_retries: maxRetries,
      next_retry_at: nextRetryAt
    });
    
    throw error;
  }
}

// Validate platform requirements
async function validatePlatformRequirements(post) {
  const requirements = PLATFORM_REQUIREMENTS[post.platform];
  if (!requirements) {
    throw new Error(`Unknown platform: ${post.platform}`);
  }
  
  // Validate caption length
  if (post.caption) {
    const captionLength = post.caption.length;
    if (captionLength < requirements.minCaptionLength) {
      throw new Error(`Caption too short for ${post.platform}. Minimum: ${requirements.minCaptionLength}, Got: ${captionLength}`);
    }
    if (captionLength > requirements.maxCaptionLength) {
      throw new Error(`Caption too long for ${post.platform}. Maximum: ${requirements.maxCaptionLength}, Got: ${captionLength}`);
    }
  }
  
  // Validate media count
  if (post.media_urls && post.media_urls.length > 0) {
    if (post.media_urls.length > requirements.maxMediaCount) {
      throw new Error(`Too many media items for ${post.platform}. Maximum: ${requirements.maxMediaCount}, Got: ${post.media_urls.length}`);
    }
    
    // Validate media types
    if (post.media_types) {
      for (const mediaType of post.media_types) {
        if (!requirements.supportedMediaTypes.includes(mediaType)) {
          throw new Error(`Unsupported media type for ${post.platform}: ${mediaType}`);
        }
      }
    }
  }
  
  logger.debug('Platform requirements validated', { 
    platform: post.platform,
    captionLength: post.caption?.length,
    mediaCount: post.media_urls?.length 
  });
}

// Check rate limits
async function checkRateLimits(brandId, platform) {
  try {
    const { data: rateLimit, error } = await supabaseAdmin
      .from('brand_rate_limits')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform', platform)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Not found is OK
      throw error;
    }
    
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    
    // Reset counters if window has passed
    let resetHour = false;
    let resetDay = false;
    
    if (rateLimit && new Date(rateLimit.hour_window_start) < hourStart) {
      resetHour = true;
    }
    
    if (rateLimit && new Date(rateLimit.day_window_start) < dayStart) {
      resetDay = true;
    }
    
    // Get brand limits
    const { data: brand } = await supabaseAdmin
      .from('brands')
      .select('rate_limit_posts_per_hour, rate_limit_posts_per_day')
      .eq('id', brandId)
      .single();
    
    const hourlyLimit = brand?.rate_limit_posts_per_hour || 10;
    const dailyLimit = brand?.rate_limit_posts_per_day || 100;
    
    // Check current usage
    const currentHourly = resetHour ? 0 : (rateLimit?.posts_this_hour || 0);
    const currentDaily = resetDay ? 0 : (rateLimit?.posts_this_day || 0);
    
    if (currentHourly >= hourlyLimit) {
      throw new Error(`Hourly rate limit exceeded for ${platform}. Limit: ${hourlyLimit}, Current: ${currentHourly}`);
    }
    
    if (currentDaily >= dailyLimit) {
      throw new Error(`Daily rate limit exceeded for ${platform}. Limit: ${dailyLimit}, Current: ${currentDaily}`);
    }
    
    logger.debug('Rate limit check passed', {
      brandId,
      platform,
      hourly: `${currentHourly}/${hourlyLimit}`,
      daily: `${currentDaily}/${dailyLimit}`
    });
    
  } catch (error) {
    if (error.message.includes('rate limit exceeded')) {
      throw error;
    }
    logger.error('Error checking rate limits:', error);
    // Don't fail the post for rate limit check errors, just log
  }
}

// Update rate limits after successful post
async function updateRateLimits(brandId, platform) {
  try {
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    
    const { data: rateLimit, error: fetchError } = await supabaseAdmin
      .from('brand_rate_limits')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform', platform)
      .single();
    
    const resetHour = rateLimit && new Date(rateLimit.hour_window_start) < hourStart;
    const resetDay = rateLimit && new Date(rateLimit.day_window_start) < dayStart;
    
    const updates = {
      posts_this_hour: resetHour ? 1 : (rateLimit?.posts_this_hour || 0) + 1,
      posts_this_day: resetDay ? 1 : (rateLimit?.posts_this_day || 0) + 1,
      hour_window_start: resetHour ? hourStart.toISOString() : rateLimit?.hour_window_start,
      day_window_start: resetDay ? dayStart.toISOString() : rateLimit?.day_window_start,
      updated_at: now.toISOString()
    };
    
    if (rateLimit) {
      await supabaseAdmin
        .from('brand_rate_limits')
        .update(updates)
        .eq('id', rateLimit.id);
    } else {
      await supabaseAdmin
        .from('brand_rate_limits')
        .insert({
          brand_id: brandId,
          platform,
          ...updates,
          hour_window_start: hourStart.toISOString(),
          day_window_start: dayStart.toISOString()
        });
    }
    
    logger.debug('Rate limits updated', { brandId, platform });
    
  } catch (error) {
    logger.error('Error updating rate limits:', error);
  }
}

// Log post events
async function logPostEvent(postId, eventType, message, metadata = {}) {
  try {
    await supabaseAdmin.from('post_logs').insert({
      post_id: postId,
      event_type: eventType,
      status: eventType,
      message,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        worker_id: process.pid
      }
    });
  } catch (error) {
    logger.error('Failed to log post event:', error);
  }
}

// Platform-specific publishing (simplified - would need full implementation)
async function publishToPlatform(postId, platform, post, token) {
  // This would contain the actual platform-specific publishing logic
  // For now, returning a mock result
  logger.info(`Publishing to ${platform}`, { postId });
  
  // Simulate platform-specific publishing
  switch (platform) {
    case 'facebook':
      return {
        provider_post_id: `fb_${Date.now()}`,
        provider_user_id: token.account_id,
        platform_specific: { platform: 'facebook', published: true }
      };
    case 'instagram':
      return {
        provider_post_id: `ig_${Date.now()}`,
        provider_user_id: token.account_id,
        platform_specific: { platform: 'instagram', published: true }
      };
    case 'tiktok':
      return {
        provider_post_id: `tt_${Date.now()}`,
        provider_user_id: token.account_id,
        platform_specific: { platform: 'tiktok', published: true }
      };
    case 'linkedin':
      return {
        provider_post_id: `li_${Date.now()}`,
        provider_user_id: token.account_id,
        platform_specific: { platform: 'linkedin', published: true }
      };
    case 'youtube':
      return {
        provider_post_id: `yt_${Date.now()}`,
        provider_user_id: token.account_id,
        platform_specific: { platform: 'youtube', published: true }
      };
    case 'threads':
      return {
        provider_post_id: `th_${Date.now()}`,
        provider_user_id: token.account_id,
        platform_specific: { platform: 'threads', published: true }
      };
    case 'bluesky':
      return {
        provider_post_id: `bs_${Date.now()}`,
        provider_user_id: token.account_id,
        platform_specific: { platform: 'bluesky', published: true }
      };
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

module.exports = {
  publishPost,
  POST_STATUS,
  PLATFORM_REQUIREMENTS,
  validatePlatformRequirements,
  checkRateLimits,
  updateRateLimits,
  logPostEvent
};