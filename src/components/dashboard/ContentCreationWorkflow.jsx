
import React, { useState, useEffect } from "react";
import { prism } from "@/api/prismClient";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, Loader2, ChevronRight, CheckCircle,
  ExternalLink, Lightbulb, MessageSquare, Send, Image as ImageIcon,
  Video, Upload, Wand2, Save, ArrowRight, X, RefreshCw, Download,
  Calendar, Clock, List, ChevronLeft, Trash2, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import CESDKEditor from "../editor/CESDKEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";


// Replace with your actual CE.SDK license key for production.
// For development, you might use a trial key or leave it empty if the editor handles its own fallback.
const CESDK_LICENSE_KEY = "YOUR_CESDK_LICENSE_KEY";


const workflowSteps = [
  { id: "idea_development", label: "Idea Development", icon: Lightbulb },
  { id: "text_generation", label: "Text Generation", icon: Sparkles },
  { id: "text_review", label: "Review Text", icon: CheckCircle },
  { id: "visual_setup", label: "Visual Setup", icon: ImageIcon },
  { id: "ai_generation", label: "AI Generation", icon: Wand2 },
  { id: "editor", label: "Editor", icon: Video },
  { id: "publish", label: "Publish", icon: CheckCircle }
];

const contentFormats = [
  {
    id: "single_image",
    name: "Single Image Post",
    icon: "📸",
    platforms: ["instagram", "facebook", "linkedin", "pinterest", "threads"],
    needsTemplate: true,
    needsVisuals: "image",
    defaultFormat: "instagram_portrait", // Added defaultFormat
    options: [
      { id: "aspect_ratio", label: "Aspect Ratio", type: "select", values: ["portrait", "square", "landscape"], default: "portrait" } // Changed values and added default
    ]
  },
  {
    id: "carousel",
    name: "Carousel",
    icon: "📱",
    platforms: ["instagram", "linkedin"],
    needsTemplate: true,
    needsVisuals: "multiple_images",
    minSlides: 2,
    maxSlides: 10,
    defaultFormat: "instagram_square", // Default format for carousel slides
    options: [
      { id: "slide_count", label: "Number of Slides", type: "number", min: 2, max: 10, default: 5 }
    ]
  },
  {
    id: "reel",
    name: "Instagram Reel",
    icon: "🎬",
    platforms: ["instagram"],
    needsTemplate: true,
    needsVisuals: "video",
    defaultFormat: "instagram_story",
    options: [
      { id: "duration", label: "Duration", type: "select", values: ["15s", "30s", "60s", "90s"] },
      { id: "has_captions", label: "Auto Captions", type: "checkbox" },
      { id: "has_music", label: "Background Music", type: "checkbox" }
    ]
  },
  {
    id: "tiktok",
    name: "TikTok Video",
    icon: "🎵",
    platforms: ["tiktok"],
    needsTemplate: true,
    needsVisuals: "video",
    defaultFormat: "tiktok_vertical",
    options: [
      { id: "duration", label: "Duration", type: "select", values: ["15s", "30s", "60s", "3min"] },
      { id: "has_captions", label: "Auto Captions", type: "checkbox" },
      { id: "trending_sound", label: "Use Trending Sound", type: "checkbox" }
    ]
  },
  {
    id: "youtube_short",
    name: "YouTube Short",
    icon: "🎥",
    platforms: ["youtube"],
    needsTemplate: true,
    needsVisuals: "video",
    defaultFormat: "instagram_story", // Vertical video format
    options: [
      { id: "duration", label: "Duration", type: "select", values: ["15s", "30s", "60s"] },
      { id: "has_captions", label: "Auto Captions", type: "checkbox" }
    ]
  },
  {
    id: "youtube_video",
    name: "YouTube Video",
    icon: "📺",
    platforms: ["youtube"],
    needsTemplate: false,
    needsVisuals: "video",
    defaultFormat: "youtube_video",
    options: [
      { id: "duration", label: "Duration", type: "select", values: ["5min", "10min", "15min", "20min+"] },
      { id: "needs_thumbnail", label: "Custom Thumbnail", type: "checkbox" }
    ]
  },
  {
    id: "story",
    name: "Instagram Story",
    icon: "📲",
    platforms: ["instagram", "facebook"],
    needsTemplate: true,
    needsVisuals: "image",
    defaultFormat: "instagram_story",
    options: [
      { id: "has_poll", label: "Add Poll", type: "checkbox" },
      { id: "has_question", label: "Add Question Sticker", type: "checkbox" },
      { id: "has_link", label: "Add Link", type: "checkbox" }
    ]
  },
  {
    id: "single_status",
    name: "Text Post",
    icon: "💬",
    platforms: ["linkedin", "facebook", "threads", "bluesky", "twitter"],
    needsTemplate: false,
    needsVisuals: false,
    options: [
      { id: "max_length", label: "Max Length", type: "select", values: ["short", "medium", "long"] }
    ]
  },
  {
    id: "thread",
    name: "Thread",
    icon: "🧵",
    platforms: ["twitter", "threads"],
    needsTemplate: false,
    needsVisuals: false,
    options: [
      { id: "tweet_count", label: "Number of Tweets", type: "number", min: 2, max: 15, default: 5 }
    ]
  },
  {
    id: "blog_post",
    name: "Blog Post",
    icon: "📝",
    platforms: ["wordpress", "medium", "substack"],
    needsTemplate: false,
    needsVisuals: "image",
    defaultFormat: "custom_blog_post", // Example custom format
    options: [
      { id: "word_count", label: "Word Count", type: "select", values: ["500", "1000", "1500", "2000+"] },
      { id: "needs_featured_image", label: "Featured Image", type: "checkbox" }
    ]
  },
  {
    id: "pin",
    name: "Pinterest Pin",
    icon: "📌",
    platforms: ["pinterest"],
    needsTemplate: true,
    needsVisuals: "image",
    defaultFormat: "pinterest_pin",
    options: [
      { id: "aspect_ratio", label: "Aspect Ratio", type: "select", values: ["2:3", "1:2", "9:16"] }
    ]
  }
];

export default function ContentCreationWorkflow({
  initialIdea,
  onClose,
  onComplete,
  initialStep = "idea_development"
}) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(initialIdea?.workflow_step || initialStep);
  const [ideaData, setIdeaData] = useState(initialIdea);

  // Idea Development State - Initialize from saved data
  const [additionalContext, setAdditionalContext] = useState(initialIdea?.additional_context || "");
  const [instructions, setInstructions] = useState(initialIdea?.instructions || "");
  const [brainstormMessages, setBrainstormMessages] = useState(initialIdea?.brainstorm_history || []);
  const [brainstormInput, setBrainstormInput] = useState("");
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState(initialIdea?.selected_formats || []);
  const [formatTemplates, setFormatTemplates] = useState(initialIdea?.format_templates || {});
  const [formatOptions, setFormatOptions] = useState(initialIdea?.format_options || {});
  const [selectedBrandId, setSelectedBrandId] = useState(initialIdea?.brand_id || null);

  // Text Generation State - Initialize from saved data
  const [generatedText, setGeneratedText] = useState(initialIdea?.generated_text || {});
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState(null);
  const [regenerationFeedback, setRegenerationFeedback] = useState("");

  // Visual Setup State - Initialize from saved data
  const [visualSetup, setVisualSetup] = useState(initialIdea?.visual_setup || {});
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [currentFormatForMedia, setCurrentFormatForMedia] = useState(null);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(null);

  // AI Generation State - Initialize from saved data
  const [generatedVisuals, setGeneratedVisuals] = useState(initialIdea?.generated_visuals || {});
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);

  // Editor State - Initialize from saved data
  const [editorScenes, setEditorScenes] = useState(initialIdea?.editor_scenes || {});
  const [editorState, setEditorState] = useState({
    open: false,
    formatKey: null,
    initialScene: null, // The scene to load (saved scene or prepared template)
    contentValues: {}, // Added for passing to CESDKEditor
    uploadedMedia: [], // Added for passing to CESDKEditor
    format: 'instagram_square', // Default editor canvas format
    templatePlaceholders: [], // New state property
  });


  // Publish State
  const [selectedPlatforms, setSelectedPlatforms] = useState({});

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => prism.entities.Template.list(),
    initialData: [],
  });

  // Fetch social connections
  const { data: connections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: () => prism.entities.SocialMediaConnection.filter({ is_active: true }),
    initialData: [],
  });

  // Fetch brands
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const result = await prism.entities.Brand.list();
      return Array.isArray(result) ? result : [];
    },
    initialData: [],
    refetchOnMount: 'always',
    staleTime: 0,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch media items for Media Library
  const { data: mediaLibrary = [], refetch: refetchMedia } = useQuery({
    queryKey: ['uploads'],
    queryFn: () => prism.entities.Upload.list('-created_date'),
    initialData: [],
  });


  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: (data) => {
      console.log('Auto-saving content:', data);
      return prism.entities.Content.update(ideaData.id, data);
    },
    onSuccess: (updated) => {
      console.log('Auto-save successful');
      setIdeaData(updated);
      // Invalidate all content-related queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      queryClient.invalidateQueries({ queryKey: ['recentIdeas'] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['generatedContent'] });
    },
    onError: (error) => {
      console.error('Auto-save failed:', error);
    }
  });

  // Auto-save whenever important state changes
  React.useEffect(() => {
    if (!ideaData?.id) {
      console.log('Skipping auto-save: no idea ID');
      return;
    }

    console.log('Triggering auto-save for step:', currentStep);

    const saveData = {
      additional_context: additionalContext,
      instructions: instructions,
      brainstorm_history: brainstormMessages,
      selected_formats: selectedFormats,
      format_templates: formatTemplates,
      format_options: formatOptions,
      generated_text: generatedText,
      visual_setup: visualSetup,
      generated_visuals: generatedVisuals,
      editor_scenes: editorScenes,
      workflow_step: currentStep,
      brand_id: selectedBrandId,
      status: currentStep === 'publish' ? 'completed_draft' :
              currentStep === 'editor' ? 'visuals_generated' :
              currentStep === 'text_review' ? 'generated' : // Use 'generated' so it shows in Generated tab
              'draft'
    };

    // Debounce auto-save by 1 second
    const timeoutId = setTimeout(() => {
      autoSaveMutation.mutate(saveData);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [
    ideaData?.id, // Added ideaData.id to trigger save when content is first created and id is assigned
    currentStep,
    additionalContext,
    instructions,
    brainstormMessages,
    selectedFormats,
    formatTemplates,
    formatOptions,
    generatedText,
    visualSetup,
    generatedVisuals,
    editorScenes,
    selectedBrandId
  ]);

  const handleRemoveFormat = (formatIdToRemove) => {
    setSelectedFormats(prev => prev.filter(f => f !== formatIdToRemove));
    setFormatTemplates(prev => {
      const newState = { ...prev };
      delete newState[formatIdToRemove];
      return newState;
    });
    setFormatOptions(prev => {
      const newState = { ...prev };
      delete newState[formatIdToRemove];
      return newState;
    });
    setGeneratedText(prev => {
      const newState = { ...prev };
      delete newState[formatIdToRemove];
      return newState;
    });
    setVisualSetup(prev => {
      const newState = { ...prev };
      delete newState[formatIdToRemove];
      return newState;
    });
    setGeneratedVisuals(prev => {
      const newState = { ...prev };
      delete newState[formatIdToRemove];
      return newState;
    });
    setEditorScenes(prev => {
      const newState = { ...prev };
      delete newState[formatIdToRemove];
      return newState;
    });
    toast.info(`${contentFormats.find(f => f.id === formatIdToRemove)?.name} removed.`);
  };

  const handleBrainstorm = async () => {
    if (!brainstormInput.trim()) return;

    const userMessage = { role: "user", content: brainstormInput };
    setBrainstormMessages(prev => [...prev, userMessage]);
    setBrainstormInput("");
    setIsBrainstorming(true);

    try {
      const brandName = selectedBrandId ? brands.find(b => b.id === selectedBrandId)?.name : 'N/A';
      const context = `
Original Idea: ${ideaData.ai_generated_title}
Research: ${ideaData.research_data || 'N/A'}
Additional Context: ${additionalContext || 'N/A'}
Instructions: ${instructions || 'N/A'}
Brand: ${brandName}

Conversation History:
${brainstormMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

User: ${brainstormInput}
`;

      const response = await prism.integrations.Core.InvokeLLM({
        prompt: `You are a content strategist helping develop a viral content idea. Based on the context, provide helpful insights, suggestions, and ask clarifying questions to develop this idea further.\n\n${context}`,
        add_context_from_internet: false
      });

      const aiMessage = { role: "assistant", content: response };
      setBrainstormMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast.error("Brainstorm failed");
    }

    setIsBrainstorming(false);
  };

  const handleGenerateText = async () => {
    setIsGeneratingText(true);
    setCurrentStep("text_generation");

    try {
      const generated = {};
      const brandName = selectedBrandId ? brands.find(b => b.id === selectedBrandId)?.name : 'N/A';

      for (const formatId of selectedFormats) {
        const format = contentFormats.find(f => f.id === formatId);
        const templateId = formatTemplates[formatId];
        const template = templateId ? templates.find(t => t.id === templateId) : null;
        const options = formatOptions[formatId] || {};

        let prompt = `Create ${format.name} content for: ${ideaData.ai_generated_title}

Research: ${ideaData.research_data}
Additional Context: ${additionalContext}
Instructions: ${instructions}
Platforms: ${format.platforms.join(', ')}
Options: ${JSON.stringify(options)}
Brand: ${brandName}

CRITICAL HASHTAG RULES:
- Hashtags must ONLY appear at the very end of the caption
- NO text should come after hashtags
- Return hashtags as plain words WITHOUT the # symbol (e.g., "contentcreation" not "#contentcreation")
- Provide 5-10 relevant hashtags
`;

        if (formatId === 'carousel') {
          const slideCount = options.slide_count || 5;

          if (template && template.placeholders && template.placeholders.length > 0) {
            prompt += `\nCreate exactly ${slideCount} carousel slides. For each slide, generate ONLY the following fields: ${template.placeholders.filter(p => p.type === 'text').map(p => p.label).join(', ')}.

IMPORTANT: If there's a field called "placeholder" or similar, treat it as the IMAGE TITLE TEXT that will appear ON the visual itself - make it punchy and attention-grabbing (up to 25 words).

Also provide a main caption for the post that tells a compelling story with emotional depth, including key insights, lessons, or takeaways. Make it 3-5 sentences that provide real value. End with 5-10 relevant hashtags (return hashtags WITHOUT # prefix).`;

            const schema = {
              type: "object",
              properties: {
                caption: { type: "string", description: "Main post caption - compelling story (3-5 sentences) with hashtags ONLY at the end" },
                hashtags: { type: "array", items: { type: "string" }, description: "5-10 hashtags WITHOUT # prefix (e.g., 'contentcreation' not '#contentcreation')" },
                slides: {
                  type: "array",
                  minItems: slideCount,
                  maxItems: slideCount,
                  items: {
                    type: "object",
                    properties: {},
                    required: []
                  }
                }
              },
              required: ["caption", "hashtags", "slides"]
            };

            template.placeholders.filter(p => p.type === 'text').forEach(p => {
              const isImageTitle = p.label.toLowerCase().includes('placeholder') ||
                                   p.label.toLowerCase().includes('title') ||
                                   p.id.toLowerCase().includes('placeholder');

              schema.properties.slides.items.properties[p.id] = {
                type: "string",
                description: isImageTitle
                  ? `${p.label} - Image title text (up to 25 words, punchy and attention-grabbing)`
                  : p.label
              };
              if (p.required) {
                schema.properties.slides.items.required.push(p.id);
              }
            });

            const response = await prism.integrations.Core.InvokeLLM({
              prompt,
              response_json_schema: schema
            });

            if (!response || (response.error && !response.caption && !response.slides)) {
              console.error('Invalid LLM response for carousel:', response);
              throw new Error(`Failed to generate carousel content: ${response?.error || 'Invalid response'}`);
            }

            generated[formatId] = response;
          } else {
            // No template - default
            prompt += `\nCreate exactly ${slideCount} carousel slides. Each slide must have a title (short, 2-5 words) and content. Also provide a main caption that tells a compelling story (3-5 sentences) ending with 5-10 relevant hashtags (WITHOUT # prefix).`;

            const response = await prism.integrations.Core.InvokeLLM({
              prompt,
              response_json_schema: {
                type: "object",
                properties: {
                  caption: { type: "string", description: "Compelling story-focused caption (3-5 sentences) with hashtags ONLY at the end" },
                  hashtags: { type: "array", items: { type: "string" }, description: "5-10 hashtags WITHOUT # prefix" },
                  slides: {
                    type: "array",
                    minItems: slideCount,
                    maxItems: slideCount,
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short slide title (2-5 words)" },
                        content: { type: "string" }
                      },
                      required: ["title", "content"]
                    }
                  }
                },
                required: ["caption", "hashtags", "slides"]
              }
            });

            generated[formatId] = response;
          }
        } else if (formatId === 'thread') {
          const tweetCount = options.tweet_count || 5;
          prompt += `\nCreate exactly ${tweetCount} tweets for a thread. Each tweet should be engaging and within 280 characters. Also provide 5-10 relevant hashtags (WITHOUT # prefix).`;

          const response = await prism.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
              type: "object",
              properties: {
                tweets: {
                  type: "array",
                  minItems: tweetCount,
                  maxItems: tweetCount,
                  items: { type: "string" }
                },
                hashtags: { type: "array", items: { type: "string" }, description: "Hashtags WITHOUT # prefix" }
              },
              required: ["tweets", "hashtags"]
            }
          });

            if (!response || (response.error && !response.tweets)) {
              console.error('Invalid LLM response for thread:', response);
              throw new Error(`Failed to generate thread content: ${response?.error || 'Invalid response'}`);
            }

          generated[formatId] = response;
        } else if (template && template.placeholders && template.placeholders.length > 0) {
          // Single content with template
          prompt += `\nGenerate content for ONLY these fields: ${template.placeholders.filter(p => p.type === 'text').map(p => p.label).join(', ')}.

IMPORTANT: If there's a field called "placeholder" or similar, treat it as the IMAGE TITLE TEXT that will appear ON the visual - make it punchy and attention-grabbing (up to 25 words).

Also provide a caption for the post that tells a compelling story with emotional depth, key insights, or lessons. Make it 3-5 sentences that provide real value. End with 5-10 relevant hashtags (WITHOUT # prefix).`;

          const schema = {
            type: "object",
            properties: {
              caption: { type: "string", description: "Compelling story-focused caption with depth (3-5 sentences) with hashtags ONLY at the end" },
              hashtags: { type: "array", items: { type: "string" }, description: "5-10 hashtags WITHOUT # prefix" }
            },
            required: ["caption", "hashtags"]
          };

          template.placeholders.filter(p => p.type === 'text').forEach(p => {
            const isImageTitle = p.label.toLowerCase().includes('placeholder') ||
                                 p.label.toLowerCase().includes('title') ||
                                 p.id.toLowerCase().includes('placeholder');

            schema.properties[p.id] = {
              type: "string",
              description: isImageTitle
                ? `${p.label} - Image title text (up to 25 words, punchy and attention-grabbing)`
                : p.label
            };
            if (p.required) {
              schema.required.push(p.id);
            }
          });

          const response = await prism.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: schema
          });

          generated[formatId] = response;
        } else {
          // No template - generate default caption/content
          const needsCaption = format.needsVisuals || ['single_image', 'reel', 'tiktok', 'youtube_short', 'story'].includes(formatId);

          if (needsCaption) {
            const response = await prism.integrations.Core.InvokeLLM({
              prompt: prompt + `\nProvide a caption for the post ending with 5-10 relevant hashtags (WITHOUT # prefix).`,
              response_json_schema: {
                type: "object",
                properties: {
                  caption: { type: "string" },
                  hashtags: { type: "array", items: { type: "string" }, description: "Hashtags WITHOUT # prefix" }
                },
                required: ["caption", "hashtags"]
              }
            });

            if (!response || (response.error && !response.caption)) {
              console.error('Invalid LLM response for caption:', response);
              throw new Error(`Failed to generate caption: ${response?.error || 'Invalid response'}`);
            }

            generated[formatId] = response;
          } else {
            const response = await prism.integrations.Core.InvokeLLM({
              prompt: prompt + `\nGenerate the content for this post ending with 5-10 relevant hashtags (WITHOUT # prefix).`,
              response_json_schema: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  hashtags: { type: "array", items: { type: "string" }, description: "Hashtags WITHOUT # prefix" }
                },
                required: ["content", "hashtags"]
              }
            });

            if (!response || (response.error && !response.content)) {
              console.error('Invalid LLM response for content:', response);
              throw new Error(`Failed to generate content: ${response?.error || 'Invalid response'}`);
            }

            generated[formatId] = response;
          }
        }
      }

      setGeneratedText(generated);
      
      // Explicitly save generated content to database immediately
      if (ideaData?.id) {
        try {
          const savedContent = await autoSaveMutation.mutateAsync({
            generated_text: generated,
            workflow_step: 'text_review',
            status: 'generated' // Use 'generated' status so it shows in Generated tab
          });
          console.log('Generated content saved to database:', savedContent);
          
          // Force refresh content queries to update UI counters
          queryClient.invalidateQueries({ queryKey: ['contents'] });
          queryClient.invalidateQueries({ queryKey: ['recentIdeas'] });
        } catch (saveError) {
          console.error('Failed to save generated content:', saveError);
          toast.error('Content generated but failed to save. Please try again.');
        }
      }
      
      setCurrentStep("text_review");
      toast.success("Content generated!");
    } catch (error) {
      console.error(error);
      toast.error("Text generation failed: " + error.message);
    }

    setIsGeneratingText(false);
  };

  const handleRegenerateSection = async (formatId, sectionType = null, sectionIndex = null) => {
    const key = sectionType && sectionIndex !== null ? `${formatId}_${sectionType}_${sectionIndex}` : (sectionType ? `${formatId}_${sectionType}_` : formatId);
    setRegeneratingSection(key);

    try {
      const format = contentFormats.find(f => f.id === formatId);
      const currentContent = generatedText[formatId];
      const templateId = formatTemplates[formatId];
      const template = templateId ? templates.find(t => t.id === templateId) : null;
      const brandName = selectedBrandId ? brands.find(b => b.id === selectedBrandId)?.name : 'N/A';

      let prompt = `Regenerate the content for ${format.name}: ${ideaData.ai_generated_title}
User feedback: ${regenerationFeedback}

Original Idea: ${ideaData.ai_generated_title}
Research: ${ideaData.research_data}
Additional Context: ${additionalContext}
Instructions: ${instructions}
Brand: ${brandName}

CRITICAL HASHTAG RULES:
- Hashtags must ONLY appear at the very end of the caption
- NO text should come after hashtags
- Return hashtags as plain words WITHOUT the # symbol (e.g., "contentcreation" not "#contentcreation")
`;

      if (sectionType === 'slide' && sectionIndex !== null) {
        prompt += `\nRegenerate only slide ${sectionIndex + 1}. Current slide content: ${JSON.stringify(currentContent.slides?.[sectionIndex] || {})}. Maintain the existing fields.`;

        let slideProperties = {
          title: { type: "string" },
          content: { type: "string" }
        };
        let slideRequired = ["title", "content"];

        if (template && template.placeholders) {
          slideProperties = {};
          slideRequired = [];
          template.placeholders.forEach(p => {
            if (p.type === 'text') {
              slideProperties[p.id] = { type: "string", description: p.label };
              if (p.required) slideRequired.push(p.id);
            }
          });
        }

        const response = await prism.integrations.Core.InvokeLLM({
          prompt: prompt,
          response_json_schema: {
            type: "object",
            properties: slideProperties,
            required: slideRequired
          }
        });

        const newSlides = [...currentContent.slides];
        newSlides[sectionIndex] = response;
        setGeneratedText(prev => ({
          ...prev,
          [formatId]: { ...prev[formatId], slides: newSlides }
        }));
      } else if (sectionType === 'tweet' && sectionIndex !== null) {
        prompt += `\nRegenerate only tweet ${sectionIndex + 1}. Current tweet content: "${currentContent.tweets?.[sectionIndex] || ''}". Keep it under 280 characters.`;

        const response = await prism.integrations.Core.InvokeLLM({
          prompt: prompt,
          response_json_schema: {
            type: "object",
            properties: {
              tweet: { type: "string" }
            },
            required: ["tweet"]
          }
        });

        const newTweets = [...currentContent.tweets];
        newTweets[sectionIndex] = response.tweet;
        setGeneratedText(prev => ({
          ...prev,
          [formatId]: { ...prev[formatId], tweets: newTweets }
        }));
      } else if (sectionType === 'caption') {
        prompt += `\nRegenerate only the caption. Current caption: "${currentContent.caption || ''}". Also provide 5-10 relevant hashtags (WITHOUT # prefix).`;

        const response = await prism.integrations.Core.InvokeLLM({
          prompt: prompt,
          response_json_schema: {
            type: "object",
            properties: {
              caption: { type: "string", description: "Caption with hashtags ONLY at the end" },
              hashtags: { type: "array", items: { type: "string" }, description: "Hashtags WITHOUT # prefix" }
            },
            required: ["caption", "hashtags"]
          }
        });

        setGeneratedText(prev => ({
          ...prev,
          [formatId]: { ...prev[formatId], caption: response.caption, hashtags: response.hashtags }
        }));
      } else if (sectionType && currentContent[sectionType] !== undefined) { // Regenerating a specific template field
        prompt += `\nRegenerate only the field "${sectionType.replace(/_/g, ' ')}". Current content for this field: "${currentContent[sectionType]}".`;

        const response = await prism.integrations.Core.InvokeLLM({
          prompt: prompt,
          response_json_schema: {
            type: "object",
            properties: {
              [sectionType]: { type: "string" }
            },
            required: [sectionType]
          }
        });
        setGeneratedText(prev => ({
          ...prev,
          [formatId]: { ...prev[formatId], [sectionType]: response[sectionType] }
        }));
      } else { // Regenerate all
        prompt += `\nRegenerate the entire content, maintaining the existing structure. Current content: ${JSON.stringify(currentContent)}`;

        // Build schema based on current content's top-level structure
        const schema = {
          type: "object",
          properties: {},
          required: []
        };

        for (const prop in currentContent) {
            schema.properties[prop] = {
                type: typeof currentContent[prop] === 'string' ? 'string' : (Array.isArray(currentContent[prop]) ? 'array' : typeof currentContent[prop]), // Basic type inference
                items: Array.isArray(currentContent[prop]) ? { type: "string" } : undefined // For arrays of strings
            };
            if (prop === 'hashtags') {
              schema.properties[prop].description = "Hashtags WITHOUT # prefix";
            }
            schema.required.push(prop);
        }

        const response = await prism.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: schema
        });

        setGeneratedText(prev => ({
          ...prev,
          [formatId]: response
        }));
      }

      setRegenerationFeedback("");
      toast.success("Content regenerated!");
    } catch (error) {
      console.error(error);
      toast.error("Regeneration failed");
    }

    setRegeneratingSection(null);
  };

  const handleVisualSetup = () => {
    setCurrentStep("visual_setup");
  };

  // Handler to open Media Library (adapted from code_outline)
  const handleOpenMediaLibrary = (formatId, placeholderId = null) => {
    setCurrentFormatForMedia(formatId);
    setCurrentPlaceholder(placeholderId);
    setShowMediaLibrary(true);
  };

  // Handler for file uploads - save to media library and map to placeholders
  const handleFileUpload = async (formatId, files) => {
    const urls = [];
    try {
      for (const file of files) {
        const { file_url } = await prism.integrations.Core.UploadFile({ file });
        urls.push(file_url);

        // Save to Upload entity
        await prism.entities.Upload.create({
          file_name: file.name,
          file_url: file_url,
          file_type: file.type,
          file_size: file.size
        });
      }

      // Get template to map to placeholders
      const templateId = formatTemplates[formatId];
      const template = templateId ? templates.find(t => t.id === templateId) : null;

      let placeholderMapping = {};
      if (template && template.placeholders) {
        const imagePlaceholders = template.placeholders.filter(p => p.type === 'image');
        imagePlaceholders.forEach((placeholder, index) => {
          // If a general upload is happening, try to fill the next available image placeholder
          if (urls[index] && !visualSetup[formatId]?.placeholderMapping?.[placeholder.id]) {
            placeholderMapping[placeholder.id] = urls[index];
          }
        });
      }

      setVisualSetup(prev => ({
        ...prev,
        [formatId]: {
          ...prev[formatId],
          uploadedUrls: [...(prev[formatId]?.uploadedUrls || []), ...urls],
          placeholderMapping: { ...(prev[formatId]?.placeholderMapping || {}), ...placeholderMapping }
        }
      }));

      await refetchMedia(); // Refetch media items to include new uploads
      toast.success(`${files.length} file(s) uploaded and added to media library!`);
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("Failed to upload files");
    }
  };

  const handleGenerateVisuals = async () => {
    setIsGeneratingVisuals(true);
    setCurrentStep("ai_generation");

    try {
      const visuals = {};
      const brandName = selectedBrandId ? brands.find(b => b.id === selectedBrandId)?.name : 'N/A';

      for (const formatId of selectedFormats) {
        const setup = visualSetup[formatId];
        if (!setup || setup.method !== 'ai_generate') continue;

        const format = contentFormats.find(f => f.id === formatId);
        const content = generatedText[formatId];
        const templateId = formatTemplates[formatId];
        const template = templateId ? templates.find(t => t.id === templateId) : null;

        if (format.needsVisuals === 'image' || format.needsVisuals === 'multiple_images') {
          const count = formatId === 'carousel' ? (content.slides?.length || 5) : 1;
          const urls = [];
          const newPlaceholderMapping = {};

          for (let i = 0; i < count; i++) {
            let imagePrompt = `Create a visually striking image for: ${ideaData.ai_generated_title}`;

            if (formatId === 'carousel' && content.slides?.[i]) {
              // Join all slide properties for context
              const slideText = Object.entries(content.slides[i])
                                      .map(([key, value]) => `${key}: ${value}`)
                                      .join('\n');
              imagePrompt += `\n\nSlide ${i + 1} content:\n${slideText}`;
            } else if (content.caption) {
              imagePrompt += `\n\nMain content idea: ${content.caption}`;
            } else if (content.content) { // For text-only posts which might have generated content field
              imagePrompt += `\n\nMain content idea: ${content.content}`;
            }

            imagePrompt += `\n\nStyle: Professional, eye-catching, ${setup.style || 'modern'}`;
            imagePrompt += `\nBrand: ${brandName}`;

            const result = await prism.integrations.Core.GenerateImage({
              prompt: imagePrompt
            });

            urls.push(result.url);

            // If a template is used, map the generated images to the image placeholders
            if (template && template.placeholders && template.placeholders.length > 0) {
              const imagePlaceholders = template.placeholders.filter(p => p.type === 'image');
              if (imagePlaceholders[i]) {
                newPlaceholderMapping[imagePlaceholders[i].id] = result.url;
              }
            }
          }

          visuals[formatId] = urls;
          setVisualSetup(prev => ({
            ...prev,
            [formatId]: {
              ...prev[formatId],
              placeholderMapping: { ...(prev[formatId]?.placeholderMapping || {}), ...newPlaceholderMapping }
            }
          }));

        } else if (format.needsVisuals === 'video') {
          // For now, placeholder - video generation would need different service
          visuals[formatId] = ['https://example.com/placeholder_video.mp4']; // Changed to a valid example URL
          toast.info("Video generation placeholder - implement with video AI service");
        }
      }

      setGeneratedVisuals(visuals);
      setCurrentStep("editor");
      toast.success("Visuals generated!");
    } catch (error) {
      console.error(error);
      toast.error("Visual generation failed");
    }

    setIsGeneratingVisuals(false);
  };

  const handleOpenEditor = async (formatId) => {
    console.log('=== OPENING EDITOR ===');
    console.log('Format ID:', formatId);

    const selectedFormatDef = contentFormats.find(f => f.id === formatId);
    if (!selectedFormatDef) {
      toast.error('Content format definition not found.');
      return;
    }

    const templateId = formatTemplates[formatId];
    const template = templateId ? templates.find(t => t.id === templateId) : null;
    const content = generatedText[formatId] || {};
    const visualSetupForFormat = visualSetup[formatId] || {};
    const optionsForFormat = formatOptions[formatId] || {};

    console.log('Visual setup for this format:', visualSetupForFormat);
    console.log('Placeholder mapping:', visualSetupForFormat.placeholderMapping);
    console.log('Uploaded URLs:', visualSetupForFormat.uploadedUrls);

    // Determine which scene to load: saved scene or template scene
    let sceneToLoad = null;
    if (editorScenes[formatId]?.scene) {
      // Use saved scene if it exists
      sceneToLoad = editorScenes[formatId].scene;
      console.log('Using saved scene');
    } else if (template?.cesdk_scene) {
      // Otherwise use template scene
      sceneToLoad = template.cesdk_scene;
      console.log('Using template scene');
    } else {
      console.log('No scene to load - will create blank');
    }

    // Build content values for CE.SDK variables
    const contentValuesForTemplate = {};
    if (template?.placeholders) {
      template.placeholders.forEach(placeholder => {
        if (placeholder.type === 'text') {
          if (formatId === 'carousel' && content.slides) {
            const slideValues = content.slides.map(slide => slide[placeholder.id]).filter(Boolean);
            if (slideValues.length > 0) {
              contentValuesForTemplate[placeholder.id] = slideValues;
            }
          } else if (content[placeholder.id] !== undefined) {
            contentValuesForTemplate[placeholder.id] = content[placeholder.id];
          }
        }
      });
    }

    console.log('Content values for template:', contentValuesForTemplate);

    // Build uploaded media list
    const uploadedMediaList = [];
    
    // Add from placeholder mapping
    if (visualSetupForFormat.placeholderMapping) {
      const mappedUrls = Object.values(visualSetupForFormat.placeholderMapping);
      console.log('Adding from placeholder mapping:', mappedUrls);
      uploadedMediaList.push(...mappedUrls);
    }
    
    // Add from uploaded URLs
    if (visualSetupForFormat.uploadedUrls) {
      console.log('Adding from uploaded URLs:', visualSetupForFormat.uploadedUrls);
      uploadedMediaList.push(...visualSetupForFormat.uploadedUrls);
    }
    
    // Add from generated visuals
    if (generatedVisuals[formatId]) {
      console.log('Adding from generated visuals:', generatedVisuals[formatId]);
      uploadedMediaList.push(...generatedVisuals[formatId]);
    }

    console.log('Final uploaded media list:', uploadedMediaList);
    console.log('Total images to pass to editor:', uploadedMediaList.length);

    // Determine the CE.SDK format
    let editorCanvasFormat = selectedFormatDef.defaultFormat || 'instagram_portrait';
    if (formatId === 'single_image' && optionsForFormat?.aspect_ratio) {
      if (optionsForFormat.aspect_ratio === 'square') {
        editorCanvasFormat = 'instagram_square';
      } else if (optionsForFormat.aspect_ratio === 'landscape') {
        editorCanvasFormat = 'youtube_thumbnail';
      }
    } else if (formatId === 'story' || formatId === 'reel' || formatId === 'youtube_short') {
      editorCanvasFormat = 'instagram_story';
    } else if (formatId === 'tiktok') {
      editorCanvasFormat = 'tiktok_vertical';
    } else if (formatId === 'carousel') {
      editorCanvasFormat = 'instagram_square';
    } else if (formatId === 'pin' && optionsForFormat?.aspect_ratio) {
      if (optionsForFormat.aspect_ratio === '2:3') editorCanvasFormat = 'pinterest_pin';
      else if (optionsForFormat.aspect_ratio === '1:2') editorCanvasFormat = 'pinterest_tall';
      else if (optionsForFormat.aspect_ratio === '9:16') editorCanvasFormat = 'pinterest_story';
    } else if (formatId === 'youtube_video') {
      editorCanvasFormat = 'youtube_video';
    } else if (formatId === 'blog_post') {
      editorCanvasFormat = 'custom_blog_post';
    }

    console.log('Opening editor with:', {
      hasScene: !!sceneToLoad,
      hasTemplate: !!template,
      format: editorCanvasFormat,
      contentValues: contentValuesForTemplate,
      uploadedMedia: uploadedMediaList.length,
      templatePlaceholders: template?.placeholders?.length || 0
    });

    setEditorState({
      open: true,
      formatKey: formatId,
      template: null, // Don't pass template separately anymore
      initialScene: sceneToLoad, // Pass the scene (saved or template) as initialScene
      contentValues: contentValuesForTemplate,
      uploadedMedia: [...new Set(uploadedMediaList)].filter(Boolean),
      format: editorCanvasFormat,
      templatePlaceholders: template?.placeholders || [],
    });
  };

  const handleEditorSave = (formatId, designData) => { // Changed from 'scene' to 'designData'
    console.log('Saving editor design for format:', formatId, designData);
    setEditorScenes(prev => ({
      ...prev,
      [formatId]: designData // Store the full designData object
    }));
    setEditorState({ open: false, formatKey: null, initialScene: null, contentValues: {}, uploadedMedia: [], format: 'instagram_square', templatePlaceholders: [] }); // Close and reset editor state
    toast.success("Design saved!");
  };

  const handleContinueToPublish = () => {
    setCurrentStep("publish");
  };

  // Publish handler - implement actual posting
  const handlePublish = async (action) => {
    if (action === 'post_now') {
      try {
        toast.info("Posting content...");

        for (const formatId of selectedFormats) {
          const content = generatedText[formatId];
          const sceneData = editorScenes[formatId]; // sceneData is now designData object {scene, previewUrl}
          const format = contentFormats.find(f => f.id === formatId);

          let mediaUrlsToPost = [];

          // If there's an editor scene with a preview URL, prioritize it
          if (sceneData?.scene && sceneData?.previewUrl) {
            mediaUrlsToPost.push(sceneData.previewUrl); // Use the already rendered preview
          } else if (sceneData?.scene) { // If there's a scene but no previewUrl, render it
            try {
              const { data: renderResult } = await prism.functions.invoke('cesdkRenderDesign', {
                scene: sceneData.scene,
                exportFormat: 'png' // Assuming image for simplicity, can be dynamic
              });
              if (renderResult.imageUrl) {
                mediaUrlsToPost.push(renderResult.imageUrl);
              }
            } catch (renderError) {
              console.error('Render error:', renderError);
              toast.error(`Failed to render design for ${format.name}`);
              continue; // Skip this format if rendering fails
            }
          } else {
            // If no scene, use directly uploaded/generated visuals
            const visualSetupForFormat = visualSetup[formatId];
            if (visualSetupForFormat?.placeholderMapping) {
              mediaUrlsToPost = mediaUrlsToPost.concat(Object.values(visualSetupForFormat.placeholderMapping));
            }
            if (visualSetupForFormat?.uploadedUrls) {
              mediaUrlsToPost = mediaUrlsToPost.concat(visualSetupForFormat.uploadedUrls);
            }
            if (generatedVisuals[formatId]) {
              mediaUrlsToPost = mediaUrlsToPost.concat(generatedVisuals[formatId]);
            }
          }

          // Post to each selected platform
          for (const platform of format.platforms) { // Iterate through all possible platforms for this format
            const platformKey = `${formatId}_${platform}`;
            // If the platform is not explicitly selected (or is explicitly deselected), skip
            if (selectedPlatforms[platformKey] === false) continue;
            // If it's not in selectedPlatforms at all, assume it's selected by default for now.
            // This behavior might need refinement based on exact UI state.

            const connection = connections.find(c => c.platform === platform && c.is_active);
            if (!connection) {
              // toast.error(`No active connection for ${platform}`); // Already shown in UI
              continue;
            }

            try {
              const { data: postResult } = await prism.functions.invoke('socialMediaPost', {
                connection_id: connection.id,
                content_type: formatId,
                media_urls: mediaUrlsToPost.length > 0 ? mediaUrlsToPost : null, // Pass null if no media
                caption: content.caption || content.content || '',
                hashtags: content.hashtags?.map(h => `#${h}`).join(' ') || ''
              });

              if (postResult.success) {
                toast.success(`Posted to ${platform}!`);
              } else {
                toast.error(`Failed to post to ${platform}: ${postResult.error || 'Unknown error'}`);
              }
            } catch (postError) {
              console.error(`Post error for ${platform}:`, postError);
              toast.error(`Failed to post to ${platform}: ${postError.message}`);
            }
          }
        }

        // Update content status
        await prism.entities.Content.update(ideaData.id, {
          status: 'posted'
        });

        toast.success("Content published successfully!");
        if (onComplete) onComplete();
        if (onClose) onClose();

      } catch (error) {
        console.error('Publish error:', error);
        toast.error("Failed to publish content overall");
      }
    } else if (action === 'schedule') {
      toast.info("Schedule functionality coming soon!");
    } else if (action === 'save_draft') {
      await prism.entities.Content.update(ideaData.id, {
        status: 'completed_draft'
      });
      toast.success("Saved as draft!");
      if (onComplete) onComplete();
      if (onClose) onClose();
    } else if (action === 'download') {
      toast.info("Download functionality coming soon!");
    } else if (action === 'add_to_autolist') {
      await prism.entities.Content.update(ideaData.id, {
        in_autolist: true,
        status: 'completed_draft'
      });
      toast.success("Added to autolist!");
    }
  };


  const currentStepIndex = workflowSteps.findIndex(s => s.id === currentStep);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8" style={{
      background: 'rgba(61, 61, 43, 0.5)',
      backdropFilter: 'blur(8px)'
    }}>
      {/* Modal Container */}
      <div className="w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col" style={{
        background: 'linear-gradient(135deg, #FFD5C9 0%, #FFDCC1 20%, #FFE4D0 40%, #D8E4C9 60%, #C9DEE4 80%, #D8C9E4 100%)'
      }} role="dialog" aria-modal="true" aria-describedby="workflow-description">
        <span id="workflow-description" style={{ display: 'none' }}>
          Content creation workflow for {ideaData.ai_generated_title}
        </span>

        {/* Header */}
        <div className="border-b backdrop-blur-sm shadow-sm px-6 py-4 flex items-center justify-between" style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderColor: 'rgba(229, 165, 116, 0.3)'
        }}>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-red-50"
            >
              <X className="w-5 h-5" style={{ color: '#8B7355' }} />
            </Button>
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#3D3D2B' }}>
                {ideaData.ai_generated_title}
              </h2>
              <p className="text-sm" style={{ color: '#8B7355' }}>
                Step {currentStepIndex + 1} of {workflowSteps.length}
              </p>
            </div>
          </div>
          <Badge className="px-4 py-2" style={{
            background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
            color: 'white'
          }}>
            {autoSaveMutation.isPending ? 'Saving...' : 'Saved'}
          </Badge>
        </div>

        {/* Progress Steps - Circular */}
        <div className="border-b backdrop-blur-sm px-6 py-6" style={{
          background: 'rgba(255, 255, 255, 0.8)',
          borderColor: 'rgba(229, 165, 116, 0.3)'
        }}>
          <div className="flex items-center justify-center gap-2 max-w-5xl mx-auto">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = index < currentStepIndex;
              const isClickable = isCompleted || isActive;

              return (
                <div key={step.id} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      onClick={() => isClickable && setCurrentStep(step.id)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-50'
                      }`}
                      style={{
                        background: isActive
                          ? 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)'
                          : isCompleted
                          ? 'linear-gradient(135deg, #A4B58B 0%, #C4D4A8 100%)'
                          : 'white',
                        color: isActive || isCompleted ? 'white' : '#8B7355',
                        border: isActive || isCompleted ? 'none' : '2px solid rgba(136, 146, 93, 0.3)',
                        boxShadow: isActive ? '0 4px 12px rgba(136, 146, 93, 0.4)' : 'none'
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className="text-xs font-medium whitespace-nowrap max-w-[80px] text-center" style={{
                      color: isActive ? '#3D3D2B' : '#8B7355'
                    }}>
                      {step.label}
                    </span>
                  </div>
                  {index < workflowSteps.length - 1 && (
                    <ChevronRight className="w-5 h-5 opacity-30 mt-[-20px]" style={{ color: '#88925D' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Idea Development */}
          {currentStep === "idea_development" && (
            <div className="max-w-4xl mx-auto space-y-6">

              {/* Research Insights */}
              {ideaData.research_data && (
                <Card className="border-2 rounded-2xl" style={{
                  borderColor: 'rgba(229, 165, 116, 0.3)',
                  background: 'rgba(255, 255, 255, 0.9)'
                }}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <TrendingUp className="w-6 h-6 flex-shrink-0" style={{ color: '#E5A574' }} />
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-2" style={{ color: '#3D3D2B' }}>
                          Research & Insights
                        </h3>
                        {/* Source URL Link for original input */}
                        {ideaData.original_input?.includes('http') && (
                          <a 
                            href={ideaData.original_input.match(/https?:\/\/[^\s]+/)?.[0]} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3 text-sm font-medium hover:opacity-80 transition-opacity"
                            style={{
                              backgroundColor: 'rgba(136, 146, 93, 0.1)',
                              color: '#88925D'
                            }}
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Original Source
                          </a>
                        )}
                        <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: '#6B6B4D' }}>
                          {ideaData.research_data}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Original Idea Section */}
              <Card className="border-2 rounded-2xl" style={{
                borderColor: 'rgba(229, 165, 116, 0.3)',
                background: 'rgba(255, 255, 255, 0.9)'
              }}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-6 h-6 flex-shrink-0" style={{ color: '#E8B44D' }} />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-2" style={{ color: '#3D3D2B' }}>
                        Original Idea
                      </h3>
                      {/* Source URL Link for original input */}
                      {ideaData.original_input?.includes('http') && (
                        <a 
                          href={ideaData.original_input.match(/https?:\/\/[^\s]+/)?.[0]} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3 text-sm font-medium hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: 'rgba(136, 146, 93, 0.1)',
                            color: '#88925D'
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Source
                        </a>
                      )}
                      <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: '#6B6B4D' }}>
                        {ideaData.original_input}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Context */}
              <Card className="border-2 rounded-2xl" style={{
                borderColor: 'rgba(229, 165, 116, 0.3)',
                background: 'rgba(255, 255, 255, 0.9)'
              }}>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label className="text-base font-semibold mb-2" style={{ color: '#3D3D2B' }}>
                      Additional Context
                    </Label>
                    <Textarea
                      value={additionalContext}
                      onChange={(e) => setAdditionalContext(e.target.value)}
                      placeholder="Add any additional context, background, or details..."
                      className="min-h-24 rounded-xl"
                      style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
                    />
                  </div>

                  <div>
                    <Label className="text-base font-semibold mb-2" style={{ color: '#3D3D2B' }}>
                      Instructions
                    </Label>
                    <Textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Specific instructions for tone, style, requirements..."
                      className="min-h-24 rounded-xl"
                      style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
                    />
                  </div>

                  {/* Brand Selection */}
                  <div>
                      <Label className="text-base font-semibold mb-2" style={{ color: '#3D3D2B' }}>
                          Select Brand (Optional)
                      </Label>
                      <Select
                          value={selectedBrandId || ""}
                          onValueChange={setSelectedBrandId}
                      >
                          <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select a brand..." />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="null">No Brand</SelectItem>
                              {brands.map((brand) => (
                                  <SelectItem key={brand.id} value={brand.id}>
                                      {brand.name}
                                  </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                </CardContent>
              </Card>

              {/* AI Brainstorm */}
              <Card className="border-2 rounded-2xl" style={{
                borderColor: 'rgba(136, 146, 93, 0.3)',
                background: 'rgba(255, 255, 255, 0.9)'
              }}>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: '#3D3D2B' }}>
                    <MessageSquare className="w-5 h-5" style={{ color: '#88925D' }} />
                    Brainstorm with AI
                  </h3>

                  {brainstormMessages.length > 0 && (
                    <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                      {brainstormMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`p-3 rounded-xl max-w-[85%]`}
                            style={{
                              background: msg.role === 'user'
                                ? 'rgba(136, 146, 93, 0.15)'
                                : 'rgba(229, 165, 116, 0.15)',
                              border: `1px solid ${msg.role === 'user' ? 'rgba(136, 146, 93, 0.3)' : 'rgba(229, 165, 116, 0.3)'}`,
                              color: '#4A4A4A'
                            }}
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      value={brainstormInput}
                      onChange={(e) => setBrainstormInput(e.target.value)}
                      placeholder="Ask questions, get suggestions, discuss ideas..."
                      className="rounded-xl"
                      style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
                      onKeyPress={(e) => e.key === 'Enter' && !isBrainstorming && handleBrainstorm()}
                      disabled={isBrainstorming}
                    />
                    <Button
                      onClick={handleBrainstorm}
                      disabled={!brainstormInput.trim() || isBrainstorming}
                      className="rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                        color: 'white'
                      }}
                    >
                      {isBrainstorming ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Format Selection */}
              <Card className="border-2 rounded-2xl" style={{
                borderColor: 'rgba(229, 165, 116, 0.3)',
                background: 'rgba(255, 255, 255, 0.9)'
              }}>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4" style={{ color: '#3D3D2B' }}>
                    Select Content Formats
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    {contentFormats.map(format => {
                      const isSelected = selectedFormats.includes(format.id);
                      const options = formatOptions[format.id] || {};

                      return (
                        <div key={format.id}>
                          <Card
                            onClick={() => {
                              if (isSelected) {
                                setSelectedFormats(prev => prev.filter(f => f !== format.id));
                              } else {
                                setSelectedFormats(prev => [...prev, format.id]);
                              }
                            }}
                            className="border-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
                            style={{
                              borderColor: isSelected ? '#88925D' : 'rgba(229, 165, 116, 0.3)',
                              background: isSelected ? 'rgba(136, 146, 93, 0.08)' : 'white'
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="w-5 h-5 rounded"
                                    style={{ accentColor: '#88925D' }}
                                  />
                                  <span className="text-2xl">{format.icon}</span>
                                  <h4 className="font-semibold" style={{ color: '#3D3D2B' }}>
                                    {format.name}
                                  </h4>
                                </div>
                                {isSelected && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent card from toggling selection
                                      handleRemoveFormat(format.id);
                                    }}
                                    className="rounded-full w-6 h-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 ml-8">
                                {format.platforms.map(p => (
                                  <Badge key={p} variant="outline" style={{
                                    borderColor: '#88925D',
                                    color: '#3D3D2B'
                                  }}>
                                    {p}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Format Options */}
                          {isSelected && format.options && (
                            <div className="mt-3 ml-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                              {format.options.map(option => (
                                <div key={option.id}>
                                  <Label className="text-sm font-medium mb-1">{option.label}</Label>
                                  {option.type === 'select' && (
                                    <Select
                                      value={options[option.id] || option.default || option.values[0]}
                                      onValueChange={(value) => setFormatOptions(prev => ({
                                        ...prev,
                                        [format.id]: { ...prev[format.id], [option.id]: value }
                                      }))}
                                    >
                                      <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {option.values.map(v => (
                                          <SelectItem key={v} value={v}>{v}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  {option.type === 'number' && (
                                    <Input
                                      type="number"
                                      min={option.min}
                                      max={option.max}
                                      value={options[option.id] || option.default}
                                      onChange={(e) => setFormatOptions(prev => ({
                                        ...prev,
                                        [format.id]: { ...prev[format.id], [option.id]: parseInt(e.target.value) }
                                      }))}
                                      className="rounded-xl w-24"
                                    />
                                  )}
                                  {option.type === 'checkbox' && (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={options[option.id] || false}
                                        onChange={(e) => setFormatOptions(prev => ({
                                          ...prev,
                                          [format.id]: { ...prev[format.id], [option.id]: e.target.checked }
                                        }))}
                                        className="w-4 h-4 rounded"
                                        style={{ accentColor: '#88925D' }}
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}

                              {/* Template Selection */}
                              {format.needsTemplate && (
                                <div>
                                  <Label className="text-sm font-medium mb-1">Visual Template (Optional)</Label>
                                  <Select
                                    value={formatTemplates[format.id] || ''}
                                    onValueChange={(value) => setFormatTemplates(prev => ({
                                      ...prev,
                                      [format.id]: value === "null" ? null : value // Ensure "No Template" maps to null
                                    }))}
                                  >
                                    <SelectTrigger className="rounded-xl">
                                      <SelectValue placeholder="No Template (Design Later)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="null">No Template</SelectItem>
                                      {templates
                                        .filter(t => t.template_type === format.id ||
                                                   (format.id === 'single_image' && t.template_type === 'single_image') ||
                                                   (format.id === 'carousel' && t.template_type === 'carousel')
                                          )
                                        .map(t => (
                                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Generate Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleGenerateText}
                  disabled={selectedFormats.length === 0 || isGeneratingText}
                  className="rounded-xl h-14 px-8 text-base font-bold shadow-lg hover:shadow-xl transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                    color: 'white'
                  }}
                >
                  {isGeneratingText ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Content Text
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Text Generation Loading */}
          {currentStep === "text_generation" && isGeneratingText && (
            <div className="max-w-2xl mx-auto text-center py-16">
              <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: '#88925D' }} />
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
                Generating Your Content...
              </h3>
              <p style={{ color: '#8B7355' }}>
                Creating {selectedFormats.length} content format{selectedFormats.length > 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Text Review */}
          {currentStep === "text_review" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#3D3D2B' }}>
                  Review Generated Content
                </h2>
              </div>

              {selectedFormats.map(formatId => {
                const format = contentFormats.find(f => f.id === formatId);
                const content = generatedText[formatId];

                if (!content) return null;

                return (
                  <Card key={formatId} className="border-2 rounded-2xl" style={{
                    borderColor: 'rgba(229, 165, 116, 0.3)',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)'
                  }}>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#3D3D2B' }}>
                          <span>{format.icon}</span>
                          {format.name}
                        </h3>
                        <Button
                          onClick={() => handleRegenerateSection(formatId)}
                          disabled={regenerationFeedback.trim() === '' && regeneratingSection === formatId} // Regenerating all
                          variant="outline"
                          className="rounded-xl"
                        >
                          {regeneratingSection === formatId ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Regenerate All
                        </Button>
                      </div>

                      {/* Carousel Content */}
                      {formatId === 'carousel' && content.slides && (
                        <div className="space-y-4">
                          {/* Caption first */}
                          <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 248, 240, 0.8)' }}>
                            <div className="flex items-start justify-between mb-2">
                              <Label className="text-sm font-semibold">Caption</Label>
                              <Button
                                onClick={() => handleRegenerateSection(formatId, 'caption')}
                                disabled={regeneratingSection === `${formatId}_caption_`}
                                variant="ghost"
                                size="sm"
                                className="rounded-lg"
                              >
                                {regeneratingSection === `${formatId}_caption_` ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                            <Textarea
                              value={content.caption}
                              onChange={(e) => setGeneratedText(prev => ({
                                ...prev,
                                [formatId]: { ...prev[formatId], caption: e.target.value }
                              }))}
                              className="min-h-24 rounded-xl"
                            />
                          </div>

                          {/* Then slides */}
                          <div>
                            <Label className="text-sm font-semibold mb-2">Slides</Label>
                            {content.slides.map((slide, idx) => (
                              <Card key={idx} className="mb-3 border rounded-xl">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <span className="text-sm font-semibold" style={{ color: '#3D3D2B' }}>
                                      Slide {idx + 1}
                                    </span>
                                    <Button
                                      onClick={() => handleRegenerateSection(formatId, 'slide', idx)}
                                      disabled={regeneratingSection === `${formatId}_slide_${idx}`}
                                      variant="ghost"
                                      size="sm"
                                      className="rounded-lg"
                                    >
                                      {regeneratingSection === `${formatId}_slide_${idx}` ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <RefreshCw className="w-3 h-3" />
                                      )}
                                    </Button>
                                  </div>
                                  {/* Render template placeholders - filter out 'type' */}
                                  {Object.keys(slide).filter(key => key !== 'type').map(key => (
                                    <div key={key} className="mb-2">
                                      <Label className="text-xs font-medium capitalize text-gray-600 mb-1">
                                        {key.replace(/_/g, ' ')}
                                      </Label>
                                      <Textarea
                                        value={slide[key]}
                                        onChange={(e) => {
                                          const newSlides = [...content.slides];
                                          newSlides[idx] = { ...newSlides[idx], [key]: e.target.value };
                                          setGeneratedText(prev => ({
                                            ...prev,
                                            [formatId]: { ...prev[formatId], slides: newSlides }
                                          }));
                                        }}
                                        className="rounded-lg min-h-16"
                                      />
                                    </div>
                                  ))}
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          {/* Hashtags - show unique only */}
                          {content.hashtags && content.hashtags.length > 0 && (
                            <div>
                              <Label className="text-sm font-semibold mb-2">Suggested Hashtags</Label>
                              <div className="flex flex-wrap gap-2">
                                {[...new Set(content.hashtags)].map((tag, idx) => (
                                  <Badge key={idx} variant="outline">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Thread Content */}
                      {formatId === 'thread' && content.tweets && (
                        <div className="space-y-4">
                          {content.tweets.map((tweet, idx) => (
                            <Card key={idx} className="border rounded-xl">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <span className="text-sm font-semibold" style={{ color: '#3D3D2B' }}>
                                    Tweet {idx + 1}
                                  </span>
                                  <Button
                                    onClick={() => handleRegenerateSection(formatId, 'tweet', idx)}
                                    disabled={regeneratingSection === `${formatId}_tweet_${idx}`}
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-lg"
                                  >
                                    {regeneratingSection === `${formatId}_tweet_${idx}` ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <RefreshCw className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                                <Textarea
                                  value={tweet}
                                  onChange={(e) => {
                                    const newTweets = [...content.tweets];
                                    newTweets[idx] = e.target.value;
                                    setGeneratedText(prev => ({
                                      ...prev,
                                      [formatId]: { ...prev[formatId], tweets: newTweets }
                                    }));
                                  }}
                                  className="rounded-lg"
                                  maxLength={280}
                                />
                                <p className="text-xs mt-1" style={{ color: '#8B7355' }}>
                                  {tweet.length}/280 characters
                                </p>
                              </CardContent>
                            </Card>
                          ))}

                          {/* Hashtags - show unique only */}
                          {content.hashtags && content.hashtags.length > 0 && (
                            <div>
                              <Label className="text-sm font-semibold mb-2">Suggested Hashtags</Label>
                              <div className="flex flex-wrap gap-2">
                                {[...new Set(content.hashtags)].map((tag, idx) => (
                                  <Badge key={idx} variant="outline">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* General Template Content or Standard Caption/Content */}
                      {!['carousel', 'thread'].includes(formatId) && (
                        <div className="space-y-4">
                          {/* Show template placeholders first - filter out type, caption, hashtags */}
                          {Object.keys(content).filter(key => key !== 'type' && key !== 'caption' && key !== 'hashtags' && key !== 'tweets' && key !== 'slides').map(key => (
                            <div key={key}>
                              <div className="flex items-start justify-between mb-2">
                                  <Label className="text-sm font-semibold capitalize">{key.replace(/_/g, ' ')}</Label>
                                  <Button
                                      onClick={() => handleRegenerateSection(formatId, key)}
                                      disabled={regeneratingSection === `${formatId}_${key}`}
                                      variant="ghost"
                                      size="sm"
                                      className="rounded-lg"
                                  >
                                      {regeneratingSection === `${formatId}_${key}` ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                      <RefreshCw className="w-3 h-3" />
                                      )}
                                  </Button>
                              </div>
                              <Textarea
                                value={content[key]}
                                onChange={(e) => setGeneratedText(prev => ({
                                  ...prev,
                                  [formatId]: { ...prev[formatId], [key]: e.target.value }
                                }))}
                                className="min-h-24 rounded-xl"
                              />
                            </div>
                          ))}

                          {/* Then caption */}
                          {content.caption !== undefined && (
                            <div>
                              <div className="flex items-start justify-between mb-2">
                                <Label className="text-sm font-semibold">Caption</Label>
                                <Button
                                  onClick={() => handleRegenerateSection(formatId, 'caption')}
                                  disabled={regeneratingSection === `${formatId}_caption_`}
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-lg"
                                >
                                  {regeneratingSection === `${formatId}_caption_` ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                              <Textarea
                                value={content.caption}
                                onChange={(e) => setGeneratedText(prev => ({
                                  ...prev,
                                  [formatId]: { ...prev[formatId], caption: e.target.value }
                                }))}
                                className="min-h-32 rounded-xl"
                              />
                            </div>
                          )}

                          {/* Hashtags - show unique only */}
                          {content.hashtags && content.hashtags.length > 0 && (
                            <div>
                              <Label className="text-sm font-semibold mb-2">Suggested Hashtags</Label>
                              <div className="flex flex-wrap gap-2">
                                {[...new Set(content.hashtags)].map((tag, idx) => (
                                  <Badge key={idx} variant="outline">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Regeneration Feedback */}
                      <div className="pt-4 border-t" style={{ borderColor: 'rgba(229, 165, 116, 0.2)' }}>
                        <Label className="text-sm font-medium mb-2">Feedback for Regeneration</Label>
                        <div className="flex gap-2">
                          <Input
                            value={regenerationFeedback}
                            onChange={(e) => setRegenerationFeedback(e.target.value)}
                            placeholder="e.g., Make it more casual, add emojis, focus on benefits..."
                            className="rounded-xl"
                          />
                          <Button
                            onClick={() => handleRegenerateSection(formatId, null, null)} // Target entire format for regeneration with feedback
                            disabled={!regenerationFeedback.trim() || regeneratingSection === formatId}
                            className="rounded-xl"
                            style={{
                              background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                              color: 'white'
                            }}
                          >
                            Apply Feedback to All
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Navigation Buttons */}
              <div className="flex justify-between">
                <Button
                  onClick={() => setCurrentStep("idea_development")}
                  variant="outline"
                  className="rounded-xl h-12 px-6"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Back to Idea Development
                </Button>
                <Button
                  onClick={handleVisualSetup} // Corrected
                  className="rounded-xl h-12 px-6 font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                    color: 'white'
                  }}
                >
                  Continue to Visual Setup
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Text Generation Loading */}
          {currentStep === "text_generation" && isGeneratingText && (
            <div className="max-w-2xl mx-auto text-center py-16">
              <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: '#88925D' }} />
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
                Generating Your Content...
              </h3>
              <p style={{ color: '#8B7355' }}>
                Creating {selectedFormats.length} content format{selectedFormats.length > 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Visual Setup */}
          {currentStep === "visual_setup" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#3D3D2B' }}>
                  Visual Setup
                </h2>
              </div>

              {selectedFormats.map(formatId => {
                const format = contentFormats.find(f => f.id === formatId);
                if (!format.needsVisuals) return null;

                const setup = visualSetup[formatId] || {};
                const templateId = formatTemplates[formatId];
                const template = templateId ? templates.find(t => t.id === templateId) : null;
                const imagePlaceholders = template?.placeholders?.filter(p => p.type === 'image') || [];


                return (
                  <Card key={formatId} className="border-2 rounded-2xl" style={{
                    borderColor: 'rgba(229, 165, 116, 0.3)',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)'
                  }}>
                    <CardContent className="p-6 space-y-4">
                      <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#3D3D2B' }}>
                        <span>{format.icon}</span>
                        {format.name}
                      </h3>

                      <div>
                        <Label className="text-base font-semibold mb-3">How do you want to create visuals?</Label>
                        <div className="space-y-3">
                          <Card
                            onClick={() => setVisualSetup(prev => ({ ...prev, [formatId]: { ...prev[formatId], method: 'ai_generate' } }))}
                            className="border-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
                            style={{
                              borderColor: setup.method === 'ai_generate' ? '#88925D' : 'rgba(229, 165, 116, 0.3)',
                              background: setup.method === 'ai_generate' ? 'rgba(136, 146, 93, 0.08)' : 'white'
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  checked={setup.method === 'ai_generate'}
                                  onChange={() => {}}
                                  className="w-4 h-4"
                                  style={{ accentColor: '#88925D' }}
                                />
                                <Wand2 className="w-5 h-5" style={{ color: '#88925D' }} />
                                <div>
                                  <p className="font-semibold" style={{ color: '#3D3D2B' }}>AI Generate</p>
                                  <p className="text-xs" style={{ color: '#8B7355' }}>Let AI create visuals based on your content</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card
                            onClick={() => setVisualSetup(prev => ({ ...prev, [formatId]: { ...prev[formatId], method: 'upload' } }))}
                            className="border-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
                            style={{
                              borderColor: setup.method === 'upload' ? '#88925D' : 'rgba(229, 165, 116, 0.3)',
                              background: setup.method === 'upload' ? 'rgba(136, 146, 93, 0.08)' : 'white'
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  checked={setup.method === 'upload'}
                                  onChange={() => {}}
                                  className="w-4 h-4"
                                  style={{ accentColor: '#88925D' }}
                                />
                                <Upload className="w-5 h-5" style={{ color: '#88925D' }} />
                                <div>
                                  <p className="font-semibold" style={{ color: '#3D3D2B' }}>Upload from library / device</p>
                                  <p className="text-xs" style={{ color: '#8B7355' }}>Select from your media library or upload new files</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card
                            onClick={() => setVisualSetup(prev => ({ ...prev, [formatId]: { ...prev[formatId], method: 'editor' } }))}
                            className="border-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
                            style={{
                              borderColor: setup.method === 'editor' ? '#88925D' : 'rgba(229, 165, 116, 0.3)',
                              background: setup.method === 'editor' ? 'rgba(136, 146, 93, 0.08)' : 'white'
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  checked={setup.method === 'editor'}
                                  onChange={() => {}}
                                  className="w-4 h-4"
                                  style={{ accentColor: '#88925D' }}
                                />
                                <ImageIcon className="w-5 h-5" style={{ color: '#88925D' }} />
                                <div>
                                  <p className="font-semibold" style={{ color: '#3D3D2B' }}>Design in Editor</p>
                                  <p className="text-xs" style={{ color: '#8B7355' }}>Create visuals directly in the editor</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* AI Generation Options */}
                      {setup.method === 'ai_generate' && (
                        <div>
                          <Label className="text-sm font-medium mb-2">Style</Label>
                          <Input
                            value={setup.style || ''}
                            onChange={(e) => setVisualSetup(prev => ({
                              ...prev,
                              [formatId]: { ...prev[formatId], style: e.target.value }
                            }))}
                            placeholder="e.g., modern, minimalist, vibrant, professional..."
                            className="rounded-xl"
                          />
                        </div>
                      )}

                      {/* Upload/Library Options with Placeholder Mapping */}
                      {setup.method === 'upload' && (
                        <div className="space-y-4">
                          {/* Show placeholder mapping if template exists and has image placeholders */}
                          {template && imagePlaceholders.length > 0 && (
                            <div>
                              <Label className="text-sm font-semibold mb-2">Map Media to Placeholders</Label>
                              {imagePlaceholders.map((placeholder, index) => (
                                <div key={placeholder.id} className="mb-3 p-3 border rounded-xl" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
                                  <Label className="text-xs font-medium mb-2">{placeholder.label}</Label>
                                  <div className="flex gap-2 mt-2 items-center">
                                    {setup.placeholderMapping?.[placeholder.id] && (
                                      <div className="relative w-20 h-20 flex-shrink-0">
                                        <img
                                          src={setup.placeholderMapping[placeholder.id]}
                                          alt={placeholder.label}
                                  className="w-full h-full object-cover rounded-md"
                                        />
                                        <Button
                                          variant="destructive"
                                          size="icon"
                                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                                          onClick={() => {
                                            setVisualSetup(prev => {
                                              const newMapping = { ...(prev[formatId]?.placeholderMapping || {}) };
                                              delete newMapping[placeholder.id];
                                              return {
                                                ...prev,
                                                [formatId]: {
                                                  ...prev[formatId],
                                                  placeholderMapping: newMapping
                                                }
                                              };
                                            });
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenMediaLibrary(formatId, placeholder.id)}
                                      className="rounded-lg"
                                    >
                                      <ImageIcon className="w-4 h-4 mr-2" />
                                      {setup.placeholderMapping?.[placeholder.id] ? 'Change' : 'Select'} Media
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* General media list */}
                          <div>
                            <Label className="text-sm font-semibold mb-2">Additional Media</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {(setup.uploadedUrls || []).map((url, idx) => (
                                <div key={idx} className="relative w-16 h-16">
                                  <img src={url} alt={`upload ${idx}`} className="w-full h-full object-cover rounded-md" />
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                    onClick={() => setVisualSetup(prev => ({
                                      ...prev,
                                      [formatId]: {
                                        ...prev[formatId],
                                        uploadedUrls: prev[formatId]?.uploadedUrls.filter((u, i) => i !== idx)
                                      }
                                    }))}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleOpenMediaLibrary(formatId, null)} // Pass null for general media selection
                                className="rounded-xl"
                              >
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Select from Media Library
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = format.needsVisuals === 'video' ? 'video/*' : 'image/*';
                                  input.multiple = format.needsVisuals === 'multiple_images';
                                  input.onchange = async (e) => {
                                    const files = Array.from(e.target.files || []);
                                    await handleFileUpload(formatId, files);
                                  };
                                  input.click();
                                }}
                                className="rounded-xl"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload New Files
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              <div className="flex justify-between">
                <Button
                  onClick={() => setCurrentStep("text_review")}
                  variant="outline"
                  className="rounded-xl h-12 px-6"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Back to Text Review
                </Button>
                <Button
                  onClick={() => {
                    // Check if any format needs AI generation
                    const needsAI = selectedFormats.some(fId => {
                      const format = contentFormats.find(f => f.id === fId);
                      return format.needsVisuals && visualSetup[fId]?.method === 'ai_generate';
                    });

                    if (needsAI) {
                      handleGenerateVisuals();
                    } else {
                      setCurrentStep("editor");
                    }
                  }}
                  className="rounded-xl h-12 px-6 font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                    color: 'white'
                  }}
                >
                  {selectedFormats.some(id => visualSetup[id]?.method === 'ai_generate')
                    ? 'Generate Visuals'
                    : 'Continue to Editor'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* AI Generation */}
          {currentStep === "ai_generation" && (
            <div className="max-w-4xl mx-auto space-y-6">
              {isGeneratingVisuals ? (
                <div className="text-center py-16">
                  <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: '#88925D' }} />
                  <h3 className="text-2xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
                    Generating Visuals...
                  </h3>
                  <p style={{ color: '#8B7355' }}>
                    Creating AI-generated images for your content
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold" style={{ color: '#3D3D2B' }}>
                      Review Generated Visuals
                    </h2>
                  </div>

                  {selectedFormats.map(formatId => {
                    const format = contentFormats.find(f => f.id === formatId);
                    const visuals = generatedVisuals[formatId];

                    if (!visuals || visuals.length === 0) return null;

                    return (
                      <Card key={formatId} className="border-2 rounded-2xl" style={{
                        borderColor: 'rgba(229, 165, 116, 0.3)',
                        background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)'
                      }}>
                        <CardContent className="p-6 space-y-4">
                          <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#3D3D2B' }}>
                            <span>{format.icon}</span>
                            {format.name}
                          </h3>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {visuals.map((url, idx) => (
                              <div key={idx} className="relative group">
                                <img
                                  src={url}
                                  alt={`Generated ${idx + 1}`}
                                  className="w-full h-48 object-cover rounded-xl border-2"
                                  style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
                                />
                                <Button
                                  onClick={() => {
                                    // Regenerate specific visual - this would invoke another AI call
                                    toast.info("Regenerate specific visual coming soon");
                                  }}
                                  variant="secondary"
                                  size="sm"
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  <div className="flex justify-between">
                    <Button
                      onClick={() => setCurrentStep("visual_setup")}
                      variant="outline"
                      className="rounded-xl h-12 px-6"
                    >
                      <ChevronLeft className="w-5 h-5 mr-2" />
                      Back to Visual Setup
                    </Button>
                    <Button
                      onClick={() => setCurrentStep("editor")}
                      className="rounded-xl h-12 px-6 font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                        color: 'white'
                      }}
                    >
                      Continue to Editor
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Editor */}
          {currentStep === "editor" && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#3D3D2B' }}>
                  Design Your Content
                </h2>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedFormats.map(formatId => {
                  const format = contentFormats.find(f => f.id === formatId);
                  const hasScene = !!editorScenes[formatId];

                  return (
                    <Card
                      key={formatId}
                      onClick={() => handleOpenEditor(formatId)}
                      className="border-2 rounded-2xl cursor-pointer transition-all hover:shadow-lg"
                      style={{
                        borderColor: hasScene ? '#88925D' : 'rgba(229, 165, 116, 0.3)',
                        background: hasScene ? 'rgba(136, 146, 93, 0.08)' : 'white'
                      }}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="text-4xl mb-3">{format.icon}</div>
                        <h4 className="font-bold mb-2" style={{ color: '#3D3D2B' }}>
                          {format.name}
                        </h4>
                        {hasScene ? (
                          <Badge style={{ background: '#88925D', color: 'white' }}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Edited
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Not Started
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-between">
                <Button
                  onClick={() => {
                    // Go back to AI generation if visuals were generated, otherwise visual setup
                    const hasAIGenerated = selectedFormats.some(fId => generatedVisuals[fId] && visualSetup[fId]?.method === 'ai_generate');
                    setCurrentStep(hasAIGenerated ? "ai_generation" : "visual_setup");
                  }}
                  variant="outline"
                  className="rounded-xl h-12 px-6"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep("publish")}
                  className="rounded-xl h-12 px-6 font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                    color: 'white'
                  }}
                >
                  Continue to Publish
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Publish */}
          {currentStep === "publish" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#3D3D2B' }}>
                  Publish Your Content
                </h2>
              </div>

              {selectedFormats.map(formatId => {
                const format = contentFormats.find(f => f.id === formatId);
                const content = generatedText[formatId];

                // Prioritize rendered scene, then placeholder mapping, then uploaded URLs, then generated visuals
                let mediaForPreview = [];
                const sceneData = editorScenes[formatId]; // this is now the designData object {scene, previewUrl}

                if (sceneData?.previewUrl) {
                  mediaForPreview.push(sceneData.previewUrl);
                } else {
                  const visualSetupForFormat = visualSetup[formatId];
                  if (visualSetupForFormat?.placeholderMapping) {
                    mediaForPreview = mediaForPreview.concat(Object.values(visualSetupForFormat.placeholderMapping));
                  }
                  if (visualSetupForFormat?.uploadedUrls) {
                    mediaForPreview = mediaForPreview.concat(visualSetupForFormat.uploadedUrls);
                  }
                  if (generatedVisuals[formatId]) {
                    mediaForPreview = mediaForPreview.concat(generatedVisuals[formatId]);
                  }
                }

                return (
                  <Card key={formatId} className="border-2 rounded-2xl" style={{
                    borderColor: 'rgba(229, 165, 116, 0.3)',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)'
                  }}>
                    <CardContent className="p-6 space-y-4">
                      <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#3D3D2B' }}>
                        <span>{format.icon}</span>
                        {format.name}
                      </h3>

                      {/* Platform Selection */}
                      <div>
                        <Label className="text-sm font-semibold mb-2">Select Platforms</Label>
                        <div className="flex flex-wrap gap-2">
                          {format.platforms.map(platform => {
                            const connection = connections.find(c => c.platform === platform);
                            // Default to true if not explicitly false in state
                            const isSelected = selectedPlatforms[`${formatId}_${platform}`] !== false;

                            return (
                              <Button
                                key={platform}
                                onClick={() => setSelectedPlatforms(prev => ({
                                  ...prev,
                                  [`${formatId}_${platform}`]: !isSelected
                                }))}
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                className="rounded-xl"
                                disabled={!connection}
                                style={isSelected ? {
                                  background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                                  color: 'white'
                                } : {}}
                              >
                                {connection ? '✓ ' : '⚠️ '}
                                {platform}
                              </Button>
                            );
                          })}
                        </div>
                        <p className="text-xs mt-2" style={{ color: '#8B7355' }}>
                          ⚠️ = Not connected. Go to Settings → Connections to connect accounts.
                        </p>
                      </div>

                      {/* Preview */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {mediaForPreview.length > 0 && (
                          <div>
                            <Label className="text-sm font-semibold mb-2">Visual</Label>
                            <img
                              src={mediaForPreview[0]}
                              alt="Preview"
                              className="w-full h-48 object-cover rounded-xl border-2"
                              style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
                            />
                          </div>
                        )}
                        <div>
                          <Label className="text-sm font-semibold mb-2">Caption</Label>
                          <div className="p-3 rounded-xl text-sm max-h-48 overflow-y-auto" style={{
                            backgroundColor: 'rgba(255, 248, 240, 0.8)',
                            border: '1px solid rgba(229, 165, 116, 0.2)'
                          }}>
                            {(function() {
                                let combinedText = content?.caption || content?.content || "";
                                if (content.hashtags && content.hashtags.length > 0) {
                                    combinedText += "\n\n" + content.hashtags.map(h => `#${h}`).join(' ');
                                }
                                return combinedText || "No text content generated.";
                            })()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Action Buttons */}
              <div className="border-t pt-6" style={{ borderColor: 'rgba(229, 165, 116, 0.2)' }}>
                <div className="flex justify-between items-center">
                  <Button
                    onClick={() => setCurrentStep("editor")}
                    variant="outline"
                    className="rounded-xl h-12 px-6"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back to Editor
                  </Button>

                  <div className="flex flex-wrap gap-3 justify-end">
                    <Button
                      onClick={() => handlePublish('download')}
                      variant="outline"
                      className="rounded-xl h-12 px-6"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download
                    </Button>
                    <Button
                      onClick={() => handlePublish('save_draft')}
                      variant="outline"
                      className="rounded-xl h-12 px-6"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      Save as Draft
                    </Button>
                    <Button
                      onClick={() => handlePublish('add_to_autolist')}
                      variant="outline"
                      className="rounded-xl h-12 px-6"
                    >
                      <List className="w-5 h-5 mr-2" />
                      Add to Autolist
                    </Button>
                    <Button
                      onClick={() => handlePublish('schedule')}
                      className="rounded-xl h-12 px-6"
                      style={{
                        background: 'linear-gradient(135deg, #E8B44D 0%, #E5A574 100%)',
                        color: 'white'
                      }}
                    >
                      <Calendar className="w-5 h-5 mr-2" />
                      Schedule
                    </Button>
                    <Button
                      onClick={() => handlePublish('post_now')}
                      className="rounded-xl h-12 px-6 font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                        color: 'white'
                      }}
                    >
                      <Send className="w-5 h-5 mr-2" />
                      Post Now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* CE.SDK Editor Modal */}
        {editorState.open && (
          <CESDKEditor
            open={editorState.open}
            initialScene={editorState.initialScene} // This will be the prepared scene, or a previously saved scene
            // template={editorState.template} // Pass the raw template scene object if it exists, for editor to use as base
            templatePlaceholders={editorState.templatePlaceholders} // New prop for placeholders
            formatInfo={contentFormats.find(f => f.id === editorState.formatKey)}
            contentValues={editorState.contentValues} // Now directly from editorState
            uploadedMedia={editorState.uploadedMedia} // Now directly from editorState
            format={editorState.format}
            templateName={contentFormats.find(f => f.id === editorState.formatKey)?.name}
            showContinueButton={true}
            onSave={(designData) => handleEditorSave(editorState.formatKey, designData)}
            onClose={() => setEditorState({ open: false, formatKey: null, initialScene: null, contentValues: {}, uploadedMedia: [], format: 'instagram_square', templatePlaceholders: [] })}
          />
        )}

        {/* Media Library Dialog - Updated */}
        <Dialog open={showMediaLibrary} onOpenChange={setShowMediaLibrary}>
          <DialogContent 
            className="sm:max-w-[800px] h-[70vh] flex flex-col"
            aria-labelledby="media-library-title"
            aria-describedby="media-library-description"
          >
            <DialogHeader>
              <DialogTitle id="media-library-title">Select Media from Library</DialogTitle>
              <div id="media-library-description" className="sr-only">
                Browse and select media files from your library to use in your content. Click on a media item to add it to your content.
              </div>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-4">
              {mediaLibrary.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-500">No media in library. Upload some files first!</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {mediaLibrary.map((item) => (
                    <div
                      key={item.id}
                      className="relative cursor-pointer rounded-lg overflow-hidden border-2 hover:border-primary-brand-dark transition-colors"
                      onClick={() => {
                        if (currentPlaceholder) {
                          // Map to specific placeholder
                          setVisualSetup(prev => ({
                            ...prev,
                            [currentFormatForMedia]: {
                              ...prev[currentFormatForMedia],
                              placeholderMapping: {
                                ...(prev[currentFormatForMedia]?.placeholderMapping || {}),
                                [currentPlaceholder]: item.file_url
                              }
                            }
                          }));
                          setShowMediaLibrary(false);
                          setCurrentPlaceholder(null);
                          toast.success("Media mapped to placeholder!");
                        } else {
                          // Add to general media list
                          // Prevent duplicates
                          const currentUrls = visualSetup[currentFormatForMedia]?.uploadedUrls || [];
                          if (!currentUrls.includes(item.file_url)) {
                            setVisualSetup(prev => ({
                              ...prev,
                              [currentFormatForMedia]: {
                                ...prev[currentFormatForMedia],
                                uploadedUrls: [...currentUrls, item.file_url]
                              }
                            }));
                            toast.success("Media added!");
                          } else {
                            toast.info("Media already added.");
                          }
                        }
                      }}
                    >
                      <img
                        src={item.file_url}
                        alt={item.file_name}
                        className="w-full h-24 object-cover"
                      />
                      <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent text-white text-xs p-1 truncate">
                        {item.file_name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button variant="outline" onClick={() => {
                setShowMediaLibrary(false);
                setCurrentPlaceholder(null); // Clear placeholder context
              }}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
  );
}
