import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function YouTubeCallback() {
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Connecting YouTube...");

  useEffect(() => {
    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const error = params.get("error");

        console.log("YouTube Callback - Code:", code ? "Present" : "Missing");
        console.log("YouTube Callback - State:", state);
        console.log("YouTube Callback - Error:", error);

        if (error) {
          setStatus("error");
          setMessage(`YouTube authentication failed: ${error}`);
          setTimeout(() => {
            window.location.href = `/Connections?error=${encodeURIComponent(error)}`;
          }, 3000);
          return;
        }

        if (!code || !state) {
          setStatus("error");
          setMessage("No authorization code received from YouTube");
          setTimeout(() => {
            window.location.href = "/Connections?error=no_code";
          }, 3000);
          return;
        }

        setMessage("Exchanging authorization code...");

        // Call backend with query parameters
        const callbackUrl = `${window.location.origin}/functions/socialMediaCallback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&platform=youtube`;
        
        const response = await fetch(callbackUrl);
        const html = await response.text();

        // Check if response indicates success
        if (html.includes('Connected Successfully') || html.includes('✅')) {
          setStatus("success");
          setMessage("Successfully connected YouTube account!");
          setTimeout(() => {
            window.location.href = "/Connections?success=youtube";
          }, 2000);
        } else if (html.includes('Connection Failed') || html.includes('❌')) {
          throw new Error("Failed to connect YouTube account");
        }

      } catch (err) {
        console.error("YouTube callback error:", err);
        setStatus("error");
        setMessage(err.message || "An unexpected error occurred");
        setTimeout(() => {
          window.location.href = `/Connections?error=${encodeURIComponent(err.message)}`;
        }, 3000);
      }
    }

    handleCallback();
  }, []);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4" 
      style={{
        background: 'linear-gradient(135deg, #FFD5C9 0%, #FFDCC1 20%, #FFE4D0 40%, #D8E4C9 60%, #C9DEE4 80%, #D8C9E4 100%)'
      }}
    >
      <div 
        className="max-w-md w-full p-8 rounded-3xl text-center"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 20px 60px rgba(166, 124, 82, 0.3)',
          border: '2px solid rgba(229, 165, 116, 0.3)'
        }}
      >
        {status === "processing" && (
          <>
            <Loader2 
              className="w-16 h-16 mx-auto mb-4 animate-spin" 
              style={{ color: '#88925D' }} 
            />
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
              {message}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#88925D' }} />
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#A4B58B', animationDelay: '0.2s' }} />
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#C4D4A8', animationDelay: '0.4s' }} />
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)' }}>
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
              YouTube Connected! 📹
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-red-100">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
              Connection Failed
            </h2>
            <p className="text-sm mb-4" style={{ color: '#8B7355' }}>
              {message}
            </p>
            <p className="text-xs mt-4" style={{ color: '#8B7355' }}>
              Redirecting back to connections...
            </p>
          </>
        )}
      </div>
    </div>
  );
}