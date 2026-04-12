export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Build target URL - replace host, keep path and query
  let targetUrl = `https://api.fundtracer.xyz${url.pathname}${url.search}`;

  // Clone request with same method, headers, body
  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    redirect: 'manual'
  });

  let response = await fetch(proxyRequest);

  // Handle redirects - follow them transparently
  while (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
    const location = response.headers.get('location');
    if (!location) break;
    
    // Build new target URL (handle relative and absolute redirects)
    if (location.startsWith('/')) {
      targetUrl = `https://api.fundtracer.xyz${location}`;
    } else {
      targetUrl = location;
    }

    // Create new proxy request for redirect
    const redirectRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'manual'
    });

    response = await fetch(redirectRequest);
  }

  // Return response with original status and headers
  return new Response(response.body, {
    status: response.status,
    headers: response.headers
  });
}