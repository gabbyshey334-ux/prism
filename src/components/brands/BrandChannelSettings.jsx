import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Save } from "lucide-react";
import { toast } from "sonner";

const platforms = [
  { id: "general", name: "General", icon: "⚙️", description: "Default settings for all platforms" },
  { id: "tiktok", name: "TikTok", icon: "🎵", description: "Short-form video settings" },
  { id: "instagram", name: "Instagram", icon: "📸", description: "Reels and carousel settings" },
  { id: "threads", name: "Threads", icon: "🧵", description: "Conversational content settings" },
  { id: "blog", name: "Blog", icon: "📝", description: "Long-form article settings" },
  { id: "youtube", name: "YouTube", icon: "🎥", description: "Video content settings" }
];

export default function BrandChannelSettings({ brand }) {
  const queryClient = useQueryClient();
  const [activePlatform, setActivePlatform] = useState("general");

  const { data: allSettings = [] } = useQuery({
    queryKey: ['brandSettings'],
    queryFn: () => base44.entities.BrandSettings.list(),
    initialData: [],
  });

  const currentSettings = allSettings.find(
    s => s.brand_id === brand.id && s.platform === activePlatform
  ) || {
    brand_id: brand.id,
    platform: activePlatform,
    brand_voice: "",
    content_style: "",
    cta_preferences: "",
    hashtag_strategy: "",
    posting_frequency: "",
    dos_and_donts: ""
  };

  const [formData, setFormData] = useState(currentSettings);

  React.useEffect(() => {
    const settings = allSettings.find(
      s => s.brand_id === brand.id && s.platform === activePlatform
    ) || {
      brand_id: brand.id,
      platform: activePlatform,
      brand_voice: "",
      content_style: "",
      cta_preferences: "",
      hashtag_strategy: "",
      posting_frequency: "",
      dos_and_donts: ""
    };
    setFormData(settings);
  }, [brand.id, activePlatform, allSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        return base44.entities.BrandSettings.update(data.id, data);
      } else {
        return base44.entities.BrandSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandSettings'] });
      toast.success("Settings saved!");
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <Card className="border-0 rounded-2xl shadow-lg" style={{ backgroundColor: 'var(--card)' }}>
      <CardContent className="p-6">
        <Tabs value={activePlatform} onValueChange={setActivePlatform}>
          <TabsList className="bg-white rounded-xl border-2 p-1 flex-wrap h-auto gap-2 mb-6"
                   style={{ borderColor: 'var(--border)' }}>
            {platforms.map(platform => (
              <TabsTrigger
                key={platform.id}
                value={platform.id}
                className="rounded-lg px-4 data-[state=active]:bg-opacity-80"
                style={{
                  backgroundColor: activePlatform === platform.id ? 'var(--card-hover)' : 'transparent',
                  color: activePlatform === platform.id ? 'var(--primary-dark)' : 'var(--text)'
                }}
              >
                <span className="mr-2">{platform.icon}</span>
                {platform.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {platforms.map(platform => (
            <TabsContent key={platform.id} value={platform.id} className="space-y-6">
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--background)' }}>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                  {platform.description}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Settings for: {brand.name}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
                  Brand Voice & Tone
                </label>
                <Textarea
                  placeholder="e.g., Friendly, professional, humorous, inspirational..."
                  value={formData.brand_voice || ""}
                  onChange={(e) => setFormData({...formData, brand_voice: e.target.value})}
                  className="min-h-24 rounded-xl border-2 resize-none"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
                  Content Style
                </label>
                <Textarea
                  placeholder="e.g., Educational, entertaining, behind-the-scenes, storytelling..."
                  value={formData.content_style || ""}
                  onChange={(e) => setFormData({...formData, content_style: e.target.value})}
                  className="min-h-24 rounded-xl border-2 resize-none"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
                  Call-to-Action Preferences
                </label>
                <Textarea
                  placeholder="e.g., 'Follow for more', 'Link in bio', 'Comment below', custom CTAs..."
                  value={formData.cta_preferences || ""}
                  onChange={(e) => setFormData({...formData, cta_preferences: e.target.value})}
                  className="min-h-24 rounded-xl border-2 resize-none"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
                  Hashtag Strategy
                </label>
                <Textarea
                  placeholder="e.g., Use 5-7 hashtags, mix popular and niche, avoid banned hashtags..."
                  value={formData.hashtag_strategy || ""}
                  onChange={(e) => setFormData({...formData, hashtag_strategy: e.target.value})}
                  className="min-h-24 rounded-xl border-2 resize-none"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
                  Posting Frequency
                </label>
                <Textarea
                  placeholder="e.g., 3 times per week, Daily at 9 AM, Every Monday and Thursday..."
                  value={formData.posting_frequency || ""}
                  onChange={(e) => setFormData({...formData, posting_frequency: e.target.value})}
                  className="min-h-20 rounded-xl border-2 resize-none"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
                  Do's and Don'ts
                </label>
                <Textarea
                  placeholder="e.g., Always include emojis, never mention competitors, avoid controversial topics..."
                  value={formData.dos_and_donts || ""}
                  onChange={(e) => setFormData({...formData, dos_and_donts: e.target.value})}
                  className="min-h-32 rounded-xl border-2 resize-none"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="w-full rounded-xl h-12 shadow-md hover:shadow-lg transition-all"
                style={{ 
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                  color: 'white'
                }}
              >
                <Save className="w-5 h-5 mr-2" />
                Save {platform.name} Settings
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}