# Social Posting System

A comprehensive multi-platform social media posting system that supports Facebook, Instagram, TikTok, LinkedIn, YouTube, Threads, and Bluesky.

## Features

- **Multi-Platform Support**: Post to 7 major social media platforms
- **OAuth Token Management**: Automatic token refresh and validation
- **Media Upload**: Support for images and videos with platform-specific validation
- **Batch Posting**: Create multiple posts across different platforms
- **Scheduled Posting**: Schedule posts for future publication
- **Error Handling**: Robust error handling with retry mechanisms
- **Post Status Tracking**: Monitor post status and retry failed posts
- **Platform Validation**: Automatic validation against platform-specific requirements

## API Endpoints

### Create a Post
```http
POST /api/social/posts
Content-Type: application/json

{
  "platform": "facebook",
  "caption": "Your post caption here",
  "hashtags": ["hashtag1", "hashtag2"],
  "mentions": ["username1", "username2"],
  "media_urls": ["https://example.com/image.jpg"],
  "media_types": ["image"],
  "brand_id": "your-brand-id",
  "content_id": "your-content-id",
  "scheduled_at": "2024-01-01T12:00:00Z" // Optional
}
```

### Batch Create Posts
```http
POST /api/social/posts/batch
Content-Type: application/json

{
  "posts": [
    {
      "platform": "facebook",
      "caption": "Facebook post",
      "media_urls": ["https://example.com/image1.jpg"]
    },
    {
      "platform": "instagram",
      "caption": "Instagram post",
      "media_urls": ["https://example.com/image2.jpg"]
    }
  ],
  "publish_immediately": false
}
```

### Test Post (without creating database record)
```http
POST /api/social/posts/test
Content-Type: application/json

{
  "platform": "facebook",
  "caption": "Test post",
  "media_urls": ["https://example.com/image.jpg"]
}
```

### Get Post Status
```http
GET /api/social/posts/:id/status
```

### List Posts
```http
GET /api/social/posts?platform=facebook&status=pending&brand_id=your-brand-id
```

### Retry Failed Post
```http
POST /api/social/posts/:id/retry
```

### Get Platform Requirements
```http
GET /api/social/platforms/:platform/requirements
```

## Platform-Specific Requirements

### Facebook
- **Required Scopes**: `pages_manage_posts`, `pages_read_engagement`
- **Max Caption**: 63,206 characters
- **Max Media**: 10 files
- **Supported Images**: JPG, JPEG, PNG, GIF
- **Supported Videos**: MP4, MOV
- **Max Video Size**: 10GB
- **Max Image Size**: 40MB

### Instagram
- **Required Scopes**: `instagram_basic`, `instagram_content_publish`
- **Max Caption**: 2,200 characters
- **Max Media**: 1 file (currently)
- **Supported Images**: JPG, JPEG, PNG
- **Supported Videos**: MP4, MOV
- **Max Video Size**: 10GB
- **Max Image Size**: 8MB

### TikTok
- **Required Scopes**: `video.upload`, `user.info.basic`
- **Max Caption**: 2,200 characters
- **Max Media**: 1 video file
- **Supported Videos**: MP4, MOV
- **Max Video Size**: 287MB (Android) / 10GB (iOS)

### LinkedIn
- **Required Scopes**: `w_member_social`, `r_liteprofile`
- **Max Caption**: 3,000 characters
- **Max Media**: 9 images or 1 video
- **Supported Images**: JPG, JPEG, PNG
- **Supported Videos**: MP4, MOV
- **Max Video Size**: 5GB
- **Max Image Size**: 100MB

### YouTube
- **Required Scopes**: `https://www.googleapis.com/auth/youtube.upload`
- **Max Caption**: 5,000 characters
- **Max Media**: 1 video file
- **Supported Videos**: MP4, MOV, AVI, WMV, FLV
- **Max Video Size**: 256GB

### Threads
- **Required Scopes**: `threads_basic`, `threads_content_publish`
- **Max Caption**: 500 characters
- **Max Media**: 1 file
- **Supported Images**: JPG, JPEG, PNG
- **Supported Videos**: MP4, MOV

### Bluesky
- **Required Scopes**: N/A (uses app passwords)
- **Max Caption**: 300 characters
- **Max Media**: 4 images or 1 video
- **Supported Images**: JPG, JPEG, PNG, GIF
- **Supported Videos**: MP4, MOV
- **Max Video Size**: 50MB

## Post Status

- `queued`: Post is scheduled for future publication
- `pending`: Post is ready to be published
- `processing`: Post is currently being published
- `posted`: Post was successfully published
- `failed`: Post failed to publish (max retries reached)
- `retry`: Post failed but will be retried

## Error Handling

The system includes comprehensive error handling:

1. **Validation Errors**: Platform-specific validation before posting
2. **Token Refresh**: Automatic OAuth token refresh when expired
3. **Retry Logic**: Failed posts are retried up to 3 times
4. **Error Logging**: Detailed error logs for debugging
5. **Graceful Degradation**: Continues with other media files if one fails

## Testing

Run the comprehensive test suite:

```bash
npm test -- tests/social_posting.test.js
```

The test suite covers:
- Platform requirements validation
- Post creation and validation
- Batch posting functionality
- Error handling scenarios
- OAuth token management
- Media format validation
- Complete workflow integration

## Setup

1. **Database**: Ensure the enhanced social posting schema is applied
2. **OAuth**: Configure OAuth credentials for each platform in your `.env` file
3. **Environment Variables**:
   ```
   FACEBOOK_APP_ID=your_facebook_app_id
   FACEBOOK_APP_SECRET=your_facebook_app_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   LINKEDIN_CLIENT_ID=your_linkedin_client_id
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
   ```

4. **Database Schema**: The system uses the enhanced schema from migration `005_enhanced_social_posting.sql`

## Usage Examples

### Basic Post Creation
```javascript
const response = await fetch('/api/social/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platform: 'facebook',
    caption: 'Hello World! #firstpost',
    hashtags: ['firstpost'],
    brand_id: 'your-brand-id'
  })
});

const result = await response.json();
console.log('Post created:', result.post.id);
```

### Scheduled Post
```javascript
const scheduledPost = {
  platform: 'instagram',
  caption: 'Scheduled post for tomorrow',
  media_urls: ['https://example.com/image.jpg'],
  scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

const response = await fetch('/api/social/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(scheduledPost)
});
```

### Multi-Platform Campaign
```javascript
const campaignPosts = [
  {
    platform: 'facebook',
    caption: 'Check out our new product! #launch',
    media_urls: ['https://example.com/product.jpg']
  },
  {
    platform: 'instagram',
    caption: 'New product launch! 📸 #launch #newproduct',
    media_urls: ['https://example.com/product-instagram.jpg']
  },
  {
    platform: 'linkedin',
    caption: 'Excited to announce our latest product launch...',
    media_urls: ['https://example.com/product-linkedin.jpg']
  }
];

const response = await fetch('/api/social/posts/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ posts: campaignPosts, publish_immediately: true })
});
```

This social posting system provides a robust, scalable solution for managing social media content across multiple platforms with comprehensive error handling and validation.