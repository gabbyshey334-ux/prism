
import React, { useEffect, useCallback } from "react"; // Added useEffect and useCallback to imports
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const LICENSE_CACHE_KEY = 'cesdk_license_key';
const LICENSE_CACHE_TIME_KEY = 'cesdk_license_key_time';
const CACHE_DURATION = 3600000;

export default function CESDKEditor({
  open = true,
  initialScene = null,
  template = null,
  formatInfo = null, // New prop
  contentValues = {},
  uploadedMedia = [],
  format = 'instagram_square',
  templateName = '', // Changed default from 'Untitled Design'
  showContinueButton = true, // Changed default from false
  onSave = null, // Kept default null for consistency
  onClose = null // Kept default null for consistency
}) {
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [cesdk, setCesdk] = React.useState(null); // State to hold the CESDK instance
  const instanceRef = React.useRef(null);
  const initStartedRef = React.useRef(false);

  const getFormatDimensions = useCallback((formatKey) => { // Memoized with useCallback
    const dimensions = {
      'instagram_portrait': { width: 1080, height: 1350 },
      'instagram_square': { width: 1080, height: 1080 },
      'instagram_story': { width: 1080, height: 1920 },
      'tiktok_vertical': { width: 1080, height: 1920 },
      'youtube_thumbnail': { width: 1280, height: 720 },
      'youtube_video': { width: 1920, height: 1080 },
      'pinterest_pin': { width: 1000, height: 1500 }
    };
    return dimensions[formatKey] || dimensions['instagram_square'];
  }, []); // Empty dependency array means it's created once

  const loadCESDKScript = () => {
    return new Promise((resolve, reject) => {
      if (window.CreativeEditorSDK) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = `
        import CreativeEditorSDK from 'https://cdn.img.ly/packages/imgly/cesdk-js/1.31.0/index.js';
        window.CreativeEditorSDK = CreativeEditorSDK;
        window.dispatchEvent(new Event('cesdk-loaded'));
      `;
      
      const loadHandler = () => {
        window.removeEventListener('cesdk-loaded', loadHandler);
        resolve();
      };
      
      window.addEventListener('cesdk-loaded', loadHandler);
      script.onerror = (err) => {
        window.removeEventListener('cesdk-loaded', loadHandler);
        reject(new Error('Failed to load CE.SDK'));
      };
      
      document.head.appendChild(script);
    });
  };

  const getLicenseKey = async () => {
    try {
      const cachedKey = localStorage.getItem(LICENSE_CACHE_KEY);
      const cachedTime = localStorage.getItem(LICENSE_CACHE_TIME_KEY);
      
      if (cachedKey && cachedTime) {
        const now = Date.now();
        const cacheAge = now - parseInt(cachedTime);
        if (cacheAge < CACHE_DURATION) {
          return cachedKey;
        }
      }

      const { data: licenseResponse } = await base44.functions.invoke('getCESDKKey');
      
      if (!licenseResponse?.apiKey) {
        throw new Error('License key not available');
      }

      localStorage.setItem(LICENSE_CACHE_KEY, licenseResponse.apiKey);
      localStorage.setItem(LICENSE_CACHE_TIME_KEY, Date.now().toString());
      
      return licenseResponse.apiKey;

    } catch (error) {
      const fallbackKey = localStorage.getItem(LICENSE_CACHE_KEY);
      if (fallbackKey) return fallbackKey;
      throw error;
    }
  };

  const initEditor = async (container) => {
    if (!container || initStartedRef.current) return;
    initStartedRef.current = true;

    try {
      await loadCESDKScript();
      const licenseKey = await getLicenseKey();

      const config = {
        license: licenseKey,
        role: 'Creator',
        ui: {
          elements: {
            navigation: {
              action: {
                export: false,
                download: false,
                save: false
              }
            }
          }
        },
        callbacks: {
          onUpload: async (file) => {
            try {
              const { file_url } = await base44.integrations.Core.UploadFile({ file });
              
              await base44.entities.Upload.create({
                file_name: file.name,
                file_url: file_url,
                file_type: file.type,
                file_size: file.size
              });

              return {
                id: `upload-${Date.now()}`,
                meta: {
                  uri: file_url,
                  thumbUri: file_url
                }
              };
            } catch (error) {
              console.error('Upload error:', error);
              throw error;
            }
          }
        }
      };

      const instance = await window.CreativeEditorSDK.create(container, config);
      
      if (!instance) return;

      instanceRef.current = instance;
      setCesdk(instance); // Store the instance in state

      setTimeout(() => {
        try {
          instance.addDefaultAssetSources();
          instance.addDemoAssetSources({
            sceneMode: 'Design',
            withUploadAssetSources: true
          });
        } catch (err) {
          console.error('Asset loading error:', err);
        }
      }, 0);

      // setLoading(false) will now be handled by the useEffect once the scene is loaded/created
    } catch (err) {
      console.error('Init failed:', err);
      setError(err.message);
      toast.error('Failed to load editor: ' + err.message);
      setLoading(false); // If init fails, stop loading
    }
  };

  // This useEffect handles loading the scene and applying content
  useEffect(() => {
    // Only proceed if CESDK instance is ready and component is open
    if (!cesdk || !open) return;

    const loadSceneAndApplyContent = async () => {
      try {
        setLoading(true); // Start loading spinner
        const engine = cesdk.engine;
        
        console.log('=== LOADING SCENE ===');
        console.log('Has initialScene:', !!initialScene);
        console.log('Has template:', !!template);
        console.log('Template type:', typeof template);

        let sceneString = null;

        // Determine which scene to load
        if (initialScene) {
          sceneString = initialScene;
          console.log('Using initialScene');
        } else if (template?.cesdk_scene) {
          sceneString = template.cesdk_scene;
          console.log('Using template.cesdk_scene');
        }

        if (sceneString) {
          console.log('Scene string starts with:', sceneString.substring(0, 20));
          
          // Decode if base64 (UBQ1 format)
          if (sceneString.startsWith('UBQ1')) {
            console.log('Decoding UBQ1 format...');
            const base64Content = sceneString.substring(4);
            sceneString = atob(base64Content);
            console.log('Decoded, new length:', sceneString.length);
          }

          // Load the scene
          console.log('Loading scene into engine...');
          await engine.scene.loadFromString(sceneString);
          console.log('✓ Scene loaded successfully');

          // Get all blocks in the scene
          const allBlocks = engine.block.findAll();
          console.log(`Found ${allBlocks.length} blocks in scene`);

          // Apply content values to text blocks
          if (Object.keys(contentValues).length > 0) {
            console.log('Applying content values:', contentValues);
            
            for (const [placeholderId, value] of Object.entries(contentValues)) {
              if (value === undefined || value === null || value === '') continue; // Skip empty values
              
              console.log(`Looking for placeholder: ${placeholderId}`);
              
              // Find text blocks
              const textBlocks = allBlocks.filter(id => {
                try {
                  return engine.block.getType(id) === '//ly.img.ubq/text';
                } catch {
                  return false;
                }
              });
              
              console.log(`Found ${textBlocks.length} text blocks`);
              
              for (const blockId of textBlocks) {
                try {
                  const blockName = engine.block.getName(blockId);
                  console.log(`  Text block: ${blockId}, name: "${blockName}"`);
                  
                  // Match by placeholder ID or name containing placeholder ID
                  if (blockName === placeholderId || 
                      (blockName && blockName.includes(placeholderId)) ||
                      (placeholderId && placeholderId.includes(blockName))) {
                    engine.block.setString(blockId, 'text/text', String(value));
                    console.log(`    ✓ Set text for block "${blockName}" (ID: ${blockId}) to: "${value}"`);
                  }
                } catch (err) {
                  console.warn(`Failed to update text block ${blockId}:`, err);
                }
              }
            }
          }

          // Apply uploaded media to image blocks
          if (uploadedMedia.length > 0) {
            console.log('=== APPLYING UPLOADED MEDIA ===');
            console.log('Uploaded media array:', uploadedMedia);
            console.log('Number of images to apply:', uploadedMedia.length);
            
            // Find all graphic blocks
            const allGraphicBlocks = allBlocks.filter(id => {
              try {
                const type = engine.block.getType(id);
                return type === '//ly.img.ubq/graphic';
              } catch {
                return false;
              }
            });
            
            console.log(`Found ${allGraphicBlocks.length} total graphic blocks`);
            
            // Check which ones have image fills
            const imageBlocks = [];
            for (const blockId of allGraphicBlocks) {
              try {
                const blockName = engine.block.getName(blockId);
                console.log(`Checking graphic block: ${blockName || blockId}`);
                
                const hasFill = engine.block.hasFill(blockId);
                console.log(`  Has fill: ${hasFill}`);
                
                if (hasFill) {
                  const fill = engine.block.getFill(blockId);
                  const fillType = engine.block.getType(fill);
                  console.log(`  Fill type: ${fillType}`);
                  
                  if (fillType === '//ly.img.ubq/fill/image') {
                    imageBlocks.push(blockId);
                    console.log(`  ✓ This is an image block`);
                  }
                }
              } catch (err) {
                console.warn(`Error checking block ${blockId}:`, err);
              }
            }
            
            console.log(`Found ${imageBlocks.length} image blocks with image fills`);
            
            // Apply images using modern API
            for (let i = 0; i < Math.min(imageBlocks.length, uploadedMedia.length); i++) {
              try {
                const blockId = imageBlocks[i];
                const imageUrl = uploadedMedia[i];
                const blockName = engine.block.getName(blockId);
                
                console.log(`\nApplying image ${i + 1}:`);
                console.log(`  Block: ${blockName || blockId}`);
                console.log(`  URL: ${imageUrl}`);
                
                const fill = engine.block.getFill(blockId);
                console.log(`  Fill ID: ${fill}`);
                
                // Use modern sourceSet API
                engine.block.setSourceSet(
                  fill,
                  'fill/image/sourceSet',
                  [
                    {
                      uri: imageUrl,
                      width: 2048,
                      height: 2048
                    }
                  ]
                );
                
                // Also set content fill mode to ensure image fills the block properly
                engine.block.setEnum(blockId, 'contentFill/mode', 'Cover');
                
                console.log(`  ✓ Image set successfully with Cover mode`);
              } catch (err) {
                console.error(`Failed to set image for block ${imageBlocks[i]}:`, err);
              }
            }
            
            console.log('=== FINISHED APPLYING MEDIA ===');
          } else {
            console.log('No uploaded media to apply');
          }

          // Set page dimensions
          const pages = engine.scene.getPages();
          if (pages.length > 0) {
            const dimensions = getFormatDimensions(format);
            engine.block.setWidth(pages[0], dimensions.width);
            engine.block.setHeight(pages[0], dimensions.height);
            console.log(`Set page dimensions: ${dimensions.width}x${dimensions.height}`);
          }

        } else {
          // No scene to load - create blank design
          console.log('Creating blank design scene...');
          await cesdk.createDesignScene();
          
          const pages = engine.scene.getPages();
          if (pages.length > 0) {
            const dimensions = getFormatDimensions(format);
            engine.block.setWidth(pages[0], dimensions.width);
            engine.block.setHeight(pages[0], dimensions.height);
            console.log(`Set page dimensions: ${dimensions.width}x${dimensions.height}`);
          } else {
            console.warn('No pages found after creating blank design scene.');
          }
        }

        console.log('=== SCENE LOADING COMPLETE ===');
        setLoading(false);

      } catch (error) {
        console.error('Error loading scene:', error);
        setError(error.message);
        toast.error('Failed to load design: ' + error.message);
        setLoading(false);
      }
    };

    loadSceneAndApplyContent();
  }, [cesdk, open, initialScene, template, contentValues, uploadedMedia, format, getFormatDimensions]);

  const containerRef = React.useCallback((node) => {
    console.log('Callback ref called, node:', !!node, 'open:', open);
    if (node && open && !initStartedRef.current) {
      initEditor(node);
    }
  }, [open]); // Removed format, template, contentValues, initialScene as they are handled by a separate useEffect now.

  React.useEffect(() => {
    return () => {
      if (instanceRef.current) {
        try {
          instanceRef.current.dispose();
        } catch (e) {
          console.error('Dispose error:', e);
        }
      }
      instanceRef.current = null;
      setCesdk(null); // Also clear the state
      initStartedRef.current = false;
    };
  }, []);

  const handleSave = async (closeAfter = true, continueWorkflow = false) => {
    if (!instanceRef.current) {
      toast.error('Editor not ready');
      return;
    }

    setSaving(true);
    try {
      const engine = instanceRef.current.engine;

      // Export scene as string
      const sceneString = await engine.scene.saveToString();

      console.log('Scene exported, length:', sceneString.length);

      // Export preview image
      const page = engine.scene.getCurrentPage();
      const pageWidth = engine.block.getWidth(page);
      const pageHeight = engine.block.getHeight(page);

      const maxWidth = 1080;
      const scale = pageWidth > maxWidth ? maxWidth / pageWidth : 1;
      const targetWidth = Math.floor(pageWidth * scale);
      const targetHeight = Math.floor(pageHeight * scale);

      console.log(`Exporting preview at ${targetWidth}x${targetHeight}`);

      const blob = await engine.block.export(page, 'image/png', {
        targetWidth,
        targetHeight
      });

      const previewFile = new File([blob], `${Date.now().toString(36)}_preview.png`, { type: 'image/png' });
      const { file_url: previewUrl } = await base44.integrations.Core.UploadFile({ file: previewFile });

      const result = {
        scene: sceneString,
        previewUrl,
        name: templateName,
        format: format
      };

      console.log('Calling onSave with result:', { name: result.name, format: result.format, previewUrl: result.previewUrl });
      if (onSave) await onSave(result);
      toast.success('Design saved!');

      if (continueWorkflow) {
        if (onClose) onClose();
      } else if (closeAfter) {
        if (onClose) onClose();
      }

    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save: ' + error.message);
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white">
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-95 z-[100000]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xl font-bold text-white">Loading Editor...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-95 z-[100000]">
          <div className="text-center max-w-md">
            <p className="text-xl font-bold text-red-400 mb-4">Failed to Load Editor</p>
            <p className="text-sm text-gray-300 mb-6">{error}</p>
            <Button onClick={onClose} variant="outline" size="lg" className="bg-white">
              Close
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[100000] flex gap-3">
          {showContinueButton ? (
            <>
              <Button
                onClick={() => handleSave(true, true)}
                disabled={saving}
                size="lg"
                className="shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                  color: 'white'
                }}
              >
                {saving ? 'Saving...' : 'Save & Continue'}
              </Button>
              <Button
                onClick={() => handleSave(true, false)}
                disabled={saving}
                variant="outline"
                size="lg"
                className="shadow-xl bg-white"
              >
                Save & Close
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => handleSave(false, false)}
                disabled={saving}
                variant="outline"
                size="lg"
                className="shadow-xl bg-white"
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={() => handleSave(true, false)}
                disabled={saving}
                size="lg"
                className="shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                  color: 'white'
                }}
              >
                Save & Close
              </Button>
            </>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: '100vh', minWidth: '100vw' }}
      />
    </div>
  );
}
