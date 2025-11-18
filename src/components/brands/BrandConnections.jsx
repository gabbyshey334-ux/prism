import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Link2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const platforms = [
  { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E1306C' },
  { id: 'facebook', name: 'Facebook', icon: '👍', color: '#1877F2' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#000000' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0A66C2' }
];

export default function BrandConnections({ brand }) {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: connections = [], isLoading, refetch, error: queryError } = useQuery({
    queryKey: ['socialConnections', brand.id],
    queryFn: async () => {
      console.log('🔍 Fetching connections for brand:', brand.id);
      console.log('📋 Brand object:', brand);
      
      try {
        // Try to get ALL connections first to debug
        const allConnections = await base44.entities.SocialMediaConnection.list();
        console.log('📊 ALL connections in database:', allConnections);
        
        // Now filter for this brand
        const result = await base44.entities.SocialMediaConnection.filter({ brand_id: brand.id });
        console.log('✅ Filtered connections for brand:', result);
        console.log('📌 Number of connections found:', result.length);
        
        return result;
      } catch (error) {
        console.error('❌ Error fetching connections:', error);
        throw error;
      }
    },
    initialData: [],
    retry: 1,
  });

  // Log when connections change
  useEffect(() => {
    console.log('🔄 Connections updated:', connections);
  }, [connections]);

  // Log query error
  useEffect(() => {
    if (queryError) {
      console.error('❌ Query error:', queryError);
      toast.error(`Failed to load connections: ${queryError.message}`);
    }
  }, [queryError]);

  const deleteConnectionMutation = useMutation({
    mutationFn: (id) => base44.entities.SocialMediaConnection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialConnections', brand.id] });
      toast.success("Connection removed");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove connection");
    }
  });

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    console.log('🔄 Manual refresh triggered');
    try {
      const result = await refetch();
      console.log('✅ Refresh result:', result);
      toast.success("Connections refreshed");
    } catch (error) {
      console.error('❌ Refresh error:', error);
      toast.error("Failed to refresh connections");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Listen for OAuth callback messages from popup
  useEffect(() => {
    const handleMessage = async (event) => {
      console.log('📨 Message received:', event.data, 'from origin:', event.origin);

      if (event.data.type === 'oauth-success') {
        console.log('✅ OAuth success message received for:', event.data.platform);
        
        setConnecting(null);
        
        // Show success message
        toast.success(`${event.data.platform} connected successfully!`);
        
        // Wait a moment for the database to update
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Force refetch the connections
        console.log('🔄 Refetching connections after OAuth success...');
        await refetch();
        
      } else if (event.data.type === 'oauth-error') {
        console.error('❌ OAuth error:', event.data.error);
        toast.error(event.data.error || 'Failed to connect');
        setConnecting(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [brand.id, refetch]);

  const handleConnect = async (platformId) => {
    setConnecting(platformId);
    
    try {
      console.log('🔗 Initiating connection:', platformId, 'for brand:', brand.id);
      
      const response = await base44.functions.invoke('socialMediaConnect', {
        platform: platformId,
        brand_id: brand.id
      });

      console.log('📡 Response:', response);

      if (!response?.data?.authUrl) {
        throw new Error(response?.data?.error || 'No authorization URL received');
      }

      console.log('🚀 Opening OAuth popup...');
      console.log('📍 Auth URL:', response.data.authUrl);

      // Open popup window (centered)
      const width = 600;
      const height = 700;
      const left = (window.screen.width / 2) - (width / 2);
      const top = (window.screen.height / 2) - (height / 2);

      const popup = window.open(
        response.data.authUrl,
        `${platformId}_oauth`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Check if popup was closed without completing auth
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          if (connecting === platformId) {
            console.log('⚠️ Popup closed');
            // Force refresh after popup closes
            setTimeout(async () => {
              console.log('🔄 Popup closed, refreshing connections...');
              await refetch();
              setConnecting(null);
            }, 2000);
          }
        }
      }, 500);

    } catch (error) {
      console.error('❌ Connection error:', error);
      toast.error(error.message || "Failed to connect. Please try again.");
      setConnecting(null);
    }
  };

  const handleDisconnect = (connectionId) => {
    if (confirm('Are you sure you want to disconnect this account?')) {
      deleteConnectionMutation.mutate(connectionId);
    }
  };

  const getConnection = (platformId) => {
    const connection = connections.find(c => c.platform === platformId);
    console.log(`🔍 Looking for ${platformId} connection:`, connection);
    return connection;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#88925D' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
            Social Media Connections
          </h3>
          <p className="text-sm" style={{ color: '#8B7355' }}>
            Connect your social media accounts to publish content directly from PRISM
          </p>
        </div>
        <Button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="rounded-xl"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Important Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl" style={{
        backgroundColor: '#FFF4E0',
        border: '1px solid #E8B44D'
      }}>
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#E8B44D' }} />
        <div className="text-sm">
          <p className="font-semibold mb-1" style={{ color: '#3D3D2B' }}>
            Before Connecting:
          </p>
          <p style={{ color: '#6B6B4D' }}>
            Make sure popups are enabled. After connecting, click the Refresh button if connections don't appear automatically.
          </p>
        </div>
      </div>

      {/* Debug Info */}
      <div className="text-xs p-3 rounded-lg" style={{ backgroundColor: '#f0f0f0', color: '#666' }}>
        <p>🔍 Debug Info:</p>
        <p className="mt-1">Brand ID: {brand.id}</p>
        <p>Connections found: {connections.length}</p>
        {connections.length > 0 && (
          <div className="mt-2">
            <p className="font-semibold">Connected platforms:</p>
            <ul className="list-disc pl-5">
              {connections.map((conn, idx) => (
                <li key={idx}>{conn.platform} - @{conn.account_name}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-2 text-blue-600 cursor-pointer" onClick={() => console.log('Current connections:', connections)}>
          Click to log connections to console
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {platforms.map(platform => {
          const connection = getConnection(platform.id);
          const isConnected = !!connection;

          return (
            <Card
              key={platform.id}
              className="border-2 rounded-2xl overflow-hidden transition-all hover:shadow-lg"
              style={{
                borderColor: isConnected ? platform.color : 'rgba(229, 165, 116, 0.3)',
                background: isConnected
                  ? `linear-gradient(135deg, ${platform.color}15 0%, ${platform.color}08 100%)`
                  : 'white'
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ background: `${platform.color}20` }}
                    >
                      {platform.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: '#3D3D2B' }}>
                        {platform.name}
                      </h3>
                      {isConnected && connection && (
                        <p className="text-sm" style={{ color: '#8B7355' }}>
                          @{connection.account_name}
                        </p>
                      )}
                    </div>
                  </div>
                  {isConnected && (
                    <Badge
                      className="px-3 py-1"
                      style={{
                        background: `linear-gradient(135deg, ${platform.color} 0%, ${platform.color}CC 100%)`,
                        color: 'white'
                      }}
                    >
                      ✓ Connected
                    </Badge>
                  )}
                </div>

                {isConnected && connection ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: '#8B7355' }}>Status:</span>
                      <Badge variant="outline" style={{ borderColor: platform.color, color: platform.color }}>
                        Active
                      </Badge>
                    </div>
                    <Button
                      onClick={() => handleDisconnect(connection.id)}
                      variant="outline"
                      className="w-full rounded-xl border-2 hover:bg-red-50"
                      disabled={deleteConnectionMutation.isPending}
                      style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#DC2626' }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleConnect(platform.id)}
                    disabled={connecting === platform.id}
                    className="w-full rounded-xl font-semibold"
                    style={{
                      background: `linear-gradient(135deg, ${platform.color} 0%, ${platform.color}DD 100%)`,
                      color: platform.id === 'tiktok' ? 'white' : 'white'
                    }}
                  >
                    {connecting === platform.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4 mr-2" />
                        Connect {platform.name}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}