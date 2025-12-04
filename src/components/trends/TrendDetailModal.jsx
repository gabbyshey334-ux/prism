import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Lightbulb, TrendingUp, Flame, Calendar, ExternalLink, Hash } from "lucide-react";
import { format } from "date-fns";

export default function TrendDetailModal({ trend, onClose, onCreateContent, onSaveIdea }) {
  if (!trend) return null;

  const isRssTrend = trend.source?.toLowerCase().startsWith('rss -');
  const sourceInfo = isRssTrend
    ? trend.source
    : {
        instagram: "Instagram",
        tiktok: "TikTok",
        twitter: "Twitter/X",
        youtube: "YouTube",
        rss: "RSS Feed",
        news: "News",
        general: "General"
      }[trend.source] || trend.source;

  const sourceIcon = isRssTrend ? "📰" : {
    instagram: "📸",
    tiktok: "🎵",
    twitter: "🐦",
    youtube: "🎥",
    rss: "📰",
    news: "📰",
    general: "✨"
  }[trend.source] || "✨";

  // Extract domain from URL for display
  const getSourceDomain = (url) => {
    if (!url) return null;
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6" 
        style={{
        backgroundColor: 'white',
        border: '2px solid rgba(125, 90, 74, 0.2)',
        boxShadow: '0 20px 50px rgba(125, 90, 74, 0.15)'
        }}
        aria-labelledby="trend-detail-title"
        aria-describedby="trend-detail-description"
      >
        <DialogHeader>
          <DialogTitle id="trend-detail-title" className="text-3xl font-bold pr-8 leading-tight" style={{ color: '#2D2416' }}>
            {trend.title}
          </DialogTitle>
          <div id="trend-detail-description" className="sr-only">
            Detailed information about this trending topic. View description, research data, and options to save as content idea or create content.
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Header Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className="px-3 py-1 text-sm font-semibold" style={{
              backgroundColor: trend.viral_potential >= 8 ? '#E8B44D' : '#88925D',
              color: 'white',
              border: 'none'
            }}>
              {trend.viral_potential >= 8 ? (
                <>
                  <Flame className="w-4 h-4 mr-1" />
                  Hot Trend - {trend.viral_potential}/10
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Trending - {trend.viral_potential}/10
                </>
              )}
            </Badge>
            <Badge className="px-3 py-1 text-sm font-semibold" style={{ 
              backgroundColor: '#F5EFE7', 
              color: '#5E4032',
              border: '1px solid #D4C4B0'
            }}>
              {sourceIcon} {sourceInfo}
            </Badge>
            {trend.category && (
              <Badge className="px-3 py-1 text-sm font-semibold" style={{ 
                backgroundColor: '#FFE5D9', 
                color: '#C9664D',
                border: '1px solid #E5A574'
              }}>
                {trend.category}
              </Badge>
            )}
            {trend.source_date && (
              <Badge className="px-3 py-1 text-sm font-semibold" style={{ 
                backgroundColor: '#F5F5F5', 
                color: '#5E4032',
                border: '1px solid #D4C4B0'
              }}>
                <Calendar className="w-4 h-4 mr-1" />
                {format(new Date(trend.source_date), 'MMM d, yyyy')}
              </Badge>
            )}
          </div>

          {/* Source Link - Prominent Display */}
          {trend.source_url && (
            <a 
              href={trend.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-4 rounded-2xl transition-all hover:shadow-md font-semibold"
              style={{ 
                backgroundColor: '#F0F4E8',
                border: '2px solid #88925D',
                color: '#5E4032'
              }}
            >
              <ExternalLink className="w-5 h-5" style={{ color: '#88925D' }} />
              <div className="flex-1">
                <div className="text-sm" style={{ color: '#88925D' }}>View Original Source</div>
                <div className="text-xs" style={{ color: '#8B7355' }}>{getSourceDomain(trend.source_url)}</div>
              </div>
            </a>
          )}

          {/* Description */}
          <div className="p-5 rounded-2xl" style={{ 
            backgroundColor: '#FAFAF8',
            border: '1px solid #E8E3DC'
          }}>
            <h3 className="text-base font-bold mb-3" style={{ color: '#2D2416' }}>
              What's Trending
            </h3>
            <p className="text-base leading-relaxed" style={{ color: '#4A4032' }}>
              {trend.description}
            </p>
          </div>

          {/* Trending Data / Insights */}
          {trend.trending_data && (
            <div className="p-5 rounded-2xl" style={{ 
              backgroundColor: '#FFF8F0',
              border: '2px solid #E5A574'
            }}>
              <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: '#2D2416' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#E5A574' }} />
                Deep Context & Insights
              </h3>
              <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: '#4A4032' }}>
                {trend.trending_data}
              </p>
            </div>
          )}

          {/* Brand Relevance */}
          {trend.brand_relevance && (
            <div className="p-5 rounded-2xl" style={{ 
              backgroundColor: '#F0F4E8',
              border: '2px solid #88925D'
            }}>
              <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: '#2D2416' }}>
                <Sparkles className="w-5 h-5" style={{ color: '#88925D' }} />
                Why This Matters to Your Brand
              </h3>
              <p className="text-base leading-relaxed" style={{ color: '#4A4032' }}>
                {trend.brand_relevance}
              </p>
            </div>
          )}

          {/* Keywords & Hashtags */}
          {trend.keywords && trend.keywords.length > 0 && (
            <div>
              <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: '#2D2416' }}>
                <Hash className="w-5 h-5" style={{ color: '#88925D' }} />
                Keywords & Hashtags
              </h3>
              <div className="flex flex-wrap gap-2">
                {trend.keywords.map((keyword, idx) => (
                  <Badge key={idx} className="px-3 py-1.5 text-sm font-semibold" style={{
                    backgroundColor: '#E8D9F4',
                    color: '#5E4032',
                    border: '1px solid #A88FA8'
                  }}>
                    #{keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-sm pt-4 border-t-2" style={{ 
            borderColor: '#E8E3DC',
            color: '#8B7355'
          }}>
            <span className="font-semibold">
              Viral Potential: <span style={{ color: trend.viral_potential >= 7 ? '#E8B44D' : '#5E4032' }}>
                {trend.viral_potential}/10
              </span>
            </span>
            {trend.duration_estimate && (
              <span>Est. Duration: {trend.duration_estimate}</span>
            )}
            <span>
              {trend.source_date 
                ? format(new Date(trend.source_date), 'MMM d, yyyy')
                : format(new Date(trend.created_date), 'MMM d, yyyy')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="flex-col sm:flex-row gap-2 pt-6 border-t-2" style={{ borderColor: '#E8E3DC' }}>
          <Button
            onClick={() => onCreateContent(trend)}
            className="flex-1 rounded-xl h-12 text-base font-bold shadow-lg hover:shadow-xl transition-all"
            style={{
              background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
              color: 'white',
              border: 'none'
            }}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Create Content
          </Button>
          <Button
            onClick={() => onSaveIdea(trend)}
            variant="outline"
            className="flex-1 rounded-xl h-12 text-base font-bold"
            style={{ 
              borderColor: '#88925D',
              color: '#5E4032'
            }}
          >
            <Lightbulb className="w-5 h-5 mr-2" />
            Save Idea
          </Button>
          <DialogClose asChild>
            <Button 
              variant="ghost" 
              className="flex-1 rounded-xl h-12 text-base font-bold"
              style={{ color: '#8B7355' }}
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}