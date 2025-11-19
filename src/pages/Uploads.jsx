import React, { useState } from "react";
import { prism } from "@/api/prismClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Search, Trash2, Image as ImageIcon, Video, FileText, 
  Download, Eye, X, Loader2, CloudUpload, AlertCircle, CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Uploads() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_FILE_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/jpg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/svg+xml': ['.svg'],
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
    'video/quicktime': ['.mov'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv']
  };

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ['uploads'],
    queryFn: () => prism.entities.Content.list('-created_date'),
    initialData: [],
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => prism.entities.Brand.list(),
    initialData: [],
  });

  const deleteUploadMutation = useMutation({
    mutationFn: (id) => prism.entities.Content.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      toast.success("Upload deleted!");
    },
    onError: (error) => {
      console.error('Delete upload error:', error);
      toast.error("Failed to delete upload");
    },
  });

  const validateFile = (file) => {
    const errors = [];
    
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File size exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }
    
    if (!ALLOWED_FILE_TYPES[file.type]) {
      errors.push(`File type not supported: ${file.type}`);
    }
    
    return errors;
  };

  const uploadFileMutation = useMutation({
    mutationFn: async (fileData) => {
      const validationErrors = validateFile(fileData.file);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      // Get current user for user_id
      const currentUser = await prism.auth.getCurrentUser();
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      setUploadProgress(prev => ({ ...prev, [fileData.file.name]: 10 }));

      // Upload to Firebase Storage with enhanced metadata
      const uploadResult = await prism.integrations.Core.UploadFile({ file: fileData.file });
      
      setUploadProgress(prev => ({ ...prev, [fileData.file.name]: 50 }));

      const fileType = fileData.file.type.startsWith('video/') ? 'video'
        : fileData.file.type.startsWith('image/') ? 'image'
        : 'document';

      // Create upload record with comprehensive metadata
      const uploadRecord = await prism.entities.Upload.create({
        user_id: currentUser.id,
        brand_id: fileData.brand_id || null,
        storage_path: uploadResult.storage_path,
        mime_type: fileData.file.type,
        original_name: uploadResult.metadata.original_name,
        file_size: uploadResult.metadata.size,
        uploaded_at: uploadResult.metadata.uploaded_at
      });

      setUploadProgress(prev => ({ ...prev, [fileData.file.name]: 80 }));

      // Create content entry linked to upload
      const contentData = await prism.entities.Content.create({
        user_id: currentUser.id,
        original_input: fileData.name || fileData.file.name,
        input_type: 'upload',
        ai_generated_title: fileData.name || fileData.file.name,
        uploaded_file_url: uploadResult.file_url,
        uploaded_file_type: fileType,
        tags: fileData.tags || [],
        status: 'draft',
        upload_id: uploadRecord.id,
        brand_content: fileData.brand_id ? [{
          brand_id: fileData.brand_id,
          brand_name: brands.find(b => b.id === fileData.brand_id)?.name
        }] : []
      });

      setUploadProgress(prev => ({ ...prev, [fileData.file.name]: 100 }));

      return contentData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      toast.success("File uploaded successfully!");
    },
    onError: (error, variables) => {
      console.error('Upload file error:', error);
      setUploadErrors(prev => ({
        ...prev,
        [variables.file.name]: error.message
      }));
      toast.error(`Failed to upload ${variables.file.name}: ${error.message}`);
    },
  });

  // Filter uploads only
  const uploads = contents.filter(c => c.uploaded_file_url);

  // Apply filters
  let filteredUploads = uploads;

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredUploads = filteredUploads.filter(u =>
      u.ai_generated_title?.toLowerCase().includes(query) ||
      u.original_input?.toLowerCase().includes(query)
    );
  }

  if (selectedType !== "all") {
    filteredUploads = filteredUploads.filter(u => u.uploaded_file_type === selectedType);
  }

  if (selectedBrand !== "all") {
    filteredUploads = filteredUploads.filter(u =>
      u.brand_content?.some(bc => bc.brand_id === selectedBrand)
    );
  }

  const stats = {
    total: uploads.length,
    images: uploads.filter(u => u.uploaded_file_type === 'image').length,
    videos: uploads.filter(u => u.uploaded_file_type === 'video').length,
    documents: uploads.filter(u => u.uploaded_file_type === 'document').length,
  };

  const handleDeleteUpload = (uploadId, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this upload? This action cannot be undone.')) {
      deleteUploadMutation.mutate(uploadId);
    }
  };

  const handleBulkUpload = async (files) => {
    const fileArray = Array.from(files);
    setUploadingFiles(fileArray.map(f => f.name));
    setUploadProgress({});
    setUploadErrors({});

    let successCount = 0;
    let errorCount = 0;

    for (const file of fileArray) {
      try {
        // Simulate progress stages
        setUploadProgress(prev => ({ ...prev, [file.name]: 10 }));
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 200));
        setUploadProgress(prev => ({ ...prev, [file.name]: 30 }));
        
        await uploadFileMutation.mutateAsync({
          file,
          name: file.name,
          brand_id: selectedBrand !== "all" ? selectedBrand : null
        });
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        successCount++;
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        setUploadProgress(prev => ({ ...prev, [file.name]: -1 }));
        errorCount++;
      }
    }

    setUploadingFiles([]);
    
    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file(s)`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} file(s)`);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8" style={{
      background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
    }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
              Uploads
            </h1>
            <p className="text-lg" style={{ color: '#8B7355' }}>
              Manage your uploaded images, videos, and files
            </p>
          </div>
          <Button
            onClick={() => setShowUploadModal(true)}
            className="rounded-xl shadow-md ethereal-glow"
            style={{
              background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
              color: 'white'
            }}
          >
            <CloudUpload className="w-5 h-5 mr-2" />
            Upload Files
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 rounded-2xl shadow-sm crystal-shine" style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(229, 165, 116, 0.3)'
          }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#8B7355' }}>
                    Total Uploads
                  </p>
                  <p className="text-3xl font-bold" style={{ color: '#7D5A4A' }}>
                    {stats.total}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center ethereal-glow"
                     style={{ background: 'linear-gradient(135deg, #E5A574 0%, #F4DCC8 100%)' }}>
                  <CloudUpload className="w-6 h-6" style={{ color: '#7D5A4A' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 rounded-2xl shadow-sm crystal-shine" style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(229, 165, 116, 0.3)'
          }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#8B7355' }}>
                    Images
                  </p>
                  <p className="text-3xl font-bold" style={{ color: '#E8B44D' }}>
                    {stats.images}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center ethereal-glow"
                     style={{ background: 'linear-gradient(135deg, #E8B44D 0%, #F4DCC8 100%)' }}>
                  <ImageIcon className="w-6 h-6" style={{ color: '#B8842D' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 rounded-2xl shadow-sm crystal-shine" style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(229, 165, 116, 0.3)'
          }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#8B7355' }}>
                    Videos
                  </p>
                  <p className="text-3xl font-bold" style={{ color: '#7FB8BF' }}>
                    {stats.videos}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center ethereal-glow"
                     style={{ background: 'linear-gradient(135deg, #7FB8BF 0%, #D9EEF4 100%)' }}>
                  <Video className="w-6 h-6" style={{ color: '#4A6B7B' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 rounded-2xl shadow-sm crystal-shine" style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(229, 165, 116, 0.3)'
          }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#8B7355' }}>
                    Documents
                  </p>
                  <p className="text-3xl font-bold" style={{ color: '#A88FA8' }}>
                    {stats.documents}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center ethereal-glow"
                     style={{ background: 'linear-gradient(135deg, #A88FA8 0%, #E8D9F4 100%)' }}>
                  <FileText className="w-6 h-6" style={{ color: '#6B5B7B' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 rounded-2xl shadow-sm mb-6 crystal-shine" style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(229, 165, 116, 0.3)'
        }}>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                        style={{ color: '#8B7355' }} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search uploads..."
                  className="pl-10 rounded-xl border-2"
                  style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
                />
              </div>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
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
          </CardContent>
        </Card>

        {/* Uploads Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#88925D' }} />
            <p style={{ color: '#8B7355' }}>Loading uploads...</p>
          </div>
        ) : filteredUploads.length === 0 ? (
          <Card className="p-12 text-center border-0 rounded-2xl crystal-shine" style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
            backdropFilter: 'blur(16px)'
          }}>
            <CloudUpload className="w-16 h-16 mx-auto mb-4" style={{ color: '#8B7355' }} />
            <p className="text-xl mb-2" style={{ color: '#3D3D2B' }}>
              {searchQuery || selectedType !== "all" || selectedBrand !== "all"
                ? "No uploads match your filters"
                : "No uploads yet"}
            </p>
            <p style={{ color: '#8B7355' }}>
              {searchQuery || selectedType !== "all" || selectedBrand !== "all"
                ? "Try adjusting your filters"
                : "Upload your first file to get started"}
            </p>
            {!searchQuery && selectedType === "all" && selectedBrand === "all" && (
              <Button
                onClick={() => setShowUploadModal(true)}
                className="mt-6 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                  color: 'white'
                }}
              >
                <CloudUpload className="w-5 h-5 mr-2" />
                Upload Files
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredUploads.map(upload => (
              <UploadCard
                key={upload.id}
                upload={upload}
                brands={brands}
                onDelete={(e) => handleDeleteUpload(upload.id, e)}
                onView={() => setSelectedFile(upload)}
              />
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <UploadModal
            onClose={() => setShowUploadModal(false)}
            onUpload={handleBulkUpload}
            brands={brands}
            selectedBrand={selectedBrand}
            uploadingFiles={uploadingFiles}
            uploadProgress={uploadProgress}
            uploadErrors={uploadErrors}
          />
        )}

        {/* File Viewer Modal */}
        {selectedFile && (
          <FileViewerModal
            file={selectedFile}
            onClose={() => setSelectedFile(null)}
          />
        )}
      </div>
    </div>
  );
}

function UploadCard({ upload, brands, onDelete, onView }) {
  const brand = upload.brand_content?.[0]
    ? brands.find(b => b.id === upload.brand_content[0].brand_id)
    : null;

  const typeIcons = {
    image: <ImageIcon className="w-5 h-5" />,
    video: <Video className="w-5 h-5" />,
    document: <FileText className="w-5 h-5" />
  };

  const typeColors = {
    image: '#E8B44D',
    video: '#7FB8BF',
    document: '#A88FA8'
  };

  const getFileSize = (upload) => {
    // Try to get file size from various possible sources
    return upload.file_size || 
           upload.upload_metadata?.size || 
           upload.metadata?.size || 
           null;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    if (upload.uploaded_file_url) {
      window.open(upload.uploaded_file_url, '_blank');
    }
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    onView();
  };

  return (
    <Card
      className="border rounded-2xl hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
      style={{
        borderColor: 'rgba(229, 165, 116, 0.3)',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.75) 100%)',
        backdropFilter: 'blur(16px)'
      }}
    >
      {/* Action Buttons Overlay */}
      <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleQuickView}
          className="bg-white/90 hover:bg-blue-50 text-blue-600 rounded-full h-8 w-8"
          title="Quick View"
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownload}
          className="bg-white/90 hover:bg-green-50 text-green-600 rounded-full h-8 w-8"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="bg-white/90 hover:bg-red-50 text-red-600 rounded-full h-8 w-8"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <CardContent className="p-4">
        {/* Enhanced Preview */}
        <div 
          onClick={handleQuickView}
          className="w-full h-40 rounded-lg overflow-hidden mb-3 flex items-center justify-center relative group/preview"
          style={{ backgroundColor: 'rgba(229, 165, 116, 0.1)' }}
        >
          {upload.uploaded_file_type === 'image' ? (
            <img 
              src={upload.uploaded_file_url} 
              alt={upload.ai_generated_title} 
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : upload.uploaded_file_type === 'video' ? (
            <div className="relative w-full h-full">
              <video 
                src={upload.uploaded_file_url} 
                className="w-full h-full object-cover"
                preload="metadata"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover/preview:bg-opacity-20 transition-all">
                <div className="w-12 h-12 rounded-full bg-white bg-opacity-90 flex items-center justify-center">
                  <Video className="w-6 h-6" style={{ color: typeColors.video }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-4">
              <div className="mb-2" style={{ color: typeColors[upload.uploaded_file_type] }}>
                {typeIcons[upload.uploaded_file_type]}
              </div>
              <p className="text-xs" style={{ color: '#8B7355' }}>
                {upload.uploaded_file_type.toUpperCase()}
              </p>
            </div>
          )}
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover/preview:bg-opacity-20 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover/preview:opacity-100 transition-opacity">
              <Eye className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Enhanced Info */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold line-clamp-2 text-sm leading-tight" style={{ color: '#3D3D2B' }}>
              {upload.ai_generated_title || upload.original_input}
            </h3>
            {upload.original_input !== upload.ai_generated_title && (
              <p className="text-xs mt-1 opacity-75 truncate" style={{ color: '#8B7355' }}>
                {upload.original_input}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline" 
              className="text-xs"
              style={{ 
                borderColor: typeColors[upload.uploaded_file_type],
                color: typeColors[upload.uploaded_file_type]
              }}
            >
              {upload.uploaded_file_type}
            </Badge>
            {brand && (
              <Badge variant="outline" className="text-xs" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
                <div className="flex items-center gap-1">
                  {brand.primary_color && (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brand.primary_color }} />
                  )}
                  {brand.name}
                </div>
              </Badge>
            )}
          </div>

          {/* File metadata */}
          <div className="flex items-center justify-between text-xs" style={{ color: '#8B7355' }}>
            <span>{format(new Date(upload.created_date), 'MMM d, yyyy')}</span>
            {getFileSize(upload) && (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {formatFileSize(getFileSize(upload))}
              </span>
            )}
          </div>

          {/* Tags if available */}
          {upload.tags && upload.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {upload.tags.slice(0, 3).map((tag, idx) => (
                <span key={idx} className="text-xs px-2 py-1 rounded-full" 
                      style={{ backgroundColor: 'rgba(229, 165, 116, 0.2)', color: '#8B7355' }}>
                  {tag}
                </span>
              ))}
              {upload.tags.length > 3 && (
                <span className="text-xs px-2 py-1 rounded-full" 
                      style={{ backgroundColor: 'rgba(229, 165, 116, 0.2)', color: '#8B7355' }}>
                  +{upload.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function UploadModal({ onClose, onUpload, brands, selectedBrand, uploadingFiles, uploadProgress = {}, uploadErrors = {} }) {
  const [files, setFiles] = useState([]);
  const [fileErrors, setFileErrors] = useState({});

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_FILE_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/jpg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/svg+xml': ['.svg'],
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
    'video/quicktime': ['.mov'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv']
  };

  const validateFile = (file) => {
    const errors = [];
    
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File size exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }
    
    if (!ALLOWED_FILE_TYPES[file.type]) {
      errors.push(`File type not supported: ${file.type}`);
    }
    
    return errors;
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const errors = {};
    
    newFiles.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        errors[file.name] = fileErrors;
      }
    });
    
    setFileErrors(errors);
    setFiles(newFiles);
  };

  const handleUpload = () => {
    const validFiles = files.filter(file => !fileErrors[file.name]);
    
    if (validFiles.length === 0) {
      toast.error("No valid files selected for upload");
      return;
    }
    
    if (validFiles.length !== files.length) {
      toast.warning(`${files.length - validFiles.length} files have errors and won't be uploaded`);
    }
    
    onUpload(validFiles);
    
    if (validFiles.length === files.length) {
      onClose();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 252, 240, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: '2px solid rgba(229, 165, 116, 0.3)'
      }}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{ color: '#3D3D2B' }}>
            Upload Files
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          <div>
            <label className="block mb-3">
              <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                   style={{ borderColor: 'rgba(229, 165, 116, 0.4)' }}>
                <CloudUpload className="w-12 h-12 mx-auto mb-4" style={{ color: '#88925D' }} />
                <p className="text-base font-semibold mb-1" style={{ color: '#3D3D2B' }}>
                  Click to upload or drag and drop
                </p>
                <p className="text-sm" style={{ color: '#8B7355' }}>
                  Images, videos, or documents
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                />
              </div>
            </label>

            {files.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2" style={{ color: '#3D3D2B' }}>
                  Selected Files ({files.length})
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {Array.from(files).map((file, idx) => (
                    <div key={idx} className="p-2 rounded-lg border"
                         style={{ 
                           backgroundColor: 'rgba(229, 165, 116, 0.1)',
                           borderColor: fileErrors[file.name] ? 'rgba(239, 68, 68, 0.3)' : 'rgba(229, 165, 116, 0.2)'
                         }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm truncate" style={{ color: '#3D3D2B' }}>
                          {file.name}
                        </span>
                        <span className="text-xs ml-2" style={{ color: '#8B7355' }}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      
                      {fileErrors[file.name] && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          {fileErrors[file.name].join(', ')}
                        </div>
                      )}
                      
                      {uploadProgress[file.name] !== undefined && (
                        <div className="mt-2">
                          {uploadProgress[file.name] === -1 ? (
                            <div className="flex items-center gap-1 text-xs text-red-600">
                              <AlertCircle className="w-3 h-3" />
                              Upload failed
                            </div>
                          ) : uploadProgress[file.name] === 100 ? (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              Upload complete
                            </div>
                          ) : (
                            <div>
                              <div className="flex justify-between text-xs mb-1" style={{ color: '#8B7355' }}>
                                <span>Uploading...</span>
                                <span>{uploadProgress[file.name]}%</span>
                              </div>
                              <Progress value={uploadProgress[file.name]} className="h-1" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {uploadingFiles.length > 0 && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(136, 146, 93, 0.1)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#88925D' }} />
                <span className="text-sm font-semibold" style={{ color: '#3D3D2B' }}>
                  Uploading {uploadingFiles.length} file(s)...
                </span>
              </div>
              <div className="space-y-1">
                {uploadingFiles.map((fileName, idx) => (
                  <p key={idx} className="text-xs" style={{ color: '#8B7355' }}>
                    {fileName}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
              disabled={uploadingFiles.length > 0}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploadingFiles.length > 0}
              className="rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                color: 'white'
              }}
            >
              <CloudUpload className="w-5 h-5 mr-2" />
              Upload {files.length > 0 && `(${files.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FileViewerModal({ file, onClose }) {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageErrors] = useState(false);

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtension = (filename) => {
    return filename?.split('.').pop()?.toLowerCase() || 'unknown';
  };

  const handleImageLoad = () => {
    setIsImageLoading(false);
  };

  const handleImageError = () => {
    setIsImageLoading(false);
    setImageErrors(true);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('URL copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy URL');
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh]" style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 252, 240, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: '2px solid rgba(229, 165, 116, 0.3)'
      }}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold" style={{ color: '#3D3D2B' }}>
              {file.ai_generated_title || file.original_input}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* File Preview */}
          <div className="bg-gray-50 rounded-xl overflow-hidden">
            {file.uploaded_file_type === 'image' && (
              <div className="relative">
                {isImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#88925D' }} />
                  </div>
                )}
                {imageErrors ? (
                  <div className="p-12 text-center">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-semibold mb-2" style={{ color: '#3D3D2B' }}>
                      Image Preview Error
                    </p>
                    <p className="text-sm mb-4" style={{ color: '#8B7355' }}>
                      Unable to load image preview
                    </p>
                    <Button
                      onClick={() => window.open(file.uploaded_file_url, '_blank')}
                      className="rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                        color: 'white'
                      }}
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download Image
                    </Button>
                  </div>
                ) : (
                  <img 
                    src={file.uploaded_file_url} 
                    alt={file.ai_generated_title} 
                    className="w-full max-h-[60vh] object-contain"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                )}
              </div>
            )}
            
            {file.uploaded_file_type === 'video' && (
              <div className="relative">
                <video 
                  src={file.uploaded_file_url} 
                  controls 
                  className="w-full max-h-[60vh]"
                  preload="metadata"
                />
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                  Video
                </div>
              </div>
            )}
            
            {file.uploaded_file_type === 'document' && (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#A88FA8' }} />
                <p className="text-lg font-semibold mb-2" style={{ color: '#3D3D2B' }}>
                  Document Preview
                </p>
                <p className="text-sm mb-2" style={{ color: '#8B7355' }}>
                  {getFileExtension(file.original_input || file.ai_generated_title)?.toUpperCase()} file
                </p>
                <p className="text-xs mb-6" style={{ color: '#8B7355' }}>
                  Preview not available for this file type
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => window.open(file.uploaded_file_url, '_blank')}
                    className="rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                      color: 'white'
                    }}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(file.uploaded_file_url)}
                    variant="outline"
                    className="rounded-xl"
                  >
                    Copy URL
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* File Information */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold" style={{ color: '#3D3D2B' }}>File Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: '#8B7355' }}>Filename:</span>
                  <span className="font-medium">{file.original_input || file.ai_generated_title}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#8B7355' }}>Type:</span>
                  <span className="font-medium capitalize">{file.uploaded_file_type}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#8B7355' }}>Uploaded:</span>
                  <span className="font-medium">{format(new Date(file.created_date), 'MMM d, yyyy h:mm a')}</span>
                </div>
                {file.file_size && (
                  <div className="flex justify-between">
                    <span style={{ color: '#8B7355' }}>Size:</span>
                    <span className="font-medium">{formatFileSize(file.file_size)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold" style={{ color: '#3D3D2B' }}>Actions</h3>
              <div className="space-y-2">
                <Button
                  onClick={() => window.open(file.uploaded_file_url, '_blank')}
                  className="w-full rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                    color: 'white'
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download File
                </Button>
                <Button
                  onClick={() => copyToClipboard(file.uploaded_file_url)}
                  variant="outline"
                  className="w-full rounded-xl"
                >
                  Copy File URL
                </Button>
              </div>
            </div>
          </div>

          {/* Tags */}
          {file.tags && file.tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2" style={{ color: '#3D3D2B' }}>Tags</h3>
              <div className="flex flex-wrap gap-2">
                {file.tags.map((tag, idx) => (
                  <span key={idx} className="text-xs px-3 py-1 rounded-full" 
                        style={{ backgroundColor: 'rgba(229, 165, 116, 0.2)', color: '#8B7355' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Brand Info */}
          {file.brand_content && file.brand_content.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2" style={{ color: '#3D3D2B' }}>Brand</h3>
              <div className="flex items-center gap-2">
                {file.brand_content[0].brand_name}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}