
import React, { useEffect, useCallback } from "react"; // Added useEffect and useCallback to imports
import { prism } from "@/api/prismClient";
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

  const loadCESDKScript = (retryCount = 0, maxRetries = 2) => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.CreativeEditorSDK) {
        console.log('[CE.SDK] SDK already loaded');
        resolve();
        return;
      }

      console.log(`[CE.SDK] Loading SDK script (attempt ${retryCount + 1}/${maxRetries + 1})...`);

      // Set timeout for script loading (30 seconds)
      const timeout = setTimeout(() => {
        window.removeEventListener('cesdk-loaded', loadHandler);
        window.removeEventListener('cesdk-error', errorHandler);
        const error = new Error('CE.SDK script loading timeout after 30 seconds');
        console.error('[CE.SDK] Script loading timeout:', error);
        
        if (retryCount < maxRetries) {
          console.log(`[CE.SDK] Retrying script load (${retryCount + 1}/${maxRetries})...`);
          loadCESDKScript(retryCount + 1, maxRetries)
            .then(resolve)
            .catch(reject);
        } else {
          reject(error);
        }
      }, 30000);

      const loadHandler = () => {
        clearTimeout(timeout);
        window.removeEventListener('cesdk-loaded', loadHandler);
        window.removeEventListener('cesdk-error', errorHandler);
        console.log('[CE.SDK] SDK loaded successfully');
        resolve();
      };

      const errorHandler = (event) => {
        clearTimeout(timeout);
        window.removeEventListener('cesdk-loaded', loadHandler);
        window.removeEventListener('cesdk-error', errorHandler);
        const error = event.detail || new Error('Failed to load CE.SDK script');
        console.error('[CE.SDK] Script loading error:', error);
        
        if (retryCount < maxRetries) {
          console.log(`[CE.SDK] Retrying script load (${retryCount + 1}/${maxRetries})...`);
          setTimeout(() => {
            loadCESDKScript(retryCount + 1, maxRetries)
              .then(resolve)
              .catch(reject);
          }, 2000); // Wait 2 seconds before retry
        } else {
          reject(error);
        }
      };
      
      window.addEventListener('cesdk-loaded', loadHandler);
      window.addEventListener('cesdk-error', errorHandler);

      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = `
        try {
          import('https://cdn.img.ly/packages/imgly/cesdk-js/1.31.0/index.js')
            .then(module => {
              window.CreativeEditorSDK = module.default || module;
              console.log('[CE.SDK] Module imported successfully');
              window.dispatchEvent(new Event('cesdk-loaded'));
            })
            .catch(error => {
              console.error('[CE.SDK] Module import error:', error);
              window.dispatchEvent(new CustomEvent('cesdk-error', { detail: error }));
            });
        } catch (error) {
          console.error('[CE.SDK] Script execution error:', error);
          window.dispatchEvent(new CustomEvent('cesdk-error', { detail: error }));
        }
      `;
      
      script.onerror = (err) => {
        clearTimeout(timeout);
        window.removeEventListener('cesdk-loaded', loadHandler);
        window.removeEventListener('cesdk-error', errorHandler);
        const error = new Error('Failed to load CE.SDK script from CDN. Check network connection and CORS settings.');
        console.error('[CE.SDK] Script onerror:', err, error);
        
        if (retryCount < maxRetries) {
          console.log(`[CE.SDK] Retrying script load (${retryCount + 1}/${maxRetries})...`);
          setTimeout(() => {
            loadCESDKScript(retryCount + 1, maxRetries)
              .then(resolve)
              .catch(reject);
          }, 2000);
        } else {
          reject(error);
        }
      };
      
      document.head.appendChild(script);
      console.log('[CE.SDK] Script element added to DOM');
    });
  };

  const getLicenseKey = async () => {
    try {
      console.log('[CE.SDK] Fetching license key...');
      
      // Check cache first
      const cachedKey = localStorage.getItem(LICENSE_CACHE_KEY);
      const cachedTime = localStorage.getItem(LICENSE_CACHE_TIME_KEY);
      
      if (cachedKey && cachedTime) {
        const now = Date.now();
        const cacheAge = now - parseInt(cachedTime);
        if (cacheAge < CACHE_DURATION) {
          console.log('[CE.SDK] Using cached license key');
          return cachedKey;
        } else {
          console.log('[CE.SDK] Cached license key expired, fetching new one');
        }
      }

      // Fetch from backend
      console.log('[CE.SDK] Requesting license key from backend...');
      const { data: licenseResponse } = await prism.functions.invoke('getCESDKKey');
      
      console.log('[CE.SDK] License key response:', {
        hasApiKey: !!licenseResponse?.apiKey,
        hasError: !!licenseResponse?.error,
        error: licenseResponse?.error,
        message: licenseResponse?.message
      });
      
      if (licenseResponse?.error) {
        throw new Error(licenseResponse.message || licenseResponse.error || 'License key not available');
      }
      
      if (!licenseResponse?.apiKey) {
        throw new Error('License key not available. Please configure CESDK_LICENSE_KEY or CESDK_API_KEY environment variable.');
      }

      // Cache the key
      localStorage.setItem(LICENSE_CACHE_KEY, licenseResponse.apiKey);
      localStorage.setItem(LICENSE_CACHE_TIME_KEY, Date.now().toString());
      console.log('[CE.SDK] License key cached successfully');
      
      return licenseResponse.apiKey;

    } catch (error) {
      console.error('[CE.SDK] License key fetch error:', error);
      
      // Try fallback to cached key even if expired
      const fallbackKey = localStorage.getItem(LICENSE_CACHE_KEY);
      if (fallbackKey) {
        console.warn('[CE.SDK] Using expired cached license key as fallback');
        return fallbackKey;
      }
      
      // Provide detailed error message
      const errorMessage = error.message || 'Failed to fetch CE.SDK license key';
      throw new Error(`${errorMessage}. Please check that CESDK_LICENSE_KEY or CESDK_API_KEY is configured in the backend environment variables.`);
    }
  };

  const initEditor = async (container) => {
    if (!container || initStartedRef.current) {
      if (!container) {
        console.warn('[CE.SDK] Init skipped: container not available');
      }
      if (initStartedRef.current) {
        console.warn('[CE.SDK] Init skipped: already started');
      }
      return;
    }
    
    initStartedRef.current = true;
    console.log('[CE.SDK] Initializing editor...');

    try {
      // Step 1: Load SDK script
      console.log('[CE.SDK] Step 1: Loading SDK script...');
      setLoading(true);
      setError(null);
      
      await loadCESDKScript();
      console.log('[CE.SDK] ✓ SDK script loaded');

      // Step 2: Get license key
      console.log('[CE.SDK] Step 2: Getting license key...');
      const licenseKey = await getLicenseKey();
      
      if (!licenseKey) {
        throw new Error('License key is empty or invalid');
      }
      console.log('[CE.SDK] ✓ License key obtained');

      // Step 3: Create editor instance
      console.log('[CE.SDK] Step 3: Creating editor instance...');
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
              console.log('[CE.SDK] Uploading file:', file.name);
              const { file_url } = await prism.integrations.Core.UploadFile({ file });
              console.log('[CE.SDK] File uploaded:', file_url);
              
              return {
                id: `upload-${Date.now()}`,
                meta: {
                  uri: file_url,
                  thumbUri: file_url
                }
              };
            } catch (error) {
              console.error('[CE.SDK] Upload error:', error);
              throw error;
            }
          }
        }
      };

      console.log('[CE.SDK] Creating SDK instance with config...');
      const instance = await window.CreativeEditorSDK.create(container, config);
      
      if (!instance) {
        throw new Error('Failed to create CE.SDK instance. The SDK returned null.');
      }

      console.log('[CE.SDK] ✓ Editor instance created successfully');
      instanceRef.current = instance;
      setCesdk(instance);

      // Step 4: Add asset sources
      setTimeout(() => {
        try {
          console.log('[CE.SDK] Adding asset sources...');
          instance.addDefaultAssetSources();
          instance.addDemoAssetSources({
            sceneMode: 'Design',
            withUploadAssetSources: true
          });
          console.log('[CE.SDK] ✓ Asset sources added');
        } catch (err) {
          console.error('[CE.SDK] Asset loading error:', err);
          // Don't throw - asset sources are optional
        }
      }, 0);

      console.log('[CE.SDK] ✓ Editor initialization complete');
      // setLoading(false) will be handled by the useEffect once the scene is loaded/created
    } catch (err) {
      console.error('[CE.SDK] ✗ Initialization failed:', err);
      
      // Provide user-friendly error messages
      let errorMessage = err.message || 'Failed to initialize CE.SDK editor';
      
      if (errorMessage.includes('timeout')) {
        errorMessage = 'CE.SDK script loading timed out. Please check your internet connection and try again.';
      } else if (errorMessage.includes('License') || errorMessage.includes('license')) {
        errorMessage = 'CE.SDK license key is not configured. Please contact support or check backend configuration.';
      } else if (errorMessage.includes('CORS') || errorMessage.includes('network')) {
        errorMessage = 'Failed to load CE.SDK from CDN. Please check your network connection and CORS settings.';
      }
      
      setError(errorMessage);
      toast.error('Failed to load editor: ' + errorMessage);
      setLoading(false);
      initStartedRef.current = false; // Allow retry
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

  // Store container node for retry functionality
  const containerNodeRef = React.useRef(null);
  
  const containerRef = React.useCallback((node) => {
    console.log('[CE.SDK] Container ref called, node:', !!node, 'open:', open, 'initStarted:', initStartedRef.current);
    containerNodeRef.current = node;
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
      const { file_url: previewUrl } = await prism.integrations.Core.UploadFile({ file: previewFile });

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
            <p className="text-xl font-bold text-white mb-2">Loading Creative Editor...</p>
            <p className="text-sm text-gray-400">This may take a few moments</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-95 z-[100000]">
          <div className="text-center max-w-lg px-6">
            <div className="w-16 h-16 mx-auto mb-4 text-red-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-xl font-bold text-red-400 mb-4">Failed to Load Editor</p>
            <p className="text-sm text-gray-300 mb-2">{error}</p>
            <p className="text-xs text-gray-500 mb-6">
              Check the browser console for detailed error information.
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={() => {
                  console.log('[CE.SDK] Retry button clicked');
                  setError(null);
                  setLoading(true);
                  initStartedRef.current = false;
                  if (containerNodeRef.current) {
                    initEditor(containerNodeRef.current);
                  } else {
                    console.error('[CE.SDK] Cannot retry: container node not available');
                    setError('Cannot retry: container not available. Please close and reopen the editor.');
                    setLoading(false);
                  }
                }} 
                variant="outline" 
                size="lg" 
                className="bg-white"
              >
                Retry
              </Button>
              {onClose && (
                <Button onClick={onClose} variant="outline" size="lg" className="bg-gray-700 text-white">
                  Close
                </Button>
              )}
            </div>
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
