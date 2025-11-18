import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, RefreshCw, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const platforms = [
  {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
    description: "Connect your Instagram Business account to post Reels and Carousels",
    color: "#E1306C"
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "👍",
    description: "Connect your Facebook Page to post content",
    color: "#1877F2"
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "🎵",
    description: "Connect your TikTok account to post videos",
    color: "#000000"
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "💼",
    description: "Connect your LinkedIn profile or page",
    color: "#0A66C2"
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "🎥",
    description: "Connect your YouTube channel to post videos (Coming Soon)",
    color: "#FF0000",
    comingSoon: true
  },
  {
    id: "twitter",
    name: "Twitter/X",
    icon: "𝕏",
    description: "Connect your Twitter account to post tweets (Coming Soon)",
    color: "#000000",
    comingSoon: true
  }
];

export default function Connections() {
  const queryClient = useQueryClient();
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [connecting, setConnecting] = useState(null);

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => base44.entities.Brand.list(),
    initialData: [],
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: () => base44.entities.SocialMediaConnection.list(),
    initialData: [],
  });

  // Check for success/error messages from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');

    if (success) {
      toast.success(`Successfully connected ${success}!`);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      // Refresh connections
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    }

    if (error) {
      toast.error(`Connection failed: ${decodeURIComponent(error)}`);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [queryClient]);

  useEffect(() => {
    if (brands.length > 0 && !selectedBrand) {
      setSelectedBrand(brands[0].id);
    }
  }, [brands, selectedBrand]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SocialMediaConnection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success("Connection removed");
    },
  });

  const handleConnect = async (platformId) => {
    if (!selectedBrand) {
      toast.error("Please select a brand first");
      return;
    }

    setConnecting(platformId);

    try {
      const response = await base44.functions.invoke('socialMediaConnect', {
        platform: platformId,
        brand_id: selectedBrand
      });

      if (!response.data || !response.data.authUrl) {
        throw new Error("Failed to generate authorization URL");
      }

      // Redirect to the OAuth URL directly (not popup for better reliability)
      window.location.href = response.data.authUrl;

    } catch (error) {
      console.error("Connection error:", error);
      toast.error(error.message || "Failed to connect. Please try again.");
      setConnecting(null);
    }
  };

  const handleDisconnect = (connectionId) => {
    if (confirm("Are you sure you want to disconnect this account?")) {
      deleteMutation.mutate(connectionId);
    }
  };

  const handleRefreshToken = async (connectionId) => {
    try {
      await base44.functions.invoke('socialMediaRefreshToken', {
        connection_id: connectionId
      });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success("Token refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh token");
    }
  };

  const brandConnections = connections.filter(c => c.brand_id === selectedBrand);

  return (
    <div className="min-h-screen p-6 md:p-8" style={{
      background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
    }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
            Social Media Connections
          </h1>
          <p className="text-lg" style={{ color: '#8B7355' }}>
            Connect your social media accounts to publish directly from Prism
          </p>
        </div>

        {brands.length === 0 ? (
          <Card className="p-12 text-center border-0 rounded-2xl" style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(16px)'
          }}>
            <p className="text-xl mb-2" style={{ color: '#3D3D2B' }}>No brands yet</p>
            <p style={{ color: '#8B7355' }}>Create a brand first to connect social accounts</p>
          </Card>
        ) : (
          <>
            {/* Brand Selector */}
            <Card className="border-0 rounded-2xl shadow-sm mb-6" style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(16px)'
            }}>
              <CardContent className="p-6">
                <label className="text-sm font-medium mb-2 block" style={{ color: '#3D3D2B' }}>
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
              </CardContent>
            </Card>

            {/* Platforms Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {platforms.map(platform => {
                const connection = brandConnections.find(c => c.platform === platform.id);
                const isExpired = connection?.expires_at && new Date(connection.expires_at) < new Date();

                return (
                  <Card key={platform.id} className="border-0 rounded-2xl shadow-sm hover:shadow-md transition-all"
                        style={{
                          background: 'rgba(255, 255, 255, 0.9)',
                          backdropFilter: 'blur(16px)'
                        }}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                               style={{ backgroundColor: `${platform.color}15` }}>
                            {platform.icon}
                          </div>
                          <div>
                            <CardTitle className="text-lg" style={{ color: '#3D3D2B' }}>
                              {platform.name}
                            </CardTitle>
                            {connection && (
                              <p className="text-sm mt-1" style={{ color: '#8B7355' }}>
                                @{connection.account_name}
                              </p>
                            )}
                          </div>
                        </div>

                        {connection ? (
                          <Badge style={{
                            backgroundColor: isExpired ? '#FEE2E2' : connection.is_active ? '#D1FAE5' : '#FEE2E2',
                            color: isExpired ? '#DC2626' : connection.is_active ? '#059669' : '#DC2626'
                          }}>
                            {isExpired ? (
                              <>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Expired
                              </>
                            ) : connection.is_active ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Connected
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </Badge>
                        ) : platform.comingSoon ? (
                          <Badge style={{ backgroundColor: '#FFF4E0', color: '#8B7355' }}>
                            Coming Soon
                          </Badge>
                        ) : null}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <p className="text-sm" style={{ color: '#8B7355' }}>
                        {platform.description}
                      </p>

                      {connection ? (
                        <>
                          {connection.expires_at && (
                            <p className="text-xs" style={{ color: '#8B7355' }}>
                              Token expires: {format(new Date(connection.expires_at), 'MMM d, yyyy')}
                            </p>
                          )}

                          <div className="flex gap-2">
                            {isExpired && (
                              <Button
                                onClick={() => handleRefreshToken(connection.id)}
                                variant="outline"
                                size="sm"
                                className="rounded-lg flex-1"
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh Token
                              </Button>
                            )}
                            <Button
                              onClick={() => handleDisconnect(connection.id)}
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                              style={{ flex: isExpired ? 'none' : 1 }}
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Disconnecting...
                                </>
                              ) : (
                                'Disconnect'
                              )}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <Button
                          onClick={() => handleConnect(platform.id)}
                          disabled={connecting === platform.id || platform.comingSoon}
                          className="w-full rounded-xl"
                          style={{
                            backgroundColor: platform.comingSoon ? '#E8E8E8' : platform.color,
                            color: 'white'
                          }}
                        >
                          {connecting === platform.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Connecting...
                            </>
                          ) : platform.comingSoon ? (
                            'Coming Soon'
                          ) : (
                            <>
                              <ExternalLink className="w-4 h-4 mr-2" />
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

            {/* Help Section */}
            <Card className="border-0 rounded-2xl shadow-sm mt-8" style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(16px)'
            }}>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3" style={{ color: '#3D3D2B' }}>
                  📌 Connection Requirements
                </h3>
                <div className="space-y-2 text-sm" style={{ color: '#8B7355' }}>
                  <p><strong>Instagram:</strong> You need an Instagram Business or Creator account connected to a Facebook Page</p>
                  <p><strong>Facebook:</strong> You need to be an admin of the Facebook Page you want to connect</p>
                  <p><strong>TikTok:</strong> You need a TikTok account with creator/business permissions</p>
                  <p><strong>LinkedIn:</strong> You need a LinkedIn profile or company page with posting permissions</p>
                  <p><strong>Permissions:</strong> Prism will request permissions to publish content and read basic analytics</p>
                  <p><strong>Security:</strong> Your access tokens are encrypted and stored securely</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}