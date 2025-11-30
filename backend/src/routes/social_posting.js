const router = require('express').Router();
const axios = require('axios');
const { supabaseAdmin } = require('../config/supabase');
const { z } = require('zod');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { queuePostForPublishing } = require('../workers/postWorker');

// Schema validation for social posts
const postSchema = z.object({
  platform: z.enum(['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube', 'threads', 'bluesky']),
  caption: z.string().max(10000).optional(),
  media_urls: z.array(z.string().url()).max(10).optional(),
  media_types: z.array(z.enum(['image', 'video', 'gif'])).optional(),
  hashtags: z.array(z.string()).max(30).optional(),
  mentions: z.array(z.string()).max(50).optional(),
  links: z.array(z.string().url()).max(5).optional(),
  scheduled_at: z.string().datetime().optional(),
  brand_id: z.string().uuid().optional(),
  content_id: z.string().uuid().optional(),
  platform_specific: z.object({}).optional()
});

// Post status enumeration
const POST_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  POSTED: 'posted',
  FAILED: 'failed',
  RETRY: 'retry',
  PENDING: 'pending'
};

// OAuth Token Manager
class OAuthTokenManager {
  static async getValidToken(platform, accountId = null) {
    try {
      let query = supabaseAdmin
        .from('oauth_tokens')
        .select('*')
        .eq('platform', platform)
        .eq('is_valid', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query.single();
      
      if (error || !data) {
        throw new Error(`No valid OAuth token found for ${platform}`);
      }

      // Check if token is expired
      const isExpired = this.isTokenExpired(data);
      if (isExpired) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Token expired for ${platform}, attempting refresh...`);
        }
        const refreshedToken = await this.refreshToken(data);
        return refreshedToken;
      }

      return data;
    } catch (error) {
      console.error(`Error getting OAuth token for ${platform}:`, error);
      throw error;
    }
  }

  static isTokenExpired(token) {
    if (!token.expires_in || !token.created_at) return true;
    
    const createdAt = new Date(token.created_at);
    const expiresAt = new Date(createdAt.getTime() + (token.expires_in * 1000));
    const now = new Date();
    
    return now >= expiresAt;
  }

  static async refreshToken(token) {
    try {
      let refreshData;
      
      switch (token.platform) {
        case 'google':
        case 'youtube':
          refreshData = await this.refreshGoogleToken(token);
          break;
        case 'facebook':
        case 'instagram':
        case 'threads':
          refreshData = await this.refreshFacebookToken(token);
          break;
        case 'linkedin':
          refreshData = await this.refreshLinkedInToken(token);
          break;
        case 'tiktok':
          refreshData = await this.refreshTikTokToken(token);
          break;
        case 'bluesky':
          refreshData = await this.refreshBlueskyToken(token);
          break;
        default:
          throw new Error(`Token refresh not implemented for ${token.platform}`);
      }

      // Update token in database
      const { data, error } = await supabaseAdmin
        .from('oauth_tokens')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || token.refresh_token,
          expires_in: refreshData.expires_in,
          last_refreshed_at: new Date().toISOString(),
          is_valid: true
        })
        .eq('id', token.id)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to update token: ${error.message}`);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`Token refreshed successfully for ${token.platform}`);
      }
      return data;
    } catch (error) {
      console.error(`Token refresh failed for ${token.platform}:`, error);
      
      // Mark token as invalid
      await supabaseAdmin
        .from('oauth_tokens')
        .update({ is_valid: false })
        .eq('id', token.id);
      
      throw error;
    }
  }

  static async refreshGoogleToken(token) {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token'
    });

    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in
    };
  }

  static async refreshFacebookToken(token) {
    const response = await axios.get('https://graph.facebook.com/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: token.access_token
      }
    });

    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in
    };
  }

  static async refreshLinkedInToken(token) {
    const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
      refresh_token: response.data.refresh_token
    };
  }

  static async refreshTikTokToken(token) {
    // TikTok doesn't support refresh tokens, mark as invalid
    throw new Error('TikTok tokens cannot be refreshed. User must re-authenticate.');
  }

  static async refreshThreadsToken(token) {
    // Threads uses Facebook's token refresh mechanism
    return await this.refreshFacebookToken(token);
  }

  static async refreshBlueskyToken(token) {
    // Bluesky tokens don't expire in the traditional sense
    // Return the existing token if it's still valid
    if (!this.isTokenExpired(token)) {
      return {
        access_token: token.access_token,
        expires_in: token.expires_in || 3600
      };
    }
    throw new Error('Bluesky token refresh not implemented. User may need to re-authenticate.');
  }

  static async refreshYouTubeToken(token) {
    // YouTube uses Google's OAuth, so we can use the same refresh mechanism
    return await this.refreshGoogleToken(token);
  }
}

// Platform-specific posting implementations
class SocialPlatformPoster {
  static async postToFacebook(postData, token) {
    try {
      const pageId = token.account_id || 'me';
      
      if (!pageId || pageId === 'me') {
        throw new Error('Facebook page ID is required. Please ensure the OAuth token has account_id set.');
      }
      
      let mediaIds = [];

      // Upload media first if provided
      if (postData.media_urls && postData.media_urls.length > 0) {
        // Validate media count
        if (postData.media_urls.length > 10) {
          throw new Error('Facebook supports maximum 10 media files per post');
        }
        
        for (const mediaUrl of postData.media_urls) {
          try {
            const mediaId = await this.uploadFacebookMedia(pageId, mediaUrl, token.access_token);
            mediaIds.push(mediaId);
          } catch (mediaError) {
            console.error(`Failed to upload media ${mediaUrl}:`, mediaError.message);
            // Continue with other media files if one fails
          }
        }
      }

      // Prepare post data
      const postParams = {
        message: this.buildCaption(postData),
        access_token: token.access_token
      };

      if (mediaIds.length > 0) {
        if (mediaIds.length === 1) {
          postParams.object_attachment = mediaIds[0];
        } else {
          // For multiple media, create a carousel post
          postParams.child_attachments = mediaIds.join(',');
          postParams.published = false; // Draft for carousel
        }
      }

      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${pageId}/feed`,
        postParams
      );

      return {
        success: true,
        provider_post_id: response.data.id,
        provider_user_id: pageId,
        platform_specific: {
          post_type: mediaIds.length > 0 ? 'media' : 'text',
          media_count: mediaIds.length,
          media_uploaded: mediaIds.length
        }
      };
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      
      // Handle specific Facebook errors
      if (errorCode === 200 && errorMessage.includes('Permissions')) {
        throw new Error('Facebook posting failed: Insufficient permissions. Required: pages_manage_posts, pages_read_engagement');
      } else if (errorCode === 100 && errorMessage.includes('Invalid')) {
        throw new Error('Facebook posting failed: Invalid parameter. Check page ID and media formats.');
      }
      
      throw new Error(`Facebook posting failed: ${errorMessage}`);
    }
  }

  static async uploadFacebookMedia(pageId, mediaUrl, accessToken) {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${pageId}/photos`,
        {
          url: mediaUrl,
          published: false,
          access_token: accessToken
        }
      );
      return response.data.id;
    } catch (error) {
      throw new Error(`Facebook media upload failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  static async postToInstagram(postData, token) {
    try {
      const igUserId = token.account_id;
      if (!igUserId) {
        throw new Error('Instagram Business Account ID required. Please ensure your Facebook OAuth includes instagram_basic and instagram_content_publish permissions.');
      }

      let mediaId;

      if (postData.media_urls && postData.media_urls.length > 0) {
        // Instagram only supports 1 media file per post currently
        if (postData.media_urls.length > 1) {
          console.warn('Instagram currently supports only 1 media file per post. Using first media file.');
        }
        
        const mediaUrl = postData.media_urls[0];
        const mediaType = postData.media_types?.[0] || 'image';
        
        // Validate caption length for Instagram (max 2200 characters)
        const caption = this.buildCaption(postData);
        if (caption.length > 2200) {
          throw new Error('Instagram caption exceeds maximum length of 2200 characters');
        }
        
        if (mediaType === 'video') {
          mediaId = await this.uploadInstagramVideo(igUserId, mediaUrl, token.access_token);
        } else {
          mediaId = await this.uploadInstagramImage(igUserId, mediaUrl, token.access_token);
        }

        // Add caption if provided
        if (postData.caption) {
          try {
            await axios.post(
              `https://graph.facebook.com/v18.0/${mediaId}`,
              {
                caption: caption,
                access_token: token.access_token
              }
            );
          } catch (captionError) {
            console.warn('Failed to add caption to Instagram media:', captionError.message);
            // Continue with publishing even if caption update fails
          }
        }

        // Publish the media
        const publishResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
          {
            creation_id: mediaId,
            access_token: token.access_token
          }
        );

        return {
          success: true,
          provider_post_id: publishResponse.data.id,
          provider_user_id: igUserId,
          platform_specific: {
            media_type: mediaType,
            published: true,
            media_id: mediaId
          }
        };
      } else {
        throw new Error('Instagram requires media (image/video) for posting');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      
      // Handle specific Instagram errors
      if (errorCode === 10 && errorMessage.includes('permission')) {
        throw new Error('Instagram posting failed: Insufficient permissions. Required: instagram_basic, instagram_content_publish');
      } else if (errorCode === 100 && errorMessage.includes('media_type')) {
        throw new Error('Instagram posting failed: Invalid media type. Only JPG, PNG images and MP4, MOV videos are supported.');
      } else if (errorCode === 200 && errorMessage.includes('limit')) {
        throw new Error('Instagram posting failed: Rate limit exceeded or daily post limit reached.');
      }
      
      throw new Error(`Instagram posting failed: ${errorMessage}`);
    }
  }

  static async uploadInstagramImage(igUserId, imageUrl, accessToken) {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${igUserId}/media`,
        {
          image_url: imageUrl,
          access_token: accessToken
        }
      );
      return response.data.id;
    } catch (error) {
      throw new Error(`Instagram image upload failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  static async uploadInstagramVideo(igUserId, videoUrl, accessToken) {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${igUserId}/media`,
        {
          media_type: 'VIDEO',
          video_url: videoUrl,
          access_token: accessToken
        }
      );
      return response.data.id;
    } catch (error) {
      throw new Error(`Instagram video upload failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  static async postToTikTok(postData, token) {
    try {
      // TikTok posting requires video upload first, then post creation
      if (!postData.media_urls || postData.media_urls.length === 0) {
        throw new Error('TikTok requires video media for posting');
      }

      const videoUrl = postData.media_urls[0];
      
      // Step 1: Initialize video upload
      const initResponse = await axios.post(
        'https://open-api.tiktok.com/share/video/upload/',
        {
          open_id: token.account_id,
          access_token: token.access_token
        }
      );

      const { upload_url, upload_id } = initResponse.data.data;

      // Step 2: Upload video file
      const videoBuffer = await axios.get(videoUrl, { responseType: 'arraybuffer' });
      
      await axios.put(upload_url, videoBuffer.data, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': videoBuffer.data.length
        }
      });

      // Step 3: Create post with uploaded video
      const postResponse = await axios.post(
        'https://open-api.tiktok.com/share/video/create/',
        {
          open_id: token.account_id,
          access_token: token.access_token,
          upload_id: upload_id,
          description: this.buildCaption(postData)
        }
      );

      return {
        success: true,
        provider_post_id: postResponse.data.data.share_id,
        provider_user_id: token.account_id,
        platform_specific: {
          upload_id: upload_id,
          video_url: videoUrl
        }
      };
    } catch (error) {
      throw new Error(`TikTok posting failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  static async postToLinkedIn(postData, token) {
    try {
      const personId = token.account_id || 'me';
      
      // Step 1: Register upload for media if provided
      let mediaUrn;
      if (postData.media_urls && postData.media_urls.length > 0) {
        const mediaUrl = postData.media_urls[0];
        const mediaType = postData.media_types?.[0] || 'image';
        mediaUrn = await this.uploadLinkedInMedia(personId, mediaUrl, mediaType, token.access_token);
      }

      // Step 2: Create the post
      const postBody = {
        author: `urn:li:person:${personId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: this.buildCaption(postData)
            },
            shareMediaCategory: mediaUrn ? 'IMAGE' : 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      if (mediaUrn) {
        postBody.specificContent['com.linkedin.ugc.ShareContent'].media = [{
          status: 'READY',
          description: {
            text: postData.caption || ''
          },
          media: mediaUrn
        }];
      }

      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        postBody,
        {
          headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      return {
        success: true,
        provider_post_id: response.data.id,
        provider_user_id: personId,
        platform_specific: {
          media_included: !!mediaUrn,
          post_type: mediaUrn ? 'media' : 'text'
        }
      };
    } catch (error) {
      throw new Error(`LinkedIn posting failed: ${error.response?.data?.message || error.message}`);
    }
  }

  static async uploadLinkedInMedia(personId, mediaUrl, mediaType, accessToken) {
    try {
      // Register upload
      const registerResponse = await axios.post(
        'https://api.linkedin.com/v2/assets?action=registerUpload',
        {
          registerUploadRequest: {
            recipes: [`urn:li:digitalmediaRecipe:feedshare-${mediaType}`],
            owner: `urn:li:person:${personId}`,
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerResponse.data.value.asset;

      // Upload media file
      const mediaBuffer = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
      
      await axios.put(uploadUrl, mediaBuffer.data, {
        headers: {
          'Content-Type': mediaType === 'video' ? 'video/mp4' : 'image/jpeg'
        }
      });

      return asset;
    } catch (error) {
      throw new Error(`LinkedIn media upload failed: ${error.response?.data?.message || error.message}`);
    }
  }

  static async postToYouTube(postData, token) {
    try {
      if (!postData.media_urls || postData.media_urls.length === 0) {
        throw new Error('YouTube requires video media for posting');
      }

      const videoUrl = postData.media_urls[0];
      
      // Step 1: Create video metadata
      const videoMetadata = {
        snippet: {
          title: postData.caption ? postData.caption.substring(0, 100) : 'Uploaded Video',
          description: postData.caption || '',
          tags: postData.hashtags || []
        },
        status: {
          privacyStatus: 'public'
        }
      };

      // Step 2: Create video upload session
      const initResponse = await axios.post(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable',
        videoMetadata,
        {
          headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const uploadUrl = initResponse.headers.location;

      // Step 3: Upload video file
      const videoBuffer = await axios.get(videoUrl, { responseType: 'arraybuffer' });
      
      const uploadResponse = await axios.put(uploadUrl, videoBuffer.data, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': videoBuffer.data.length
        }
      });

      return {
        success: true,
        provider_post_id: uploadResponse.data.id,
        provider_user_id: token.account_id,
        platform_specific: {
          video_id: uploadResponse.data.id,
          title: videoMetadata.snippet.title
        }
      };
    } catch (error) {
      throw new Error(`YouTube posting failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  static async postToThreads(postData, token) {
    try {
      const userId = token.account_id;
      
      let mediaId;
      if (postData.media_urls && postData.media_urls.length > 0) {
        const mediaUrl = postData.media_urls[0];
        const mediaType = postData.media_types?.[0] || 'image';
        
        // Upload media to Threads
        const uploadResponse = await axios.post(
          `https://graph.threads.net/v1.0/${userId}/threads_media`,
          {
            media_type: mediaType === 'video' ? 'VIDEO' : 'IMAGE',
            image_url: mediaType === 'image' ? mediaUrl : undefined,
            video_url: mediaType === 'video' ? mediaUrl : undefined,
            access_token: token.access_token
          }
        );
        
        mediaId = uploadResponse.data.id;
      }

      // Create the thread post
      const postResponse = await axios.post(
        `https://graph.threads.net/v1.0/${userId}/threads`,
        {
          text: this.buildCaption(postData),
          media_id: mediaId,
          access_token: token.access_token
        }
      );

      return {
        success: true,
        provider_post_id: postResponse.data.id,
        provider_user_id: userId,
        platform_specific: {
          media_included: !!mediaId,
          media_type: postData.media_types?.[0] || 'text'
        }
      };
    } catch (error) {
      throw new Error(`Threads posting failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  static async postToBluesky(postData, token) {
    try {
      // Bluesky uses AT Protocol
      const handle = token.account_username;
      const did = token.account_id;
      
      // Create the post record
      const postRecord = {
        text: this.buildCaption(postData),
        createdAt: new Date().toISOString(),
        $type: 'app.bsky.feed.post'
      };

      // Add media if provided
      if (postData.media_urls && postData.media_urls.length > 0) {
        const mediaEmbeds = [];
        for (let i = 0; i < Math.min(postData.media_urls.length, 4); i++) {
          const mediaUrl = postData.media_urls[i];
          const mediaType = postData.media_types?.[i] || 'image';
          
          // Upload media to Bluesky
          const uploadResponse = await this.uploadBlueskyMedia(mediaUrl, mediaType, token.access_token);
          mediaEmbeds.push({
            $type: 'app.bsky.embed.images#image',
            alt: postData.caption ? postData.caption.substring(0, 100) : '',
            image: uploadResponse.blob
          });
        }
        
        postRecord.embed = {
          $type: 'app.bsky.embed.images',
          images: mediaEmbeds
        };
      }

      // Create the post
      const response = await axios.post(
        'https://bsky.social/xrpc/com.atproto.repo.createRecord',
        {
          repo: did,
          collection: 'app.bsky.feed.post',
          record: postRecord
        },
        {
          headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        provider_post_id: response.data.uri,
        provider_user_id: did,
        platform_specific: {
          handle: handle,
          uri: response.data.uri
        }
      };
    } catch (error) {
      throw new Error(`Bluesky posting failed: ${error.response?.data?.message || error.message}`);
    }
  }

  static async uploadBlueskyMedia(mediaUrl, mediaType, accessToken) {
    try {
      // Download media
      const mediaResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
      
      // Upload to Bluesky
      const uploadResponse = await axios.post(
        'https://bsky.social/xrpc/com.atproto.repo.uploadBlob',
        mediaResponse.data,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': mediaType === 'video' ? 'video/mp4' : 'image/jpeg'
          }
        }
      );

      return uploadResponse.data;
    } catch (error) {
      throw new Error(`Bluesky media upload failed: ${error.message}`);
    }
  }

  static buildCaption(postData) {
    let caption = postData.caption || '';
    
    // Add hashtags
    if (postData.hashtags && postData.hashtags.length > 0) {
      caption += '\n\n' + postData.hashtags.map(tag => 
        tag.startsWith('#') ? tag : `#${tag}`
      ).join(' ');
    }
    
    // Add mentions
    if (postData.mentions && postData.mentions.length > 0) {
      caption += '\n\n' + postData.mentions.map(mention => 
        mention.startsWith('@') ? mention : `@${mention}`
      ).join(' ');
    }
    
    return caption.trim();
  }
}

// Main posting function
async function publishToPlatform(postId, platform, postData, token) {
  try {
    console.log(`Publishing to ${platform}...`);
    
    // Validate platform requirements before attempting to post
    const { data: platformReqs, error: reqError } = await supabaseAdmin
      .from('platform_requirements')
      .select('*')
      .eq('platform', platform)
      .single();

    if (reqError || !platformReqs) {
      throw new Error(`Platform ${platform} requirements not found`);
    }

    // Validate post data against platform requirements
    if (postData.caption && postData.caption.length > platformReqs.max_caption_length) {
      throw new Error(`Caption exceeds maximum length of ${platformReqs.max_caption_length} characters for ${platform}`);
    }

    if (postData.media_urls && postData.media_urls.length > platformReqs.max_media_count) {
      throw new Error(`Too many media files. Maximum ${platformReqs.max_media_count} allowed for ${platform}`);
    }

    // Validate media formats if provided
    if (postData.media_urls && postData.media_urls.length > 0) {
      for (let i = 0; i < postData.media_urls.length; i++) {
        const mediaUrl = postData.media_urls[i];
        const mediaType = postData.media_types?.[i] || 'image';
        
        // Extract file extension
        const urlPath = new URL(mediaUrl).pathname;
        const fileExtension = urlPath.split('.').pop()?.toLowerCase();
        
        if (mediaType === 'video') {
          if (!platformReqs.supported_video_formats.includes(fileExtension)) {
            throw new Error(`Unsupported video format .${fileExtension} for ${platform}. Supported: ${platformReqs.supported_video_formats.join(', ')}`);
          }
        } else {
          if (!platformReqs.supported_image_formats.includes(fileExtension)) {
            throw new Error(`Unsupported image format .${fileExtension} for ${platform}. Supported: ${platformReqs.supported_image_formats.join(', ')}`);
          }
        }
      }
    }
    
    let result;
    switch (platform) {
      case 'facebook':
        result = await SocialPlatformPoster.postToFacebook(postData, token);
        break;
      case 'instagram':
        result = await SocialPlatformPoster.postToInstagram(postData, token);
        break;
      case 'tiktok':
        result = await SocialPlatformPoster.postToTikTok(postData, token);
        break;
      case 'linkedin':
        result = await SocialPlatformPoster.postToLinkedIn(postData, token);
        break;
      case 'youtube':
        result = await SocialPlatformPoster.postToYouTube(postData, token);
        break;
      case 'threads':
        result = await SocialPlatformPoster.postToThreads(postData, token);
        break;
      case 'bluesky':
        result = await SocialPlatformPoster.postToBluesky(postData, token);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    console.log(`Successfully published to ${platform}:`, result.provider_post_id);
    return result;
  } catch (error) {
    console.error(`Failed to publish to ${platform}:`, error);
    
    // Log detailed error information for debugging
    const errorDetails = {
      platform: platform,
      post_id: postId,
      error_message: error.message,
      error_stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    console.error('Publishing error details:', JSON.stringify(errorDetails, null, 2));
    
    throw error;
  }
}

// API Routes

// Create a new social post
router.post('/posts', async (req, res) => {
  try {
    // Validate input
    const validationResult = postSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'validation_failed',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    const postData = validationResult.data;
    
    // Check platform requirements
    const { data: platformReqs, error: reqError } = await supabaseAdmin
      .from('platform_requirements')
      .select('*')
      .eq('platform', postData.platform)
      .single();

    if (reqError || !platformReqs) {
      return res.status(400).json({
        error: 'platform_not_supported',
        message: `Platform ${postData.platform} is not supported`
      });
    }

    // Validate against platform requirements
    if (postData.caption && postData.caption.length > platformReqs.max_caption_length) {
      return res.status(400).json({
        error: 'caption_too_long',
        message: `Caption exceeds maximum length of ${platformReqs.max_caption_length} characters`
      });
    }

    if (postData.media_urls && postData.media_urls.length > platformReqs.max_media_count) {
      return res.status(400).json({
        error: 'too_many_media_files',
        message: `Maximum ${platformReqs.max_media_count} media files allowed for ${postData.platform}`
      });
    }

    // Create post record
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .insert({
        platform: postData.platform,
        caption: postData.caption,
        media_urls: postData.media_urls,
        media_types: postData.media_types,
        hashtags: postData.hashtags,
        mentions: postData.mentions,
        links: postData.links,
        brand_id: postData.brand_id,
        content_id: postData.content_id,
        scheduled_at: postData.scheduled_at,
        status: postData.scheduled_at ? POST_STATUS.QUEUED : POST_STATUS.PENDING,
        platform_specific: postData.platform_specific,
        posted_by: req.user?.id || null
      })
      .select('*')
      .single();

    if (postError) {
      return res.status(400).json({
        error: 'post_creation_failed',
        details: postError.message
      });
    }

    // If not scheduled, publish immediately
    if (!postData.scheduled_at) {
      // Queue for immediate publishing using the worker system
      setImmediate(async () => {
        try {
          await queuePostForPublishing(post.id);
        } catch (error) {
          console.error('Failed to queue post for immediate publishing:', error);
        }
      });
    } else {
      // For scheduled posts, log the scheduling event
      await supabaseAdmin.from('post_logs').insert({
        post_id: post.id,
        event_type: 'scheduled',
        status: 'queued',
        message: `Post scheduled for ${postData.scheduled_at}`,
        metadata: {
          scheduled_at: postData.scheduled_at,
          platform: postData.platform
        }
      });
    }

    res.status(201).json({
      success: true,
      post: post,
      message: postData.scheduled_at ? 'Post scheduled successfully' : 'Post created and will be published shortly'
    });
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({
      error: 'post_creation_failed',
      message: 'An unexpected error occurred while creating the post'
    });
  }
});

// Publish a specific post
async function publishPost(postId) {
  let post;
  
  try {
    // Get post details
    const { data: postData, error: postError } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError || !postData) {
      throw new Error(`Post not found: ${postId}`);
    }
    
    post = postData;

    // Update post status to processing
    await supabaseAdmin
      .from('posts')
      .update({ status: POST_STATUS.PROCESSING })
      .eq('id', postId);

    // Get OAuth token for the platform
    const token = await OAuthTokenManager.getValidToken(post.platform);

    // Publish to platform
    const result = await publishToPlatform(postId, post.platform, post, token);

    // Update post with success data
    await supabaseAdmin
      .from('posts')
      .update({
        status: POST_STATUS.POSTED,
        posted_at: new Date().toISOString(),
        provider_post_id: result.provider_post_id,
        provider_user_id: result.provider_user_id,
        platform_specific: result.platform_specific,
        error_log: null,
        last_error: null,
        retry_count: 0
      })
      .eq('id', postId);

    console.log(`Post ${postId} published successfully to ${post.platform}`);
    return result;
  } catch (error) {
    console.error(`Failed to publish post ${postId}:`, error);
    
    // Update post with error data
    const retryCount = post?.retry_count || 0;
    const maxRetries = post?.max_retries || 3;
    const newStatus = retryCount < maxRetries ? POST_STATUS.RETRY : POST_STATUS.FAILED;
    
    await supabaseAdmin
      .from('posts')
      .update({
        status: newStatus,
        error_log: {
          error: error.message,
          timestamp: new Date().toISOString(),
          retry_count: retryCount + 1
        },
        last_error: error.message,
        retry_count: retryCount + 1
      })
      .eq('id', postId);

    throw error;
  }
}

// Retry failed posts
router.post('/posts/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (postError || !post) {
      return res.status(404).json({
        error: 'post_not_found',
        message: 'Post not found'
      });
    }

    if (post.status !== POST_STATUS.FAILED && post.status !== POST_STATUS.RETRY) {
      return res.status(400).json({
        error: 'post_not_retryable',
        message: 'Post is not in a retryable state'
      });
    }

    // Reset status and retry
    await supabaseAdmin
      .from('posts')
      .update({
        status: POST_STATUS.PENDING,
        last_error: null
      })
      .eq('id', id);

    // Queue for retry using the worker system
    setImmediate(async () => {
      try {
        await queuePostForPublishing(id);
      } catch (error) {
        console.error('Failed to queue post for retry:', error);
      }
    });

    res.json({
      success: true,
      message: 'Post will be retried shortly'
    });
  } catch (error) {
    console.error('Post retry error:', error);
    res.status(500).json({
      error: 'post_retry_failed',
      message: 'Failed to retry post'
    });
  }
});

// Get post status
router.get('/posts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !post) {
      return res.status(404).json({
        error: 'post_not_found',
        message: 'Post not found'
      });
    }

    res.json({
      success: true,
      post: {
        id: post.id,
        platform: post.platform,
        status: post.status,
        provider_post_id: post.provider_post_id,
        provider_user_id: post.provider_user_id,
        posted_at: post.posted_at,
        scheduled_at: post.scheduled_at,
        retry_count: post.retry_count,
        max_retries: post.max_retries,
        last_error: post.last_error,
        platform_specific: post.platform_specific
      }
    });
  } catch (error) {
    console.error('Post status error:', error);
    res.status(500).json({
      error: 'post_status_failed',
      message: 'Failed to get post status'
    });
  }
});

// List posts with filtering
router.get('/posts', async (req, res) => {
  try {
    const {
      platform,
      status,
      brand_id,
      scheduled,
      limit = 50,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    let query = supabaseAdmin.from('posts').select('*');

    // Apply filters
    if (platform) {
      query = query.eq('platform', platform);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (brand_id) {
      query = query.eq('brand_id', brand_id);
    }
    
    if (scheduled === 'true') {
      query = query.not('scheduled_at', 'is', null);
    } else if (scheduled === 'false') {
      query = query.eq('scheduled_at', null);
    }

    // Apply sorting
    if (['created_at', 'posted_at', 'scheduled_at', 'platform'].includes(sort_by)) {
      query = query.order(sort_by, { ascending: sort_order === 'asc' });
    }

    // Apply pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;
    
    if (error) {
      return res.status(400).json({
        error: 'posts_fetch_failed',
        details: error.message
      });
    }

    res.json({
      success: true,
      posts: data || [],
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Posts fetch error:', error);
    res.status(500).json({
      error: 'posts_fetch_failed',
      message: 'Failed to fetch posts'
    });
  }
});

// Test posting to a platform (without creating a database record)
router.post('/posts/test', async (req, res) => {
  try {
    // Validate input
    const validationResult = postSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'validation_failed',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    const postData = validationResult.data;
    
    // Get OAuth token for the platform
    const token = await OAuthTokenManager.getValidToken(postData.platform);
    
    // Test publish without creating database record
    const result = await publishToPlatform(null, postData.platform, postData, token);
    
    res.json({
      success: true,
      message: 'Test post successful',
      result: result
    });
  } catch (error) {
    console.error('Test post error:', error);
    res.status(400).json({
      error: 'test_post_failed',
      message: error.message
    });
  }
});

// Batch create posts for multiple platforms
router.post('/posts/batch', async (req, res) => {
  try {
    const { posts, publish_immediately = false } = req.body;
    
    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({
        error: 'invalid_batch',
        message: 'Posts must be a non-empty array'
      });
    }

    if (posts.length > 10) {
      return res.status(400).json({
        error: 'batch_too_large',
        message: 'Maximum 10 posts allowed per batch'
      });
    }

    const results = [];
    const errors = [];

    for (const postData of posts) {
      try {
        // Validate each post
        const validationResult = postSchema.safeParse(postData);
        if (!validationResult.success) {
          errors.push({
            platform: postData.platform,
            error: 'validation_failed',
            details: validationResult.error.errors
          });
          continue;
        }

        const validPostData = validationResult.data;
        
        // Create post record
        const { data: post, error: postError } = await supabaseAdmin
          .from('posts')
          .insert({
            platform: validPostData.platform,
            caption: validPostData.caption,
            media_urls: validPostData.media_urls,
            media_types: validPostData.media_types,
            hashtags: validPostData.hashtags,
            mentions: validPostData.mentions,
            links: validPostData.links,
            brand_id: validPostData.brand_id,
            content_id: validPostData.content_id,
            scheduled_at: validPostData.scheduled_at,
            status: validPostData.scheduled_at ? POST_STATUS.QUEUED : (publish_immediately ? POST_STATUS.PENDING : POST_STATUS.QUEUED),
            platform_specific: validPostData.platform_specific,
            posted_by: req.user?.id || null
          })
          .select('*')
          .single();

        if (postError) {
          errors.push({
            platform: validPostData.platform,
            error: 'post_creation_failed',
            message: postError.message
          });
          continue;
        }

        results.push(post);

        // Publish immediately if requested and not scheduled
        if (publish_immediately && !validPostData.scheduled_at) {
          setImmediate(async () => {
            try {
              await publishPost(post.id);
            } catch (error) {
              console.error(`Batch publishing failed for post ${post.id}:`, error);
            }
          });
        }
      } catch (error) {
        errors.push({
          platform: postData.platform,
          error: 'unexpected_error',
          message: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      created: results.length,
      posts: results,
      errors: errors,
      message: `Created ${results.length} posts successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });
  } catch (error) {
    console.error('Batch post creation error:', error);
    res.status(500).json({
      error: 'batch_creation_failed',
      message: 'An unexpected error occurred while creating batch posts'
    });
  }
});

// Get platform requirements
router.get('/platforms/:platform/requirements', async (req, res) => {
  try {
    const { platform } = req.params;
    
    const { data: requirements, error } = await supabaseAdmin
      .from('platform_requirements')
      .select('*')
      .eq('platform', platform)
      .single();

    if (error || !requirements) {
      return res.status(404).json({
        error: 'platform_not_found',
        message: `Platform ${platform} not found or not supported`
      });
    }

    res.json({
      success: true,
      platform: requirements.platform,
      requirements: {
        required_scopes: requirements.required_scopes,
        max_media_count: requirements.max_media_count,
        max_caption_length: requirements.max_caption_length,
        supports_video: requirements.supports_video,
        supports_stories: requirements.supports_stories,
        supports_reels: requirements.supports_reels,
        max_video_size: requirements.max_video_size,
        max_image_size: requirements.max_image_size,
        supported_image_formats: requirements.supported_image_formats,
        supported_video_formats: requirements.supported_video_formats,
        aspect_ratio_requirements: requirements.aspect_ratio_requirements
      }
    });
  } catch (error) {
    console.error('Platform requirements error:', error);
    res.status(500).json({
      error: 'platform_requirements_failed',
      message: 'Failed to get platform requirements'
    });
  }
});

module.exports = router;