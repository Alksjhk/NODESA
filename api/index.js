export default async function handler(request) {
  // 设置你要代理的目标URL
  const TARGET_URL = 'https://www.googleapis.com/gemini/v1';

  // 修改目标URL
  const url = new URL(request.url);
  const newUrl = TARGET_URL + url.pathname + url.search;
    
  // 使用fetch方法代理请求
  const response = await fetch(newUrl, request);
    
  // 复制响应头
  const headers = new Headers(response.headers);
  headers.set('x-vercel-cache', 'DYNAMIC');
    
  // 返回修改后的响应
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}
