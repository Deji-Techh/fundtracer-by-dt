export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Build target URL - replace host, keep path and query
  const targetUrl = `https://api.fundtracer.xyz${url.pathname}${url.search}`;

  // Clone request with same method, headers, body
  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    redirect: 'manual'
  });

  const response = await fetch(proxyRequest);

  // Return response with original status and headers
  return new Response(response.body, {
    status: response.status,
    headers: response.headers
  });
}