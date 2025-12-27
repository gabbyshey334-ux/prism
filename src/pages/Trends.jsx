
import React, { useState, useEffect } from "react";
import { prism } from "@/api/prismClient";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TrendingUp, Sparkles, Loader2, Plus, RefreshCw, Flame, Search, X, Calendar, ArrowUpDown, Lightbulb, LineChart, ExternalLink } from "lucide-react";
import { format, subWeeks, startOfDay, endOfDay, parseISO, isWithinInterval } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";

const sources = [
  { id: "all", name: "All Sources", icon: "🌐" },
  { id: "instagram", name: "Instagram", icon: "📸" },
  { id: "tiktok", name: "TikTok", icon: "🎵" },
  { id: "twitter", name: "Twitter/X", icon: "🐦" },
  { id: "youtube", name: "YouTube", icon: "🎥" },
  { id: "rss", name: "RSS Feeds", icon: "📰" },
  { id: "general", name: "General", icon: "✨" }
];

// Helper function to create page URLs. This could be in a separate utility file.
// For this component, it's assumed "Generate" maps to "/generate"
const createPageUrl = (pageName) => {
  if (pageName === "Dashboard") { // Changed from "Generate" to "Dashboard" based on usage in handleTrendClick
    return "/dashboard";
  }
  // Fallback for other pages, if any
  return `/${pageName.toLowerCase()}`;
};

// TrendDetailModal Component
const TrendDetailModal = ({ trend, onClose, onCreateContent, onSaveIdea }) => {
  if (!trend) return null;

  const isRssTrend = trend.source?.toLowerCase().startsWith('rss -');
  const sourceInfo = isRssTrend
    ? trend.source // Display the full "RSS - [Feed Name] ([Domain])" string
    : sources.find(s => s.id === trend.source)?.name || trend.source; // Fallback to source name or raw source

  const sourceIcon = isRssTrend
    ? sources.find(s => s.id === 'rss')?.icon
    : sources.find(s => s.id === trend.source)?.icon;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto max-h-[90vh] rounded-3xl p-6 bg-background text-foreground"
        aria-labelledby="trend-modal-title"
        aria-describedby="trend-modal-description"
      >
        <DialogHeader>
          <DialogTitle id="trend-modal-title" className="text-2xl font-bold mb-2 flex items-center gap-2">
            {sourceIcon && <span className="text-xl">{sourceIcon}</span>}
            {trend.title}
          </DialogTitle>
          <DialogDescription id="trend-modal-description" className="text-sm">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge style={{
                backgroundColor: trend.viral_potential >= 8 ? 'var(--accent-yellow)' : 'var(--accent-light)',
                color: trend.viral_potential >= 8 ? 'var(--primary-dark)' : 'var(--text)'
              }}>
                {trend.viral_potential >= 8 ? (
                  <>
                    <Flame className="w-3 h-3 mr-1" />
                    Hot Trend
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Trending
                  </>
                )}
              </Badge>
              <Badge variant="outline" style={{ borderColor: 'var(--border)', color: 'var(--text)', fontSize: '0.7rem' }}>
                {sourceInfo}
              </Badge>
              {trend.category && (
                <Badge variant="outline" className="text-xs" style={{ borderColor: 'var(--accent)', color: 'var(--primary-dark)' }}>
                  {trend.category}
                </Badge>
              )}
            </div>
            <p className="mb-2 text-md" style={{ color: 'var(--text-muted)' }}>
              {trend.description}
            </p>
            {trend.source_url && (
              <a
                href={trend.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#88925D] hover:underline flex items-center gap-1 mt-2"
              >
                <ExternalLink className="w-4 h-4" />
                View Original Source
              </a>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 border-t border-b" style={{ borderColor: 'var(--border)' }}>
          {trend.trending_data && (
            <div>
              <h4 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Deep Context:</h4>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>{trend.trending_data}</p>
            </div>
          )}

          {trend.brand_relevance && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }}>
              <h4 className="text-xs font-medium mb-1" style={{ color: 'var(--primary-dark)' }}>Why this matters to your brand:</h4>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{trend.brand_relevance}</p>
            </div>
          )}

          {trend.keywords && trend.keywords.length > 0 && (
            <div>
              <h4 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Keywords & Hashtags:</h4>
              <div className="flex flex-wrap gap-2">
                {trend.keywords.map((keyword, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 rounded-lg"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--text)' }}>
                    #{keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm pt-2" style={{ color: 'var(--text-muted)' }}>
            <span>Viral Potential: <span className="font-semibold" style={{ color: trend.viral_potential >= 7 ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>{trend.viral_potential}/10</span></span>
            <span>Est. Duration: {trend.duration_estimate || 'N/A'}</span>
            <span>Date: {trend.source_date ? format(new Date(trend.source_date), 'MMM d, yyyy') : format(new Date(trend.created_date), 'MMM d, yyyy')}</span>
          </div>
        </div>

        <DialogFooter className="flex-col md:flex-row gap-2 pt-4">
          <Button
            onClick={() => onCreateContent(trend)}
            className="flex-1 rounded-xl w-full"
            style={{
              background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
              color: 'white'
            }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Create Content
          </Button>
          <Button
            onClick={() => onSaveIdea(trend)}
            variant="outline"
            className="flex-1 rounded-xl w-full"
            style={{ borderColor: 'var(--border)' }}
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            Save Idea
          </Button>
          <DialogClose asChild>
            <Button variant="ghost" className="flex-1 rounded-xl w-full">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Define keyframe animations using a string for dangerouslySetInnerHTML
// In a real application, these would ideally be in a global CSS file or handled by a CSS-in-JS library.
const animationStyles = `
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes float {
  0% { transform: translateY(0) translateX(0) scale(1); }
  25% { transform: translateY(-10px) translateX(5px) scale(1.02); }
  50% { transform: translateY(0) translateX(0) scale(1); }
  75% { transform: translateY(10px) translateX(-5px) scale(0.98); }
  100% { transform: translateY(0) translateX(0) scale(1); }
}
`;


export default function Trends() {
  const queryClient = useQueryClient();
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  // New states for date filtering and sorting
  const [dateRange, setDateRange] = useState("2weeks"); // "all", "1week", "2weeks", "1month", "custom"
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [sortBy, setSortBy] = useState("date"); // "date", "viral", "source"
  const [showHidden, setShowHidden] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState(null); // New state for detail modal

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication (optional - trends can be viewed without auth)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await prism.auth.isAuthenticated();
        if (!isAuth) {
          console.log('[Trends Page] User not authenticated - showing public trends');
          // Don't redirect - allow viewing public trends
        }
      } catch (error) {
        console.warn('[Trends Page] Auth check failed:', error);
        // Continue anyway - trends should be publicly accessible
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);


  // Get content age limit for selected brand
  const getContentAgeLimit = () => {
    if (selectedBrand === "all") return 7; // Default 7 days if no specific brand selected
    const brand = brands.find(b => b.id === selectedBrand);
    return brand?.content_age_limit_days || 7; // Use brand-specific limit or default to 7 days
  };

  const { data: trendsData = { trends: [] }, isLoading, error: trendsError } = useQuery({
    queryKey: ['trendingTopics', selectedBrand, searchQuery, showHidden, selectedSource, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('search', searchQuery);
      if (selectedSource !== 'all') params.append('category', selectedSource);
      if (showHidden) params.append('is_hidden', 'true'); else params.append('is_hidden', 'false');
      if (selectedBrand !== 'all') params.append('brand_id', selectedBrand);
      if (sortBy === 'viral') params.append('sort_by', 'relevance_score');
      if (sortBy === 'date') params.append('sort_by', 'created_at');
      
      // Log the request for debugging
      console.log('[Trends Page] Fetching trends with params:', {
        selectedBrand,
        brand_id: selectedBrand !== 'all' ? selectedBrand : 'all',
        category: selectedSource,
        search: searchQuery,
        is_hidden: showHidden,
        sort_by: sortBy,
        url: `/api/trending_topics?${params.toString()}`
      });
      
      // Use full URL to avoid any proxy/redirect issues
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://octopus-app-73pgz.ondigitalocean.app/api';
      const fullUrl = `${apiBaseUrl}/trending_topics?${params.toString()}`;
      
      console.log('[Trends Page] Full URL:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'omit' // Don't send cookies/credentials for public endpoint
      });
      
      console.log('[Trends Page] Response status:', response.status);
      console.log('[Trends Page] Response content-type:', response.headers.get('content-type'));
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData = {};
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json().catch(() => ({}));
        } else {
          // Got HTML instead of JSON - likely a server error or redirect
          const textResponse = await response.text();
          console.error('[Trends Page] Got HTML instead of JSON:', textResponse.substring(0, 200));
          throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
        }
        
        console.error('[Trends Page] API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.message || `Failed to fetch trends: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Log the response for debugging
      console.log('[Trends Page] Trends fetched:', {
        selectedBrand,
        brand_id: selectedBrand !== 'all' ? selectedBrand : 'all',
        trends_count: data.trends?.length || 0,
        total: data.total,
        trends_with_brand_id: data.trends?.filter(t => t.brand_id)?.length || 0,
        trends_without_brand_id: data.trends?.filter(t => !t.brand_id)?.length || 0
      });
      
      return data;
    },
    initialData: { trends: [] },
    enabled: true, // Always enabled - don't wait for auth check
    retry: 2,
    retryDelay: 1000,
  });

  const trends = trendsData.trends || [];

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

  const createTrendMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/trending_topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create trend');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trendingTopics'] });
      toast.success('Trend created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create trend: ${error.message}`);
    }
  });

  const updateTrendMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/trending_topics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update trend');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trendingTopics'] });
      toast.success('Trend updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update trend: ${error.message}`);
    }
  });

  // createContentMutation is now used in this component
  const createContentMutation = useMutation({
    mutationFn: (data) => prism.entities.Content.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] }); // Invalidate contents query when new content is created
      toast.success("Content idea saved!");
    },
  });

  const researchTrends = async () => {
    setIsResearching(true);

    try {
      const selectedBrandData = selectedBrand !== "all"
        ? brands.find(b => b.id === selectedBrand)
        : null;

      // Build brand context for LLM
      const brandContext = selectedBrandData
        ? `Brand: ${selectedBrandData.name}\nIndustry: ${selectedBrandData.industry || 'General'}\nAudience: ${selectedBrandData.target_audience || 'General audience'}\nValues: ${selectedBrandData.brand_values || 'Quality content'}`
        : 'General content creation brand';

      // Build niche from brand data
      const niche = selectedBrandData?.industry || 'content creation';

      // Use the new LLM research endpoint via API client
      console.log('Researching trends with brand context:', brandContext);
      const result = await api.post('/trending_topics/research', {
          brand_context: brandContext,
          niche: niche,
          content_type: 'social media',
          count: 10
      }).then(res => res.data).catch(error => {
        console.error('Research API error:', error.response?.status, error.response?.data || error.message);
        throw new Error(`Research failed: ${error.response?.statusText || error.message}`);
      });
      
      if (result.success && result.trends && result.trends.length > 0) {
        // Use the bulk create endpoint to save all trends at once
        const trendsToSave = result.trends.map(trend => ({
          ...trend,
          brand_id: selectedBrand !== "all" ? selectedBrand : null,
          source: trend.category?.toLowerCase() || 'general',
          viral_potential: trend.relevance_score ? Math.round(trend.relevance_score / 10) : 7,
          source_date: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }));

        // Save trends using bulk endpoint via API client
        console.log('Saving trends:', trendsToSave.length);
        await api.post('/trending_topics/bulk', { trends: trendsToSave })
          .then(res => res.data)
          .catch(error => {
            console.error('Bulk save error:', error.response?.status, error.response?.data || error.message);
            throw new Error(`Failed to save trends: ${error.response?.statusText || error.message}`);
          });

        // Refresh the trends list
        queryClient.invalidateQueries({ queryKey: ['trendingTopics'] });
        
        toast.success(`Discovered ${result.trends.length} trending topics using ${result.source === 'llm' ? 'AI' : 'fallback'}!`);
      } else {
        toast.error("No trends were generated. Please try again.");
      }
    } catch (error) {
      console.error("Error researching trends:", error);
      toast.error(`Failed to research trends: ${error.message}`);
    }

    setIsResearching(false);
  };

  const handleTrendCardClick = (trend) => {
    setSelectedTrend(trend);
  };

  const handleTrendClick = async (trend) => {
    // Close the modal first for a smoother transition to dashboard
    setSelectedTrend(null);

    // Save as idea/content
    const savedContent = await createContentMutation.mutateAsync({
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

    // Mark trend as used
    await updateTrendMutation.mutateAsync({
      id: trend.id,
      data: { ...trend, used: true }
    });

    // Navigate to Dashboard with workflow - using URL params instead of state
    const params = new URLSearchParams({
      ideaId: savedContent.id,
      openWorkflow: 'true',
      initialStep: 'idea_development'
    });
    window.location.href = createPageUrl("Dashboard") + `?${params.toString()}`;
  };

  const handleSaveIdea = async (trend, e) => {
    if (e) {
      e.stopPropagation(); // Prevent card onClick from firing again if called from card
    }

    // Save as idea/content
    await createContentMutation.mutateAsync({
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
      preselected_brand: selectedBrand !== "all" ? selectedBrand : null // Added for brand context
    });

    // Mark trend as used
    await updateTrendMutation.mutateAsync({
      id: trend.id,
      data: { ...trend, used: true }
    });

    // Close modal if open after saving idea
    setSelectedTrend(null);

    // toast.success("Idea saved!"); // Toast is handled by createContentMutation onSuccess
  };

  const handleHideTrend = async (trendId, e) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/trending_topics/${trendId}/hide`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: true })
      });
      if (!response.ok) throw new Error('Failed to hide trend');
      queryClient.invalidateQueries({ queryKey: ['trendingTopics'] });
      toast.success("Trend hidden");
    } catch (error) {
      toast.error(`Failed to hide trend: ${error.message}`);
    }
  };

  const handleUnhideTrend = async (trendId) => {
    try {
      const response = await fetch(`/api/trending_topics/${trendId}/hide`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: false })
      });
      if (!response.ok) throw new Error('Failed to restore trend');
      queryClient.invalidateQueries({ queryKey: ['trendingTopics'] });
      toast.success("Trend restored");
    } catch (error) {
      toast.error(`Failed to restore trend: ${error.message}`);
    }
  };

  // Date filtering logic
  const getDateRangeFilter = () => {
    const now = new Date();

    switch (dateRange) {
      case "1week":
        return { start: subWeeks(now, 1), end: now };
      case "2weeks":
        return { start: subWeeks(now, 2), end: now };
      case "1month":
        return { start: subWeeks(now, 4), end: now };
      case "custom":
        if (customStartDate && customEndDate) {
          return {
            start: startOfDay(parseISO(customStartDate)),
            end: endOfDay(parseISO(customEndDate))
          };
        }
        return null;
      default:
        return null; // "all"
    }
  };

  let preFilteredAndSortedTrends = trends;

  // Apply source filter
  if (selectedSource !== "all") {
    // If selectedSource is 'rss', filter by anything starting with 'rss -'
    if (selectedSource === 'rss') {
      preFilteredAndSortedTrends = preFilteredAndSortedTrends.filter(t => t.source?.toLowerCase().startsWith('rss -'));
    } else {
      // For other sources, filter by exact match after converting to lowercase
      preFilteredAndSortedTrends = preFilteredAndSortedTrends.filter(t => t.source?.toLowerCase() === selectedSource);
    }
  }

  // Apply brand filter (backend now handles this, but keep as client-side backup)
  // Note: Backend should be filtering by brand_id, but we keep this as a safety net
  if (selectedBrand !== "all") {
    const beforeCount = preFilteredAndSortedTrends.length;
    preFilteredAndSortedTrends = preFilteredAndSortedTrends.filter(t => t.brand_id === selectedBrand);
    const afterCount = preFilteredAndSortedTrends.length;
    if (beforeCount !== afterCount && beforeCount > 0) {
      console.warn('[Trends Page] Client-side brand filter applied:', {
        selectedBrand,
        beforeCount,
        afterCount,
        message: 'Backend may not be filtering correctly - client-side filter applied'
      });
    }
  } else {
    // If "All Brands" is selected, show all trends returned by backend
    // Backend returns all trends (both global and brand-specific) when brand_id is "all"
    console.log('[Trends Page] Showing all trends (no brand filter)');
  }

  // Apply search query filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    preFilteredAndSortedTrends = preFilteredAndSortedTrends.filter(t =>
      t.title?.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query) ||
      t.keywords?.some(k => k.toLowerCase().includes(query)) ||
      t.source?.toLowerCase().includes(query) // Include source in search
    );
  }

  // Apply date range filter
  const dateFilterRange = getDateRangeFilter();
  if (dateFilterRange) {
    preFilteredAndSortedTrends = preFilteredAndSortedTrends.filter(t => {
      // Use source_date if available, otherwise fallback to created_date
      const trendDate = parseISO(t.source_date || t.created_date);
      return isWithinInterval(trendDate, { start: dateFilterRange.start, end: dateFilterRange.end });
    });
  }

  // Apply age filter based on brand settings
  const ageLimit = getContentAgeLimit();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - ageLimit);

  preFilteredAndSortedTrends = preFilteredAndSortedTrends.filter(t => {
    const trendDate = new Date(t.source_date || t.created_date);
    return trendDate >= cutoffDate;
  });

  // Apply sorting
  preFilteredAndSortedTrends = [...preFilteredAndSortedTrends].sort((a, b) => {
    switch (sortBy) {
      case "viral":
        return (b.viral_potential || 0) - (a.viral_potential || 0);
      case "source":
        return (a.source || "").localeCompare(b.source || "");
      case "date":
      default:
        // Sort by source_date first, then fallback to created_date
        const dateA = new Date(a.source_date || a.created_date);
        const dateB = new Date(b.source_date || b.created_date);
        return dateB.getTime() - dateA.getTime();
    }
  });

  // Categorize into active, used, and hidden
  const activeTrends = preFilteredAndSortedTrends.filter(t => !t.used && !t.hidden && new Date(t.expires_at) > new Date());
  const usedTrends = preFilteredAndSortedTrends.filter(t => t.used && !t.hidden);
  const hiddenTrends = preFilteredAndSortedTrends.filter(t => t.hidden);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#88925D' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8" style={{
      background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
    }}>
      {/* Embed the keyframes */}
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />

      {/* Animated ethereal background */}
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

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>
              Trending Topics
            </h1>
            <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>
              AI-researched viral content opportunities from this week
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mt-2" style={{
              background: 'linear-gradient(135deg, rgba(232, 180, 77, 0.15) 0%, rgba(229, 165, 116, 0.15) 100%)',
              border: '1px solid rgba(229, 165, 116, 0.3)'
            }}>
              <Sparkles className="w-4 h-4" style={{ color: '#E8B44D' }} />
              <span className="text-sm font-medium" style={{ color: '#5E4032' }}>
                Trends are researched weekly from Instagram, TikTok, Twitter, YouTube, RSS feeds & more
              </span>
            </div>
          </div>
          <div className="flex gap-4">
            {/* Analytics Menu Button */}
            <Button
              className="rounded-xl shadow-md"
              variant="outline"
              // onClick={() => { /* Navigate to analytics page */ }}
              style={{ borderColor: 'var(--border)' }}
            >
              <LineChart className="w-5 h-5 mr-2" />
              Analytics
            </Button>
            <Button
              onClick={researchTrends}
              disabled={isResearching}
              className="rounded-xl shadow-md"
              style={{
                background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                color: 'white'
              }}
            >
              {isResearching ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Research {selectedBrand !== "all" ? "Brand" : ""} Trends
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Brand Selection & Search */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-1">
            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
              Filter by Brand
            </label>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'var(--border)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌐 Hot Right Now (All)</SelectItem>
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
            {selectedBrand !== "all" && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Showing trends from last {getContentAgeLimit()} days
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
              Search Trends
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: 'var(--text-muted)' }} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by keyword, topic, hashtag, or source..."
                className="pl-10 rounded-xl border-2"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
          </div>
        </div>

        {/* New: Date Range and Sort Controls */}
        <Card className="border-0 rounded-2xl shadow-sm mb-6 crystal-shine" style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(125, 90, 74, 0.3)'
        }}>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date Range
                </label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'var(--border)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="1week">Last Week</SelectItem>
                    <SelectItem value="2weeks">Last 2 Weeks</SelectItem>
                    <SelectItem value="1month">Last Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateRange === "custom" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="rounded-xl border-2"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="rounded-xl border-2"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
                  <ArrowUpDown className="w-4 h-4 inline mr-1" />
                  Sort By
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'var(--border)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Latest First</SelectItem>
                    <SelectItem value="viral">Viral Score</SelectItem>
                    <SelectItem value="source">Source</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setShowHidden(!showHidden)}
                  className="w-full rounded-xl"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {showHidden ? "Hide Hidden" : `Show Hidden (${hiddenTrends.length})`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Source Filter */}
        <Tabs value={selectedSource} onValueChange={setSelectedSource} className="mb-6">
          <TabsList className="bg-white rounded-xl border-2 p-1 flex-wrap h-auto gap-2"
            style={{ borderColor: 'var(--border)' }}>
            {sources.map(source => (
              <TabsTrigger
                key={source.id}
                value={source.id}
                className="rounded-lg px-4"
                style={{
                  backgroundColor: selectedSource === source.id ? 'var(--card-hover)' : 'transparent',
                  color: selectedSource === source.id ? 'var(--primary-dark)' : 'var(--text)'
                }}
              >
                <span className="mr-2">{source.icon}</span>
                {source.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Loading trends...</p>
          </div>
        ) : trendsError ? (
          <Card className="p-12 text-center border-0 rounded-2xl" style={{ backgroundColor: 'var(--card)' }}>
            <TrendingUp className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xl mb-2" style={{ color: 'var(--text)' }}>
              Error loading trends
            </p>
            <p style={{ color: 'var(--text-muted)' }}>
              {trendsError.message || 'An error occurred while fetching trends. Please try again.'}
            </p>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['trendingTopics'] })}
              className="mt-4 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                color: 'white'
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </Card>
        ) : activeTrends.length === 0 && usedTrends.length === 0 && (!showHidden || hiddenTrends.length === 0) ? (
          <Card className="p-12 text-center border-0 rounded-2xl" style={{ backgroundColor: 'var(--card)' }}>
            <TrendingUp className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xl mb-2" style={{ color: 'var(--text)' }}>
              {searchQuery ? 'No trends match your search' : 'No trending topics yet'}
            </p>
            <p style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? 'Try a different search term' :
                `Click "Research ${selectedBrand !== "all" ? "Brand " : ""}Trends" to discover viral content opportunities${selectedBrand !== "all" && brands.find(b => b.id === selectedBrand)?.rss_feeds?.length > 0 ? ' including news from your RSS feeds' : ''}`}
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Active Trends */}
            {activeTrends.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4" style={{ color: '#3D3D2B' }}>
                  🔥 {selectedBrand !== "all"
                    ? `${brands.find(b => b.id === selectedBrand)?.name} Trends`
                    : "Hot Right Now"} ({activeTrends.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeTrends.map(trend => {
                    const isRssTrend = trend.source?.toLowerCase().startsWith('rss -');
                    const sourceInfo = isRssTrend
                      ? trend.source
                      : sources.find(s => s.id === trend.source)?.name || trend.source;

                    const sourceIcon = isRssTrend
                      ? sources.find(s => s.id === 'rss')?.icon
                      : sources.find(s => s.id === trend.source)?.icon;

                    return (
                      <Card
                        key={trend.id}
                        onClick={() => handleTrendCardClick(trend)}
                        className="border-2 rounded-3xl hover:shadow-2xl transition-all relative group flex flex-col cursor-pointer overflow-hidden"
                        style={{
                          borderColor: 'rgba(229, 165, 116, 0.3)',
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(244, 220, 200, 0.85) 100%)',
                          backdropFilter: 'blur(16px)',
                          boxShadow: `
                      0 8px 24px rgba(166, 124, 82, 0.15),
                      0 0 40px rgba(229, 165, 116, 0.1),
                      inset 0 1px 0 rgba(255, 255, 255, 0.5)
                    `
                        }}
                      >
                        <CardContent className="p-6 flex-1 flex flex-col">
                          {/* Hide button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleHideTrend(trend.id, e)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-gray-100 rounded-full z-10"
                            aria-label="Hide trend"
                          >
                            <X className="w-4 h-4" />
                          </Button>

                          <div className="space-y-3 flex-1 flex flex-col">
                            {/* Header with badges */}
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <Badge style={{
                                backgroundColor: trend.viral_potential >= 8 ? '#E8B44D' : 'rgba(136, 146, 93, 0.15)',
                                color: trend.viral_potential >= 8 ? '#3D3D2B' : '#5E4032'
                              }}>
                                {trend.viral_potential >= 8 ? (
                                  <>
                                    <Flame className="w-3 h-3 mr-1" />
                                    Hot
                                  </>
                                ) : (
                                  <>
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    Trending
                                  </>
                                )}
                              </Badge>
                              <Badge variant="outline" style={{ borderColor: 'rgba(229, 165, 116, 0.4)', color: '#8B7355', fontSize: '0.7rem' }}>
                                {sourceIcon} {sourceInfo}
                              </Badge>
                            </div>

                            {/* Title */}
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-2 line-clamp-2" style={{ color: '#3D3D2B' }}>
                                {trend.title}
                              </h3>
                              <p className="text-sm line-clamp-3 mb-3" style={{ color: '#8B7355' }}>
                                {trend.description}
                              </p>

                              {trend.source_url && (
                                <a
                                  href={trend.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs hover:underline flex items-center gap-1 mb-2"
                                  style={{ color: '#88925D' }}
                                >
                                  🔗 View Source
                                </a>
                              )}
                            </div>

                            {/* Brand relevance */}
                            {trend.brand_relevance && (
                              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(232, 180, 77, 0.1)' }}>
                                <p className="text-xs font-medium mb-1" style={{ color: '#5E4032' }}>
                                  Why this matters:
                                </p>
                                <p className="text-xs line-clamp-2" style={{ color: '#8B7355' }}>
                                  {trend.brand_relevance}
                                </p>
                              </div>
                            )}

                            {trend.keywords && trend.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {trend.keywords.slice(0, 3).map((keyword, idx) => (
                                  <span key={idx} className="text-xs px-2 py-1 rounded-lg"
                                    style={{ backgroundColor: 'rgba(136, 146, 93, 0.1)', color: '#5E4032' }}>
                                    #{keyword}
                                  </span>
                                ))}
                                {trend.keywords.length > 3 && (
                                  <span className="text-xs px-2 py-1 rounded-lg"
                                    style={{ backgroundColor: 'rgba(229, 165, 116, 0.1)', color: '#8B7355' }}>
                                    +{trend.keywords.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Footer with metadata */}
                            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'rgba(229, 165, 116, 0.2)' }}>
                              <div className="flex items-center gap-3">
                                {trend.category && (
                                  <Badge variant="outline" className="text-xs" style={{ borderColor: 'rgba(136, 146, 93, 0.3)', color: '#5E4032' }}>
                                    {trend.category}
                                  </Badge>
                                )}
                                <div className="text-xs font-semibold" style={{ color: trend.viral_potential >= 7 ? '#E8B44D' : '#8B7355' }}>
                                  Viral: {trend.viral_potential}/10
                                </div>
                              </div>
                              <div className="text-xs" style={{ color: '#8B7355' }}>
                                {trend.source_date ? format(new Date(trend.source_date), 'MMM d') : format(new Date(trend.created_date), 'MMM d')}
                              </div>
                            </div>
                          </div>
                        </CardContent>

                        {/* Action buttons */}
                        <CardFooter className="p-4 pt-0 flex gap-2">
                          <Button
                            onClick={() => handleTrendClick(trend)}
                            className="flex-1 rounded-xl"
                            style={{
                              background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                              color: 'white'
                            }}
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Create Content
                          </Button>
                          <Button
                            onClick={(e) => handleSaveIdea(trend, e)}
                            disabled={createContentMutation.isPending}
                            variant="outline"
                            className="flex-1 rounded-xl"
                            style={{ borderColor: 'rgba(229, 165, 116, 0.4)' }}
                          >
                            <Lightbulb className="w-4 h-4 mr-2" />
                            Save Idea
                          </Button>
                        </CardFooter>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Used Trends */}
            {usedTrends.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4" style={{ color: '#8B7355' }}>
                  ✓ Already Used ({usedTrends.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {usedTrends.map(trend => (
                    <Card key={trend.id} className="border-2 rounded-2xl opacity-60"
                          style={{ 
                            borderColor: 'rgba(229, 165, 116, 0.4)',
                            background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)'
                          }}>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-sm line-clamp-1" style={{ color: '#3D3D2B' }}>
                          {trend.title}
                        </h3>
                        <p className="text-xs mt-1" style={{ color: '#8B7355' }}>
                          Used for content
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden Trends */}
            {showHidden && hiddenTrends.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4" style={{ color: '#8B7355' }}>
                  👁️‍🗨️ Hidden Trends ({hiddenTrends.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hiddenTrends.map(trend => (
                    <Card key={trend.id} className="border-2 rounded-2xl opacity-60"
                          style={{ 
                            borderColor: 'rgba(229, 165, 116, 0.4)',
                            background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)'
                          }}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-sm line-clamp-1 flex-1" style={{ color: '#3D3D2B' }}>
                            {trend.title}
                          </h3>
                          <Button
                            onClick={() => handleUnhideTrend(trend.id)}
                            size="sm"
                            variant="ghost"
                            className="ml-2"
                          >
                            Restore
                          </Button>
                        </div>
                        <p className="text-xs mt-1" style={{ color: '#8B7355' }}>
                          Hidden
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trend Detail Modal */}
      {selectedTrend && (
        <TrendDetailModal
          trend={selectedTrend}
          onClose={() => setSelectedTrend(null)}
          onCreateContent={handleTrendClick}
          onSaveIdea={handleSaveIdea}
        />
      )}
    </div>
  );
}
