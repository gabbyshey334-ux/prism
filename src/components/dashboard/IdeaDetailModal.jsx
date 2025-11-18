
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Flame, Calendar, ExternalLink, Hash, Lightbulb } from "lucide-react";
import { format } from "date-fns";

export default function IdeaDetailModal({ idea, brands, onClose, onOpenWorkflow }) {
  if (!idea) return null;

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

  // Check if original input contains a URL
  const urlMatch = idea.original_input?.match(/https?:\/\/[^\s]+/);
  const hasUrl = !!urlMatch;
  const url = urlMatch?.[0];

  const brand = idea.brand_content?.[0]
    ? brands.find(b => b.id === idea.brand_content[0].brand_id)
    : null;

  const handleOpenWorkflow = () => {
    onOpenWorkflow(idea);
    onClose(); // Close the modal after opening the workflow
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl" style={{
        backgroundColor: 'white',
        border: '2px solid rgba(125, 90, 74, 0.2)',
        boxShadow: '0 20px 50px rgba(125, 90, 74, 0.15)'
      }}>
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold pr-8 leading-tight" style={{ color: '#2D2416' }}>
            {idea.ai_generated_title || idea.original_input}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Header Badges */}
          <div className="flex flex-wrap gap-2">
            {idea.viral_score && (
              <Badge className="px-3 py-1 text-sm font-semibold" style={{
                backgroundColor: idea.viral_score >= 7 ? '#E8B44D' : '#88925D',
                color: 'white',
                border: 'none'
              }}>
                {idea.viral_score >= 7 ? (
                  <>
                    <Flame className="w-4 h-4 mr-1" />
                    High Potential - {idea.viral_score}/10
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-1" />
                    {idea.viral_score}/10
                  </>
                )}
              </Badge>
            )}
            {idea.ai_generated_category && (
              <Badge className="px-3 py-1 text-sm font-semibold" style={{ 
                backgroundColor: '#FFE5D9', 
                color: '#C9664D',
                border: '1px solid #E5A574'
              }}>
                {idea.ai_generated_category}
              </Badge>
            )}
            {idea.status && (
              <Badge className="px-3 py-1 text-sm font-semibold" style={{
                background: idea.status === 'generated'
                  ? 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)'
                  : '#A4B58B',
                color: 'white',
                border: 'none'
              }}>
                {idea.status}
              </Badge>
            )}
            <Badge className="px-3 py-1 text-sm font-semibold" style={{ 
              backgroundColor: '#F5F5F5', 
              color: '#5E4032',
              border: '1px solid #D4C4B0'
            }}>
              <Calendar className="w-4 h-4 mr-1" />
              {format(new Date(idea.created_date), 'MMM d, yyyy')}
            </Badge>
          </div>

          {/* Brand */}
          {brand && (
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{
              backgroundColor: '#F0F4E8',
              border: '2px solid #88925D'
            }}>
              {brand.primary_color && (
                <div className="w-8 h-8 rounded-lg shadow-sm" style={{ 
                  backgroundColor: brand.primary_color,
                  border: '2px solid white'
                }} />
              )}
              <span className="font-bold text-base" style={{ color: '#2D2416' }}>{brand.name}</span>
            </div>
          )}

          {/* Source Link */}
          {hasUrl && (
            <a 
              href={url} 
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
              <span>View Source: {extractDomain(url)}</span>
            </a>
          )}

          {/* Original Input */}
          <div className="p-5 rounded-2xl" style={{ 
            backgroundColor: '#FAFAF8',
            border: '1px solid #E8E3DC'
          }}>
            <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: '#2D2416' }}>
              <Lightbulb className="w-5 h-5" style={{ color: '#E8B44D' }} />
              Original Idea
            </h3>
            <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: '#4A4032' }}>
              {idea.original_input}
            </p>
          </div>

          {/* Research Data */}
          {idea.research_data && (
            <div className="p-5 rounded-2xl" style={{ 
              backgroundColor: '#FFF8F0',
              border: '2px solid #E5A574'
            }}>
              <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: '#2D2416' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#E5A574' }} />
                Research & Insights
              </h3>
              <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: '#4A4032' }}>
                {idea.research_data}
              </p>
            </div>
          )}

          {/* Tags */}
          {idea.tags && idea.tags.length > 0 && (
            <div>
              <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: '#2D2416' }}>
                <Hash className="w-5 h-5" style={{ color: '#88925D' }} />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {idea.tags.map((tag, idx) => (
                  <Badge key={idx} className="px-3 py-1.5 text-sm font-semibold" style={{
                    backgroundColor: '#E8D9F4',
                    color: '#5E4032',
                    border: '1px solid #A88FA8'
                  }}>
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded Images */}
          {idea.uploaded_file_url && idea.uploaded_file_type === 'image' && (
            <div>
              <h3 className="text-base font-bold mb-3" style={{ color: '#2D2416' }}>
                Uploaded Image
              </h3>
              <img 
                src={idea.uploaded_file_url} 
                alt={idea.ai_generated_title || "Content"} 
                className="w-full rounded-2xl shadow-lg"
                style={{ border: '3px solid #E8E3DC' }}
              />
            </div>
          )}

          {/* Action Buttons */}
          <DialogFooter className="flex-col sm:flex-row gap-3 pt-6 border-t-2" style={{ borderColor: '#E8E3DC' }}>
            <Button
              onClick={handleOpenWorkflow}
              className="flex-1 rounded-xl h-12 text-base font-bold shadow-lg hover:shadow-xl transition-all"
              style={{
                background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                color: 'white',
                border: 'none'
              }}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {idea.status === 'draft' || idea.status === 'researched' 
                ? 'Create Content' 
                : idea.status === 'text_generated'
                ? 'Review Content'
                : idea.status === 'visuals_generated'
                ? 'Review Visuals'
                : 'Edit & Publish'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
