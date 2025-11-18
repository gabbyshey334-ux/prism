
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Zap, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import ContentCreationWorkflow from "../components/dashboard/ContentCreationWorkflow";

export default function Generate() {
  const [input, setInput] = useState("");
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [workflowIdea, setWorkflowIdea] = useState(null);
  const [skipResearch, setSkipResearch] = useState(true);

  const { data: recentIdeas = [] } = useQuery({
    queryKey: ['recentIdeas'],
    queryFn: () => base44.entities.Content.list('-created_date', 5),
    initialData: [],
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => base44.entities.Brand.list(),
    initialData: [],
  });

  // Check if we're coming from a trend with a saved content ID
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const contentId = urlParams.get('contentId');
    const ideaId = urlParams.get('ideaId');
    
    if (contentId || ideaId) {
      // Load the content and open workflow
      base44.entities.Content.list().then(contents => {
        const content = contents.find(c => c.id === (contentId || ideaId));
        if (content) {
          setWorkflowIdea(content);
          setSkipResearch(!!content.research_data);
          setShowWorkflow(true);
        }
      });
    }
  }, []);

  const handleQuickGenerate = (withResearch = false) => {
    if (!input.trim()) {
      toast.error("Please enter an idea or topic");
      return;
    }

    setWorkflowIdea({
      original_input: input,
      ai_generated_title: input,
      input_type: "text"
    });
    setSkipResearch(!withResearch);
    setShowWorkflow(true);
  };

  const handleGenerateFromIdea = (idea) => {
    setWorkflowIdea(idea);
    setSkipResearch(!!idea.research_data);
    setShowWorkflow(true);
  };

  const handleBrandClick = (brand) => {
    if (!input.trim()) {
      toast.error("Please enter an idea or topic first");
      return;
    }

    setWorkflowIdea({
      original_input: input,
      ai_generated_title: input,
      input_type: "text",
      preselected_brand: brand.id
    });
    setSkipResearch(false);
    setShowWorkflow(true);
  };

  return (
    <div className="min-h-screen p-6 md:p-8" style={{
      background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
    }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
            Generate Content
          </h1>
          <p className="text-lg" style={{ color: '#8B7355' }}>
            Enter your idea, then select a brand to generate content
          </p>
        </div>

        {/* Quick Input */}
        <Card className="border-0 rounded-3xl shadow-lg mb-8 crystal-shine" style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 50%, rgba(244, 220, 200, 0.9) 100%)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(229, 165, 116, 0.3)'
        }}>
          <CardContent className="p-6 space-y-4">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your content idea or topic..."
              className="min-h-32 rounded-xl border-2 resize-none"
              style={{ 
                borderColor: 'rgba(229, 165, 116, 0.3)',
                color: '#4A4A4A'
              }}
            />
          </CardContent>
        </Card>

        {/* Select Brand */}
        {input.trim() && brands.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#3D3D2B' }}>
              Select a Brand
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {brands.map(brand => (
                <Card
                  key={brand.id}
                  onClick={() => handleBrandClick(brand)}
                  className="border rounded-3xl shadow-lg hover:shadow-xl transition-all cursor-pointer group crystal-shine"
                  style={{
                    borderColor: 'rgba(180, 150, 120, 0.3)',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.75) 100%)',
                    backdropFilter: 'blur(16px)'
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {brand.primary_color && (
                          <div className="w-12 h-12 rounded-xl"
                               style={{ backgroundColor: brand.primary_color }}
                          />
                        )}
                        <div>
                          <h3 className="font-semibold text-lg" style={{ color: '#3D3D2B' }}>
                            {brand.name}
                          </h3>
                          {brand.description && (
                            <p className="text-sm line-clamp-1" style={{ color: '#8B7355' }}>
                              {brand.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" 
                                   style={{ color: '#88925D' }} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {brands.length === 0 && (
          <Card className="p-8 text-center border-0 rounded-3xl" style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(16px)'
          }}>
            <p style={{ color: '#8B7355' }}>
              Create a brand first to start generating content
            </p>
          </Card>
        )}

        {/* Recent Ideas */}
        {recentIdeas.length > 0 && !showWorkflow && (
          <div>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#3D3D2B' }}>
              Generate from Recent Ideas
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {recentIdeas.map(idea => (
                <Card
                  key={idea.id}
                  className="border rounded-3xl shadow-lg hover:shadow-xl transition-all cursor-pointer group crystal-shine"
                  style={{
                    borderColor: 'rgba(180, 150, 120, 0.3)',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.75) 100%)',
                    backdropFilter: 'blur(16px)'
                  }}
                  onClick={() => handleGenerateFromIdea(idea)}
                >
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2" style={{ color: '#3D3D2B' }}>
                      {idea.ai_generated_title || idea.original_input}
                    </h3>
                    {idea.ai_generated_category && (
                      <p className="text-sm" style={{ color: '#8B7355' }}>
                        {idea.ai_generated_category}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {showWorkflow && workflowIdea && (
          <ContentCreationWorkflow
            initialIdea={workflowIdea}
            skipResearch={skipResearch}
            onClose={() => {
              setShowWorkflow(false);
              setWorkflowIdea(null);
              setInput("");
            }}
            onComplete={() => {
              setShowWorkflow(false);
              setWorkflowIdea(null);
              setInput("");
              toast.success("Content generated! Check your Library.");
            }}
          />
        )}
      </div>
    </div>
  );
}
