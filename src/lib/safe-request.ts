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

/**
 * Safe fetch wrapper for POST requests with JSON validation
 */
export async function safePostRequest(url: string, payload: any, headers: Record<string, string> = {}): Promise<Response> {
  const body = safeJSONStringify(payload);
  
  if (!validateJSON(body)) {
    throw new Error('Invalid JSON payload');
  }

  // Check if this is an n8n endpoint that needs extended timeout
  const isN8nEndpoint = url.includes('/webhook/') || url.includes('/n8n/') || url.includes('/api/flow/') || url.includes('n8n.cloud');
  
  if (isN8nEndpoint) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000); // 3 min timeout for n8n

    return fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        ...headers
      },
      body,
      signal: controller.signal
    }).finally(() => {
      clearTimeout(timeout);
    });
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