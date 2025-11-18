const request = require('supertest');
const app = require('../src/app');
const { supabaseAdmin } = require('../src/config/supabase');

// Mock OAuth tokens for testing
const mockTokens = {
  facebook: {
    access_token: 'mock_facebook_access_token',
    refresh_token: 'mock_facebook_refresh_token',
    expires_in: 3600,
    account_id: 'mock_facebook_page_id',
    platform: 'facebook',
    is_valid: true
  },
  instagram: {
    access_token: 'mock_instagram_access_token',
    refresh_token: 'mock_instagram_refresh_token',
    expires_in: 3600,
    account_id: 'mock_instagram_business_id',
    platform: 'instagram',
    is_valid: true
  },
  tiktok: {
    access_token: 'mock_tiktok_access_token',
    account_id: 'mock_tiktok_user_id',
    platform: 'tiktok',
    is_valid: true
  },
  linkedin: {
    access_token: 'mock_linkedin_access_token',
    refresh_token: 'mock_linkedin_refresh_token',
    expires_in: 3600,
    account_id: 'mock_linkedin_person_id',
    platform: 'linkedin',
    is_valid: true
  },
  youtube: {
    access_token: 'mock_youtube_access_token',
    refresh_token: 'mock_youtube_refresh_token',
    expires_in: 3600,
    account_id: 'mock_youtube_channel_id',
    platform: 'youtube',
    is_valid: true
  },
  threads: {
    access_token: 'mock_threads_access_token',
    refresh_token: 'mock_threads_refresh_token',
    expires_in: 3600,
    account_id: 'mock_threads_user_id',
    platform: 'threads',
    is_valid: true
  },
  bluesky: {
    access_token: 'mock_bluesky_access_token',
    account_id: 'mock_bluesky_did',
    account_username: 'mock_bluesky_handle',
    platform: 'bluesky',
    is_valid: true
  }
};

// Test data for different platforms
const testPostData = {
  facebook: {
    platform: 'facebook',
    caption: 'Test post to Facebook with #hashtag and @mention',
    hashtags: ['test', 'facebook'],
    mentions: ['testuser'],
    media_urls: ['https://example.com/test-image.jpg'],
    media_types: ['image']
  },
  instagram: {
    platform: 'instagram',
    caption: 'Test Instagram post #instagood #test',
    hashtags: ['instagood', 'test'],
    media_urls: ['https://example.com/test-image.jpg'],
    media_types: ['image']
  },
  tiktok: {
    platform: 'tiktok',
    caption: 'Test TikTok video #fyp #test',
    hashtags: ['fyp', 'test'],
    media_urls: ['https://example.com/test-video.mp4'],
    media_types: ['video']
  },
  linkedin: {
    platform: 'linkedin',
    caption: 'Professional test post for LinkedIn #business #test',
    hashtags: ['business', 'test'],
    media_urls: ['https://example.com/test-image.jpg'],
    media_types: ['image']
  },
  youtube: {
    platform: 'youtube',
    caption: 'Test video upload to YouTube with detailed description. This is a comprehensive test of the video upload functionality.',
    hashtags: ['test', 'video'],
    media_urls: ['https://example.com/test-video.mp4'],
    media_types: ['video']
  },
  threads: {
    platform: 'threads',
    caption: 'Test post for Threads platform #threads #test',
    hashtags: ['threads', 'test'],
    media_urls: ['https://example.com/test-image.jpg'],
    media_types: ['image']
  },
  bluesky: {
    platform: 'bluesky',
    caption: 'Test post for Bluesky using AT Protocol #bluesky #test',
    hashtags: ['bluesky', 'test'],
    media_urls: ['https://example.com/test-image.jpg'],
    media_types: ['image']
  }
};

describe('Social Posting System', () => {
  let testBrandId;
  let testContentId;

  beforeAll(async () => {
    // Create test brand and content
    const { data: brand } = await supabaseAdmin
      .from('brands')
      .insert({ name: 'Test Brand', description: 'Test brand for social posting' })
      .select('*')
      .single();
    
    testBrandId = brand.id;

    const { data: content } = await supabaseAdmin
      .from('content')
      .insert({ title: 'Test Content', content: 'Test content for social posting' })
      .select('*')
      .single();
    
    testContentId = content.id;

    // Insert mock OAuth tokens
    for (const [platform, token] of Object.entries(mockTokens)) {
      await supabaseAdmin.from('oauth_tokens').insert({
        ...token,
        created_at: new Date().toISOString(),
        last_refreshed_at: new Date().toISOString()
      });
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await supabaseAdmin.from('posts').delete().eq('brand_id', testBrandId);
    await supabaseAdmin.from('oauth_tokens').delete().like('access_token', 'mock_%');
    await supabaseAdmin.from('content').delete().eq('id', testContentId);
    await supabaseAdmin.from('brands').delete().eq('id', testBrandId);
  });

  describe('Platform Requirements', () => {
    test('should get platform requirements for all supported platforms', async () => {
      const platforms = ['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube', 'threads', 'bluesky'];
      
      for (const platform of platforms) {
        const response = await request(app)
          .get(`/api/social/platforms/${platform}/requirements`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.platform).toBe(platform);
        expect(response.body.requirements).toHaveProperty('max_caption_length');
        expect(response.body.requirements).toHaveProperty('max_media_count');
        expect(response.body.requirements).toHaveProperty('supports_video');
      }
    });

    test('should return 404 for unsupported platform', async () => {
      const response = await request(app)
        .get('/api/social/platforms/unsupported/requirements')
        .expect(404);

      expect(response.body.error).toBe('platform_not_found');
    });
  });

  describe('Post Validation', () => {
    test('should validate post data before creation', async () => {
      const invalidPost = {
        platform: 'facebook',
        caption: 'Test',
        media_urls: ['not-a-valid-url']
      };

      const response = await request(app)
        .post('/api/social/posts')
        .send(invalidPost)
        .expect(400);

      expect(response.body.error).toBe('validation_failed');
      expect(response.body.details).toBeInstanceOf(Array);
    });

    test('should validate platform-specific constraints', async () => {
      // Test caption length validation
      const longCaptionPost = {
        platform: 'instagram',
        caption: 'a'.repeat(2500), // Instagram max is 2200
        media_urls: ['https://example.com/test.jpg'],
        media_types: ['image']
      };

      const response = await request(app)
        .post('/api/social/posts')
        .send(longCaptionPost)
        .expect(400);

      expect(response.body.error).toBe('caption_too_long');
    });

    test('should validate media count constraints', async () => {
      const tooManyMediaPost = {
        platform: 'instagram',
        caption: 'Test',
        media_urls: Array(15).fill('https://example.com/test.jpg'), // Instagram max is 10
        media_types: Array(15).fill('image')
      };

      const response = await request(app)
        .post('/api/social/posts')
        .send(tooManyMediaPost)
        .expect(400);

      expect(response.body.error).toBe('too_many_media_files');
    });
  });

  describe('Post Creation', () => {
    test('should create a post successfully', async () => {
      const postData = {
        ...testPostData.facebook,
        brand_id: testBrandId,
        content_id: testContentId
      };

      const response = await request(app)
        .post('/api/social/posts')
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.post).toHaveProperty('id');
      expect(response.body.post.platform).toBe('facebook');
      expect(response.body.post.status).toBe('pending');
    });

    test('should create scheduled post', async () => {
      const scheduledTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      const postData = {
        ...testPostData.linkedin,
        brand_id: testBrandId,
        content_id: testContentId,
        scheduled_at: scheduledTime
      };

      const response = await request(app)
        .post('/api/social/posts')
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.post.scheduled_at).toBe(scheduledTime);
      expect(response.body.post.status).toBe('queued');
    });
  });

  describe('Batch Posting', () => {
    test('should create multiple posts in batch', async () => {
      const batchPosts = [
        { ...testPostData.facebook, brand_id: testBrandId, content_id: testContentId },
        { ...testPostData.instagram, brand_id: testBrandId, content_id: testContentId },
        { ...testPostData.linkedin, brand_id: testBrandId, content_id: testContentId }
      ];

      const response = await request(app)
        .post('/api/social/posts/batch')
        .send({ posts: batchPosts, publish_immediately: false })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.created).toBe(3);
      expect(response.body.posts).toHaveLength(3);
      expect(response.body.errors).toHaveLength(0);
    });

    test('should handle batch with validation errors', async () => {
      const batchPosts = [
        { ...testPostData.facebook, brand_id: testBrandId, content_id: testContentId },
        { ...testPostData.instagram, caption: 'a'.repeat(2500) }, // Invalid caption length
        { ...testPostData.linkedin, brand_id: testBrandId, content_id: testContentId }
      ];

      const response = await request(app)
        .post('/api/social/posts/batch')
        .send({ posts: batchPosts, publish_immediately: false })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.created).toBe(2); // Only 2 valid posts
      expect(response.body.errors).toHaveLength(1); // 1 validation error
    });
  });

  describe('Post Status and Management', () => {
    let testPostId;

    beforeEach(async () => {
      // Create a test post
      const { data: post } = await supabaseAdmin
        .from('posts')
        .insert({
          platform: 'facebook',
          caption: 'Test post for status checking',
          brand_id: testBrandId,
          content_id: testContentId,
          status: 'pending'
        })
        .select('*')
        .single();
      
      testPostId = post.id;
    });

    test('should get post status', async () => {
      const response = await request(app)
        .get(`/api/social/posts/${testPostId}/status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.post).toHaveProperty('id', testPostId);
      expect(response.body.post).toHaveProperty('status', 'pending');
      expect(response.body.post).toHaveProperty('platform', 'facebook');
    });

    test('should list posts with filtering', async () => {
      const response = await request(app)
        .get('/api/social/posts')
        .query({ platform: 'facebook', brand_id: testBrandId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.posts).toBeInstanceOf(Array);
      expect(response.body.total).toBeGreaterThan(0);
    });

    test('should retry failed posts', async () => {
      // First, update post to failed status
      await supabaseAdmin
        .from('posts')
        .update({ status: 'failed', retry_count: 1 })
        .eq('id', testPostId);

      const response = await request(app)
        .post(`/api/social/posts/${testPostId}/retry`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Post will be retried shortly');
    });
  });

  describe('Test Posting (without database)', () => {
    test('should test post to platform successfully', async () => {
      const postData = {
        ...testPostData.facebook,
        brand_id: testBrandId,
        content_id: testContentId
      };

      // Note: This will fail with actual API calls since we're using mock tokens
      // but it should validate the request and attempt to get the token
      const response = await request(app)
        .post('/api/social/posts/test')
        .send(postData)
        .expect(400); // Expected to fail due to mock token

      expect(response.body.error).toBe('test_post_failed');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing OAuth tokens gracefully', async () => {
      // Remove mock tokens temporarily
      await supabaseAdmin.from('oauth_tokens').delete().like('access_token', 'mock_%');

      const postData = {
        ...testPostData.facebook,
        brand_id: testBrandId,
        content_id: testContentId
      };

      const response = await request(app)
        .post('/api/social/posts')
        .send(postData)
        .expect(500);

      expect(response.body.error).toBe('post_creation_failed');

      // Restore mock tokens
      for (const [platform, token] of Object.entries(mockTokens)) {
        await supabaseAdmin.from('oauth_tokens').insert({
          ...token,
          created_at: new Date().toISOString(),
          last_refreshed_at: new Date().toISOString()
        });
      }
    });

    test('should handle platform-specific errors', async () => {
      // Test Instagram without media (should fail)
      const invalidInstagramPost = {
        platform: 'instagram',
        caption: 'Test Instagram post without media',
        brand_id: testBrandId,
        content_id: testContentId
      };

      const response = await request(app)
        .post('/api/social/posts')
        .send(invalidInstagramPost)
        .expect(201); // Post creation should succeed

      // The actual publishing should fail when attempted
      expect(response.body.success).toBe(true);
      expect(response.body.post.status).toBe('pending');
    });
  });

  describe('Media Validation', () => {
    test('should validate media formats for each platform', async () => {
      const invalidFormatPosts = [
        {
          platform: 'instagram',
          caption: 'Test with unsupported format',
          media_urls: ['https://example.com/test.bmp'], // Instagram doesn't support BMP
          media_types: ['image'],
          brand_id: testBrandId,
          content_id: testContentId
        },
        {
          platform: 'tiktok',
          caption: 'Test with unsupported format',
          media_urls: ['https://example.com/test.avi'], // TikTok doesn't support AVI
          media_types: ['video'],
          brand_id: testBrandId,
          content_id: testContentId
        }
      ];

      for (const postData of invalidFormatPosts) {
        const response = await request(app)
          .post('/api/social/posts')
          .send(postData)
          .expect(201); // Post creation should succeed

        // The validation happens during publishing, not creation
        expect(response.body.success).toBe(true);
      }
    });
  });
});

// Integration test for the complete workflow
describe('Social Posting Integration', () => {
  test('should handle complete posting workflow', async () => {
    // This test demonstrates the complete workflow
    // 1. Create a post
    // 2. Check its status
    // 3. Retry if failed
    // 4. List all posts

    const postData = {
      platform: 'facebook',
      caption: 'Complete workflow test post #integration #test',
      hashtags: ['integration', 'test'],
      media_urls: ['https://example.com/test-image.jpg'],
      media_types: ['image']
    };

    // Step 1: Create post
    const createResponse = await request(app)
      .post('/api/social/posts')
      .send(postData)
      .expect(201);

    const postId = createResponse.body.post.id;

    // Step 2: Check status
    const statusResponse = await request(app)
      .get(`/api/social/posts/${postId}/status`)
      .expect(200);

    expect(statusResponse.body.post.id).toBe(postId);

    // Step 3: List posts
    const listResponse = await request(app)
      .get('/api/social/posts')
      .query({ platform: 'facebook' })
      .expect(200);

    expect(listResponse.body.posts.length).toBeGreaterThan(0);
    expect(listResponse.body.posts.some(post => post.id === postId)).toBe(true);
  });
});