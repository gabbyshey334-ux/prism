import React, { useEffect, useState } from "react";
import { prism } from "@/api/prismClient";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function OAuthCallbackPage() {
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Processing OAuth callback...");
  const [debugInfo, setDebugInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");
        const error = urlParams.get("error");
        const errorDescription = urlParams.get("error_description");

        const debug = {
          url: window.location.href,
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
          error: error,
          errorDescription: errorDescription
        };
        
        setDebugInfo(debug);
        console.log("OAuth Callback Debug Info:", debug);

        if (error) {
          setStatus("error");
          setMessage(`OAuth Error: ${errorDescription || error}`);
          setTimeout(() => navigate("/connections"), 5000);
          return;
        }

        if (!code || !state) {
          setStatus("error");
          setMessage("Missing authorization code or state parameter");
          console.error("Missing parameters:", { code: !!code, state: !!state });
          setTimeout(() => navigate("/connections"), 5000);
          return;
        }

        setMessage("Exchanging authorization code for access token...");
        console.log("Calling socialMediaCallback function...");

        const response = await prism.functions.invoke("socialMediaCallback", {
          code,
          state
        });

        console.log("Callback response:", response);

        if (response.data && response.data.success) {
          setStatus("success");
          setMessage(`Successfully connected ${response.data.platform}! Account: ${response.data.account_name}`);
          setTimeout(() => navigate("/connections?success=true"), 2000);
        } else {
          throw new Error(response.data?.error || "Failed to complete OAuth");
        }

      } catch (error) {
        console.error("OAuth callback error:", error);
        setStatus("error");
        setMessage(error.message || "Failed to complete OAuth flow");
        setTimeout(() => navigate("/connections"), 5000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
    }}>
      <div className="max-w-md w-full p-8 rounded-3xl text-center" style={{
        background: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 20px 60px rgba(166, 124, 82, 0.3)'
      }}>
        {status === "processing" && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: '#88925D' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
              Connecting...
            </h2>
            <p className="text-sm mb-4" style={{ color: '#8B7355' }}>
              {message}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#88925D' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
              Success!
            </h2>
            <p className="text-sm mb-4" style={{ color: '#8B7355' }}>
              {message}
            </p>
            <p className="text-xs" style={{ color: '#8B7355' }}>
              Redirecting to connections...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#DC2626' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
              Connection Failed
            </h2>
            <p className="text-sm mb-4" style={{ color: '#8B7355' }}>
              {message}
            </p>
            <p className="text-xs mt-4" style={{ color: '#8B7355' }}>
              Redirecting back to connections in 5 seconds...
            </p>
          </>
        )}

        {debugInfo && (
          <div className="mt-6 p-4 rounded-xl text-left text-xs" style={{
            background: 'rgba(139, 115, 85, 0.1)',
            border: '1px solid rgba(139, 115, 85, 0.2)'
          }}>
            <p className="font-bold mb-2" style={{ color: '#3D3D2B' }}>Debug Info:</p>
            <p style={{ color: '#8B7355' }}>Has Code: {debugInfo.hasCode ? '✅' : '❌'}</p>
            <p style={{ color: '#8B7355' }}>Has State: {debugInfo.hasState ? '✅' : '❌'}</p>
            {debugInfo.hasError && (
              <p style={{ color: '#DC2626' }}>Error: {debugInfo.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}