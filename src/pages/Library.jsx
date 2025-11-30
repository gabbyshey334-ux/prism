
import React, { useState } from "react";
import { prism } from "@/api/prismClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Upload, Filter, Eye, Edit, TrendingUp, Calendar, Plus, X, Trash2, Sparkles, Loader2, Copy } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Added DialogDescription, DialogFooter
import { toast } from "sonner";
import ContentCreationWorkflow from "../components/dashboard/ContentCreationWorkflow";

const platformIcons = {
  tiktok: "🎵",
  instagram_reel: "📹",
  instagram_carousel: "📸",
  instagram: "📸",
  threads: "🧵",
  blog: "📝",
  youtube: "🎥",
  twitter: "🐦",
  facebook: "📘",
  linkedin: "💼"
};

// Helper to extract base domain from URL
const extractDomain = (url) => {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
};

export default function Library() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [selectedAge, setSelectedAge] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all"); // New state for category filter
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [activeSection, setActiveSection] = useState("all"); // new state for sections

  // States for duplication confirmation
  const [showDuplicateConfirmDialog, setShowDuplicateConfirmDialog] = useState(false);
  const [contentToDuplicate, setContentToDuplicate] = useState(null);

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ['contents'],
    queryFn: () => prism.entities.Content.list('-created_date'),
    initialData: [],
  });

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

  const deleteContentMutation = useMutation({
    mutationFn: (id) => prism.entities.Content.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      toast.success("Content deleted!");
    },
    onError: () => {
      toast.error("Failed to delete content.");
    }
  });

  const duplicateIdeaMutation = useMutation({ // Renamed from duplicateContentMutation
    mutationFn: async (content) => {
      const duplicate = {
        original_input: content.original_input,
        input_type: content.input_type,
        ai_generated_title: `${content.ai_generated_title || "Untitled"} (Copy)`, // Ensure title exists
        ai_generated_category: content.ai_generated_category,
        research_data: content.research_data,
        additional_context: content.additional_context,
        // Deep copy brand_content to avoid reference issues
        brand_content: content.brand_content ? content.brand_content.map(bc => ({ ...bc })) : [],
        status: 'draft', // Duplicated content starts as draft
        viral_score: content.viral_score,
        tags: content.tags ? [...content.tags] : [], // Deep copy tags
        uploaded_file_url: content.uploaded_file_url,
        uploaded_file_type: content.uploaded_file_type,
        generated_images: content.generated_images ? [...content.generated_images] : [] // Deep copy generated_images
      };
      return prism.entities.Content.create(duplicate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      toast.success("Content duplicated!");
      setShowDuplicateConfirmDialog(false); // Close dialog
      setContentToDuplicate(null); // Clear content
    },
    onError: () => {
      toast.error("Failed to duplicate content");
    }
  });

  const handleDeleteContent = (contentId, e) => {
    e.stopPropagation(); // Prevent the card's onClick from firing
    if (confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      deleteContentMutation.mutate(contentId);
    }
  };

  const handleDuplicateClick = (content, e) => {
    e.stopPropagation(); // Prevent the card's onClick from firing
    setContentToDuplicate(content);
    setShowDuplicateConfirmDialog(true);
  };

  const confirmDuplicateContent = () => {
    if (contentToDuplicate) {
      duplicateIdeaMutation.mutate(contentToDuplicate);
    }
  };

  // Modified handleCardClick to open the ContentCreationWorkflow
  const handleCardClick = (content) => {
    setSelectedContent(content);
    setShowWorkflow(true);
  };

  const allTags = [...new Set(contents.flatMap(c => c.tags || []))];
  const allCategories = [...new Set(contents.map(c => c.ai_generated_category).filter(Boolean))];

  let filteredContents = contents;

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredContents = filteredContents.filter(c =>
      c.ai_generated_title?.toLowerCase().includes(query) ||
      c.original_input?.toLowerCase().includes(query) ||
      c.tags?.some(t => t.toLowerCase().includes(query))
    );
  }

  if (selectedBrand !== "all") {
    filteredContents = filteredContents.filter(c =>
      c.brand_content?.some(bc => bc.brand_id === selectedBrand)
    );
  }

  if (selectedStatus !== "all") {
    filteredContents = filteredContents.filter(c => c.status === selectedStatus);
  }

  if (selectedTag !== "all") {
    filteredContents = filteredContents.filter(c => c.tags?.includes(selectedTag));
  }

  if (selectedCategory !== "all") {
    filteredContents = filteredContents.filter(c => c.ai_generated_category === selectedCategory);
  }

  if (selectedPlatforms.length > 0) {
    filteredContents = filteredContents.filter(c =>
      c.brand_content && c.brand_content.some(bc => bc.selected_platforms && bc.selected_platforms.some(p => selectedPlatforms.includes(p)))
    );
  }

  if (selectedAge !== "all") {
    const now = new Date();
    filteredContents = filteredContents.filter(c => {
      if (!c.created_date) return false;
      const contentDate = new Date(c.created_date);
      const diffTime = Math.abs(now.getTime() - contentDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (selectedAge === "last_day") return diffDays <= 1;
      if (selectedAge === "last_week") return diffDays <= 7;
      if (selectedAge === "last_month") return diffDays <= 30;
      if (selectedAge === "last_year") return diffDays <= 365;
      return true;
    });
  }

  // Organize content by workflow stage
  const ideas = filteredContents.filter(c => c.status === 'draft' || c.status === 'researched');
  const textInDevelopment = filteredContents.filter(c => c.status === 'text_generated');
  const visualsInDevelopment = filteredContents.filter(c => c.status === 'visuals_generated');
  const completedDrafts = filteredContents.filter(c => c.status === 'completed_draft' || c.status === 'scheduled' || c.status === 'posted');

  // Filter by active section
  let displayContents = filteredContents;
  if (activeSection === "ideas") displayContents = ideas;
  else if (activeSection === "text") displayContents = textInDevelopment;
  else if (activeSection === "visuals") displayContents = visualsInDevelopment;
  else if (activeSection === "completed") displayContents = completedDrafts;

  const stats = {
    total: contents.length, // Total count of all items, unfiltered
    ideas: ideas.length,
    textInDev: textInDevelopment.length,
    visualsInDev: visualsInDevelopment.length,
    completed: completedDrafts.length,
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #FFF8F0 0%, #F0F4E8 100%)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>
              Content Library
            </h1>
            <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>
              All your ideas and content in one place
            </p>
            <p className="text-sm" style={{ color: '#8B7355' }}>
              <strong>User Ideas:</strong> Your original thoughts and inspiration •
              <strong> Trending Ideas:</strong> From AI-researched trends this week
            </p>
          </div>
          <Button
            onClick={() => setShowUploadModal(true)}
            className="rounded-xl shadow-md ethereal-glow"
            style={{
              background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
              color: 'white'
            }}
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Content
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <Card
            onClick={() => setActiveSection("all")}
            className={`border-0 rounded-2xl shadow-sm crystal-shine cursor-pointer transition-all ${activeSection === "all" ? 'ring-2 ring-offset-2' : ''}`}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(229, 165, 116, 0.3)',
              ringColor: activeSection === "all" ? '#88925D' : 'transparent'
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    All Content
                  </p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>
                    {stats.total}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center ethereal-glow"
                     style={{ background: 'linear-gradient(135deg, #E5A574 0%, #F4DCC8 100%)' }}>
                  <Eye className="w-6 h-6" style={{ color: 'var(--primary-dark)' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveSection("ideas")}
            className={`border-0 rounded-2xl shadow-sm crystal-shine cursor-pointer transition-all ${activeSection === "ideas" ? 'ring-2 ring-offset-2' : ''}`}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(229, 165, 116, 0.3)',
              ringColor: activeSection === "ideas" ? '#88925D' : 'transparent'
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Ideas
                  </p>
                  <p className="text-3xl font-bold" style={{ color: '#E8B44D' }}>
                    {stats.ideas}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center ethereal-glow"
                     style={{ background: 'linear-gradient(135deg, #E8B44D 0%, #F4DCC8 100%)' }}>
                  <Sparkles className="w-6 h-6" style={{ color: '#B8842D' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveSection("text")}
            className={`border-0 rounded-2xl shadow-sm crystal-shine cursor-pointer transition-all ${activeSection === "text" ? 'ring-2 ring-offset-2' : ''}`}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(229, 165, 116, 0.3)',
              ringColor: activeSection === "text" ? '#88925D' : 'transparent'
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Text in Dev
                  </p>
                  <p className="text-3xl font-bold" style={{ color: '#7FB8BF' }}>
                    {stats.textInDev}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center ethereal-glow"
                     style={{ background: 'linear-gradient(135deg, #7FB8BF 0%, #D9EEF4 100%)' }}>
                  <Edit className="w-6 h-6" style={{ color: '#4A6B7B' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveSection("visuals")}
            className={`border-0 rounded-2xl shadow-sm crystal-shine cursor-pointer transition-all ${activeSection === "visuals" ? 'ring-2 ring-offset-2' : ''}`}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(229, 165, 116, 0.3)',
              ringColor: activeSection === "visuals" ? '#88925D' : 'transparent'
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Visuals in Dev
                  </p>
                  <p className="text-3xl font-bold" style={{ color: '#A88FA8' }}>
                    {stats.visualsInDev}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center ethereal-glow"
                     style={{ background: 'linear-gradient(135deg, #A88FA8 0%, #E8D9F4 100%)' }}>
                  <TrendingUp className="w-6 h-6" style={{ color: '#6B5B7B' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveSection("completed")}
            className={`border-0 rounded-2xl shadow-sm crystal-shine cursor-pointer transition-all ${activeSection === "completed" ? 'ring-2 ring-offset-2' : ''}`}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(229, 165, 116, 0.3)',
              ringColor: activeSection === "completed" ? '#88925D' : 'transparent'
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Completed
                  </p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>
                    {stats.completed}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center ethereal-glow"
                     style={{ background: 'linear-gradient(135deg, #A8BF8F 0%, #E8F4D9 100%)' }}>
                  <Calendar className="w-6 h-6" style={{ color: '#4A5A3C' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 rounded-2xl shadow-sm mb-6 crystal-shine" style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(229, 165, 116, 0.3)'
        }}>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4"> {/* Adjusted grid for new category filter */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                        style={{ color: 'var(--text-muted)' }} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search content..."
                  className="pl-10 rounded-xl border-2"
                  style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
                />
              </div>

              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
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

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="researched">Researched</SelectItem>
                  <SelectItem value="text_generated">Text Generated</SelectItem>
                  <SelectItem value="visuals_generated">Visuals Generated</SelectItem>
                  <SelectItem value="completed_draft">Completed Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>#{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* New Age Filter */}
              <Select value={selectedAge} onValueChange={setSelectedAge}>
                <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="last_day">Last 24 hours</SelectItem>
                  <SelectItem value="last_week">Last 7 days</SelectItem>
                  <SelectItem value="last_month">Last 30 days</SelectItem>
                  <SelectItem value="last_year">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Platform Filters (Checkbox format selection) */}
            <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>Platforms</h3>
              <div className="flex flex-wrap gap-4">
                {Object.keys(platformIcons).map(platformKey => (
                  <div key={platformKey} className="flex items-center space-x-2">
                    <Checkbox
                      id={platformKey}
                      checked={selectedPlatforms.includes(platformKey)}
                      onCheckedChange={(checked) => {
                        setSelectedPlatforms(prev =>
                          checked
                            ? [...prev, platformKey]
                            : prev.filter(p => p !== platformKey)
                        );
                      }}
                      style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
                    />
                    <Label htmlFor={platformKey} className="flex items-center gap-1 text-sm cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                      {platformIcons[platformKey]} {platformKey.replace(/_/g, ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Grid */}
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#88925D' }} />
            <p style={{ color: '#6B6B4D' }}>Loading your content...</p>
          </div>
        ) : displayContents.length === 0 ? (
          <Card className="p-12 text-center border-2 rounded-2xl" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            borderColor: 'rgba(180, 150, 120, 0.3)'
          }}>
            <p className="text-xl mb-2" style={{ color: '#3D3D2B' }}>
              No content found
            </p>
            <p style={{ color: '#6B6B4D' }}>
              Start creating content from the Dashboard!
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayContents.map(content => {
              const brand = content.brand_content?.[0]
                ? brands.find(b => b.id === content.brand_content[0].brand_id)
                : null;

              const hasVisuals = content.uploaded_file_url || (content.generated_images && content.generated_images.length > 0);

              // Extract keywords/tags from content
              const getContentTags = () => {
                const tags = [];

                // Add category
                if (content.ai_generated_category) {
                  tags.push({ label: content.ai_generated_category, color: '#88925D' });
                }

                // Add viral score
                if (typeof content.viral_score === 'number' && content.viral_score !== null) {
                  if (content.viral_score >= 7) {
                    tags.push({ label: `🔥 Viral ${content.viral_score}/10`, color: '#E89152' });
                  } else {
                    tags.push({ label: `⭐ ${content.viral_score}/10`, color: '#A67C52' });
                  }
                }

                // Add input type
                if (content.input_type) {
                  const typeLabels = {
                    instagram_link: '📸 Instagram',
                    instagram_images: '📸 Instagram',
                    images: '🖼️ Images',
                    voice: '🎤 Voice',
                    link: '🔗 Link',
                    upload: '📤 Upload'
                  };
                  if (typeLabels[content.input_type]) {
                    tags.push({ label: typeLabels[content.input_type], color: '#7FB8BF' });
                  }
                }

                // Add user tags (only first 3, if any, to avoid clutter alongside other generated tags)
                if (content.tags) {
                  content.tags.slice(0, 3).forEach(tag => {
                    tags.push({ label: `#${tag}`, color: '#A88FA8' });
                  });
                }

                return tags;
              };

              const contentTags = getContentTags();

              return (
                <Card
                  key={content.id}
                  onClick={() => handleCardClick(content)} // This still handles the main card click
                  className="border-2 rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-lg"
                  style={{
                    borderColor: content.viral_score >= 7 ? '#E8B44D' : 'rgba(229, 165, 116, 0.3)',
                    background: 'white'
                  }}
                >
                  <CardContent className="p-6 space-y-4">
                    {/* Title at Top */}
                    <div>
                      <h3 className="font-semibold text-lg line-clamp-2 mb-2" style={{ color: '#3D3D2B' }}>
                        {content.ai_generated_title || content.original_input || "Untitled Content"}
                      </h3>
                      {brand && (
                        <div className="flex items-center gap-2 mb-2">
                          {brand.primary_color && (
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: brand.primary_color }} />
                          )}
                          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{brand.name}</span>
                        </div>
                      )}

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2">
                        <Badge style={{
                          background: content.status === 'posted'
                            ? 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)'
                            : content.status === 'scheduled'
                              ? 'linear-gradient(135deg, #E8B44D 0%, #E5A574 100%)'
                              : 'linear-gradient(135deg, #A4B58B 0%, #C4D4A8 100%)',
                          color: 'white'
                        }}>
                          {content.status}
                        </Badge>
                        {contentTags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="border text-xs" style={{
                            borderColor: tag.color,
                            color: '#3D3D2B', // A dark text color for contrast
                            backgroundColor: `${tag.color}20` // 20% opacity for background
                          }}>
                            {tag.label}
                          </Badge>
                        ))}
                        {content.tags && content.tags.length > 3 && (
                          <Badge variant="outline" className="border text-xs" style={{
                            borderColor: 'var(--border)',
                            color: 'var(--text-muted)'
                          }}>
                            +{content.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Preview Image/Visual or Text Snippet */}
                    {content.uploaded_file_url ? (
                      <div className="w-full h-48 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--background-secondary)' }}>
                        {content.uploaded_file_type === 'image' ? (
                          <img src={content.uploaded_file_url} alt={content.ai_generated_title || "Content image"} className="w-full h-full object-cover" />
                        ) : content.uploaded_file_type === 'video' ? (
                          <video src={content.uploaded_file_url} className="w-full h-full object-cover" controls={false} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-6xl">📄</div>
                        )}
                      </div>
                    ) : content.generated_images && content.generated_images.length > 0 ? (
                      <div className="w-full h-48 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--background-secondary)' }}>
                         {/* Display the first generated image */}
                        <img
                          src={content.generated_images[0]}
                          alt={`${content.ai_generated_title || "Content"} generated image`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      /* No visuals - show more content info */
                      <div className="space-y-3">
                        {/* Content Preview / Generated Caption */}
                        {content.brand_content?.[0]?.generated_content?.caption && (
                          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(136, 146, 93, 0.1)' }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: '#88925D' }}>
                              📝 Generated Text:
                            </p>
                            <p className="text-xs line-clamp-3" style={{ color: '#6B6B4D' }}>
                              {content.brand_content[0].generated_content.caption}
                            </p>
                          </div>
                        )}
                        {/* Research snippet */}
                        {(!content.brand_content?.[0]?.generated_content?.caption && content.research_data) && (
                          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(136, 146, 93, 0.1)' }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: '#88925D' }}>
                              📊 Research Insights:
                            </p>
                            <p className="text-xs line-clamp-3" style={{ color: '#6B6B4D' }}>
                              {content.research_data.includes('http')
                                ? `From: ${extractDomain(content.research_data.match(/https?:\/\/[^\s]+/)?.[0])}`
                                : content.research_data}
                            </p>
                          </div>
                        )}

                        {/* Original input */}
                        {(!content.brand_content?.[0]?.generated_content?.caption && !content.research_data && content.original_input) && (
                          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(229, 165, 116, 0.1)' }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: '#A67C52' }}>
                              💡 Original Idea:
                            </p>
                            <p className="text-xs line-clamp-4" style={{ color: '#6B6B4D' }}>
                              {content.original_input.includes('http')
                                ? `${content.original_input.replace(/https?:\/\/[^\s]+/, '')} (${extractDomain(content.original_input.match(/https?:\/\/[^\s]+/)?.[0])})`
                                : content.original_input}
                            </p>
                          </div>
                        )}
                      </div>
                    )}


                    {/* Footer Info */}
                    <div className="flex items-center justify-between pt-3 border-t" style={{
                      borderColor: 'rgba(180, 150, 120, 0.3)'
                    }}>
                      <span className="text-xs" style={{ color: '#8B7355' }}>
                        {content.created_date ? format(new Date(content.created_date), 'MMM d, yyyy') : 'No Date'}
                      </span>
                      {content.brand_content?.[0]?.selected_platforms && (
                        <div className="flex gap-1">
                          {content.brand_content[0].selected_platforms.slice(0, 3).map(platform => (
                            <Badge key={platform} variant="outline" className="text-xs">
                              {platformIcons[platform] || ''} {platform.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                          {content.brand_content[0].selected_platforms.length > 3 && (
                            <Badge variant="outline" className="border text-xs" style={{
                              borderColor: 'var(--border)',
                              color: 'var(--text-muted)'
                            }}>
                              +{content.brand_content[0].selected_platforms.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Analytics if posted */}
                    {content.analytics && content.status === 'posted' && (
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                        {content.analytics.views && (
                          <div className="text-center">
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Views</p>
                            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                              {content.analytics.views.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {content.analytics.likes && (
                          <div className="text-center">
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Likes</p>
                            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                              {content.analytics.likes.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {content.analytics.comments && (
                          <div className="text-center">
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Comments</p>
                            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                              {content.analytics.comments.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {content.analytics.shares && (
                          <div className="text-center">
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Shares</p>
                            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                              {content.analytics.shares.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'rgba(229, 165, 116, 0.2)' }}>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(content); // Re-use existing handler
                        }}
                        size="sm"
                        className="rounded-xl flex-1"
                        style={{
                          background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                          color: 'white'
                        }}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {content.status === 'draft' || content.status === 'researched' ? 'Create' : 'Edit'}
                      </Button>
                      <Button
                        onClick={(e) => handleDuplicateClick(content, e)} // Use new handler for duplication
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        disabled={duplicateIdeaMutation.isPending}
                        style={{borderColor: 'rgba(229, 165, 116, 0.3)'}}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={(e) => handleDeleteContent(content.id, e)} // Re-use existing handler
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-red-600 hover:bg-red-50"
                        disabled={deleteContentMutation.isPending}
                        style={{borderColor: 'rgba(229, 165, 116, 0.3)'}}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {showUploadModal && (
          <UploadContentModal
            onClose={() => setShowUploadModal(false)}
            brands={brands}
          />
        )}

        {showWorkflow && selectedContent && (
          <ContentCreationWorkflow
            initialIdea={selectedContent}
            skipResearch={!!selectedContent.research_data}
            initialStep={
              selectedContent.workflow_step
                ? selectedContent.workflow_step
                : selectedContent.status === "text_generated"
                  ? "text_review"
                  : selectedContent.status === "visuals_generated"
                    ? "visual_review"
                    : (selectedContent.status === "completed_draft" || selectedContent.status === "scheduled" || selectedContent.status === "posted")
                      ? "publish"
                      : "idea_development"
            }
            onClose={() => {
              setShowWorkflow(false);
              setSelectedContent(null);
            }}
            onComplete={() => {
              setShowWorkflow(false);
              setSelectedContent(null);
              queryClient.invalidateQueries({ queryKey: ['contents'] });
              toast.success("Content updated!");
            }}
          />
        )}

        {/* Duplicate Confirmation Dialog */}
        <Dialog open={showDuplicateConfirmDialog} onOpenChange={setShowDuplicateConfirmDialog}>
          <DialogContent style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 252, 240, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(229, 165, 116, 0.3)'
          }}>
            <DialogHeader>
              <DialogTitle>Duplicate Content</DialogTitle>
              <DialogDescription>
                Are you sure you want to duplicate "{contentToDuplicate?.ai_generated_title || contentToDuplicate?.original_input || "Untitled Content"}"? A new draft will be created.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDuplicateConfirmDialog(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={confirmDuplicateContent} disabled={duplicateIdeaMutation.isPending} className="rounded-xl ethereal-glow"
                style={{
                  background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                  color: 'white'
                }}>
                {duplicateIdeaMutation.isPending ? "Duplicating..." : "Duplicate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function UploadContentModal({ onClose, brands }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    brand_id: "",
    tags: [],
    file: null
  });
  const [tagInput, setTagInput] = useState("");

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      const { file_url } = await prism.integrations.Core.UploadFile({ file: data.file });

      const fileType = data.file.type.startsWith('video/') ? 'video'
        : data.file.type.startsWith('image/') ? 'image'
        : 'document';

      return prism.entities.Content.create({
        original_input: data.description || data.title,
        input_type: 'upload',
        ai_generated_title: data.title,
        uploaded_file_url: file_url,
        uploaded_file_type: fileType,
        tags: data.tags,
        status: 'draft',
        brand_content: data.brand_id ? [{
          brand_id: data.brand_id,
          brand_name: brands.find(b => b.id === data.brand_id)?.name
        }] : []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      toast.success("Content uploaded!");
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!formData.file || !formData.title) {
      toast.error("Please provide a file and title");
      return;
    }
    uploadMutation.mutate(formData);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({...formData, tags: [...formData.tags, tagInput.trim()]});
      setTagInput("");
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 252, 240, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(229, 165, 116, 0.3)'
      }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text)' }}>Upload Content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
              File *
            </label>
            <Input
              type="file"
              onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
              className="rounded-xl border-2"
              style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
              accept="image/*,video/*,.pdf,.doc,.docx"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
              Title *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="rounded-xl border-2"
              style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
              placeholder="Content title..."
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
              Description
            </label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="rounded-xl border-2"
              style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
              Brand
            </label>
            <Select value={formData.brand_id} onValueChange={(value) => setFormData({...formData, brand_id: value})}>
              <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
                <SelectValue placeholder="Select brand..." />
              </SelectTrigger>
              <SelectContent>
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
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                className="flex-1 rounded-xl border-2"
                style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
                placeholder="Add tag..."
              />
              <Button onClick={addTag} variant="outline" className="rounded-xl" style={{
                borderColor: 'rgba(229, 165, 116, 0.3)'
              }}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, idx) => (
                <Badge key={idx} className="flex items-center gap-2 ethereal-glow" style={{
                  background: 'linear-gradient(135deg, #E5A574 0%, #F4DCC8 100%)',
                  color: 'var(--primary-dark)'
                }}>
                  #{tag}
                  <button onClick={() => setFormData({
                    ...formData,
                    tags: formData.tags.filter((_, i) => i !== idx)
                  })}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={uploadMutation.isPending || !formData.file || !formData.title}
              className="rounded-xl ethereal-glow"
              style={{
                background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                color: 'white'
              }}
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload Content"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
