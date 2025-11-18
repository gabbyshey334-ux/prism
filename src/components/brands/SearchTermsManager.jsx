import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Trash2, X, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function SearchTermsManager({ brand, onClose, onUpdate }) {
  const [newsTopics, setNewsTopics] = useState(brand.news_topics || []);
  const [newTopic, setNewTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerms, setSearchTerms] = useState(brand.recommended_search_terms || []);

  const handleAddTopic = () => {
    if (!newTopic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setNewsTopics([...newsTopics, newTopic.trim()]);
    setNewTopic("");
  };

  const handleRemoveTopic = (index) => {
    setNewsTopics(newsTopics.filter((_, i) => i !== index));
  };

  const handleGenerateSearchTerms = async () => {
    setIsGenerating(true);
    
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on this brand profile and news topics, generate comprehensive search terms and hashtags for monitoring trending content across social media platforms (TikTok, Instagram, Twitter, YouTube):

Brand: ${brand.name}
Industry: ${brand.industry || 'Not specified'}
Description: ${brand.description || 'Not specified'}
Target Audience: ${brand.target_audience || 'Not specified'}
Brand Values: ${brand.brand_values || 'Not specified'}
Content Pillars: ${brand.content_pillars?.join(', ') || 'Not specified'}

News Topics to Monitor:
${newsTopics.map(t => `- ${t}`).join('\n')}

Generate 20-30 search terms that include:
1. Industry-specific keywords and hashtags
2. Trending topics related to the brand's niche
3. Competitor and thought leader names
4. Popular formats (e.g., "howto", "tutorial", "review")
5. Audience pain points and desires
6. Platform-specific trending terms
7. Seasonal and timely keywords

For each search term, provide:
- term: The search term or hashtag (include # for hashtags)
- relevance: Brief explanation of why it's relevant
- platform: Best platform(s) for this term (TikTok, Instagram, Twitter, YouTube, or "All")

Focus on terms that will help discover viral content and trending conversations relevant to the brand.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            search_terms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  term: { type: "string" },
                  relevance: { type: "string" },
                  platform: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSearchTerms(response.search_terms || []);
      toast.success(`Generated ${response.search_terms?.length || 0} search terms!`);
    } catch (error) {
      console.error("Error generating search terms:", error);
      toast.error("Failed to generate search terms");
    }

    setIsGenerating(false);
  };

  const handleRemoveSearchTerm = (index) => {
    setSearchTerms(searchTerms.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const updatedBrand = { 
      ...brand, 
      news_topics: newsTopics,
      recommended_search_terms: searchTerms
    };
    onUpdate(updatedBrand);
    toast.success("Search terms saved!");
    onClose();
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
              Search Terms & Topics
            </h2>
            <p className="text-sm" style={{ color: '#8B7355' }}>
              Configure trend monitoring for {brand.name}
            </p>
          </div>
        </div>
      </div>

      {/* News Topics */}
      <Card className="border-2 rounded-2xl" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            News Topics to Monitor
          </CardTitle>
          <p className="text-sm" style={{ color: '#8B7355' }}>
            Add topics you want AI to track for trending news and content ideas
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="e.g., AI developments, sustainability trends, etc."
              className="rounded-xl"
              onKeyPress={(e) => e.key === 'Enter' && handleAddTopic()}
            />
            <Button onClick={handleAddTopic} variant="outline" className="rounded-xl">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {newsTopics.map((topic, index) => (
              <Badge key={index} variant="outline" className="px-3 py-1.5 text-sm">
                {topic}
                <button
                  onClick={() => handleRemoveTopic(index)}
                  className="ml-2 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {newsTopics.length === 0 && (
              <p className="text-sm" style={{ color: '#8B7355' }}>
                No topics added yet. Add topics above to help AI find relevant trends.
              </p>
            )}
          </div>

          <Button
            onClick={handleGenerateSearchTerms}
            disabled={isGenerating || newsTopics.length === 0}
            className="w-full rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
              color: 'white'
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Search Terms...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate AI Search Terms
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Search Terms */}
      {searchTerms.length > 0 && (
        <Card className="border-2 rounded-2xl" style={{ borderColor: 'rgba(232, 180, 77, 0.3)', backgroundColor: 'rgba(232, 180, 77, 0.05)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" style={{ color: '#E8B44D' }} />
              AI-Recommended Search Terms ({searchTerms.length})
            </CardTitle>
            <p className="text-sm" style={{ color: '#8B7355' }}>
              Use these to monitor trends across social platforms
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {searchTerms.map((item, index) => (
                <div key={index} className="flex items-start justify-between p-3 rounded-lg bg-white">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-base" style={{ color: '#3D3D2B' }}>
                        {item.term}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {item.platform}
                      </Badge>
                    </div>
                    <p className="text-sm" style={{ color: '#6B6B4D' }}>
                      {item.relevance}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSearchTerm(index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          Save Configuration
        </Button>
      </div>
    </div>
  );
}