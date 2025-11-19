import React, { useEffect, useState } from "react";
import { prism } from "@/api/prismClient";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

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

        console.log('🔄 Facebook callback received:', { code: !!code, state, error });

        if (error) {
          throw new Error(errorDescription || error);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state');
        }

        setMessage('Exchanging authorization code...');

        const response = await base44.functions.invoke('socialMediaCallback', {
          platform: 'facebook',
          code,
          state
        });

        console.log('✅ OAuth completed:', response.data);

        setStatus('success');
        setMessage('Facebook connected successfully!');

        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-success',
            platform: 'facebook'
          }, window.location.origin);
        }

        setTimeout(() => {
          window.close();
        }, 2000);

      } catch (error) {
        console.error('❌ Facebook OAuth error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to connect Facebook');

        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-error',
            platform: 'facebook',
            error: error.message
          }, window.location.origin);
        }

        setTimeout(() => {
          window.close();
        }, 3000);
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
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: '#88925D' }} />
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
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2 text-red-600">
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