
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client"; // Added import for base44
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Type, Image as ImageIcon, Save, AlertCircle, Loader2 } from "lucide-react"; // Added Loader2
import { toast } from "sonner";

export default function TemplatePlaceholderEditor({ template, onSave, onClose }) {
  const [blocks, setBlocks] = useState([]);
  const [placeholderMappings, setPlaceholderMappings] = useState({});
  const [loading, setLoading] = useState(true);

  // Function to extract blocks using a backend service
  const extractBlocksFromScene = async (sceneString, existingPlaceholders) => {
    try {
      setLoading(true); // Set loading true at the start of the async operation
      // Call backend function to extract blocks using CE.SDK
      const { data } = await base44.functions.invoke('cesdkExtractBlocks', {
        scene: sceneString
      });

      console.log('Extracted blocks:', data.blocks);
      setBlocks(data.blocks || []);

      // Initialize mappings from existing placeholders
      const initialMappings = {};
      if (existingPlaceholders) {
        existingPlaceholders.forEach(placeholder => {
          initialMappings[placeholder.block_id] = placeholder;
        });
      }
      setPlaceholderMappings(initialMappings);

    } catch (error) {
      console.error("Error extracting blocks:", error);
      toast.error("Failed to extract blocks from template");
    } finally {
      setLoading(false); // Ensure loading is always set to false
    }
  };

  useEffect(() => {
    // Parse the CE.SDK scene to extract blocks
    if (template?.cesdk_scene) {
      console.log('Template received:', template);
      console.log('Raw cesdk_scene type:', typeof template.cesdk_scene);
      
      let sceneString = template.cesdk_scene;
      
      // If it's already an object, stringify it first
      if (typeof sceneString === 'object') {
        sceneString = JSON.stringify(sceneString);
      }
      
      console.log('Scene string (first 100 chars):', sceneString ? sceneString.substring(0, 100) : "empty scene string");
      
      // CE.SDK scenes are base64 encoded - we need to use a backend function to parse them
      extractBlocksFromScene(sceneString, template.placeholders);

    } else {
      console.log('No cesdk_scene found in template');
      setLoading(false); // If no scene, we are done loading
    }
  }, [template]);

  const handleUpdateMapping = (blockId, field, value) => {
    setPlaceholderMappings(prev => ({
      ...prev,
      [blockId]: {
        ...prev[blockId],
        block_id: blockId,
        type: blocks.find(b => b.id === blockId)?.type || 'text',
        [field]: value
      }
    }));
  };

  const handleRemoveMapping = (blockId) => {
    setPlaceholderMappings(prev => {
      const updated = { ...prev };
      delete updated[blockId];
      return updated;
    });
  };

  const handleSave = () => {
    // Convert mappings to placeholders array
    const placeholders = Object.values(placeholderMappings).filter(p => p.label?.trim());
    
    if (placeholders.length === 0) {
      toast.error("Please add at least one placeholder");
      return;
    }

    // Auto-generate IDs from labels
    const finalPlaceholders = placeholders.map(p => ({
      ...p,
      id: p.label.toLowerCase().replace(/\s+/g, '_')
    }));

    onSave(finalPlaceholders);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-2" />
        <p className="text-gray-600">Loading blocks...</p>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">No blocks found in template. Please create some text or image blocks in the editor first.</p>
        <Button onClick={onClose} className="mt-4">Close</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Map blocks to placeholders:</strong> Add labels and AI instructions to the text and image blocks from your design.
          These will be used to generate or customize content later.
        </p>
      </div>

      {/* Blocks from CE.SDK */}
      <div className="space-y-4">
        {blocks.map((block) => {
          const mapping = placeholderMappings[block.id] || {};
          const isMapped = !!mapping.label;

          return (
            <Card key={block.id} className="border-2" style={{ 
              borderColor: isMapped ? 'rgba(136, 146, 93, 0.5)' : 'rgba(229, 165, 116, 0.3)',
              backgroundColor: isMapped ? 'rgba(136, 146, 93, 0.05)' : 'white'
            }}>
              <CardContent className="p-4 space-y-3">
                {/* Block Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {block.type === 'text' ? (
                      <Type className="w-5 h-5" style={{ color: '#88925D' }} />
                    ) : (
                      <ImageIcon className="w-5 h-5" style={{ color: '#88925D' }} />
                    )}
                    <div>
                      <span className="font-semibold" style={{ color: '#3D3D2B' }}>
                        {block.type === 'text' ? 'Text Block' : 'Image Block'}
                      </span>
                      <p className="text-xs text-gray-500">{block.preview}</p>
                    </div>
                  </div>
                  {isMapped && (
                    <Badge style={{ backgroundColor: 'rgba(136, 146, 93, 0.2)', color: '#5E4032' }}>
                      Mapped
                    </Badge>
                  )}
                </div>

                {/* Mapping Fields */}
                <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'rgba(229, 165, 116, 0.2)' }}>
                  <div>
                    <Label className="text-sm font-medium mb-1">Placeholder Label*</Label>
                    <Input
                      value={mapping.label || ""}
                      onChange={(e) => handleUpdateMapping(block.id, 'label', e.target.value)}
                      placeholder="e.g., Main Headline, Product Image"
                      className="rounded-xl"
                    />
                  </div>

                  {block.type === 'text' && (
                    <>
                      <div>
                        <Label className="text-sm font-medium mb-1">AI Instructions</Label>
                        <Textarea
                          value={mapping.ai_instructions || ""}
                          onChange={(e) => handleUpdateMapping(block.id, 'ai_instructions', e.target.value)}
                          placeholder="e.g., Generate a catchy headline that captures attention..."
                          className="rounded-xl min-h-20"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-1">Max Length (characters)</Label>
                        <Input
                          type="number"
                          value={mapping.max_length || ""}
                          onChange={(e) => handleUpdateMapping(block.id, 'max_length', parseInt(e.target.value) || null)}
                          placeholder="e.g., 100"
                          className="rounded-xl"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={mapping.required || false}
                        onChange={(e) => handleUpdateMapping(block.id, 'required', e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#88925D' }}
                      />
                      <Label className="text-sm">Required field</Label>
                    </div>

                    {isMapped && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMapping(block.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove Mapping
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'rgba(229, 165, 116, 0.2)' }}>
        <Button variant="outline" onClick={onClose} className="rounded-xl">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
            color: 'white'
          }}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Placeholders ({Object.values(placeholderMappings).filter(p => p.label?.trim()).length})
        </Button>
      </div>
    </div>
  );
}
