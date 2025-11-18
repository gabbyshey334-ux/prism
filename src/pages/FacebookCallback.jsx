import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function FacebookCallback() {
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing Facebook authorization...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        console.log('📥 Facebook callback received:', {
          hasCode: !!code,
          state,
          error,
          errorDescription,
          fullUrl: window.location.href
        });

        if (error) {
          setStatus('error');
          setMessage(errorDescription || error);
          setTimeout(() => window.close(), 3000);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Missing authorization code or state');
          setTimeout(() => window.close(), 3000);
          return;
        }

        // Call backend function via SDK with parameters in body
        console.log('🔄 Calling backend function with code and state');
        const response = await base44.functions.invoke('socialMediaCallback', {
          code,
          state,
          platform: 'facebook'
        });

        console.log('✅ Backend response:', response.data);

        if (response.data.success) {
          setStatus('success');
          setMessage(`Successfully connected! @${response.data.account_name}`);
          
          // Notify parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'oauth-success',
              platform: 'facebook',
              account_name: response.data.account_name,
              connection_id: response.data.connection_id
            }, '*');
          }
          
          setTimeout(() => window.close(), 2000);
        } else {
          setStatus('error');
          setMessage(response.data.error || 'Connection failed');
          setTimeout(() => window.close(), 3000);
        }

      } catch (error) {
        console.error('❌ Callback error:', error);
        setStatus('error');
        setMessage(error.message || 'An error occurred');
        setTimeout(() => window.close(), 3000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 50%, #FFF4E0 100%)'
    }}>
      <div className="text-center p-8 rounded-3xl max-w-md" style={{
        background: 'white',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        {status === 'processing' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: '#1877F2' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
              Connecting Facebook...
            </h2>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#88925D' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
              Success!
            </h2>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#DC2626' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
              Connection Failed
            </h2>
          </>
        )}
        
        <p className="text-base" style={{ color: '#8B7355' }}>
          {message}
        </p>
        
        {status !== 'processing' && (
          <p className="text-sm mt-4" style={{ color: '#8B7355' }}>
            This window will close automatically...
          </p>
        )}
      </div>
    </div>
  );
}