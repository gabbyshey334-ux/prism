
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const platformInfo = {
  tiktok: { name: "TikTok", icon: "🎵" },
  instagram_reel: { name: "Instagram Reel", icon: "📹" },
  instagram_carousel: { name: "Instagram Carousel", icon: "📸" },
  threads: { name: "Threads", icon: "🧵" },
  blog: { name: "Blog", icon: "📝" },
  youtube: { name: "YouTube", icon: "🎥" }
};

export default function GeneratedContent({ idea, brandId, brandContent, brandSettings }) {
  const queryClient = useQueryClient();
  const [copiedPlatform, setCopiedPlatform] = useState(null);
  const [regeneratingPlatform, setRegeneratingPlatform] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [schedulingPlatform, setSchedulingPlatform] = useState(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Content.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
    },
  });

  const copyToClipboard = (platform, content) => {
    navigator.clipboard.writeText(content);
    setCopiedPlatform(platform);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  const regenerateContent = async (platform) => {
    setRegeneratingPlatform(platform);
    
    const platformKey = platform.replace('instagram_', '');
    const settings = brandSettings.find(s => s.platform === platformKey) || 
                    brandSettings.find(s => s.platform === 'general') || {};

    const feedbackText = feedback[platform] || "";
    
    const prompt = `REGENERATE this content with improvements.

Original content:
${brandContent.generated_content[platform]}

${feedbackText ? `User feedback: ${feedbackText}` : ''}

Idea context:
Title: ${idea.ai_generated_title}
${idea.research_data ? `Research: ${idea.research_data}` : ''}

Brand voice: ${settings.brand_voice || 'N/A'}

Create an IMPROVED, MORE VIRAL version that addresses the feedback while maintaining viral optimization.`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      const updatedIdeaBrandContent = idea.brand_content.map(bc => {
        if (bc.brand_id === brandId) {
          return {
            ...bc,
            generated_content: {
              ...bc.generated_content,
              [platform]: result
            }
          };
        }
        return bc;
      });

      await updateMutation.mutateAsync({
        id: idea.id,
        data: {
          ...idea,
          brand_content: updatedIdeaBrandContent
        }
      });

      setFeedback(prev => ({ ...prev, [platform]: "" }));
      toast.success("Content regenerated!");
    } catch (error) {
      console.error("Regeneration error:", error);
      toast.error("Failed to regenerate. Please try again.");
    }

    setRegeneratingPlatform(null);
  };

  const handleSchedule = async (platform) => {
    if (!scheduleDate || !scheduleTime) {
      toast.error("Please select date and time");
      return;
    }

    const scheduledTime = `${scheduleDate}T${scheduleTime}`;

    const updatedBrandContents = idea.brand_content.map(bc => {
      if (bc.brand_id === brandId) {
        const existingPosts = bc.scheduled_posts || [];
        return {
          ...bc,
          scheduled_posts: [
            ...existingPosts,
            {
              platform,
              scheduled_time: scheduledTime,
              post_status: "scheduled"
            }
          ]
        };
      }
      return bc;
    });

    try {
        await updateMutation.mutateAsync({
            id: idea.id,
            data: {
                ...idea,
                brand_content: updatedBrandContents,
                status: "scheduled"
            }
        });

        setSchedulingPlatform(null);
        setScheduleDate("");
        setScheduleTime("");
        toast.success("Post scheduled successfully!");
    } catch (error) {
        console.error("Scheduling error:", error);
        toast.error("Failed to schedule post. Please try again.");
    }
  };

  const toggleAutolist = async () => {
    try {
        await updateMutation.mutateAsync({
            id: idea.id,
            data: {
                ...idea,
                in_autolist: !idea.in_autolist
            }
        });
        toast.success(idea.in_autolist ? "Removed from autolist" : "Added to autolist!");
    } catch (error) {
        console.error("Autolist toggle error:", error);
        toast.error("Failed to update autolist status. Please try again.");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button
            onClick={toggleAutolist}
            variant="outline"
            size="sm"
            className="rounded-lg"
            style={{
              backgroundColor: idea.in_autolist ? 'var(--accent-light)' : 'transparent',
              borderColor: 'var(--border)',
              color: 'var(--text)' 
            }}
          >
            {idea.in_autolist ? '✓ In Autolist' : '+ Add to Autolist'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue={brandContent.selected_platforms?.[0]} className="space-y-4">
        <TabsList className="bg-white rounded-xl border-2 p-1 flex-wrap h-auto gap-2"
                 style={{ borderColor: 'var(--border)' }}>
          {brandContent.selected_platforms?.map(platform => (
            <TabsTrigger
              key={platform}
              value={platform}
              className="rounded-lg data-[state=active]:bg-opacity-80"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text)'
              }}
            >
              <span className="mr-2">{platformInfo[platform]?.icon}</span>
              {platformInfo[platform]?.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {brandContent.selected_platforms?.map(platform => (
          <TabsContent key={platform} value={platform} className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium" style={{ color: 'var(--text)' }}>
                {platformInfo[platform]?.icon} {platformInfo[platform]?.name}
              </h4>
              <div className="flex gap-2">
                <Button
                  onClick={() => copyToClipboard(platform, brandContent.generated_content[platform])}
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                >
                  {copiedPlatform === platform ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setSchedulingPlatform(platform)}
                  size="sm"
                  className="rounded-lg"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)',
                    color: 'var(--text)'
                  }}
                >
                  📅 Schedule
                </Button>
              </div>
            </div>

            <div className="p-5 rounded-xl whitespace-pre-wrap" 
                 style={{ backgroundColor: 'var(--background)' }}>
              <p style={{ color: 'var(--text)' }}>
                {brandContent.generated_content[platform]}
              </p>
            </div>

            {schedulingPlatform === platform && (
              <Card className="border-2 rounded-xl" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3" style={{ color: 'var(--text)' }}>
                    Schedule Post
                  </h4>
                  <div className="grid md:grid-cols-2 gap-3 mb-3">
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="rounded-xl border-2"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background-secondary)', color: 'var(--text)' }}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="rounded-xl border-2"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background-secondary)', color: 'var(--text)' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSchedulingPlatform(null)}
                      variant="outline"
                      className="flex-1 rounded-xl"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleSchedule(platform)}
                      className="flex-1 rounded-xl"
                      style={{ 
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                        color: 'white'
                      }}
                    >
                      Confirm Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <Textarea
                placeholder="Give feedback to improve this content (e.g., 'Make it more casual', 'Add more urgency', 'Shorter hook')..."
                value={feedback[platform] || ""}
                onChange={(e) => setFeedback(prev => ({ ...prev, [platform]: e.target.value }))}
                className="rounded-xl border-2 resize-none"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background-secondary)', color: 'var(--text)' }}
              />
              <Button
                onClick={() => regenerateContent(platform)}
                disabled={regeneratingPlatform === platform}
                variant="outline"
                className="w-full rounded-xl"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                {regeneratingPlatform === platform ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate with Feedback
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
