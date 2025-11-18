import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const contentFormats = [
  { id: "tiktok", name: "TikTok Video", icon: "🎵", description: "Short vertical video (15-60s)" },
  { id: "instagram_reel", name: "Instagram Reel", icon: "📹", description: "Vertical video for Instagram" },
  { id: "instagram_carousel", name: "Instagram Carousel", icon: "📸", description: "Multi-image post" },
  { id: "threads", name: "Threads Post", icon: "🧵", description: "Text-based conversation" },
  { id: "blog", name: "Blog Post", icon: "📝", description: "Long-form article" },
  { id: "youtube", name: "YouTube Video", icon: "🎥", description: "Long-form video content" }
];

export default function PlatformSelection({ idea, brand, brandSettings, onCancel, onGenerate }) {
  const queryClient = useQueryClient();
  const [selectedFormats, setSelectedFormats] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Content.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
    },
  });

  const toggleFormat = (formatId) => {
    setSelectedFormats(prev => 
      prev.includes(formatId) 
        ? prev.filter(id => id !== formatId)
        : [...prev, formatId]
    );
  };

  const handleGenerate = async () => {
    if (selectedFormats.length === 0) {
      toast.error("Please select at least one content format");
      return;
    }

    setIsGenerating(true);

    try {
      // Build context from brand settings
      const platformSettings = {};
      selectedFormats.forEach(format => {
        const settings = brandSettings.find(s => s.platform === format) || 
                        brandSettings.find(s => s.platform === 'general');
        if (settings) {
          platformSettings[format] = {
            brand_voice: settings.brand_voice,
            content_style: settings.content_style,
            cta_preferences: settings.cta_preferences,
            hashtag_strategy: settings.hashtag_strategy,
            dos_and_donts: settings.dos_and_donts
          };
        }
      });

      const brandContext = `Brand: ${brand.name}
${brand.description ? `Description: ${brand.description}` : ''}
${brand.target_audience ? `Target Audience: ${brand.target_audience}` : ''}
${brand.brand_values ? `Brand Values: ${brand.brand_values}` : ''}
${brand.offers?.length > 0 ? `Current Offers: ${brand.offers.join(', ')}` : ''}
${brand.lead_magnets?.length > 0 ? `Lead Magnets: ${brand.lead_magnets.join(', ')}` : ''}`;

      const ideaContext = `Content Idea: ${idea.ai_generated_title || idea.original_input}
${idea.research_data ? `Research Insights:\n${idea.research_data}` : ''}
${idea.additional_context?.length > 0 ? `Additional Context:\n${idea.additional_context.map(c => c.input).join('\n')}` : ''}`;

      // Generate content for each selected format
      const generatedContent = {};
      
      for (const format of selectedFormats) {
        const formatInfo = contentFormats.find(f => f.id === format);
        const settings = platformSettings[format] || {};

        const prompt = `Generate engaging content for ${formatInfo.name} (${formatInfo.description}).

${brandContext}

${ideaContext}

Platform-Specific Guidelines:
${settings.brand_voice ? `Brand Voice: ${settings.brand_voice}` : ''}
${settings.content_style ? `Content Style: ${settings.content_style}` : ''}
${settings.cta_preferences ? `CTA Preferences: ${settings.cta_preferences}` : ''}
${settings.hashtag_strategy ? `Hashtag Strategy: ${settings.hashtag_strategy}` : ''}
${settings.dos_and_donts ? `Do's and Don'ts: ${settings.dos_and_donts}` : ''}

Create content that:
- Matches the brand voice and personality
- Resonates with the target audience
- Follows platform best practices for ${formatInfo.name}
- Is optimized for engagement and virality
- Includes appropriate CTAs and hashtags

Return the content in this format:
- Main content/caption
- Hook (first line to grab attention)
- Hashtags (if applicable)
- CTA
- Any additional notes or suggestions`;

        const response = await base44.integrations.Core.InvokeLLM({
          prompt: prompt,
          response_json_schema: {
            type: "object",
            properties: {
              caption: { type: "string" },
              hook: { type: "string" },
              hashtags: { type: "array", items: { type: "string" } },
              cta: { type: "string" },
              notes: { type: "string" }
            }
          }
        });

        generatedContent[format] = response;
      }

      // Update the content record
      const existingBrandContent = idea.brand_content || [];
      const brandContentIndex = existingBrandContent.findIndex(bc => bc.brand_id === brand.id);

      let updatedBrandContent;
      if (brandContentIndex >= 0) {
        // Update existing brand content
        updatedBrandContent = [...existingBrandContent];
        updatedBrandContent[brandContentIndex] = {
          ...updatedBrandContent[brandContentIndex],
          selected_platforms: selectedFormats,
          generated_content: generatedContent
        };
      } else {
        // Add new brand content
        updatedBrandContent = [
          ...existingBrandContent,
          {
            brand_id: brand.id,
            brand_name: brand.name,
            selected_platforms: selectedFormats,
            generated_content: generatedContent
          }
        ];
      }

      await updateMutation.mutateAsync({
        id: idea.id,
        data: {
          ...idea,
          brand_content: updatedBrandContent,
          status: "generated"
        }
      });

      toast.success(`Generated content for ${selectedFormats.length} format${selectedFormats.length > 1 ? 's' : ''}!`);
      onGenerate(selectedFormats);
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error("Failed to generate content. Please try again.");
    }

    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--text)' }}>
          Select Content Formats
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Choose which formats to generate for this content idea
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {contentFormats.map(format => (
            <div
              key={format.id}
              className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md"
              style={{
                borderColor: selectedFormats.includes(format.id) ? 'var(--primary)' : 'var(--border)',
                backgroundColor: selectedFormats.includes(format.id) ? 'var(--accent-light)' : 'white'
              }}
              onClick={() => toggleFormat(format.id)}
            >
              <Checkbox
                checked={selectedFormats.includes(format.id)}
                onCheckedChange={() => toggleFormat(format.id)}
              />
              <div className="flex-1">
                <Label className="flex items-center gap-2 cursor-pointer font-semibold"
                       style={{ color: 'var(--text)' }}>
                  <span className="text-xl">{format.icon}</span>
                  {format.name}
                </Label>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  {format.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          onClick={onCancel}
          variant="outline"
          className="rounded-xl"
        >
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={selectedFormats.length === 0 || isGenerating}
          className="rounded-xl shadow-md"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
            color: 'white'
          }}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Content
            </>
          )}
        </Button>
      </div>
    </div>
  );
}