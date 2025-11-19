import React, { useState, useEffect } from "react";
import { prism } from "@/api/prismClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  RefreshCw, 
  Trash2, 
  Eye, 
  Filter, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  MessageCircle,
  Bird,
  Music,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// Platform icons mapping
const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Music,
  linkedin: Linkedin,
  youtube: Youtube,
  threads: MessageCircle,
  bluesky: Bird
};

// Platform colors mapping
const platformColors = {
  facebook: "bg-blue-600 text-white",
  instagram: "bg-gradient-to-br from-purple-600 via-pink-600 to-yellow-500 text-white",
  tiktok: "bg-black text-white",
  linkedin: "bg-blue-700 text-white",
  youtube: "bg-red-600 text-white",
  threads: "bg-gray-900 text-white",
  bluesky: "bg-sky-500 text-white"
};

// Status colors and icons mapping
const statusConfig = {
  queued: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock, label: "Queued" },
  processing: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: Loader2, label: "Processing" },
  posted: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle, label: "Posted" },
  failed: { color: "bg-red-100 text-red-800 border-red-200", icon: XCircle, label: "Failed" },
  retry: { color: "bg-orange-100 text-orange-800 border-orange-200", icon: AlertCircle, label: "Retry" },
  pending: { color: "bg-gray-100 text-gray-800 border-gray-200", icon: Clock, label: "Pending" }
};

export default function Posts() {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);
  
  // State for filtering and pagination
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage, setPostsPerPage] = useState(12);
  
  // State for modals and actions
  const [selectedPost, setSelectedPost] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  
  // Real-time status updates
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Check authentication
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
      } catch (error) {
        console.error("Auth check failed:", error);
        prism.auth.redirectToLogin(window.location.pathname);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch posts with filters
  const fetchPosts = async () => {
    const params = new URLSearchParams();
    if (selectedPlatform !== "all") params.append("platform", selectedPlatform);
    if (selectedStatus !== "all") params.append("status", selectedStatus);
    if (searchQuery) params.append("search", searchQuery);
    params.append("sort_by", sortBy);
    params.append("sort_order", sortOrder);
    params.append("limit", postsPerPage.toString());
    params.append("offset", ((currentPage - 1) * postsPerPage).toString());
    
    const response = await fetch(`/api/social/posts?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch posts");
    return response.json();
  };

  const { data: postsData, isLoading, error, refetch } = useQuery({
    queryKey: ["posts", selectedPlatform, selectedStatus, searchQuery, sortBy, sortOrder, currentPage, postsPerPage, lastRefresh],
    queryFn: fetchPosts,
    enabled: !isCheckingAuth,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Retry post mutation
  const retryPostMutation = useMutation({
    mutationFn: async (postId) => {
      const response = await fetch(`/api/social/posts/${postId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error("Failed to retry post");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Post will be retried shortly");
      queryClient.invalidateQueries(["posts"]);
    },
    onError: (error) => {
      toast.error(`Failed to retry post: ${error.message}`);
    }
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId) => {
      const response = await fetch(`/api/social/posts/${postId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error("Failed to delete post");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Post deleted successfully");
      queryClient.invalidateQueries(["posts"]);
      setDeleteModalOpen(false);
      setPostToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete post: ${error.message}`);
    }
  });

  // Handle retry action
  const handleRetry = (postId) => {
    retryPostMutation.mutate(postId);
  };

  // Handle delete action
  const handleDelete = (post) => {
    setPostToDelete(post);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (postToDelete) {
      deletePostMutation.mutate(postToDelete.id);
    }
  };

  // Handle view details
  const handleViewDetails = (post) => {
    setSelectedPost(post);
    setShowDetailsModal(true);
  };

  // Manual refresh
  const handleRefresh = () => {
    setLastRefresh(Date.now());
    refetch();
  };

  // Format media preview
  const getMediaPreview = (post) => {
    if (!post.media_urls || post.media_urls.length === 0) return null;
    
    const firstMedia = post.media_urls[0];
    const isVideo = post.media_types?.[0] === 'video';
    
    return {
      url: firstMedia,
      isVideo,
      alt: post.caption?.substring(0, 100) || 'Post media'
    };
  };

  // Get platform icon
  const getPlatformIcon = (platform) => {
    const Icon = platformIcons[platform] || MessageCircle;
    return Icon;
  };

  // Get status config
  const getStatusConfig = (status) => {
    return statusConfig[status] || statusConfig.pending;
  };

  // Calculate pagination
  const totalPages = postsData?.total ? Math.ceil(postsData.total / postsPerPage) : 0;
  const startItem = (currentPage - 1) * postsPerPage + 1;
  const endItem = Math.min(currentPage * postsPerPage, postsData?.total || 0);

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Social Posts</h1>
            <p className="text-gray-600">Manage and monitor your social media posts across all platforms</p>
          </div>
          <Button 
            onClick={handleRefresh}
            variant="outline"
            className="rounded-xl"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = postsData?.posts?.filter(post => post.status === status).length || 0;
            const Icon = config.icon;
            return (
              <Card key={status} className="glass-card rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{config.label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <Icon className={`w-8 h-8 ${config.color.split(' ')[1]}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="glass-card rounded-2xl mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search posts by caption, hashtags, or mentions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>

            {/* Platform Filter */}
            <div className="w-full lg:w-48">
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
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

            {/* Status Filter */}
            <div className="w-full lg:w-48">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="retry">Retry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="w-full lg:w-48">
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Newest First</SelectItem>
                  <SelectItem value="created_at-asc">Oldest First</SelectItem>
                  <SelectItem value="posted_at-desc">Posted Newest</SelectItem>
                  <SelectItem value="posted_at-asc">Posted Oldest</SelectItem>
                  <SelectItem value="platform-asc">Platform A-Z</SelectItem>
                  <SelectItem value="platform-desc">Platform Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <Card className="glass-card rounded-2xl">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <XCircle className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load posts</h3>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <Button onClick={refetch} className="rounded-xl">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : postsData?.posts?.length === 0 ? (
        <Card className="glass-card rounded-2xl">
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Calendar className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedPlatform !== "all" || selectedStatus !== "all"
                ? "Try adjusting your filters or search query"
                : "Create your first social post to get started"}
            </p>
            <Button 
              onClick={() => window.location.href = '/Generate'}
              className="rounded-xl"
            >
              Create Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {postsData?.posts?.map((post) => {
              const PlatformIcon = getPlatformIcon(post.platform);
              const StatusIcon = getStatusConfig(post.status).icon;
              const statusConfig = getStatusConfig(post.status);
              const mediaPreview = getMediaPreview(post);

              return (
                <Card key={post.id} className="glass-card rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                  {/* Platform Header */}
                  <div className={`p-4 ${platformColors[post.platform]} relative`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlatformIcon className="w-5 h-5" />
                        <span className="font-semibold text-sm capitalize">{post.platform}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${statusConfig.color} text-xs px-2 py-1`}>
                          <StatusIcon className={`w-3 h-3 mr-1 ${post.status === 'processing' ? 'animate-spin' : ''}`} />
                          {statusConfig.label}
                        </Badge>
                        {post.retry_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Retry {post.retry_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Media Preview */}
                  {mediaPreview && (
                    <div className="relative h-48 bg-gray-100">
                      <img
                        src={mediaPreview.url}
                        alt={mediaPreview.alt}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTI1SDE1MFYxNzVIMTc1VjEyNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTI1MCAxMjVIMjI1VjE3NUgyNTBWMTI1WiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMjAwIDE1MEgxNzVWMjAwSDIwMFYxNTBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0yMjUgMTUwSDIwMFYyMjVIMjI1VjE1MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                        }}
                      />
                      {mediaPreview.isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                          <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                            <div className="w-0 h-0 border-l-4 border-l-black border-y-2 border-y-transparent ml-1"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {post.caption || "No caption"}
                      </p>
                      {post.hashtags && post.hashtags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {post.hashtags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                          {post.hashtags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{post.hashtags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timestamps */}
                    <div className="text-xs text-gray-500 mb-4 space-y-1">
                      {post.created_at && (
                        <div>Created: {format(new Date(post.created_at), "MMM d, yyyy h:mm a")}</div>
                      )}
                      {post.posted_at && (
                        <div>Posted: {format(new Date(post.posted_at), "MMM d, yyyy h:mm a")}</div>
                      )}
                      {post.scheduled_at && (
                        <div className="text-blue-600 font-medium">
                          Scheduled: {format(new Date(post.scheduled_at), "MMM d, yyyy h:mm a")}
                        </div>
                      )}
                    </div>

                    {/* Error message for failed posts */}
                    {post.last_error && (
                      <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                        <strong>Error:</strong> {post.last_error}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(post)}
                          className="rounded-lg p-2"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {(post.status === 'failed' || post.status === 'retry') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRetry(post.id)}
                            disabled={retryPostMutation.isLoading}
                            className="rounded-lg p-2"
                          >
                            <RefreshCw className={`w-4 h-4 ${retryPostMutation.isLoading ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(post)}
                        className="rounded-lg p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {startItem} to {endItem} of {postsData?.total} posts
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  className="rounded-xl p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600 px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  className="rounded-xl p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Post Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto glass-card rounded-2xl">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
            <DialogDescription>
              Complete information about this social media post
            </DialogDescription>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              {/* Platform and Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${platformColors[selectedPost.platform]}`}>
                    {React.createElement(getPlatformIcon(selectedPost.platform), { className: "w-5 h-5" })}
                  </div>
                  <div>
                    <p className="font-semibold capitalize">{selectedPost.platform}</p>
                    <Badge className={getStatusConfig(selectedPost.status).color}>
                      {getStatusConfig(selectedPost.status).label}
                    </Badge>
                  </div>
                </div>
                {selectedPost.provider_post_id && (
                  <Badge variant="outline" className="text-xs">
                    ID: {selectedPost.provider_post_id}
                  </Badge>
                )}
              </div>

              {/* Content */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Caption</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                    {selectedPost.caption || "No caption provided"}
                  </div>
                </div>

                {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Hashtags</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedPost.hashtags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPost.mentions && selectedPost.mentions.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Mentions</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedPost.mentions.map((mention, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          @{mention}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Media */}
              {selectedPost.media_urls && selectedPost.media_urls.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Media</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {selectedPost.media_urls.map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Media ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NyA1Mkg2MlY5Nkg4N1Y1MloiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTEyNSA1MkgxMDBWOTZIMTI1VjUyWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4=';
                          }}
                        />
                        {selectedPost.media_types?.[index] === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                            <div className="w-8 h-8 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                              <div className="w-0 h-0 border-l-2 border-l-black border-y border-y-transparent ml-0.5"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-600">
                    {selectedPost.created_at ? format(new Date(selectedPost.created_at), "PPpp") : "N/A"}
                  </p>
                </div>
                {selectedPost.posted_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Posted</label>
                    <p className="text-sm text-gray-600">
                      {format(new Date(selectedPost.posted_at), "PPpp")}
                    </p>
                  </div>
                )}
                {selectedPost.scheduled_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Scheduled</label>
                    <p className="text-sm text-blue-600 font-medium">
                      {format(new Date(selectedPost.scheduled_at), "PPpp")}
                    </p>
                  </div>
                )}
              </div>

              {/* Error Details */}
              {selectedPost.last_error && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Error</label>
                  <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {selectedPost.last_error}
                  </div>
                </div>
              )}

              {/* Platform Specific Data */}
              {selectedPost.platform_specific && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Platform Data</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedPost.platform_specific, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="glass-card rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setPostToDelete(null);
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletePostMutation.isLoading}
              className="rounded-xl"
            >
              {deletePostMutation.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}