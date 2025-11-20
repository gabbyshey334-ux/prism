import React, { useState } from "react";
import { prism } from "@/api/prismClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TestOAuth() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testFunction = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Calling socialMediaConnect...');
      
      const response = await prism.functions.invoke('socialMediaConnect', {
        platform: 'tiktok',
        brand_id: 'test-brand-id'
      });

      console.log('Response:', response);
      setResult(response.data);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Function call failed');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen p-8">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-4">Test OAuth Function</h1>
          
          <Button onClick={testFunction} disabled={loading} className="mb-4">
            {loading ? 'Testing...' : 'Test socialMediaConnect'}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-red-800 font-semibold">Error:</p>
              <pre className="text-sm mt-2">{error}</pre>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-semibold">Success!</p>
              <pre className="text-sm mt-2 overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}