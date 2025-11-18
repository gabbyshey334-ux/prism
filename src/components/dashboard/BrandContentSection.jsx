import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const contentFormats = [
  { 
    id: "single_image", 
    name: "Single Image Post", 
    icon: "🖼️", 
    needsMedia: true,
    defaultSize: "1080x1350"
  },
  { 
    id: "carousel", 
    name: "Carousel Post", 
    icon: "📸", 
    needsMedia: true, 
    hasSlides: true, 
    defaultSlides: 5,
    defaultSize: "1080x1350"
  },
  { 
    id: "talking_head_script", 
    name: "Short-form Talking Head Script", 
    icon: "🎬", 
    needsMedia: false, 
    hasDuration: true,
    defaultDuration: 45
  },
  { 
    id: "ai_avatar_video", 
    name: "Short-form AI Avatar Video", 
    icon: "🤖", 
    needsMedia: true, 
    hasDuration: true,
    defaultDuration: 45
  },
  { 
    id: "ai_stock_video", 
    name: "Short-form AI & Stock Video", 
    icon: "🎥", 
    needsMedia: true, 
    hasDuration: true,
    defaultDuration: 45
  },
  { 
    id: "single_status", 
    name: "Single Status/Post", 
    icon: "💬", 
    needsMedia: false,
    description: "Thread, Tweet, Bluesky, Facebook status"
  },
  { 
    id: "multi_thread", 
    name: "Multi-Thread", 
    icon: "🧵", 
    needsMedia: false,
    description: "Thread, Twitter, Bluesky"
  },
  { 
    id: "long_form_video", 
    name: "Long Form Video", 
    icon: "📹", 
    needsMedia: true, 
    hasDuration: true,
    defaultDuration: 300
  },
  { 
    id: "long_form_article", 
    name: "Long Form Article", 
    icon: "📄", 
    needsMedia: false
  },
];

export default function BrandContentSection({ idea, brands, brandSettings }) {
  const queryClient = useQueryClient();
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedFormats, setSelectedFormats] = useState({});
  const [formatOptions, setFormatOptions] = useState({});
  const [showAdvanced, setShowAdvanced] = useState({});
  const [advancedOptions, setAdvancedOptions] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);

  const updateContentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Content.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
    },
  });

  const toggleBrand = (brandId) => {
    setSelectedBrands(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  const toggleFormat = (brandId, formatId) => {
    setSelectedFormats(prev => {
      const brandFormats = prev[brandId] || [];
      const newBrandFormats = brandFormats.includes(formatId)
        ? brandFormats.filter(id => id !== formatId)
        : [...brandFormats, formatId];
      
      // Initialize default options for new formats
      if (!brandFormats.includes(formatId)) {
        const format = contentFormats.find(f => f.id === formatId);
        const key = `${brandId}_${formatId}`;
        
        if (format.hasSlides) {
          setFormatOptions(prev => ({
            ...prev,
            [key]: { ...prev[key], slides: format.defaultSlides || 5, size: format.defaultSize || "1080x1350" }
          }));
        }
        if (format.hasDuration) {
          setFormatOptions(prev => ({
            ...prev,
            [key]: { ...prev[key], duration: format.defaultDuration || 45 }
          }));
        }
        if (format.defaultSize) {
          setFormatOptions(prev => ({
            ...prev,
            [key]: { ...prev[key], size: format.defaultSize }
          }));
        }
      }
      
      return { ...prev, [brandId]: newBrandFormats };
    });
  };

  const updateFormatOption = (brandId, formatId, key, value) => {
    const optionKey = `${brandId}_${formatId}`;
    setFormatOptions(prev => ({
      ...prev,
      [optionKey]: {
        ...prev[optionKey],
        [key]: value
      }
    }));
  };

  const toggleAdvanced = (brandId) => {
    setShowAdvanced(prev => ({ ...prev, [brandId]: !prev[brandId] }));
  };

  const handleGenerate = async () => {
    if (selectedBrands.length === 0) {
      toast.error("Please select at least one brand");
      return;
    }

    const hasFormats = selectedBrands.some(brandId => 
      selectedFormats[brandId]?.length > 0
    );

    if (!hasFormats) {
      toast.error("Please select at least one format for each brand");
      return;
    }

    setIsGenerating(true);

    try {
      const brandContent = [];

      for (const brandId of selectedBrands) {
        const brand = brands.find(b => b.id === brandId);
        const formats = selectedFormats[brandId] || [];
        
        if (formats.length === 0) continue;

        const brandSettingsForBrand = brandSettings.filter(bs => bs.brand_id === brandId);
        const generatedContent = {};

        for (const formatId of formats) {
          const format = contentFormats.find(f => f.id === formatId);
          const optionKey = `${brandId}_${formatId}`;
          const options = formatOptions[optionKey] || {};
          const advanced = advancedOptions[brandId] || {};

          let formatInstruction = '';
          if (format.hasSlides) {
            formatInstruction = `Create ${options.slides || 5} slides for a carousel post. Size: ${options.size || "1080x1350"}px`;
          } else if (format.hasDuration) {
            formatInstruction = `Target duration: ${options.duration || 45} seconds.`;
          }

          const prompt = `Create ${format.name} content for: "${idea.ai_generated_title}"

${idea.research_data ? `Research Insights:\n${idea.research_data.substring(0, 800)}\n\n` : ''}

Brand: ${brand.name}
${brand.description ? `Brand Description: ${brand.description}` : ''}
${brand.target_audience ? `Target Audience: ${brand.target_audience}` : ''}
${brand.brand_values ? `Brand Values: ${brand.brand_values}` : ''}

${formatInstruction}
${advanced.tone ? `Tone: ${advanced.tone}` : ''}
${advanced.customInstructions ? `Additional Instructions: ${advanced.customInstructions}` : ''}

${brandSettingsForBrand.length > 0 ? `Brand Guidelines:\n${brandSettingsForBrand.map(bs => 
  `- ${bs.platform}: ${bs.brand_voice || ''} ${bs.content_style || ''}`
).join('\n')}` : ''}

Create engaging, on-brand content that will perform well on social media.`;

          const content = await base44.integrations.Core.InvokeLLM({
            prompt,
            add_context_from_internet: false
          });

          generatedContent[formatId] = {
            content,
            options: options
          };
        }

        brandContent.push({
          brand_id: brandId,
          brand_name: brand.name,
          selected_platforms: formats,
          generated_content: generatedContent
        });
      }

      await updateContentMutation.mutateAsync({
        id: idea.id,
        data: {
          ...idea,
          brand_content: brandContent,
          status: "generated"
        }
      });

      toast.success("Content generated successfully!");

    } catch (error) {
      console.error("Error generating content:", error);
      toast.error("Failed to generate content. Please try again.");
    }

    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4" style={{ color: '#3D3D2B' }}>
          Generate Content by Brand
        </h3>

        {brands.length === 0 ? (
          <Card className="p-8 text-center border-0 rounded-2xl" style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(16px)'
          }}>
            <p style={{ color: '#8B7355' }}>
              Create a brand first to generate content
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {brands.map(brand => (
              <Card key={brand.id} className="border-0 rounded-2xl shadow-sm" style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.75) 100%)',
                backdropFilter: 'blur(16px)',
                borderColor: 'rgba(229, 165, 116, 0.3)'
              }}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Checkbox
                      checked={selectedBrands.includes(brand.id)}
                      onCheckedChange={() => toggleBrand(brand.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        {brand.primary_color && (
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: brand.primary_color }} />
                        )}
                        <h4 className="font-semibold text-lg" style={{ color: '#3D3D2B' }}>
                          {brand.name}
                        </h4>
                      </div>
                      {brand.description && (
                        <p className="text-sm" style={{ color: '#8B7355' }}>{brand.description}</p>
                      )}
                    </div>
                  </div>

                  {selectedBrands.includes(brand.id) && (
                    <div className="space-y-4 ml-7">
                      {/* Format Selection */}
                      <div>
                        <Label className="mb-3 block">Content Formats:</Label>
                        <div className="grid md:grid-cols-2 gap-3">
                          {contentFormats.map(format => (
                            <div key={format.id}>
                              <Card
                                onClick={() => toggleFormat(brand.id, format.id)}
                                className="cursor-pointer border-2 transition-all p-3"
                                style={{
                                  borderColor: selectedFormats[brand.id]?.includes(format.id) ? '#88925D' : '#E5A574',
                                  backgroundColor: selectedFormats[brand.id]?.includes(format.id) ? 'rgba(136, 146, 93, 0.1)' : 'white'
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <Checkbox checked={selectedFormats[brand.id]?.includes(format.id)} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span>{format.icon}</span>
                                      <span className="font-medium text-sm">{format.name}</span>
                                    </div>
                                    {format.description && (
                                      <p className="text-xs mt-1" style={{ color: '#8B7355' }}>
                                        {format.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </Card>

                              {/* Format Options */}
                              {selectedFormats[brand.id]?.includes(format.id) && (
                                <div className="mt-2 ml-6 space-y-2" onClick={(e) => e.stopPropagation()}>
                                  {format.hasSlides && (
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <Label className="text-xs">Slides</Label>
                                        <Input
                                          type="number"
                                          min="2"
                                          max="20"
                                          value={formatOptions[`${brand.id}_${format.id}`]?.slides || 5}
                                          onChange={(e) => updateFormatOption(brand.id, format.id, 'slides', parseInt(e.target.value))}
                                          className="h-8 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Size</Label>
                                        <Select
                                          value={formatOptions[`${brand.id}_${format.id}`]?.size || "1080x1350"}
                                          onValueChange={(v) => updateFormatOption(brand.id, format.id, 'size', v)}
                                        >
                                          <SelectTrigger className="h-8 text-sm">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="1080x1080">Square (1080x1080)</SelectItem>
                                            <SelectItem value="1080x1350">Portrait (1080x1350)</SelectItem>
                                            <SelectItem value="1080x1920">Story (1080x1920)</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  )}

                                  {format.hasDuration && (
                                    <div>
                                      <Label className="text-xs">Duration (seconds)</Label>
                                      <Input
                                        type="number"
                                        min="15"
                                        max="600"
                                        value={formatOptions[`${brand.id}_${format.id}`]?.duration || format.defaultDuration}
                                        onChange={(e) => updateFormatOption(brand.id, format.id, 'duration', parseInt(e.target.value))}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  )}

                                  {!format.hasSlides && !format.hasDuration && format.defaultSize && (
                                    <div>
                                      <Label className="text-xs">Size</Label>
                                      <Select
                                        value={formatOptions[`${brand.id}_${format.id}`]?.size || format.defaultSize}
                                        onValueChange={(v) => updateFormatOption(brand.id, format.id, 'size', v)}
                                      >
                                        <SelectTrigger className="h-8 text-sm">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="1080x1080">Square (1080x1080)</SelectItem>
                                          <SelectItem value="1080x1350">Portrait (1080x1350)</SelectItem>
                                          <SelectItem value="1080x1920">Story (1080x1920)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Advanced Options */}
                      <div>
                        <button
                          onClick={() => toggleAdvanced(brand.id)}
                          className="flex items-center gap-2 text-sm font-medium"
                          style={{ color: '#88925D' }}
                        >
                          Advanced Options
                          {showAdvanced[brand.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {showAdvanced[brand.id] && (
                          <div className="mt-3 space-y-3">
                            <div>
                              <Label className="text-sm">Tone</Label>
                              <Select
                                value={advancedOptions[brand.id]?.tone || "engaging"}
                                onValueChange={(v) => setAdvancedOptions(prev => ({
                                  ...prev,
                                  [brand.id]: { ...prev[brand.id], tone: v }
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="engaging">Engaging</SelectItem>
                                  <SelectItem value="professional">Professional</SelectItem>
                                  <SelectItem value="casual">Casual</SelectItem>
                                  <SelectItem value="humorous">Humorous</SelectItem>
                                  <SelectItem value="inspiring">Inspiring</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-sm">Custom Instructions</Label>
                              <Textarea
                                placeholder="Add any specific instructions..."
                                value={advancedOptions[brand.id]?.customInstructions || ""}
                                onChange={(e) => setAdvancedOptions(prev => ({
                                  ...prev,
                                  [brand.id]: { ...prev[brand.id], customInstructions: e.target.value }
                                }))}
                                className="min-h-20"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || selectedBrands.length === 0}
              className="w-full rounded-xl h-12 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                color: 'white'
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Content for {selectedBrands.length} Brand{selectedBrands.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}