export async function onRequest({ request, env, params }) {
  const railwayUrl = 'https://fundtracer-by-dt-production.up.railway.app';
  
  // Get the API path from params
  const apiPath = params.api || '';
  const proxyUrl = `${railwayUrl}/api/${apiPath}`;
  
  console.log('[API-PROXY] Proxying:', request.url, '->', proxyUrl);

  try {
    // Clone the request and modify headers
    const headers = new Headers(request.headers);
    headers.set('host', 'fundtracer-by-dt-production.up.railway.app');
    
    const response = await fetch(proxyUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
    });

    // Create response with CORS headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('access-control-allow-origin', '*');
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'access-control-allow-headers': 'Content-Type, Authorization',
        },
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[API-PROXY] Error:', error);
    return new Response(JSON.stringify({ error: 'Proxy error', message: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}