
import React, { useState } from "react";
import { prism } from "@/api/prismClient.js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, Trash2, Plus, X, Loader2 } from "lucide-react";
import { format, parseISO, isFuture, isPast } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/api/apiClient";

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
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [isAddingPost, setIsAddingPost] = useState(false);
  
  // Form state for scheduling post
  const [scheduleForm, setScheduleForm] = useState({
    content_id: '',
    brand_id: '',
    platform: '',
    caption: '',
    scheduled_date: '',
    scheduled_time: '',
    media_urls: []
  });

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

  // Mutation for creating scheduled post
  const schedulePostMutation = useMutation({
    mutationFn: async (postData) => {
      const scheduledDateTime = new Date(`${postData.scheduled_date}T${postData.scheduled_time}`);
      const response = await api.post('/social/posts', {
        platform: postData.platform,
        brand_id: postData.brand_id,
        content_id: postData.content_id,
        caption: postData.caption || '',
        scheduled_at: scheduledDateTime.toISOString(),
        media_urls: postData.media_urls || []
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Post scheduled successfully!');
      setIsAddingPost(false);
      setScheduleForm({
        content_id: '',
        brand_id: '',
        platform: '',
        caption: '',
        scheduled_date: '',
        scheduled_time: '',
        media_urls: []
      });
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      // Also invalidate posts query if it exists
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to schedule post. Please try again.');
    }
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

      {/* Schedule Post Modal */}
      {isAddingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="p-6 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--card)' }}>
            <CardHeader className="p-0 mb-6">
              <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Schedule New Post</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsAddingPost(false)}
                  className="rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!scheduleForm.content_id || !scheduleForm.brand_id || !scheduleForm.platform || !scheduleForm.scheduled_date || !scheduleForm.scheduled_time) {
                  toast.error('Please fill in all required fields');
                  return;
                }
                const scheduledDateTime = new Date(`${scheduleForm.scheduled_date}T${scheduleForm.scheduled_time}`);
                if (scheduledDateTime <= new Date()) {
                  toast.error('Scheduled time must be in the future');
                  return;
                }
                schedulePostMutation.mutate(scheduleForm);
              }} className="space-y-4">
                {/* Content Selection */}
                <div>
                  <Label htmlFor="content" className="mb-2 block" style={{ color: 'var(--text)' }}>
                    Content *
                  </Label>
                  <Select
                    value={scheduleForm.content_id}
                    onValueChange={(value) => setScheduleForm({ ...scheduleForm, content_id: value })}
                  >
                    <SelectTrigger id="content" className="rounded-xl">
                      <SelectValue placeholder="Select content to schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      {contents
                        .filter(c => c.status === 'generated' || c.status === 'completed_draft')
                        .map(content => (
                          <SelectItem key={content.id} value={content.id}>
                            {content.ai_generated_title || content.original_input || 'Untitled Content'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Brand Selection */}
                <div>
                  <Label htmlFor="brand" className="mb-2 block" style={{ color: 'var(--text)' }}>
                    Brand *
                  </Label>
                  <Select
                    value={scheduleForm.brand_id}
                    onValueChange={(value) => setScheduleForm({ ...scheduleForm, brand_id: value })}
                  >
                    <SelectTrigger id="brand" className="rounded-xl">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(brand => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Platform Selection */}
                <div>
                  <Label htmlFor="platform" className="mb-2 block" style={{ color: 'var(--text)' }}>
                    Platform *
                  </Label>
                  <Select
                    value={scheduleForm.platform}
                    onValueChange={(value) => setScheduleForm({ ...scheduleForm, platform: value })}
                  >
                    <SelectTrigger id="platform" className="rounded-xl">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="threads">Threads</SelectItem>
                      <SelectItem value="bluesky">Bluesky</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Caption */}
                <div>
                  <Label htmlFor="caption" className="mb-2 block" style={{ color: 'var(--text)' }}>
                    Caption
                  </Label>
                  <Textarea
                    id="caption"
                    value={scheduleForm.caption}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, caption: e.target.value })}
                    placeholder="Enter post caption..."
                    className="rounded-xl min-h-[100px]"
                    style={{ backgroundColor: 'var(--background-secondary)', color: 'var(--text)' }}
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date" className="mb-2 block" style={{ color: 'var(--text)' }}>
                      Date *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={scheduleForm.scheduled_date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="rounded-xl"
                      style={{ backgroundColor: 'var(--background-secondary)', color: 'var(--text)' }}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="time" className="mb-2 block" style={{ color: 'var(--text)' }}>
                      Time *
                    </Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduleForm.scheduled_time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_time: e.target.value })}
                      className="rounded-xl"
                      style={{ backgroundColor: 'var(--background-secondary)', color: 'var(--text)' }}
                      required
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingPost(false)}
                    className="rounded-xl"
                    disabled={schedulePostMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl"
                    disabled={schedulePostMutation.isPending}
                    style={{
                      background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                      color: 'white'
                    }}
                  >
                    {schedulePostMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Schedule Post
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
