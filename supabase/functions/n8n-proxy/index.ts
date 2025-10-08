import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const N8N_WEBHOOK_URL = 'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse incoming request body
    const payload = await req.json();
    
    console.log('[n8n-proxy] Forwarding request to n8n webhook');

    // Create abort controller for 10-second timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      // Forward request to n8n webhook (server-to-server, no CORS)
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Read response body
      const responseData = await response.json();

      console.log('[n8n-proxy] Successfully received response from n8n');

      // Return response with CORS headers
      return new Response(
        JSON.stringify(responseData),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (fetchError) {
      clearTimeout(timeout);

      // Handle timeout
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[n8n-proxy] Request timeout after 10 seconds');
        return new Response(
          JSON.stringify({
            error: 'Request timeout - the server took too long to respond',
            code: 'TIMEOUT',
          }),
          {
            status: 504,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Handle network errors
      console.error('[n8n-proxy] Network error:', fetchError);
      return new Response(
        JSON.stringify({
          error: 'Network error - unable to reach the webhook server',
          code: 'NETWORK_ERROR',
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('[n8n-proxy] Error processing request:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'PROXY_ERROR',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
