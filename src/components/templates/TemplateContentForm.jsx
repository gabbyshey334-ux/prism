import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Type, Image as ImageIcon, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function TemplateContentForm({ template, onGenerate, onClose }) {
  const [contentValues, setContentValues] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(null);

  const placeholders = template.placeholders || [];

  const handleImageUpload = async (placeholderId, file) => {
    setUploadingImage(placeholderId);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setContentValues(prev => ({ ...prev, [placeholderId]: file_url }));
      toast.success('Image uploaded!');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleGenerate = async () => {
    // Validate required fields
    const missingRequired = placeholders
      .filter(p => p.required && !contentValues[p.id])
      .map(p => p.label);

    if (missingRequired.length > 0) {
      toast.error(`Please fill in: ${missingRequired.join(', ')}`);
      return;
    }

    setIsGenerating(true);

    try {
      // Apply content to template
      const { data } = await base44.functions.invoke('applyContentToTemplate', {
        templateScene: template.cesdk_scene,
        placeholders,
        contentValues
      });

      // Render the design
      const { data: renderData } = await base44.functions.invoke('cesdkRenderDesign', {
        scene: data.scene,
        exportFormat: 'png'
      });

      if (renderData.success) {
        onGenerate(renderData.imageUrl, data.scene);
        toast.success('Content generated!');
      } else {
        toast.error('Failed to render design');
      }
    } catch (error) {
      console.error('Generate error:', error);
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 252, 240, 0.95) 100%)',
        border: '2px solid rgba(229, 165, 116, 0.3)'
      }}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{ color: '#3D3D2B' }}>
            Fill Template: {template.name}
          </DialogTitle>
          <p className="text-sm" style={{ color: '#8B7355' }}>
            Enter your content and we'll automatically apply it to the template
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {placeholders.length === 0 ? (
            <Card className="border-2" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
              <CardContent className="p-8 text-center">
                <p style={{ color: '#8B7355' }}>
                  This template has no placeholders defined yet. 
                  Go to Templates and click "Add Fields" to set them up.
                </p>
              </CardContent>
            </Card>
          ) : (
            placeholders.map(placeholder => (
              <Card key={placeholder.id} className="border-2" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge style={{ background: placeholder.type === 'text' ? '#88925D' : '#D4A574', color: 'white' }}>
                      {placeholder.type === 'text' ? <Type className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                      {placeholder.label}
                    </Badge>
                    {placeholder.required && (
                      <span className="text-xs text-red-500">* Required</span>
                    )}
                  </div>

                  {placeholder.type === 'text' ? (
                    <Textarea
                      value={contentValues[placeholder.id] || placeholder.default_value || ''}
                      onChange={(e) => setContentValues(prev => ({ ...prev, [placeholder.id]: e.target.value }))}
                      placeholder={`Enter ${placeholder.label.toLowerCase()}...`}
                      className="rounded-xl border-2"
                      style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
                      rows={3}
                    />
                  ) : (
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageUpload(placeholder.id, e.target.files[0]);
                          }
                        }}
                        disabled={uploadingImage === placeholder.id}
                        className="rounded-xl"
                      />
                      {uploadingImage === placeholder.id && (
                        <p className="text-sm mt-2" style={{ color: '#88925D' }}>
                          <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                          Uploading...
                        </p>
                      )}
                      {contentValues[placeholder.id] && (
                        <div className="mt-3">
                          <img 
                            src={contentValues[placeholder.id]} 
                            alt="Preview" 
                            className="w-32 h-32 rounded-lg object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || placeholders.length === 0}
              className="rounded-xl px-6"
              style={{
                background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                color: 'white'
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Content
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}