
import React, { useState } from "react";
import { prism } from "@/api/prismClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Plus, Trash2, GripVertical, Settings as SettingsIcon } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const platformIcons = {
  tiktok: "🎵",
  instagram_reel: "📹",
  instagram_carousel: "📸",
  threads: "🧵",
  blog: "📝",
  youtube: "🎥"
};

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Autolist() {
  const queryClient = useQueryClient();
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => prism.entities.Brand.list(),
    initialData: [],
  });

  const { data: contents = [] } = useQuery({
    queryKey: ['contents'],
    queryFn: () => prism.entities.Content.list('autolist_priority'),
    initialData: [],
  });

  const { data: autolistSettings = [] } = useQuery({
    queryKey: ['autolistSettings'],
    queryFn: () => prism.entities.AutolistSettings.list(),
    initialData: [],
  });

  // Move useEffect before any conditional returns
  React.useEffect(() => {
    if (brands.length > 0 && !selectedBrand) {
      setSelectedBrand(brands[0].id);
    }
  }, [brands, selectedBrand]);

  const updateContentMutation = useMutation({
    mutationFn: ({ id, data }) => prism.entities.Content.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        return prism.entities.AutolistSettings.update(data.id, data);
      } else {
        return prism.entities.AutolistSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autolistSettings'] });
      toast.success("Autolist settings updated!");
    },
  });

  const currentSettings = autolistSettings.find(
    s => s.brand_id === selectedBrand && s.platform === selectedPlatform
  ) || {
    brand_id: selectedBrand,
    platform: selectedPlatform,
    enabled: false,
    posting_schedule: [],
    loop_mode: true
  };

  // Filter content in autolist for selected brand/platform
  const autolistContent = contents.filter(c =>
    c.in_autolist &&
    c.brand_content?.some(bc =>
      bc.brand_id === selectedBrand &&
      bc.selected_platforms?.includes(selectedPlatform)
    )
  );

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(autolistContent);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update priorities
    for (let i = 0; i < items.length; i++) {
      await updateContentMutation.mutateAsync({
        id: items[i].id,
        data: { ...items[i], autolist_priority: i }
      });
    }
  };

  const toggleAutolist = async (contentId) => {
    const content = contents.find(c => c.id === contentId);
    await updateContentMutation.mutateAsync({
      id: contentId,
      data: {
        ...content,
        in_autolist: !content.in_autolist,
        autolist_priority: content.in_autolist ? null : autolistContent.length
      }
    });
  };

  const removeFromAutolist = async (contentId) => {
    const content = contents.find(c => c.id === contentId);
    await updateContentMutation.mutateAsync({
      id: contentId,
      data: { ...content, in_autolist: false, autolist_priority: null }
    });
  };

  const toggleEnabled = async () => {
    await updateSettingsMutation.mutateAsync({
      ...currentSettings,
      enabled: !currentSettings.enabled
    });
  };

  // Now conditional render is after all hooks
  if (brands.length === 0) {
    return (
      <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-6xl mx-auto">
          <Card className="p-12 text-center border-0 rounded-2xl" style={{ backgroundColor: 'var(--card)' }}>
            <p className="text-xl mb-2" style={{ color: 'var(--text)' }}>No brands yet</p>
            <p style={{ color: 'var(--text-muted)' }}>Create a brand first to set up autolist</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>
              Autolist Queue
            </h1>
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
              Automated posting schedule that loops through your content
            </p>
          </div>
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            className="rounded-xl"
            disabled={!selectedBrand || !selectedPlatform}
          >
            <SettingsIcon className="w-5 h-5 mr-2" />
            Configure Schedule
          </Button>
        </div>

        {/* Brand & Platform Selection */}
        <Card className="border-0 rounded-2xl shadow-sm mb-6" style={{ backgroundColor: 'var(--card)' }}>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
                  Select Brand
                </label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>
                        <div className="flex items-center gap-2">
                          {brand.primary_color && (
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: brand.primary_color }} />
                          )}
                          {brand.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
                  Select Platform
                </label>
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choose platform..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiktok">🎵 TikTok</SelectItem>
                    <SelectItem value="instagram_reel">📹 Instagram Reel</SelectItem>
                    <SelectItem value="instagram_carousel">📸 Instagram Carousel</SelectItem>
                    <SelectItem value="threads">🧵 Threads</SelectItem>
                    <SelectItem value="blog">📝 Blog</SelectItem>
                    <SelectItem value="youtube">🎥 YouTube</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedBrand && selectedPlatform && (
              <div className="flex items-center justify-between p-4 rounded-xl"
                   style={{ backgroundColor: 'var(--background)' }}>
                <div className="flex items-center gap-3">
                  {currentSettings.enabled ? (
                    <Play className="w-5 h-5" style={{ color: 'var(--success)' }} />
                  ) : (
                    <Pause className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  )}
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text)' }}>
                      Autolist {currentSettings.enabled ? 'Active' : 'Paused'}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {currentSettings.posting_schedule?.length || 0} times per week •
                      {currentSettings.loop_mode ? ' Loop enabled' : ' No loop'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={currentSettings.enabled}
                  onCheckedChange={toggleEnabled}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {selectedBrand && selectedPlatform ? (
          autolistContent.length === 0 ? (
            <Card className="p-12 text-center border-0 rounded-2xl" style={{ backgroundColor: 'var(--card)' }}>
              <p className="text-xl mb-2" style={{ color: 'var(--text)' }}>No content in autolist</p>
              <p style={{ color: 'var(--text-muted)' }}>
                Add generated content to the autolist from your ideas
              </p>
            </Card>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="autolist">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {autolistContent.map((content, index) => (
                      <Draggable key={content.id} draggableId={content.id} index={index}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="border-0 rounded-2xl shadow-sm hover:shadow-md transition-all"
                            style={{
                              backgroundColor: 'var(--card)',
                              ...provided.draggableProps.style
                            }}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-center gap-4">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                                </div>

                                <Badge className="w-8 h-8 rounded-full flex items-center justify-center"
                                       style={{ backgroundColor: 'var(--accent-light)', color: 'var(--text)' }}>
                                  {index + 1}
                                </Badge>

                                <div className="flex-1">
                                  <h3 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>
                                    {content.ai_generated_title}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">{platformIcons[selectedPlatform]}</span>
                                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                      {selectedPlatform.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFromAutolist(content.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )
        ) : (
          <Card className="p-12 text-center border-0 rounded-2xl" style={{ backgroundColor: 'var(--card)' }}>
            <p className="text-xl mb-2" style={{ color: 'var(--text)' }}>Select brand and platform</p>
            <p style={{ color: 'var(--text-muted)' }}>
              Choose a brand and platform to manage your autolist queue
            </p>
          </Card>
        )}

        {showSettings && (
          <AutolistSettingsModal
            settings={currentSettings}
            onClose={() => setShowSettings(false)}
            onSave={(data) => {
              updateSettingsMutation.mutate(data);
              setShowSettings(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function AutolistSettingsModal({ settings, onClose, onSave }) {
  const [formData, setFormData] = useState(settings);

  const addScheduleSlot = () => {
    setFormData({
      ...formData,
      posting_schedule: [
        ...(formData.posting_schedule || []),
        { day: "Monday", time: "09:00" }
      ]
    });
  };

  const removeScheduleSlot = (index) => {
    setFormData({
      ...formData,
      posting_schedule: formData.posting_schedule.filter((_, i) => i !== index)
    });
  };

  const updateScheduleSlot = (index, field, value) => {
    const updated = [...formData.posting_schedule];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, posting_schedule: updated });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Autolist Schedule Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          <div className="flex items-center justify-between p-4 rounded-xl"
               style={{ backgroundColor: 'var(--background)' }}>
            <div>
              <p className="font-medium mb-1" style={{ color: 'var(--text)' }}>Loop Mode</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Automatically restart from the beginning after posting all content
              </p>
            </div>
            <Switch
              checked={formData.loop_mode}
              onCheckedChange={(checked) => setFormData({ ...formData, loop_mode: checked })}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                Posting Schedule
              </label>
              <Button onClick={addScheduleSlot} size="sm" variant="outline" className="rounded-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Time Slot
              </Button>
            </div>

            <div className="space-y-3">
              {formData.posting_schedule?.map((slot, idx) => (
                <div key={idx} className="flex gap-3">
                  <Select
                    value={slot.day}
                    onValueChange={(value) => updateScheduleSlot(idx, 'day', value)}
                  >
                    <SelectTrigger className="flex-1 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="time"
                    value={slot.time}
                    onChange={(e) => updateScheduleSlot(idx, 'time', e.target.value)}
                    className="flex-1 rounded-xl"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeScheduleSlot(idx)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => onSave(formData)}
              className="rounded-xl"
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                color: 'white'
              }}
            >
              Save Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
