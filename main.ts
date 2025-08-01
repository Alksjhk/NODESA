addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 原始Gemini API地址
  const TARGET_HOST = 'https://generativelanguage.googleapis.com';
  
  // 保留原始请求路径和参数
  const url = new URL(request.url);
  const path = url.pathname + url.search;
  
  // 构造新请求
  const newUrl = TARGET_HOST + path;
  const newHeaders = new Headers(request.headers);
  newHeaders.set('Host', 'generativelanguage.googleapis.com');

  // 转发请求
  return fetch(newUrl, {
    method: request.method,
    headers: newHeaders,
    body: request.body
  });
}
