/**
 * Prompt Templates Service
 * Provides platform-specific and content-type-specific prompt templates
 */

const PLATFORM_LIMITS = {
  instagram: {
    caption: 2200,
    hashtags: 30,
    mentions: 20
  },
  facebook: {
    caption: 63206,
    hashtags: 30,
    mentions: 50
  },
  tiktok: {
    caption: 2200,
    hashtags: 100,
    mentions: 0
  },
  linkedin: {
    caption: 3000,
    hashtags: 5,
    mentions: 0
  },
  youtube: {
    caption: 5000,
    hashtags: 15,
    mentions: 0
  },
  twitter: {
    caption: 280,
    hashtags: 2,
    mentions: 0
  },
  threads: {
    caption: 500,
    hashtags: 10,
    mentions: 0
  }
};

const CONTENT_TYPE_TEMPLATES = {
  post: {
    system: 'You are a social media content creator specializing in engaging posts.',
    template: `Create a {platform} post about: {topic}

Brand Context: {brandContext}
Tone: {tone}
Target Audience: {audience}

Requirements:
- Caption length: {captionLimit} characters max
- Include {hashtagCount} relevant hashtags
- Make it {style}
- Include a clear call-to-action

Return a JSON object with:
- caption: The post caption
- hashtags: Array of hashtags (without #)
- cta: Call-to-action text`
  },
  story: {
    system: 'You are a social media content creator specializing in engaging stories.',
    template: `Create a {platform} story about: {topic}

Brand Context: {brandContext}
Tone: {tone}

Requirements:
- Keep it short and punchy (stories are temporary)
- Include a question or poll suggestion
- Make it visually engaging

Return a JSON object with:
- caption: The story text
- question: Optional poll/question text
- hashtags: Array of hashtags`
  },
  reel: {
    system: 'You are a social media content creator specializing in engaging video content.',
    template: `Create a {platform} reel script about: {topic}

Brand Context: {brandContext}
Tone: {tone}
Duration: {duration} seconds

Requirements:
- Hook in first 3 seconds
- Clear narrative structure
- Include captions/subtitles suggestions
- End with strong CTA

Return a JSON object with:
- hook: Opening hook text
- script: Full script
- captions: Array of caption timestamps and text
- hashtags: Array of hashtags`
  },
  video: {
    system: 'You are a social media content creator specializing in long-form video content.',
    template: `Create a {platform} video script about: {topic}

Brand Context: {brandContext}
Tone: {tone}
Duration: {duration} minutes

Requirements:
- Strong opening hook
- Clear structure with chapters
- Engaging throughout
- Strong conclusion with CTA

Return a JSON object with:
- title: Video title
- description: Video description
- script: Full script with timestamps
- chapters: Array of chapter markers
- hashtags: Array of hashtags`
  }
};

class PromptService {
  /**
   * Get platform limits
   * @param {string} platform - Platform name
   * @returns {Object} Platform limits
   */
  getPlatformLimits(platform) {
    return PLATFORM_LIMITS[platform.toLowerCase()] || PLATFORM_LIMITS.instagram;
  }

  /**
   * Get content type template
   * @param {string} contentType - Content type (post, story, reel, video)
   * @returns {Object} Template object
   */
  getContentTypeTemplate(contentType) {
    return CONTENT_TYPE_TEMPLATES[contentType.toLowerCase()] || CONTENT_TYPE_TEMPLATES.post;
  }

  /**
   * Build prompt for content generation
   * @param {Object} params - Prompt parameters
   * @returns {Object} Prompt object with system and user prompts
   */
  buildContentPrompt({
    topic,
    platform,
    contentType = 'post',
    brandContext = '',
    tone = 'professional',
    audience = 'general',
    style = 'engaging',
    duration = null,
    additionalContext = ''
  }) {
    const limits = this.getPlatformLimits(platform);
    const template = this.getContentTypeTemplate(contentType);

    let userPrompt = template.template
      .replace(/{platform}/g, platform)
      .replace(/{topic}/g, topic)
      .replace(/{brandContext}/g, brandContext || 'General content')
      .replace(/{tone}/g, tone)
      .replace(/{audience}/g, audience)
      .replace(/{style}/g, style)
      .replace(/{captionLimit}/g, limits.caption)
      .replace(/{hashtagCount}/g, limits.hashtags);

    if (duration) {
      userPrompt = userPrompt.replace(/{duration}/g, duration);
    }

    if (additionalContext) {
      userPrompt += `\n\nAdditional Context: ${additionalContext}`;
    }

    return {
      system: template.system,
      user: userPrompt
    };
  }

  /**
   * Build brainstorm prompt
   * @param {Object} params - Brainstorm parameters
   * @returns {string} Brainstorm prompt
   */
  buildBrainstormPrompt({
    topic,
    brandContext = '',
    platform = 'all',
    count = 5
  }) {
    return `Generate ${count} creative content ideas for: ${topic}

Brand Context: ${brandContext || 'General content creation'}
Platform: ${platform}

For each idea, provide:
- Title: Catchy title
- Description: Brief description
- Content Type: post, story, reel, or video
- Key Points: 3-5 key talking points
- Target Audience: Who this appeals to
- Engagement Strategy: How to maximize engagement

Return as JSON array with these fields for each idea.`;
  }

  /**
   * Build improvement prompt
   * @param {Object} params - Improvement parameters
   * @returns {string} Improvement prompt
   */
  buildImprovementPrompt({
    originalContent,
    platform,
    improvementType = 'general',
    specificFeedback = ''
  }) {
    const limits = this.getPlatformLimits(platform);

    let prompt = `Improve this ${platform} content:\n\n${originalContent}\n\n`;

    switch (improvementType) {
      case 'engagement':
        prompt += 'Focus on increasing engagement - make it more interactive, add questions, or create discussion points.';
        break;
      case 'clarity':
        prompt += 'Improve clarity and readability - simplify language, add structure, improve flow.';
        break;
      case 'tone':
        prompt += 'Adjust tone to be more professional/friendly/casual (as appropriate).';
        break;
      case 'length':
        prompt += `Optimize length for ${platform} (max ${limits.caption} characters).`;
        break;
      default:
        prompt += 'Improve overall quality - make it more engaging, clear, and effective.';
    }

    if (specificFeedback) {
      prompt += `\n\nSpecific feedback: ${specificFeedback}`;
    }

    prompt += `\n\nReturn improved content that fits ${platform} requirements (${limits.caption} char max, ${limits.hashtags} hashtags).`;

    return prompt;
  }
}

module.exports = new PromptService();

