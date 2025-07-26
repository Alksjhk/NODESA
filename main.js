addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // 设置你要代理的目标URL
  const TARGET_URL = 'https://www.googleapis.com/gemini/v1';

  // 检查请求的目标域名，如果是特定域名则代理
  const url = new URL(request.url);
  if (url.hostname === 'yourdomain.com') {
    // 修改目标URL
    const newUrl = TARGET_URL + request.url.substring(url.origin.length);
    
    // 使用Cloudflare的fetch方法代理请求
    const response = await fetch(newUrl, request);
    
    // 复制响应头
    const headers = new Headers(response.headers);
    headers.set('cf-cache-status', 'DYNAMIC');
    
    // 返回修改后的响应
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  }
  
  // 其他路由规则或直接返回
  return new Response('Hello World!', { status: 200 });
}

