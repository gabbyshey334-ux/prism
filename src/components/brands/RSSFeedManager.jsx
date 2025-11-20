import React, { useState } from "react";
import { prism } from "@/api/prismClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Rss, Plus, Trash2, X, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function RSSFeedManager({ brand, onClose, onUpdate }) {
  const [feeds, setFeeds] = useState(brand.rss_feeds || []);
  const [newFeed, setNewFeed] = useState({ name: "", url: "", category: "" });
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  const handleAddFeed = () => {
    if (!newFeed.name || !newFeed.url) {
      toast.error("Please enter feed name and URL");
      return;
    }

    setFeeds([...feeds, newFeed]);
    setNewFeed({ name: "", url: "", category: "" });
  };

  const handleRemoveFeed = (index) => {
    setFeeds(feeds.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const updatedBrand = { ...brand, rss_feeds: feeds };
    onUpdate(updatedBrand);
    toast.success("RSS feeds saved!");
    onClose();
  };

  const handleGetRecommendations = async () => {
    setIsRecommending(true);
    
    try {
      const response = await prism.integrations.Core.InvokeLLM({
        prompt: `Based on this brand profile, recommend 8-10 high-quality RSS feeds from reputable industry sources, news sites, and blogs:

Brand: ${brand.name}
Industry: ${brand.industry || 'Not specified'}
Description: ${brand.description || 'Not specified'}
Target Audience: ${brand.target_audience || 'Not specified'}
Content Pillars: ${brand.content_pillars?.join(', ') || 'Not specified'}

Recommend RSS feeds that will provide:
1. Industry news and updates
2. Trending topics relevant to the brand
3. Competitor insights
4. Technology and innovation news
5. General business/marketing news

For each RSS feed, provide:
- name: Publication/blog name
- url: Full RSS feed URL (must be a working RSS/Atom feed URL, not just website URL)
- category: Brief category (e.g., "Industry News", "Tech News", "Marketing", etc.)

Only recommend feeds from established, reputable sources that definitely have RSS feeds available.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            feeds: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  url: { type: "string" },
                  category: { type: "string" }
                }
              }
            }
          }
        }
      });

      setRecommendations(response.feeds || []);
      toast.success(`Found ${response.feeds?.length || 0} RSS feed recommendations!`);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      toast.error("Failed to get recommendations");
    }

    setIsRecommending(false);
  };

  const handleAddRecommendation = (feed) => {
    setFeeds([...feeds, feed]);
    setRecommendations(recommendations.filter(f => f.url !== feed.url));
    toast.success(`Added ${feed.name}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onClose} size="icon" className="rounded-xl">
            <X className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#3D3D2B' }}>
              RSS Feeds
            </h2>
            <p className="text-sm" style={{ color: '#8B7355' }}>
              Manage news feeds for {brand.name}
            </p>
          </div>
        </div>
        <Button
          onClick={handleGetRecommendations}
          disabled={isRecommending}
          className="rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
            color: 'white'
          }}
        >
          {isRecommending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Finding Feeds...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Recommendations
            </>
          )}
        </Button>
      </div>

      {/* Current Feeds */}
      <Card className="border-2 rounded-2xl" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rss className="w-5 h-5" />
            Current RSS Feeds ({feeds.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {feeds.map((feed, index) => (
            <div key={index} className="flex items-start justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgba(136, 146, 93, 0.05)' }}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold" style={{ color: '#3D3D2B' }}>
                    {feed.name}
                  </span>
                  {feed.category && (
                    <Badge variant="outline" className="text-xs">
                      {feed.category}
                    </Badge>
                  )}
                </div>
                <a 
                  href={feed.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs hover:underline flex items-center gap-1"
                  style={{ color: '#88925D' }}
                >
                  <ExternalLink className="w-3 h-3" />
                  {feed.url}
                </a>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveFeed(index)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {feeds.length === 0 && (
            <p className="text-center py-8" style={{ color: '#8B7355' }}>
              No RSS feeds added yet. Use AI recommendations or add manually below.
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-2 rounded-2xl" style={{ borderColor: 'rgba(232, 180, 77, 0.3)', backgroundColor: 'rgba(232, 180, 77, 0.05)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: '#E8B44D' }} />
              AI Recommended Feeds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((feed, index) => (
              <div key={index} className="flex items-start justify-between p-3 rounded-lg bg-white">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold" style={{ color: '#3D3D2B' }}>
                      {feed.name}
                    </span>
                    {feed.category && (
                      <Badge variant="outline" className="text-xs">
                        {feed.category}
                      </Badge>
                    )}
                  </div>
                  <a 
                    href={feed.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs hover:underline flex items-center gap-1"
                    style={{ color: '#88925D' }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {feed.url}
                  </a>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddRecommendation(feed)}
                  className="rounded-lg"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add New Feed */}
      <Card className="border-2 rounded-2xl" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
        <CardHeader>
          <CardTitle>Add RSS Feed Manually</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Feed Name</Label>
            <Input
              value={newFeed.name}
              onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
              placeholder="e.g., TechCrunch"
              className="rounded-xl"
            />
          </div>
          <div>
            <Label>RSS Feed URL</Label>
            <Input
              value={newFeed.url}
              onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })}
              placeholder="e.g., https://techcrunch.com/feed/"
              className="rounded-xl"
            />
          </div>
          <div>
            <Label>Category (Optional)</Label>
            <Input
              value={newFeed.category}
              onChange={(e) => setNewFeed({ ...newFeed, category: e.target.value })}
              placeholder="e.g., Tech News"
              className="rounded-xl"
            />
          </div>
          <Button onClick={handleAddFeed} variant="outline" className="w-full rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Add Feed
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} className="rounded-xl">
          Cancel
        </Button>
        <Button onClick={handleSave} className="rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
            color: 'white'
          }}>
          Save RSS Feeds
        </Button>
      </div>
    </div>
  );
}