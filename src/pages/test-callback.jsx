import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function TestCallbackPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const allParams = {};
  for (const [key, value] of urlParams.entries()) {
    allParams[key] = value;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
    }}>
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#88925D' }} />
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
              OAuth Callback Test Page
            </h1>
            <p className="text-sm" style={{ color: '#8B7355' }}>
              This page is working! ✅
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{
              background: 'rgba(136, 146, 93, 0.1)',
              border: '2px solid rgba(136, 146, 93, 0.3)'
            }}>
              <p className="font-bold mb-2" style={{ color: '#3D3D2B' }}>Current URL:</p>
              <p className="text-sm break-all" style={{ color: '#8B7355' }}>
                {window.location.href}
              </p>
            </div>

            <div className="p-4 rounded-xl" style={{
              background: 'rgba(136, 146, 93, 0.1)',
              border: '2px solid rgba(136, 146, 93, 0.3)'
            }}>
              <p className="font-bold mb-2" style={{ color: '#3D3D2B' }}>URL Parameters:</p>
              {Object.keys(allParams).length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(allParams).map(([key, value]) => (
                    <p key={key} className="text-sm" style={{ color: '#8B7355' }}>
                      <span className="font-semibold">{key}:</span> {value.substring(0, 50)}{value.length > 50 ? '...' : ''}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: '#8B7355' }}>No parameters in URL</p>
              )}
            </div>

            <div className="p-4 rounded-xl" style={{
              background: 'rgba(232, 180, 77, 0.1)',
              border: '2px solid rgba(232, 180, 77, 0.3)'
            }}>
              <p className="font-bold mb-2" style={{ color: '#3D3D2B' }}>Expected OAuth Callback Format:</p>
              <p className="text-xs break-all" style={{ color: '#8B7355' }}>
                https://prism-app.com/oauth-callback?code=AUTHORIZATION_CODE&state=STATE_VALUE
              </p>
            </div>

            <div className="p-4 rounded-xl" style={{
              background: 'rgba(229, 165, 116, 0.1)',
              border: '2px solid rgba(229, 165, 116, 0.3)'
            }}>
              <p className="font-bold mb-2" style={{ color: '#3D3D2B' }}>TikTok Developer Portal Configuration:</p>
              <div className="text-sm space-y-1" style={{ color: '#8B7355' }}>
                <p>✅ Redirect URI: https://prism-app.com/oauth-callback</p>
                <p>✅ Scopes: user.info.basic, video.upload, video.publish</p>
                <p>✅ Client Key: sbawbdb878h1yn9lub</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}