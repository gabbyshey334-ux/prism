import React, { useState } from "react";
import { prism } from "@/api/prismClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function TestOAuth() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testFunction = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔍 Testing socialMediaConnect function...');
      console.log('📍 App ID: ');
      
      const response = await prism.functions.invoke('socialMediaConnect', {
        platform: 'tiktok',
        brand_id: 'test-brand-123'
      });

      console.log('✅ Response received:', response);
      setResult({
        success: true,
        data: response.data,
        status: response.status
      });
    } catch (err) {
      console.error('❌ Error:', err);
      setError({
        message: err.message || 'Unknown error',
        response: err.response?.data,
        status: err.response?.status
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen p-8" style={{
      background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
    }}>
      <Card className="max-w-3xl mx-auto border-2 rounded-3xl" style={{
        borderColor: 'rgba(229, 165, 116, 0.4)',
        background: 'white'
      }}>
        <CardHeader>
          <CardTitle className="text-2xl font-bold" style={{ color: '#3D3D2B' }}>
            OAuth Function Test
          </CardTitle>
          <p className="text-sm mt-2" style={{ color: '#8B7355' }}>
            Testing if <code className="px-2 py-1 bg-gray-100 rounded">socialMediaConnect</code> function is deployed and accessible
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Test Button */}
          <Button 
            onClick={testFunction} 
            disabled={loading}
            className="w-full rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
              color: 'white'
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Testing Function...
              </>
            ) : (
              <>Test socialMediaConnect</>
            )}
          </Button>

          {/* Function Details */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFF8F0' }}>
            <h3 className="font-semibold mb-2" style={{ color: '#3D3D2B' }}>
              Expected Endpoint:
            </h3>
            <code className="text-xs break-all" style={{ color: '#8B7355' }}>
              POST {import.meta.env.VITE_API_BASE_URL || 'https://octopus-app-73pgz.ondigitalocean.app/api'}/apps//functions/socialMediaConnect
            </code>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-start gap-3 mb-4">
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-800 font-semibold text-lg mb-2">Error Occurred</p>
                  <p className="text-red-700 text-sm mb-3">{error.message}</p>
                  
                  {error.status && (
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-red-600">Status Code: </span>
                      <span className="text-xs text-red-700">{error.status}</span>
                    </div>
                  )}
                  
                  {error.response && (
                    <div>
                      <p className="text-xs font-semibold text-red-600 mb-1">Response:</p>
                      <pre className="text-xs bg-red-100 p-3 rounded overflow-auto text-red-800">
                        {JSON.stringify(error.response, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Troubleshooting */}
              <div className="mt-4 pt-4 border-t border-red-200">
                <p className="text-xs font-semibold text-red-600 mb-2">Troubleshooting:</p>
                <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                  <li>Check if the function is deployed in Base44 Dashboard → Code → Functions</li>
                  <li>Verify the function name is exactly "socialMediaConnect" (case-sensitive)</li>
                  <li>Make sure you're authenticated (logged in)</li>
                  <li>Check browser console for more details</li>
                </ul>
              </div>
            </div>
          )}

          {/* Success Display */}
          {result?.success && (
            <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-green-800 font-semibold text-lg mb-2">Function Works! ✅</p>
                  <p className="text-green-700 text-sm mb-3">
                    The socialMediaConnect function is deployed and accessible
                  </p>
                </div>
              </div>

              {result.data && (
                <div>
                  <p className="text-xs font-semibold text-green-600 mb-2">Response Data:</p>
                  <pre className="text-xs bg-green-100 p-3 rounded overflow-auto text-green-800 max-h-96">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}

              {result.data?.authUrl && (
                <div className="mt-4 p-3 bg-white rounded-lg">
                  <p className="text-xs font-semibold mb-2" style={{ color: '#3D3D2B' }}>
                    Generated OAuth URL:
                  </p>
                  <a 
                    href={result.data.authUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs break-all hover:underline"
                    style={{ color: '#88925D' }}
                  >
                    {result.data.authUrl}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {!error && !result && (
            <div className="p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: '#E8F4D9' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#88925D' }} />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#3D3D2B' }}>
                  How this test works:
                </p>
                <ul className="text-xs space-y-1" style={{ color: '#6B6B4D' }}>
                  <li>1. Calls the socialMediaConnect function with test parameters</li>
                  <li>2. Should return an OAuth authorization URL</li>
                  <li>3. If you see a 404 error, the function isn't deployed yet</li>
                  <li>4. If you see the OAuth URL, the function is working!</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
