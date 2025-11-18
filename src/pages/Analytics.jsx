
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Users, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Analytics() {
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => base44.entities.Brand.list(),
    initialData: [],
  });

  const { data: contents = [] } = useQuery({
    queryKey: ['contents'],
    queryFn: () => base44.entities.Content.list('-created_date'),
    initialData: [],
  });

  const handleAnalyze = async () => {
    if (selectedBrand === "all") {
      toast.error("Please select a specific brand");
      return;
    }

    setAnalyzing(true);

    try {
      const brandData = brands.find(b => b.id === selectedBrand);
      const brandContents = contents.filter(c => 
        c.brand_content?.some(bc => bc.brand_id === selectedBrand) &&
        c.analytics
      );

      if (brandContents.length === 0) {
        toast.error("No analytics data found for this brand. Post some content first!");
        setAnalyzing(false);
        return;
      }

      const analyticsData = brandContents.map(c => ({
        title: c.ai_generated_title,
        category: c.ai_generated_category,
        platforms: c.platforms,
        analytics: c.analytics,
        viral_score: c.viral_score
      }));

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a social media analytics expert. Analyze this content performance data for ${brandData.name}:

${JSON.stringify(analyticsData, null, 2)}

Provide a comprehensive analysis including:
1. Best performing content types and topics
2. Optimal posting times and frequencies
3. Audience engagement patterns
4. Content format preferences (video vs image vs text)
5. Hashtag and keyword effectiveness
6. Viral content characteristics
7. Actionable recommendations for future content

Brand Context:
- Target Audience: ${brandData.target_audience || 'Not specified'}
- Brand Values: ${brandData.brand_values || 'Not specified'}

Be specific and actionable. Format with clear sections and bullet points.`,
        add_context_from_internet: false
      });

      setAnalysisResult(response);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Analytics error:", error);
      toast.error("Failed to analyze analytics");
    }

    setAnalyzing(false);
  };

  const selectedBrandData = brands.find(b => b.id === selectedBrand);

  return (
    <div className="min-h-screen p-6" style={{
      background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
    }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
              Analytics
            </h1>
            <p style={{ color: '#8B7355' }}>
              Track performance across all your social media platforms
            </p>
          </div>
          
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger className="w-48 rounded-xl">
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
        </div>

        {/* The 'Analyze' button was removed as per the outline.
            The handleAnalyze function still exists but is not currently triggered by a UI element.
            This section will display analysis results if analysisResult is set,
            or a placeholder if no brand is selected or no analysis has been run.
        */}
        {analysisResult && (
          <Card className="border-0 rounded-2xl shadow-lg" style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.75) 100%)',
            backdropFilter: 'blur(16px)'
          }}>
            <CardHeader>
              <CardTitle style={{ color: '#3D3D2B' }}>
                Analysis for {selectedBrandData?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose max-w-none whitespace-pre-wrap" style={{ color: '#4A4A4A' }}>
                {analysisResult}
              </div>
            </CardContent>
          </Card>
        )}

        {!analysisResult && selectedBrand === "all" && (
          <Card className="p-12 text-center border-0 rounded-2xl" style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(16px)'
          }}>
            <BarChart3 className="w-16 h-16 mx-auto mb-4" style={{ color: '#8B7355' }} />
            <p className="text-xl mb-2" style={{ color: '#3D3D2B' }}>Select a Brand</p>
            <p style={{ color: '#8B7355' }}>
              Choose a brand to analyze its social media performance
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
