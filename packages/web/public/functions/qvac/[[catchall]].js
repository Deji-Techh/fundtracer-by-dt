export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Strip /qvac prefix and forward to Railway
  const targetPath = url.pathname.replace(/^\/qvac/, '');
  const targetUrl = `https://fundtracer-qvac-production.up.railway.app${targetPath}${url.search}`;

  console.log(`QVAC Proxy: ${url.pathname} -> ${targetUrl}`);

  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': request.headers.get('Authorization') || '',
    },
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  });

  const response = await fetch(proxyRequest);
  const data = await response.text();

  return new Response(data, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}