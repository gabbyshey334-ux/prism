
import React, { useState } from "react";
import { prism } from "@/api/prismClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mic, Link2, Send, Loader2, Sparkles, Image as ImageIcon, Upload, 
  Plus, // New: For the modal buttons
  FileText, Twitter, Youtube, Instagram // New: For dummy workflow component
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
// New: For the workflow modal
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ContentCreationWorkflow from "./ContentCreationWorkflow";

export default function IdeaInput({ onSubmit, isLoading }) {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputType, setInputType] = useState("text");
  const [processingStatus, setProcessingStatus] = useState("");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [showWorkflowOption, setShowWorkflowOption] = useState(false);
  const [pendingIdea, setPendingIdea] = useState(null);

  const isInstagramLink = (url) => {
    return url.includes('instagram.com') || url.includes('instagr.am');
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus(`Uploading ${files.length} image(s)...`);

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await prism.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      
      setUploadedImages(prev => [...prev, ...uploadedUrls]);
      toast.success(`${files.length} image(s) uploaded successfully!`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload images");
    }

    setIsProcessing(false);
    setProcessingStatus("");
  };

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeUploadedImages = async () => {
    if (uploadedImages.length === 0) return null;

    setProcessingStatus(`Analyzing ${uploadedImages.length} image(s)...`);
    
    try {
      const imageAnalysis = await prism.integrations.Core.InvokeLLM({
        prompt: `Analyze these images (Instagram carousel/post) and extract ALL content:

${input ? `User context: ${input}` : ''}

For each image, extract:
1. All visible text (captions, overlays, quotes, graphics)
2. Main visual themes and elements
3. Key messages and takeaways
4. Data, statistics, or facts shown
5. Design style and format
6. Overall narrative across all images

Provide a comprehensive summary that captures the full content as if recreating the post.`,
        file_urls: uploadedImages
      });

      return imageAnalysis;
    } catch (error) {
      console.error("Error analyzing images:", error);
      throw error;
    }
  };

  const processInput = async () => {
    if (!input.trim() && uploadedImages.length === 0) {
      toast.error("Please provide some input or upload images");
      return;
    }

    setIsProcessing(true);
    setProcessingStatus("Processing...");
    
    try {
      const isLink = input.trim().startsWith('http://') || input.trim().startsWith('https://');
      const isInsta = isLink && isInstagramLink(input.trim());
      
      let processedData = {
        original_input: input || `${uploadedImages.length} image(s) uploaded`,
        input_type: uploadedImages.length > 0 ? "images" : (isInsta ? "instagram_link" : (isLink ? "link" : inputType)),
        status: "draft"
      };

      let contentToAnalyze = input;

      // If images were uploaded, analyze them
      if (uploadedImages.length > 0) {
        const imageContent = await analyzeUploadedImages();
        contentToAnalyze = `${input ? input + '\n\n' : ''}Content extracted from ${uploadedImages.length} image(s):\n\n${imageContent}`;
        processedData.research_data = contentToAnalyze;
        processedData.input_type = isInsta ? "instagram_images" : "images";
      }
      // Handle Instagram links (provide helpful message)
      else if (isInsta) {
        setProcessingStatus("Note: Instagram links require manual input...");
        
        processedData.research_data = `Instagram post link: ${input}

NOTE: Due to Instagram's access restrictions, please either:
1. Copy and paste the post caption and content manually, or
2. Upload screenshots of the post using the upload button

This will allow the AI to analyze and recreate viral content based on the post.`;
        
        contentToAnalyze = input;
        toast.info("Tip: Upload screenshots or paste the content for better analysis", { duration: 5000 });
      }
      // Regular link handling
      else if (isLink) {
        setProcessingStatus("Analyzing link...");
        try {
          const linkAnalysis = await prism.integrations.Core.InvokeLLM({
            prompt: `Analyze this URL and extract the main content, key points, and insights: ${input}
            
            Provide a comprehensive summary of what the content is about.`,
            add_context_from_internet: true
          });
          contentToAnalyze = linkAnalysis;
          processedData.research_data = linkAnalysis;
        } catch (error) {
          console.error("Link analysis error:", error);
          processedData.research_data = `Link provided: ${input}\n\nNote: Could not automatically analyze this link. Please provide additional context or paste the content manually.`;
        }
      }

      // Generate title and category
      setProcessingStatus("Generating metadata...");
      const metadata = await prism.integrations.Core.InvokeLLM({
        prompt: `Based on this content input:
        
Original input: "${input || 'Images uploaded'}"
${processedData.research_data ? `\n\nExtracted content:\n${processedData.research_data}` : ''}
        
Generate a catchy, viral-worthy title and categorize this content idea.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Catchy, viral-worthy title" },
            category: { type: "string", description: "Content category/niche" },
            viral_potential: { type: "number", description: "Viral potential score 1-10" }
          }
        }
      });

      processedData.ai_generated_title = metadata.title;
      processedData.ai_generated_category = metadata.category;
      processedData.viral_score = metadata.viral_potential;

      // Save uploaded image URLs to the content data
      if (uploadedImages.length > 0) {
        processedData.uploaded_file_url = uploadedImages[0]; // Primary image
        processedData.uploaded_file_type = 'image';
        processedData.generated_images = uploadedImages; // All uploaded images
      }

      // Show options: Create Content or Add to Ideas
      setPendingIdea(processedData);
      setShowWorkflowOption(true);
      
    } catch (error) {
      console.error("Error processing input:", error);
      toast.error("Failed to process idea. Please try again.");
    }
    
    setIsProcessing(false);
    setProcessingStatus("");
  };

  const handleAddToIdeas = async () => {
    await onSubmit(pendingIdea);
    setInput("");
    setUploadedImages([]);
    setPendingIdea(null);
    setShowWorkflowOption(false);
    toast.success("Idea saved!");
  };

  const handleInstagramImages = (images) => {
    // Default to portrait for single image and carousels
    const format = 'instagram_portrait';
    
    onSubmit({
      original_input: `Instagram content from ${images.length} image${images.length > 1 ? 's' : ''}`,
      input_type: "instagram_images",
      uploaded_image_urls: images,
      ai_generated_title: `Instagram Content (${images.length} image${images.length > 1 ? 's' : ''})`,
      status: "draft"
    });
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Voice input not supported in this browser");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setInputType("voice");
      toast.info("Listening...");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = () => {
      toast.error("Voice input failed. Please try again.");
    };

    recognition.start();
  };

  const isInstagramUrl = input.trim() && (input.includes('instagram.com') || input.includes('instagr.am'));

  return (
    <>
      <Card className="border-0 rounded-3xl shadow-2xl overflow-hidden relative crystal-shine"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 50%, rgba(244, 220, 200, 0.9) 100%)',
              backdropFilter: 'blur(24px)',
              boxShadow: `
                0 8px 32px rgba(166, 124, 82, 0.2), 
                0 0 60px rgba(229, 165, 116, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.8),
                inset 0 -1px 0 rgba(232, 145, 82, 0.1)
              `,
              border: '1px solid rgba(255, 255, 255, 0.6)'
            }}>
        {/* Ethereal light leak effects */}
        <div className="absolute top-0 right-0 w-48 h-48 opacity-20 blur-3xl pointer-events-none"
             style={{
               background: 'radial-gradient(circle at top right, rgba(229, 165, 116, 0.6) 0%, transparent 70%)'
             }}
        />
        <div className="absolute bottom-0 left-0 w-40 h-40 opacity-15 blur-3xl pointer-events-none"
             style={{
               background: 'radial-gradient(circle at bottom left, rgba(127, 184, 191, 0.6) 0%, transparent 70%)'
             }}
        />
        
        <div className="space-y-4 p-6 relative z-10">
          <div className="mb-4 p-4 rounded-xl" style={{
            background: 'linear-gradient(135deg, rgba(232, 180, 77, 0.12) 0%, rgba(229, 165, 116, 0.12) 100%)',
            border: '1px solid rgba(229, 165, 116, 0.3)'
          }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                background: 'linear-gradient(135deg, #E8B44D 0%, #E5A574 100%)'
              }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold mb-1" style={{ color: '#3D3D2B' }}>
                  Capture Your Ideas
                </h4>
                <p className="text-sm leading-relaxed" style={{ color: '#8B7355' }}>
                  Share your original thoughts, paste content you found, or upload inspiration.
                  For trending AI-suggested ideas, visit the <strong>Trends</strong> page.
                </p>
              </div>
            </div>
          </div>

          <Textarea
            placeholder="Share your idea, paste content, or upload images...

💡 For trending topics, visit the Trends page"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setInputType("text");
            }}
            className="min-h-32 rounded-2xl border-2 resize-none text-base"
            style={{ 
              borderColor: 'rgba(229, 165, 116, 0.3)',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)',
              backdropFilter: 'blur(12px)',
              boxShadow: 'inset 0 2px 8px rgba(166, 124, 82, 0.08)'
            }}
            disabled={isProcessing || isLoading}
          />

          {isInstagramUrl && !isProcessing && (
            <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }}>
              <ImageIcon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary-dark)' }} />
              <div className="flex-1">
                <span className="text-sm font-medium block mb-1" style={{ color: 'var(--primary-dark)' }}>
                  Instagram link detected
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Upload screenshots of the post or paste the caption and content for best results
                </span>
              </div>
            </div>
          )}

          {/* Image Upload Section */}
          {uploadedImages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  Uploaded Images ({uploadedImages.length})
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {uploadedImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={url} 
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2"
                      style={{ borderColor: 'var(--border)' }}
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isProcessing && processingStatus && (
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--card-hover)' }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--primary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {processingStatus}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={startVoiceInput}
                disabled={isProcessing || isLoading}
                className="rounded-2xl w-11 h-11 border crystal-shine relative overflow-hidden"
                style={{ 
                  borderColor: 'rgba(229, 165, 116, 0.3)',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 4px 16px rgba(166, 124, 82, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                }}
                title="Voice input"
              >
                <Mic className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              </Button>
              
              <label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isProcessing || isLoading}
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isProcessing || isLoading}
                  className="rounded-2xl w-11 h-11 border crystal-shine relative overflow-hidden"
                  style={{ 
                    borderColor: 'rgba(229, 165, 116, 0.3)',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 4px 16px rgba(166, 124, 82, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                  }}
                  title="Upload images"
                  asChild
                >
                  <span>
                    <Upload className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                  </span>
                </Button>
              </label>

              <Button
                variant="outline"
                size="icon"
                disabled={isProcessing || isLoading}
                className="rounded-2xl w-11 h-11 border crystal-shine relative overflow-hidden"
                style={{ 
                  borderColor: 'rgba(229, 165, 116, 0.3)',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 4px 16px rgba(166, 124, 82, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                }}
                title="Paste link"
                onClick={() => {
                  navigator.clipboard.readText().then(text => {
                    if (text.startsWith('http')) {
                      setInput(text);
                      setInputType("link");
                    }
                  });
                }}
              >
                <Link2 className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              </Button>
            </div>

            <Button
              onClick={processInput}
              disabled={(!input.trim() && uploadedImages.length === 0) || isProcessing || isLoading}
              className="rounded-2xl px-6 h-11 shadow-lg hover:shadow-xl transition-all crystal-shine relative overflow-hidden ethereal-glow"
              style={{ 
                background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                color: 'white',
                boxShadow: `
                  0 8px 28px rgba(136, 146, 93, 0.35), 
                  0 0 40px rgba(164, 181, 139, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.5)
                `
              }}
            >
              {isProcessing || isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  {uploadedImages.length > 0 ? "Analyze Images" : "Capture Idea"}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {showWorkflowOption && pendingIdea && (
        <ContentCreationWorkflowModal
          idea={pendingIdea}
          onAddToIdeas={handleAddToIdeas}
          onClose={() => {
            setShowWorkflowOption(false);
            setPendingIdea(null);
          }}
        />
      )}
    </>
  );
}

function ContentCreationWorkflowModal({ idea, onAddToIdeas, onClose }) {
  const [showWorkflow, setShowWorkflow] = useState(false);

  if (showWorkflow) {
    return (
      <ContentCreationWorkflow
        initialIdea={idea}
        skipToGeneration={true}
        onClose={() => {
          setShowWorkflow(false);
          onClose();
        }}
        onComplete={onClose}
      />
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-md" 
        style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 252, 240, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(229, 165, 116, 0.3)'
        }}
        aria-labelledby="idea-action-title"
        aria-describedby="idea-action-description"
      >
        <DialogHeader>
          <DialogTitle id="idea-action-title" style={{ color: '#3D3D2B' }}>What would you like to do?</DialogTitle>
          <DialogDescription id="idea-action-description" className="sr-only">
            Choose how to process your content idea. You can create content immediately using the workflow, or save it to your ideas list for later development.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          <Button
            onClick={() => setShowWorkflow(true)}
            className="w-full h-24 rounded-xl flex flex-col items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
              color: 'white'
            }}
          >
            <Sparkles className="w-6 h-6" />
            <div>
              <div className="font-semibold">Create Content Now</div>
              <div className="text-xs opacity-90">Start content creation workflow</div>
            </div>
          </Button>

          <Button
            onClick={onAddToIdeas}
            variant="outline"
            className="w-full h-24 rounded-xl flex flex-col items-center justify-center gap-2"
            style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
          >
            <Plus className="w-6 h-6" />
            <div>
              <div className="font-semibold" style={{ color: '#3D3D2B' }}>Save to Ideas</div>
              <div className="text-xs" style={{ color: '#8B7355' }}>Develop later</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
