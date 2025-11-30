
import React, { useState } from "react";
import { prism } from "@/api/prismClient.js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, Trash2, Plus } from "lucide-react"; // Added Plus icon
import { format, parseISO, isFuture, isPast } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const platformIcons = {
  tiktok: "🎵",
  instagram_reel: "📹",
  instagram_carousel: "📸",
  threads: "🧵",
  blog: "📝",
  youtube: "🎥"
};

export default function Schedule() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all"); // New state for brand filter
  const [isAddingPost, setIsAddingPost] = useState(false); // New state for adding post popup

  const { data: contents = [] } = useQuery({
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => prism.entities.Content.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
    },
  });

  // Collect all scheduled posts across all content
  const scheduledPosts = [];
  contents.forEach(content => {
    content.brand_content?.forEach(bc => {
      bc.scheduled_posts?.forEach(post => {
        scheduledPosts.push({
          ...post,
          content_id: content.id,
          content_title: content.ai_generated_title,
          brand_name: bc.brand_name,
          brand_id: bc.brand_id
        });
      });
    });
  });

  const sortedPosts = scheduledPosts.sort((a, b) =>
    new Date(a.scheduled_time) - new Date(b.scheduled_time)
  );

  // Apply status filter
  const postsFilteredByStatus = filterStatus === "all" ? sortedPosts :
    sortedPosts.filter(p => p.post_status === filterStatus);

  // Apply brand filter
  const finalFilteredPosts = selectedBrand === "all" ? postsFilteredByStatus :
    postsFilteredByStatus.filter(p => p.brand_id === selectedBrand);

  const upcomingPosts = sortedPosts.filter(p =>
    isFuture(parseISO(p.scheduled_time)) && p.post_status === 'scheduled'
  );

  const postedCount = sortedPosts.filter(p => p.post_status === 'posted').length;
  const failedCount = sortedPosts.filter(p => p.post_status === 'failed').length;

  const handleCancelSchedule = async (contentId, brandId, platform) => {
    const content = contents.find(c => c.id === contentId);
    if (!content) return;

    const updatedBrandContent = content.brand_content.map(bc => {
      if (bc.brand_id === brandId) {
        return {
          ...bc,
          scheduled_posts: bc.scheduled_posts.filter(p => p.platform !== platform)
        };
      }
      return bc;
    });

    await updateMutation.mutateAsync({
      id: contentId,
      data: {
        ...content,
        brand_content: updatedBrandContent
      }
    });
  };

  return (
    <div className="min-h-screen p-6" style={{
      background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
    }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
              Content Calendar {/* Changed to Content Calendar */}
            </h1>
            <p className="text-sm" style={{ color: '#8B7355' }}>
              Schedule and manage your content across all platforms {/* New paragraph */}
            </p>
          </div>
          
          <div className="flex items-center gap-4"> {/* New wrapper div */}
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-48 rounded-xl"> {/* Width changed to w-48 */}
                <SelectValue placeholder="Select Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map(brand => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => setIsAddingPost(true)} // Added onClick to open popup
              className="rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                color: 'white'
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Post
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 rounded-2xl shadow-sm" style={{ backgroundColor: 'var(--card)' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Upcoming Posts
                  </p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>
                    {upcomingPosts.length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{ backgroundColor: 'var(--accent-light)' }}>
                  <CalendarIcon className="w-6 h-6" style={{ color: 'var(--primary)' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 rounded-2xl shadow-sm" style={{ backgroundColor: 'var(--card)' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Posted
                  </p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>
                    {postedCount}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{ backgroundColor: 'var(--success)', opacity: 0.2 }}>
                  <CheckCircle className="w-6 h-6" style={{ color: 'var(--success)' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 rounded-2xl shadow-sm" style={{ backgroundColor: 'var(--card)' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Failed
                  </p>
                  <p className="text-3xl font-bold text-red-600">
                    {failedCount}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Tabs value={filterStatus} onValueChange={setFilterStatus} className="mb-6">
          <TabsList className="bg-white rounded-xl border-2 p-1"
                   style={{ borderColor: 'var(--border)' }}>
            <TabsTrigger value="all" className="rounded-lg">All Posts</TabsTrigger>
            <TabsTrigger value="scheduled" className="rounded-lg">Scheduled</TabsTrigger>
            <TabsTrigger value="posted" className="rounded-lg">Posted</TabsTrigger>
            <TabsTrigger value="failed" className="rounded-lg">Failed</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Scheduled Posts List */}
        {finalFilteredPosts.length === 0 ? (
          <Card className="p-12 text-center border-0 rounded-2xl" style={{ backgroundColor: 'var(--card)' }}>
            <CalendarIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xl mb-2" style={{ color: 'var(--text)' }}>No {filterStatus !== 'all' && filterStatus} posts</p>
            <p style={{ color: 'var(--text-muted)' }}>
              Schedule content from your generated ideas
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {finalFilteredPosts.map((post, idx) => {
              const brand = brands.find(b => b.id === post.brand_id);
              const scheduledDate = parseISO(post.scheduled_time);
              const isUpcoming = isFuture(scheduledDate);

              return (
                <Card key={idx} className="border-0 rounded-2xl shadow-sm hover:shadow-md transition-all"
                      style={{ backgroundColor: 'var(--card)' }}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">{platformIcons[post.platform]}</span>
                          {brand?.primary_color && (
                            <div className="w-6 h-6 rounded-lg"
                                 style={{ backgroundColor: brand.primary_color }} />
                          )}
                          <div>
                            <h3 className="font-semibold" style={{ color: 'var(--text)' }}>
                              {post.content_title}
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                              {post.brand_name} • {post.platform.replace('_', ' ')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            {format(scheduledDate, 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {format(scheduledDate, 'h:mm a')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge style={{
                          backgroundColor: post.post_status === 'scheduled' ? 'var(--scheduled)' :
                                         post.post_status === 'posted' ? 'var(--success)' : '#ef4444',
                          color: 'white'
                        }}>
                          {post.post_status === 'scheduled' && isUpcoming && '⏰ '}
                          {post.post_status === 'posted' && '✓ '}
                          {post.post_status === 'failed' && '✗ '}
                          {post.post_status}
                        </Badge>

                        {post.post_status === 'scheduled' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancelSchedule(post.content_id, post.brand_id, post.platform)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Placeholder for the popup/modal for adding a new post */}
      {isAddingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-8 rounded-2xl max-w-2xl w-full" style={{ backgroundColor: 'var(--card)' }}>
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Schedule New Post</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* This is where the circular steps and media library integration would go */}
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                This is a placeholder for the "Add new post" form, circular steps, and media library.
              </p>
              <Button onClick={() => setIsAddingPost(false)} className="mt-6">Close</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
