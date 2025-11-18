
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card"; // Added CardContent
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Flame, Trash2, Loader2, Sparkles, Copy } from "lucide-react"; // Added Loader2, Sparkles, Copy
import { format } from "date-fns";

export default function IdeasGrid({
  ideas,
  categories,
  selectedCategory,
  onCategoryChange,
  onIdeaClick,
  onIdeaDelete,
  onIdeaDuplicate, // New prop
  isLoading,
  emptyMessage = "No ideas yet"
}) {
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

  // The handleDelete function is removed as per the outline,
  // with the logic moved directly into the button's onClick handler.

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#3D3D2B' }}>
            {ideas.length} {ideas.length === 1 ? 'item' : 'items'}
          </h2>
        </div>

        <Tabs value={selectedCategory} onValueChange={onCategoryChange}>
          <TabsList className="rounded-xl border-2 p-1" style={{
            borderColor: 'rgba(180, 150, 120, 0.4)',
            backgroundColor: 'rgba(255, 255, 255, 0.6)'
          }}>
            {categories.map(cat => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="rounded-lg capitalize data-[state=active]:shadow-md"
                style={{
                  backgroundColor: selectedCategory === cat ? '#88925D' : 'transparent',
                  color: selectedCategory === cat ? 'white' : '#6B6B4D'
                }}
              >
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#88925D' }} />
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg" style={{ color: '#8B7355' }}>{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ideas.map(idea => (
            <Card
              key={idea.id}
              className="border-2 rounded-2xl hover:shadow-xl transition-all cursor-pointer crystal-shine relative"
              style={{
                borderColor: 'rgba(229, 165, 116, 0.3)',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)'
              }}
            >
              {/* Viral score badge and date - moved outside CardContent with adjusted padding */}
              {idea.viral_score && (
                <div className="flex items-center justify-between p-6 pb-2">
                  <Badge className="border-0 shadow-sm ethereal-glow" style={{
                    background: idea.viral_score >= 7
                      ? 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)'
                      : 'linear-gradient(135deg, #A4B58B 0%, #C4D4A8 100%)',
                    color: 'white'
                  }}>
                    {idea.viral_score >= 7 ? (
                      <>
                        <Flame className="w-3 h-3 mr-1" />
                        High Viral Potential
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Good Potential
                      </>
                    )}
                  </Badge>
                  <span className="text-xs font-medium" style={{ color: '#88925D' }}>
                    {format(new Date(idea.created_date), 'MMM d')}
                  </span>
                </div>
              )}

              {/* CardContent now wraps the main idea details and has its own click handler */}
              <CardContent className="p-6 pt-0" onClick={() => onIdeaClick(idea)}>
                <h3 className="font-semibold text-lg mb-2 transition-colors line-clamp-2"
                    style={{ color: '#3D3D2B' }}>
                  {idea.ai_generated_title || idea.original_input}
                </h3>
                <p className="text-sm line-clamp-3 mb-2" style={{ color: '#6B6B4D' }}>
                  {idea.original_input}
                </p>

                {/* Show RSS domain if from RSS */}
                {idea.original_input?.includes('http') && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs" style={{ color: '#8B7355' }}>
                      📰 {extractDomain(idea.original_input.match(/https?:\/\/[^\s]+/)?.[0])}
                    </span>
                  </div>
                )}

                {/* Footer content (category and status badges) retained inside CardContent */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t" style={{ borderColor: 'rgba(180, 150, 120, 0.3)' }}>
                  {idea.ai_generated_category && (
                    <Badge variant="outline" className="border-2" style={{
                      borderColor: '#88925D',
                      color: '#3D3D2B',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(244, 220, 200, 0.4) 100%)',
                      backdropFilter: 'blur(8px)'
                    }}>
                      {idea.ai_generated_category}
                    </Badge>
                  )}
                  <Badge className="ethereal-glow" style={{
                    background: idea.status === 'generated'
                      ? 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)'
                      : 'linear-gradient(135deg, #A4B58B 0%, #C4D4A8 100%)',
                    color: 'white'
                  }}>
                    {idea.status}
                  </Badge>
                </div>
              </CardContent>

              {/* New footer section with action buttons */}
              <div className="px-6 pb-4 flex items-center justify-between gap-2">
                <Button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent CardContent onClick from firing
                    onIdeaClick(idea);
                  }}
                  size="sm"
                  className="rounded-xl flex-1"
                  style={{
                    background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                    color: 'white'
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Open
                </Button>

                {onIdeaDuplicate && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent CardContent onClick from firing
                      onIdeaDuplicate(idea);
                    }}
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent CardContent onClick from firing
                    if (confirm('Delete this idea?')) {
                      onIdeaDelete(idea.id);
                    }
                  }}
                  size="sm"
                  variant="ghost"
                  className="rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
