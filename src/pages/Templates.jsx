
import React, { useState } from "react";
import { prism } from "@/api/prismClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Edit, Trash2, Search, Filter, Loader2,
  Image as ImageIcon, Video, LayoutGrid, Save, MoreVertical, Copy,
  Eye, Sparkles, List // Added List import
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CESDKEditor from "../components/editor/CESDKEditor";
import TemplatePlaceholderEditor from "../components/templates/TemplatePlaceholderEditor";

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedTab, setSelectedTab] = useState("all");
  const [showFormatSelection, setShowFormatSelection] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Centralized state for managing CESDKEditor visibility and properties
  const [editorState, setEditorState] = useState({ open: false, initialScene: null, templateData: null, onSave: null });
  const [showPlaceholderEditor, setShowPlaceholderEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null); // This holds the full template object for editing across flows (details, placeholders)
  const [currentDesign, setCurrentDesign] = useState(null); // This holds the *new* design data from CESDKEditor during creation flow
  const [extractingTemplate, setExtractingTemplate] = useState(null); // New state for extraction loading

  // Form state for creating/editing templates
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_type: "single_image",
    format: "instagram_square",
    tags: [],
    ai_generation_instructions: "",
    content_style: "",
    target_audience: ""
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => prism.entities.Template.list('-created_date'),
    initialData: [],
  });

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || template.template_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data) => prism.entities.Template.create(data),
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setEditingTemplate(newTemplate); // Set editingTemplate to the newly created one to prepare for placeholder editing
      setShowCreateModal(false);
      setShowPlaceholderEditor(true);
      toast.success("Template created!");
    },
    onError: (error) => {
      toast.error("Failed to create template: " + error.message);
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => prism.entities.Template.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success("Template updated!");
      // If we're updating from the details modal (creation flow completion), reset form.
      // If we're updating placeholders, this will be handled after placeholder save.
      if (showCreateModal) { // This check indicates it's the creation flow finishing
         resetForm();
      }
    },
    onError: (error) => {
      toast.error("Failed to update template: " + error.message);
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => prism.entities.Template.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success("Template deleted!");
    },
    onError: (error) => {
      toast.error("Failed to delete template: " + error.message);
    }
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template) => {
      const duplicate = {
        name: `${template.name} (Copy)`,
        description: template.description,
        template_type: template.template_type,
        format: template.format,
        cesdk_scene: template.cesdk_scene,
        thumbnail_url: template.thumbnail_url,
        is_public: false,
        is_prism_template: false,
        brand_id: template.brand_id,
        tags: template.tags,
        placeholders: template.placeholders,
        block_metadata: template.block_metadata,
        ai_generation_instructions: template.ai_generation_instructions,
        content_style: template.content_style,
        target_audience: template.target_audience
      };
      return prism.entities.Template.create(duplicate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success("Template duplicated!");
    },
    onError: (error) => {
      toast.error("Failed to duplicate template: " + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      template_type: "single_image",
      format: "instagram_square",
      tags: [],
      ai_generation_instructions: "",
      content_style: "",
      target_audience: ""
    });
    setEditingTemplate(null);
    setCurrentDesign(null);
    setShowCreateModal(false);
    setEditorState({ open: false, initialScene: null, templateData: null, onSave: null }); // Reset editor state
    setShowFormatSelection(false);
    setShowPlaceholderEditor(false);
  };

  const handleCreateNew = () => {
    resetForm(); // Ensure everything is clean for a new creation
    setShowFormatSelection(true);
  };

  const handleFormatSelected = (format, type) => {
    // This part is for NEW template creation, initial setup
    setFormData(prev => ({
      ...prev,
      format: format,
      template_type: type
    }));
    setShowFormatSelection(false);
    setEditorState({
      open: true,
      initialScene: null, // No initial scene for new template
      templateData: { name: "Untitled Template", format: format, template_type: type }, // Provide minimal data for editor
      onSave: handleEditorSave // Use the common save handler for creation flow
    });
  };

  // This is the save handler when creating a *new* design from CESDKEditor
  // It closes the editor and opens the template details modal.
  const handleEditorSave = (designData) => {
    setCurrentDesign(designData); // Store the design from editor
    setEditorState(prev => ({ ...prev, open: false })); // Close the editor
    setShowCreateModal(true); // Open the template details modal
  };

  const handleSaveTemplate = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (!currentDesign?.scene) {
      toast.error("Please create a design first");
      return;
    }

    try {
      const templateData = {
        ...formData,
        cesdk_scene: currentDesign.scene,
        thumbnail_url: currentDesign.previewUrl,
        block_metadata: currentDesign.blockMetadata || [],
        is_public: false,
        is_prism_template: false,
      };

      if (editingTemplate && editingTemplate.id) { // This case implies we're updating existing template details
        await updateTemplateMutation.mutateAsync({
          id: editingTemplate.id,
          data: templateData
        });
        setShowCreateModal(false);
        // After updating the template details, we might want to allow editing placeholders
        setShowPlaceholderEditor(true);
      } else { // This is for creating a brand new template
        await createTemplateMutation.mutateAsync(templateData);
      }
    } catch (error) {
      console.error('Save template error:', error);
      toast.error('Failed to save template');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template); // Keep this to reference the template across states (e.g., placeholder editor)
    setFormData({ // Populate form data if the user decides to edit details too (though typically they'll just save design)
      name: template.name,
      description: template.description || "",
      template_type: template.template_type,
      format: template.format,
      tags: template.tags || [],
      ai_generation_instructions: template.ai_generation_instructions || "",
      content_style: template.content_style || "",
      target_audience: template.target_audience || ""
    });
    setEditorState({
      open: true,
      initialScene: template.cesdk_scene, // Pass the existing scene for editing
      templateData: template, // Pass the full template object
      onSave: async (designData) => { // Direct save for existing template's design
        try {
          await prism.entities.Template.update(template.id, {
            cesdk_scene: designData.scene,
            thumbnail_url: designData.previewUrl,
            block_metadata: designData.blockMetadata || template.block_metadata || [],
          });

          queryClient.invalidateQueries({ queryKey: ['templates'] });
          toast.success('Template design updated!');
          setEditorState({ open: false, initialScene: null, templateData: null, onSave: null });
          setEditingTemplate(null); // Clear editingTemplate specific to this design edit session
        } catch (error) {
          console.error('Update design error:', error);
          toast.error('Failed to update template design');
        }
      }
    });
  };

  const handleEditPlaceholders = (template) => {
    setEditingTemplate(template);
    setShowPlaceholderEditor(true);
  };

  // New function to handle placeholder extraction/opening
  const handleExtractPlaceholders = async (template) => {
    setExtractingTemplate(template.id);
    try {
      // Simulate an async operation for placeholder preparation/extraction.
      // In a real application, this could involve an API call to analyze the CESDK scene
      // and automatically detect potential placeholders, or fetch the latest placeholder definitions.
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async work

      // After (simulated) async work, open the placeholder editor.
      // The `handleEditPlaceholders` function already correctly sets `editingTemplate` and opens the dialog.
      handleEditPlaceholders(template);
    } catch (error) {
      console.error("Failed to prepare placeholders:", error);
      toast.error("Failed to prepare placeholders for editing.");
    } finally {
      setExtractingTemplate(null);
    }
  };

  const handleApplyTemplate = async (template) => {
    try {
      // Store template data for use in generate/editor flow
      localStorage.setItem('selectedTemplate', JSON.stringify(template));
      toast.success('Template selected! You can now use it in the Generate page.');
      // Optionally navigate to generate page
      // navigate('/generate');
    } catch (error) {
      console.error('Apply template error:', error);
      toast.error('Failed to apply template');
    }
  };


  const handleSavePlaceholders = async (placeholders) => {
    if (!editingTemplate) return;

    try {
      await updateTemplateMutation.mutateAsync({
        id: editingTemplate.id,
        data: {
          ...editingTemplate, // Keep existing template data
          placeholders: placeholders
        }
      });

      setShowPlaceholderEditor(false);
      setEditingTemplate(null); // Clear editingTemplate after placeholder save
      toast.success("Placeholders saved!");
    } catch (error) {
      console.error('Save placeholders error:', error);
      toast.error('Failed to save placeholders');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteTemplateMutation.mutateAsync(templateId);
    } catch (error) {
      console.error('Delete template error:', error);
    }
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      await duplicateTemplateMutation.mutateAsync(template);
    } catch (error) {
      console.error('Duplicate template error:', error);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{
      background: 'linear-gradient(135deg, #FFD5C9 0%, #FFDCC1 20%, #FFE4D0 40%, #D8E4C9 60%, #C9DEE4 80%, #D8C9E4 100%)'
    }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
              Templates
            </h1>
            <p className="text-lg" style={{ color: '#8B7355' }}>
              Create and manage reusable content templates
            </p>
          </div>
          <Button
            onClick={handleCreateNew}
            className="rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
              color: 'white'
            }}
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Template
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#88925D' }} />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
              <Card key={template.id} className="border-2 rounded-2xl hover:shadow-xl transition-all"
                style={{ borderColor: 'rgba(180, 150, 120, 0.3)' }}>
                <div className="aspect-[4/5] bg-gray-100 relative group">
                  {template.thumbnail_url && (
                    <img src={template.thumbnail_url} alt={template.name} className="w-full h-full object-cover rounded-t-2xl" />
                  )}

                  {/* Action buttons overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-t-2xl">
                    <Button
                      onClick={() => handleEditTemplate(template)}
                      size="sm"
                      className="rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                        color: 'white'
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Design
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 line-clamp-1" style={{ color: '#3D3D2B' }}>
                    {template.name}
                  </h3>

                  {template.description && (
                    <p className="text-sm mb-3 line-clamp-2" style={{ color: '#6B6B4D' }}>
                      {template.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline" style={{ borderColor: 'rgba(136, 146, 93, 0.4)' }}>
                      {template.format}
                    </Badge>
                    {template.placeholders && template.placeholders.length > 0 && (
                      <Badge style={{ background: 'rgba(136, 146, 93, 0.15)', color: '#5E4032' }}>
                        {template.placeholders.length} placeholders
                      </Badge>
                    )}
                    <Button
                      onClick={() => handleApplyTemplate(template)}
                      size="sm"
                      variant="ghost"
                      className="ml-auto rounded-xl"
                      style={{ color: '#88925D' }}
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Apply
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    {template.cesdk_scene && (
                      <>
                        <Button
                          onClick={() => handleExtractPlaceholders(template)}
                          disabled={extractingTemplate === template.id}
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl"
                        >
                          {extractingTemplate === template.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Extracting...
                            </>
                          ) : (
                            <>
                              <List className="w-4 h-4 mr-2" />
                              Placeholders ({template.placeholders?.length || 0})
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={async () => {
                            try {
                              const { data } = await prism.functions.invoke('cesdkInspectScene', {
                                scene: template.cesdk_scene
                              });
                              console.log('Scene inspection:', data);
                              toast.success('Check console for scene data');
                            } catch (error) {
                              console.error(error);
                              toast.error('Inspection failed');
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="rounded-xl"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Debug
                        </Button>
                      </>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="rounded-xl">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Format Selection Modal */}
      <Dialog open={showFormatSelection} onOpenChange={setShowFormatSelection}>
        <DialogContent 
          className="max-w-3xl" 
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 252, 240, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(229, 165, 116, 0.3)'
          }}
          aria-labelledby="template-format-title"
          aria-describedby="template-format-description"
        >
          <DialogHeader>
            <DialogTitle id="template-format-title" className="text-2xl font-bold" style={{ color: '#3D3D2B' }}>
              Choose Template Format
            </DialogTitle>
            <DialogDescription id="template-format-description" className="text-sm" style={{ color: '#8B7355' }}>
              Select the format and dimensions for your template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Image Templates */}
            <div>
              <h3 className="font-semibold mb-3 text-lg" style={{ color: '#3D3D2B' }}>
                📸 Image Templates
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleFormatSelected('instagram_square', 'single_image')}
                  className="p-4 rounded-xl border-2 hover:border-[#88925D] transition-all text-left flex flex-col items-start"
                  style={{ borderColor: 'rgba(180, 150, 120, 0.3)', background: 'rgba(255, 255, 255, 0.7)' }}
                >
                  <div className="w-full aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-gray-400 text-sm">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-sm" style={{ color: '#3D3D2B' }}>Instagram Post</p>
                  <p className="text-xs" style={{ color: '#8B7355' }}>1080 × 1080 (Square)</p>
                </button>

                <button
                  onClick={() => handleFormatSelected('instagram_portrait', 'single_image')}
                  className="p-4 rounded-xl border-2 hover:border-[#88925D] transition-all text-left flex flex-col items-start"
                  style={{ borderColor: 'rgba(180, 150, 120, 0.3)', background: 'rgba(255, 255, 255, 0.7)' }}
                >
                  <div className="w-full aspect-[4/5] bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-gray-400 text-sm">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-sm" style={{ color: '#3D3D2B' }}>Instagram Portrait</p>
                  <p className="text-xs" style={{ color: '#8B7355' }}>1080 × 1350 (4:5)</p>
                </button>

                <button
                  onClick={() => handleFormatSelected('instagram_story', 'story')}
                  className="p-4 rounded-xl border-2 hover:border-[#88925D] transition-all text-left flex flex-col items-start"
                  style={{ borderColor: 'rgba(180, 150, 120, 0.3)', background: 'rgba(255, 255, 255, 0.7)' }}
                >
                  <div className="w-full aspect-[9/16] bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-gray-400 text-sm">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-sm" style={{ color: '#3D3D2B' }}>Instagram Story</p>
                  <p className="text-xs" style={{ color: '#8B7355' }}>1080 × 1920 (9:16)</p>
                </button>

                <button
                  onClick={() => handleFormatSelected('youtube_thumbnail', 'video_thumbnail')}
                  className="p-4 rounded-xl border-2 hover:border-[#88925D] transition-all text-left flex flex-col items-start"
                  style={{ borderColor: 'rgba(180, 150, 120, 0.3)', background: 'rgba(255, 255, 255, 0.7)' }}
                >
                  <div className="w-full aspect-video bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-gray-400 text-sm">
                    <Video className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-sm" style={{ color: '#3D3D2B' }}>YouTube Thumbnail</p>
                  <p className="text-xs" style={{ color: '#8B7355' }}>1280 × 720 (16:9)</p>
                </button>

                <button
                  onClick={() => handleFormatSelected('twitter_header', 'custom')}
                  className="p-4 rounded-xl border-2 hover:border-[#88925D] transition-all text-left flex flex-col items-start"
                  style={{ borderColor: 'rgba(180, 150, 120, 0.3)', background: 'rgba(255, 255, 255, 0.7)' }}
                >
                  <div className="w-full aspect-[3/1] bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-gray-400 text-sm">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-sm" style={{ color: '#3D3D2B' }}>Twitter Header</p>
                  <p className="text-xs" style={{ color: '#8B7355' }}>1500 × 500 (3:1)</p>
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CE.SDK Editor */}
      {editorState.open && (
        <CESDKEditor
          open={editorState.open}
          initialScene={editorState.initialScene}
          format={editorState.templateData?.format || 'instagram_portrait'} // Fallback format
          templateName={editorState.templateData?.name || 'Untitled Template'} // Fallback name
          onSave={editorState.onSave}
          onClose={() => {
            setEditorState({ open: false, initialScene: null, templateData: null, onSave: null });
            // If we're creating a new template and close the editor, we might want to go back to format selection
            if (!editingTemplate) { // editingTemplate would be null if it's a new template creation flow
              setShowFormatSelection(true);
            }
          }}
        />
      )}

      {/* Template Details Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent 
          className="max-w-2xl" 
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 252, 240, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(229, 165, 116, 0.3)'
          }}
          aria-labelledby="template-details-title"
          aria-describedby="template-details-description"
        >
          <DialogHeader>
            <DialogTitle id="template-details-title" className="text-2xl font-bold" style={{ color: '#3D3D2B' }}>
              Template Details
            </DialogTitle>
            <DialogDescription id="template-details-description" className="text-sm" style={{ color: '#8B7355' }}>
              Add information about your template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-base font-semibold mb-2 block" style={{ color: '#3D3D2B' }}>
                Template Name*
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Instagram Quote Post"
                className="rounded-xl border-2 h-10 text-base"
                style={{ borderColor: 'rgba(229, 165, 116, 0.4)' }}
              />
            </div>

            <div>
              <Label className="text-base font-semibold mb-2 block" style={{ color: '#3D3D2B' }}>
                Description
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this template for?"
                className="rounded-xl border-2 text-base min-h-24"
                style={{ borderColor: 'rgba(229, 165, 116, 0.4)' }}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="rounded-xl h-10 px-6 text-base"
                style={{ borderColor: 'rgba(229, 165, 116, 0.4)' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending || !formData.name.trim() || !currentDesign?.scene}
                className="rounded-xl h-10 px-6 text-base font-semibold shadow-md"
                style={{
                  background: (createTemplateMutation.isPending || updateTemplateMutation.isPending || !formData.name.trim() || !currentDesign?.scene) ? '#ccc' : 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                  color: 'white'
                }}
              >
                {createTemplateMutation.isPending || updateTemplateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingTemplate ? (
                  'Update Template'
                ) : (
                  'Save & Define Placeholders'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Placeholder Editor */}
      {showPlaceholderEditor && editingTemplate && (
        <Dialog open={showPlaceholderEditor} onOpenChange={() => {
          setShowPlaceholderEditor(false);
          setEditingTemplate(null); // Clear editingTemplate when placeholder editor closes
        }}>
          <DialogContent 
            className="max-w-4xl max-h-[90vh] overflow-y-auto"
            aria-labelledby="template-placeholders-title"
            aria-describedby="template-placeholders-description"
          >
            <DialogHeader>
              <DialogTitle id="template-placeholders-title">Define Template Placeholders</DialogTitle>
              <div id="template-placeholders-description" className="sr-only">
                Define placeholders for your template. Placeholders are dynamic content areas that will be filled in when using the template.
              </div>
            </DialogHeader>
            <TemplatePlaceholderEditor
              template={editingTemplate}
              onSave={handleSavePlaceholders}
              onClose={() => {
                setShowPlaceholderEditor(false);
                setEditingTemplate(null); // Clear editingTemplate when placeholder editor closes
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
