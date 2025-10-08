/**
 * Safe request utilities to prevent crashes from invalid JSON or query parameters
 */

/**
 * Safely stringify JSON with proper escaping for special characters
 */
export function safeJSONStringify(obj: any): string {
  try {
    const jsonString = JSON.stringify(obj);
    // Escape Unicode line and paragraph separators that can break JSON parsing
    return jsonString
      .replace(/[\u2028]/g, '\\u2028')
      .replace(/[\u2029]/g, '\\u2029');
  } catch (error) {
    console.error('Failed to stringify object:', error);
    throw new Error('Invalid object for JSON serialization');
  }
}

/**
 * Validate that a string is valid JSON
 */
export function validateJSON(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely encode URI component for query parameters
 */
export function safeEncodeURIComponent(value: string | number | boolean): string {
  return encodeURIComponent(String(value));
}

// Constants for n8n proxy
const N8N_WEBHOOK_URL = 'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1';
const SUPABASE_PROJECT_URL = 'https://jqrlegdulnnrpiixiecf.supabase.co';
const N8N_PROXY_URL = `${SUPABASE_PROJECT_URL}/functions/v1/n8n-proxy`;

/**
 * Safe fetch wrapper for POST requests with JSON validation
 */
export async function safePostRequest(url: string, payload: any, headers: Record<string, string> = {}): Promise<Response> {
  const body = safeJSONStringify(payload);
  
  if (!validateJSON(body)) {
    throw new Error('Invalid JSON payload');
  }

  // Redirect n8n webhook calls to our CORS proxy
  if (url === N8N_WEBHOOK_URL) {
    console.log('[safe-request] Redirecting n8n call to CORS proxy');
    url = N8N_PROXY_URL;
  }

  // Check if this is an n8n endpoint that needs extended timeout
  const isN8nEndpoint = url.includes('/webhook/') || url.includes('/n8n/') || url.includes('/api/flow/') || url.includes('n8n.cloud') || url.includes('/n8n-proxy');
  
  if (isN8nEndpoint) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000); // 3 min timeout for n8n

    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          ...headers
        },
        body,
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      
      // Handle abort error specifically
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - the server took too long to respond');
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error - please check your connection and try again');
      }
      
      throw error;
    }
  }

  return fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...headers
    },
    body
  });
}

/**
 * Safe fetch wrapper for GET requests with encoded query parameters
 */
export async function safeGetRequest(url: string, params: Record<string, any> = {}): Promise<Response> {
  const urlObj = new URL(url);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlObj.searchParams.set(key, safeEncodeURIComponent(value));
    }
  });

  return fetch(urlObj.toString());
}