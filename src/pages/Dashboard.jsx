
import React, { useState, useEffect } from "react";
import { prism } from "@/api/prismClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, TrendingUp, Lightbulb, Zap, BarChart3, Upload, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import IdeaInput from "../components/dashboard/IdeaInput";
import IdeasGrid from "../components/dashboard/IdeasGrid";
import IdeaDetailModal from "../components/dashboard/IdeaDetailModal";
import ContentCreationWorkflow from "../components/dashboard/ContentCreationWorkflow";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);

  // Check authentication and URL params for workflow
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await prism.auth.isAuthenticated();
        if (!isAuth) {
          prism.auth.redirectToLogin(window.location.pathname);
          return;
        }
        const userData = await prism.auth.me();
        setUser(userData);

        // Check for URL params to open workflow
        const urlParams = new URLSearchParams(window.location.search);
        const ideaId = urlParams.get('ideaId');
        const shouldOpenWorkflow = urlParams.get('openWorkflow') === 'true';
        const step = urlParams.get('initialStep') || 'idea_development';

        if (ideaId && shouldOpenWorkflow) {
          // Fetch the idea and open workflow
          const idea = await prism.entities.Content.filter({ id: ideaId });
          if (idea && idea.length > 0) {
            setWorkflowIdea(idea[0]);
            setShowWorkflow(true);
            setInitialWorkflowStep(step);
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        prism.auth.redirectToLogin(window.location.pathname);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  // Check for automatic daily trend research
  useEffect(() => {
    const checkAndResearchTrends = async () => {
      if (!user) return;
      
      try {
        // Check if we've researched trends today
        const lastResearchKey = `last_trend_research_${user.id}`;
        const lastResearch = localStorage.getItem(lastResearchKey);
        const today = new Date().toDateString();
        
        if (lastResearch !== today) {
          console.log('Running automatic daily trend research...');
          
          // Get all brands
          const brandsData = await prism.entities.Brand.list();
          
          // Research trends for each brand (or general if no brands)
          if (brandsData.length > 0) {
            for (const brand of brandsData) {
              // Always research for every brand - even without RSS/topics configured
              await researchBrandTrends(brand);
            }
          } else {
            // Research general trends if no brands
            await researchGeneralTrends();
          }
          
          // Mark today as researched
          localStorage.setItem(lastResearchKey, today);
          console.log('✓ Daily trend research complete');
          queryClient.invalidateQueries({ queryKey: ['trendingTopics'] });
        }
      } catch (error) {
        console.error('Error in automatic trend research:', error);
      }
    };

    if (!isCheckingAuth && user) {
      checkAndResearchTrends();
    }
  }, [user, isCheckingAuth, queryClient]);

  const researchBrandTrends = async (brand) => {
    try {
      // Build context from brand's configured sources
      const rssFeedsContext = brand.rss_feeds?.length > 0
        ? `\n\n📰 RSS FEEDS TO MONITOR:\n${brand.rss_feeds.map(f => `- ${f.name} (${f.category}): ${f.url}`).join('\n')}`
        : '';

      const searchTermsContext = brand.recommended_search_terms?.length > 0
        ? `\n\n🔍 SEARCH TERMS TO TRACK:\n${brand.recommended_search_terms.map(t => `- ${t.term} (Platform: ${t.platform || 'any'}, Relevance: ${t.relevance || 'medium'})`).join('\n')}`
        : '';

      const newsTopicsContext = brand.news_topics?.length > 0
        ? `\n\n📌 NEWS TOPICS TO MONITOR:\n${brand.news_topics.map(t => `- ${t}`).join('\n')}`
        : '';

      const prompt = `You are a trend researcher analyzing ONLY content from the LAST 7 DAYS.

BRAND: ${brand.name}
Industry: ${brand.industry || 'Not specified'}
Target Audience: ${brand.target_audience || 'Not specified'}
Brand Values: ${brand.brand_values || 'Not specified'}

${rssFeedsContext}
${searchTermsContext}
${newsTopicsContext}

🔴 CRITICAL REQUIREMENTS:
1. ALL trends MUST be from the LAST 7 DAYS ONLY
2. EVERY trend MUST include a direct source link (Instagram post URL, TikTok video URL, article URL, etc.)
3. Use the RSS feeds provided to find relevant news articles
4. Use the search terms to discover trending content on social platforms (e.g., Google Trends, TikTok trends, Instagram explore)
5. Focus on the news topics specified by the brand

Research trending content from:
- Instagram (viral posts, trending audio, popular formats)
- TikTok (trending sounds, challenges, hashtags)
- Twitter/X (trending topics, viral tweets)
- YouTube (trending videos, popular topics)
- RSS Feeds (breaking news, industry updates)
- News sites based on topics

For EACH trend provide:
1. **title**: Catchy, attention-grabbing title
2. **source**: Platform name or "RSS - [Feed Name] ([Domain])"
3. **source_url**: REQUIRED - Direct URL
4. **description**: What's happening and why it's trending
5. **trending_data**: Deep context with stats, quotes, specifics (e.g., number of shares, views, etc.)
6. **keywords**: Relevant hashtags and keywords
7. **viral_potential**: Score 1-10
8. **category**: Content niche/category (e.g., Fashion, Tech, Lifestyle, Current Events)
9. **duration_estimate**: How long this will trend (e.g., "short-term (days)", "medium-term (weeks)", "long-term (months)")
10. **brand_relevance**: Specific connection to ${brand.name} (Explain how this trend is relevant to the brand's industry, audience, or values).

Return 10-15 distinct trends with all the above details, including source URLs.`;


      const trendingData = await prism.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            trends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  source: { type: "string" },
                  source_url: { type: "string" },
                  description: { type: "string" },
                  trending_data: { type: "string" },
                  keywords: { type: "array", items: { type: "string" } },
                  viral_potential: { type: "number" },
                  category: { type: "string" },
                  duration_estimate: { type: "string" },
                  brand_relevance: { type: "string" }
                },
                required: ["title", "source", "source_url", "description", "trending_data", "keywords", "viral_potential", "category", "duration_estimate", "brand_relevance"]
              }
            }
          },
          required: ["trends"]
        }
      });

      // Save trends to database
      const currentDate = new Date();
      const sevenDaysAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      for (const trend of trendingData.trends || []) {
        const expiresAt = new Date();
        // Set expiry based on estimate, default to 7 days if unknown
        if (trend.duration_estimate?.toLowerCase().includes('day') || trend.duration_estimate?.toLowerCase().includes('short')) expiresAt.setDate(expiresAt.getDate() + 7);
        else if (trend.duration_estimate?.toLowerCase().includes('week') || trend.duration_estimate?.toLowerCase().includes('medium')) expiresAt.setDate(expiresAt.getDate() + 14);
        else if (trend.duration_estimate?.toLowerCase().includes('month') || trend.duration_estimate?.toLowerCase().includes('long')) expiresAt.setDate(expiresAt.getDate() + 30);
        else expiresAt.setDate(expiresAt.getDate() + 7); // Default

        let storedSource = trend.source || 'general';
        if (!storedSource.toLowerCase().startsWith('rss -')) {
          storedSource = storedSource.toLowerCase();
        }

        await prism.entities.TrendingTopic.create({
          ...trend,
          source: storedSource,
          source_date: sevenDaysAgo.toISOString(), // Assuming trends are valid from ~7 days ago
          expires_at: expiresAt.toISOString(),
          brand_id: brand.id
        });
      }

      console.log(`✓ Researched ${trendingData.trends?.length || 0} trends for ${brand.name}`);
    } catch (error) {
      console.error(`Error researching trends for ${brand.name}:`, error);
    }
  };

  const researchGeneralTrends = async () => {
    try {
      const prompt = `Research trending topics from the LAST 7 DAYS across social media and news:

🔴 REQUIREMENTS:
1. Content from LAST 7 DAYS ONLY
2. Direct source URLs required for EACH trend
3. Validate information from actual platforms and provide specific examples

Sources: Instagram, TikTok, Twitter/X, YouTube, Google News, major news outlets

For EACH trend provide:
1. **title**: Catchy, attention-grabbing title
2. **source**: Platform name (e.g., TikTok, Instagram, Twitter, CNN)
3. **source_url**: REQUIRED - Direct URL to the trending content/article
4. **description**: What's happening and why it's trending
5. **trending_data**: Deep context with stats, quotes, specifics (e.g., number of shares, views, etc.)
6. **keywords**: Relevant hashtags and keywords
7. **viral_potential**: Score 1-10
8. **category**: Content niche/category (e.g., Fashion, Tech, Lifestyle, Current Events)
9. **duration_estimate**: How long this will trend (e.g., "short-term (days)", "medium-term (weeks)", "long-term (months)")

Return 12-15 distinct general trends.`;


      const trendingData = await prism.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            trends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  source: { type: "string" },
                  source_url: { type: "string" },
                  description: { type: "string" },
                  trending_data: { type: "string" },
                  keywords: { type: "array", items: { type: "string" } },
                  viral_potential: { type: "number" },
                  category: { type: "string" },
                  duration_estimate: { type: "string" }
                },
                required: ["title", "source", "source_url", "description", "trending_data", "keywords", "viral_potential", "category", "duration_estimate"]
              }
            }
          },
          required: ["trends"]
        }
      });

      const currentDate = new Date();
      const sevenDaysAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      for (const trend of trendingData.trends || []) {
        const expiresAt = new Date();
        // Set expiry based on estimate, default to 7 days if unknown
        if (trend.duration_estimate?.toLowerCase().includes('day') || trend.duration_estimate?.toLowerCase().includes('short')) expiresAt.setDate(expiresAt.getDate() + 7);
        else if (trend.duration_estimate?.toLowerCase().includes('week') || trend.duration_estimate?.toLowerCase().includes('medium')) expiresAt.setDate(expiresAt.getDate() + 14);
        else if (trend.duration_estimate?.toLowerCase().includes('month') || trend.duration_estimate?.toLowerCase().includes('long')) expiresAt.setDate(expiresAt.getDate() + 30);
        else expiresAt.setDate(expiresAt.getDate() + 7); // Default

        await prism.entities.TrendingTopic.create({
          ...trend,
          source: trend.source?.toLowerCase() || 'general',
          source_date: sevenDaysAgo.toISOString(),
          expires_at: expiresAt.toISOString()
        });
      }

      console.log(`✓ Researched ${trendingData.trends?.length || 0} general trends`);
    } catch (error) {
      console.error('Error researching general trends:', error);
    }
  };


  const [selectedIdea, setSelectedIdea] = useState(null); // Keep for now in case of other uses, though replaced by workflowIdea for detail.
  const [filterCategory, setFilterCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("ideas");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [analyzingAnalytics, setAnalyzingAnalytics] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [workflowIdea, setWorkflowIdea] = useState(null);
  const [selectedIdeaForDetail, setSelectedIdeaForDetail] = useState(null); // New state for detail modal
  const [initialWorkflowStep, setInitialWorkflowStep] = useState("idea_development"); // New state to hold the determined initial step

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ['contents'],
    queryFn: () => prism.entities.Content.list('-created_date'),
    initialData: [],
    enabled: !!user, // Only run query if user is authenticated
  });

  const { data: trends = [] } = useQuery({
    queryKey: ['trendingTopics'],
    queryFn: () => prism.entities.TrendingTopic.list('-created_date', 5),
    initialData: [],
    enabled: !!user, // Only run query if user is authenticated
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => prism.entities.Brand.list(),
    initialData: [],
    enabled: !!user, // Only run query if user is authenticated
  });

  const createIdeaMutation = useMutation({
    mutationFn: (data) => prism.entities.Content.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
    },
  });

  const createFromTrendMutation = useMutation({
    mutationFn: (data) => prism.entities.Content.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      toast.success("Idea saved!");
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: (id) => prism.entities.Content.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      toast.success("Idea deleted!");
    },
  });

  const duplicateContentMutation = useMutation({
    mutationFn: async (content) => {
      const duplicate = {
        original_input: content.original_input,
        input_type: content.input_type,
        ai_generated_title: `${content.ai_generated_title} (Copy)`,
        ai_generated_category: content.ai_generated_category,
        research_data: content.research_data,
        additional_context: content.additional_context,
        brand_content: content.brand_content,
        status: 'draft',
        viral_score: content.viral_score,
        tags: content.tags
      };
      return prism.entities.Content.create(duplicate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      toast.success("Idea duplicated!");
    },
    onError: (error) => {
      toast.error("Failed to duplicate: " + error.message);
    }
  });

  // Get content age limit for selected brand
  const getContentAgeLimit = () => {
    if (selectedBrand === "all") return 7; // Default 7 days
    const brand = brands.find(b => b.id === selectedBrand);
    return brand?.content_age_limit_days || 7;
  };

  // Filter by age
  const filterByAge = (items) => {
    const ageLimit = getContentAgeLimit();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageLimit);
    
    return items.filter(item => {
      const itemDate = new Date(item.created_date);
      return itemDate >= cutoffDate;
    });
  };

  // Filter contents by brand and age
  const allFilteredContents = selectedBrand === "all" 
    ? contents 
    : contents.filter(c => 
        c.brand_content?.some(bc => bc.brand_id === selectedBrand)
      );

  const filteredContents = filterByAge(allFilteredContents);

  const ideas = filteredContents.filter(c => c.status === 'draft' || c.status === 'researched');
  const generatedContent = filteredContents.filter(c => c.status === 'generated' || c.status === 'scheduled' || c.status === 'posted');

  const categories = ["all", ...new Set(filteredContents.map(i => i.ai_generated_category).filter(Boolean))];

  const filteredIdeas = filterCategory === "all" 
    ? ideas 
    : ideas.filter(i => i.ai_generated_category === filterCategory);

  const filteredGenerated = filterCategory === "all"
    ? generatedContent
    : generatedContent.filter(i => i.ai_generated_category === filterCategory);

  const allActiveTrends = trends.filter(t => 
    !t.used && 
    !t.hidden &&
    new Date(t.expires_at) > new Date() &&
    (selectedBrand === "all" || !t.brand_id || t.brand_id === selectedBrand)
  );

  const activeTrends = filterByAge(allActiveTrends);

  const displayItems = activeTab === "ideas" ? filteredIdeas : filteredGenerated;

  const handleCreateFromTrend = async (trend) => {
    // Save as content first
    const savedContent = await createFromTrendMutation.mutateAsync({
      original_input: `Trending: ${trend.title}\n\n${trend.description}`,
      input_type: "text",
      ai_generated_title: trend.title,
      ai_generated_category: trend.category,
      research_data: trend.trending_data,
      viral_score: trend.viral_potential,
      status: "researched",
      brand_content: selectedBrand !== "all" ? [{
        brand_id: selectedBrand,
        brand_name: brands.find(b => b.id === selectedBrand)?.name
      }] : [],
      preselected_brand: selectedBrand !== "all" ? selectedBrand : null
    });

    // Open workflow with saved content
    setWorkflowIdea(savedContent);
    setShowWorkflow(true);
    setSelectedIdeaForDetail(null); // Close detail modal if it was open
    setInitialWorkflowStep("idea_development"); // Trends start at idea development
  };

  const handleSaveIdeaFromTrend = async (trend) => {
    await createFromTrendMutation.mutateAsync({
      original_input: `Trending: ${trend.title}\n\n${trend.description}`,
      input_type: "text",
      ai_generated_title: trend.title,
      ai_generated_category: trend.category,
      research_data: trend.trending_data,
      viral_score: trend.viral_potential,
      status: "researched",
      brand_content: selectedBrand !== "all" ? [{
        brand_id: selectedBrand,
        brand_name: brands.find(b => b.id === selectedBrand)?.name
      }] : []
    });
  };

  // Function to open the detail modal for an idea
  const handleIdeaCardClick = (idea) => {
    setSelectedIdeaForDetail(idea);
  };

  // Modified handleCardClick to open workflow at correct step
  const handleIdeaClick = (idea) => { // This function now acts as 'onOpenWorkflow' for IdeaDetailModal
    // Determine initial step based on content status
    let step = "idea_development";
    if (idea.status === "text_generated") {
      step = "text_review";
    } else if (idea.status === "visuals_generated") {
      step = "visual_review";
    } else if (idea.status === "completed_draft" || idea.status === "scheduled" || idea.status === "posted") {
      step = "publish";
    }

    setWorkflowIdea(idea);
    setShowWorkflow(true);
    setSelectedIdeaForDetail(null); // Close detail modal when workflow opens
    setInitialWorkflowStep(step); // Set the determined step
  };

  const handleDeleteIdea = (ideaId) => {
    deleteContentMutation.mutate(ideaId);
  };

  const handleAnalyzeAnalytics = async () => {
    if (selectedBrand === "all") {
      toast.error("Please select a specific brand to analyze analytics");
      return;
    }

    setAnalyzingAnalytics(true);

    try {
      const brandData = brands.find(b => b.id === selectedBrand);
      const brandContents = contents.filter(c => 
        c.brand_content?.some(bc => bc.brand_id === selectedBrand) &&
        c.analytics
      );

      if (brandContents.length === 0) {
        toast.error("No analytics data found for this brand");
        setAnalyzingAnalytics(false);
        return;
      }

      // Analyze with AI
      const analyticsData = brandContents.map(c => ({
        title: c.ai_generated_title,
        category: c.ai_generated_category,
        platforms: c.platforms,
        analytics: c.analytics,
        viral_score: c.viral_score
      }));

      const response = await prism.integrations.Core.InvokeLLM({
        prompt: `You are a social media analytics expert. Analyze this content performance data for ${brandData.name}:

${JSON.stringify(analyticsData, null, 2)}

Provide a comprehensive analysis including:
1. Best performing content types and topics
2. Optimal posting times and frequencies
3. Audience engagement patterns
4. Content format preferences (video vs image vs text)
5. Hashtag and keyword effectiveness
6. Viral content characteristics
7. Actionable recommendations for future content

Brand Context:
- Target Audience: ${brandData.target_audience || 'Not specified'}
- Brand Values: ${brandData.brand_values || 'Not specified'}

Be specific and actionable.`,
        add_context_from_internet: false
      });

      // Show analysis in a modal or toast
      toast.success("Analytics analyzed! Check console for details.");
      console.log("Analytics Analysis:", response);

      // Optionally save analysis to brand or content
      
    } catch (error) {
      console.error("Analytics analysis error:", error);
      toast.error("Failed to analyze analytics");
    }

    setAnalyzingAnalytics(false);
  };

  const selectedBrandData = brands.find(b => b.id === selectedBrand);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
      }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#88925D' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ 
      background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
    }}>
      {/* Animated ethereal background with multiple layers */}
      <div className="fixed inset-0 opacity-20 pointer-events-none"
           style={{
             backgroundImage: `
               radial-gradient(circle at 20% 20%, rgba(229, 165, 116, 0.15) 0%, transparent 50%),
               radial-gradient(circle at 80% 80%, rgba(168, 143, 168, 0.15) 0%, transparent 50%),
               radial-gradient(circle at 50% 50%, rgba(127, 184, 191, 0.1) 0%, transparent 70%)
             `,
             backgroundSize: '100% 100%',
             animation: 'pulse 8s ease-in-out infinite'
           }}
      />
      
      {/* Floating ethereal orbs */}
      <div className="fixed top-1/4 left-1/3 w-64 h-64 rounded-full opacity-10 blur-3xl"
           style={{
             background: 'radial-gradient(circle, rgba(229, 165, 116, 0.6) 0%, transparent 70%)',
             animation: 'float 10s ease-in-out infinite'
           }}
      />
      <div className="fixed bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-10 blur-3xl"
           style={{
             background: 'radial-gradient(circle, rgba(127, 184, 191, 0.6) 0%, transparent 70%)',
             animation: 'float 12s ease-in-out infinite',
             animationDelay: '3s'
           }}
      />
      
      {/* Hero Section with Input */}
      <div className="border-b backdrop-blur-sm relative"
           style={{ 
             borderColor: 'rgba(229, 165, 116, 0.3)'
           }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
          {/* Brand Selector */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block" style={{ color: '#3D3D2B' }}>
              Select Brand
            </label>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="rounded-xl border-2 max-w-full md:max-w-md h-12" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
                <SelectValue placeholder="Select a brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌐 All Brands</SelectItem>
                {brands.map(brand => (
                  <SelectItem key={brand.id} value={brand.id}>
                    <div className="flex items-center gap-2">
                      {brand.primary_color && (
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: brand.primary_color }} />
                      )}
                      {brand.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBrand !== "all" && selectedBrandData && (
              <p className="text-xs mt-2" style={{ color: '#8B7355' }}>
                Showing content from the last {selectedBrandData.content_age_limit_days || 7} days
              </p>
            )}
          </div>

          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full mb-3 md:mb-4 ethereal-glow"
                 style={{ 
                   background: 'linear-gradient(135deg, rgba(229, 165, 116, 0.9) 0%, rgba(232, 180, 77, 0.8) 100%)',
                   color: '#3D3D2B',
                   backdropFilter: 'blur(10px)',
                   boxShadow: '0 4px 20px rgba(229, 165, 116, 0.3)'
                 }}>
              <Sparkles className="w-3 md:w-4 h-3 md:h-4" />
              <span className="text-xs md:text-sm font-medium">Your Personal Content Ideas</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3" style={{ 
              color: '#3D3D2B',
              textShadow: '0 2px 20px rgba(166, 124, 82, 0.2)'
            }}>
              Turn Your Ideas Into Viral Content
            </h1>
            <p className="text-base md:text-xl mb-1 md:mb-2 px-4" style={{ color: '#6B6B4D' }}>
              {selectedBrand !== "all" && selectedBrandData 
                ? `Creating content for ${selectedBrandData.name}`
                : "Share an idea, paste a link, or speak your thoughts"
              }
            </p>
            <p className="text-xs md:text-sm px-4" style={{ color: '#8B7355' }}>
              Want AI-researched trending topics? Visit <Link to={createPageUrl("Trends")} className="font-semibold underline">Trends →</Link>
            </p>
          </div>

          <IdeaInput 
            onSubmit={(data) => createIdeaMutation.mutate({
              ...data,
              brand_content: selectedBrand !== "all" ? [{
                brand_id: selectedBrand,
                brand_name: selectedBrandData?.name
              }] : [],
              preselected_brand: selectedBrand !== "all" ? selectedBrand : null
            })} 
            isLoading={createIdeaMutation.isPending} 
          />
        </div>
      </div>

      {/* Analytics Section */}
      {selectedBrand !== "all" && (
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 relative z-10">
          <Card className="border-0 rounded-2xl shadow-lg crystal-shine" style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.75) 100%)',
            backdropFilter: 'blur(16px)'
          }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1 flex items-center gap-2" style={{ color: '#3D3D2B' }}>
                    <BarChart3 className="w-5 h-5" />
                    Social Media Analytics
                  </h3>
                  <p className="text-sm" style={{ color: '#8B7355' }}>
                    Import and analyze performance data for ${selectedBrandData?.name}
                  </p>
                </div>
                <Button
                  onClick={handleAnalyzeAnalytics}
                  disabled={analyzingAnalytics}
                  className="rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                    color: 'white'
                  }}
                >
                  {analyzingAnalytics ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analyze Performance
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trending Topics Preview */}
      {activeTrends.length > 0 && !showWorkflow && (
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2" style={{ color: '#3D3D2B' }}>
              <TrendingUp className="w-5 md:w-6 h-5 md:h-6" />
              Trending Now
            </h2>
            <Link to={createPageUrl("Trends")} 
                  className="text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ color: '#88925D' }}>
              View All Trends →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeTrends.slice(0, 3).map(trend => (
              <Card key={trend.id} 
                    className="border rounded-3xl hover:shadow-2xl transition-all crystal-shine relative overflow-hidden"
                    style={{ 
                      borderColor: 'rgba(180, 150, 120, 0.3)',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(244, 220, 200, 0.85) 100%)',
                      backdropFilter: 'blur(16px)',
                      boxShadow: `
                        0 8px 24px rgba(166, 124, 82, 0.15), 
                        0 0 40px rgba(229, 165, 116, 0.1),
                        inset 0 1px 0 rgba(255, 255, 255, 0.5)
                      `
                    }}>
                <CardContent className="p-4 relative z-10">
                  <Badge className="mb-2 ethereal-glow" style={{
                    background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                    color: 'white'
                  }}>
                    🔥 {trend.source}
                  </Badge>
                  <h3 className="font-semibold mb-2 line-clamp-2" style={{ color: '#3D3D2B' }}>
                    {trend.title}
                  </h3>
                  <p className="text-sm line-clamp-2 mb-3" style={{ color: '#6B6B4D' }}>
                    {trend.description}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCreateFromTrend(trend)}
                      size="sm"
                      className="flex-1 rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                        color: 'white'
                      }}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Create
                    </Button>
                    <Button
                      onClick={() => handleSaveIdeaFromTrend(trend)}
                      disabled={createFromTrendMutation.isPending}
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-xl"
                      style={{ borderColor: 'rgba(136, 146, 93, 0.4)' }}
                    >
                      <Lightbulb className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Ideas & Generated Content Sections */}
      {!showWorkflow && (
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 relative z-10">
          {/* Tab Switcher */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setActiveTab("ideas")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === "ideas" ? "shadow-lg" : ""
              }`}
              style={{
                background: activeTab === "ideas"
                  ? 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)'
                  : 'rgba(255, 255, 255, 0.6)',
                color: activeTab === "ideas" ? 'white' : '#6B6B4D',
                border: activeTab === "ideas" ? 'none' : '2px solid rgba(180, 150, 120, 0.3)'
              }}
            >
              <Lightbulb className="w-5 h-5" />
              Ideas ({ideas.length})
            </button>
            <button
              onClick={() => setActiveTab("generated")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === "generated" ? "shadow-lg" : ""
              }`}
              style={{
                background: activeTab === "generated"
                  ? 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)'
                  : 'rgba(255, 255, 255, 0.6)',
                color: activeTab === "generated" ? 'white' : '#6B6B4D',
                border: activeTab === "generated" ? 'none' : '2px solid rgba(180, 150, 120, 0.3)'
              }}
            >
              <Zap className="w-5 h-5" />
              Generated ({generatedContent.length})
            </button>
          </div>

          <IdeasGrid 
            ideas={displayItems}
            categories={categories}
            selectedCategory={filterCategory}
            onCategoryChange={setFilterCategory}
            onIdeaClick={handleIdeaCardClick} // Changed to open detail modal first
            onIdeaDelete={handleDeleteIdea}
            onIdeaDuplicate={(idea) => duplicateContentMutation.mutate(idea)}
            isLoading={isLoading}
            emptyMessage={activeTab === "ideas" 
              ? "No ideas yet. Capture your first idea above or save trending topics!"
              : "No generated content yet. Generate content from your ideas!"
            }
          />
        </div>
      )}

      {showWorkflow && workflowIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{
          background: 'rgba(61, 61, 43, 0.7)',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="w-full max-w-7xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden" style={{
            background: 'linear-gradient(135deg, #FFF8F0 0%, #FFECD1 50%, #FFE5D9 100%)'
          }}>
            <ContentCreationWorkflow
              initialIdea={workflowIdea}
              onClose={() => {
                setShowWorkflow(false);
                setWorkflowIdea(null);
                setSelectedIdea(null);
                setSelectedIdeaForDetail(null);
                setInitialWorkflowStep("idea_development");
              }}
              onComplete={() => {
                setShowWorkflow(false);
                setWorkflowIdea(null);
                setSelectedIdea(null);
                setSelectedIdeaForDetail(null);
                queryClient.invalidateQueries({ queryKey: ['contents'] });
                setInitialWorkflowStep("idea_development");
              }}
              initialStep={initialWorkflowStep}
            />
          </div>
        </div>
      )}

      {/* Idea Detail Modal */}
      {selectedIdeaForDetail && !showWorkflow && (
        <IdeaDetailModal
          idea={selectedIdeaForDetail}
          brands={brands}
          onClose={() => setSelectedIdeaForDetail(null)}
          onOpenWorkflow={handleIdeaClick} // Use handleIdeaClick to open the workflow
        />
      )}
    </div>
  );
}
