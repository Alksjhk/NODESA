// 文件路径: /api/proxy.js
import fetch from 'node-fetch'; // Vercel环境会自动处理

export default async function handler(request, response) {
  // 从查询参数中获取目标URL，例如 /api/proxy?url=https://example.com
  const targetUrl = request.query.url;

  if (!targetUrl) {
    return response.status(400).send('Please provide a target URL in the "url" query parameter.');
  }

  try {
    const fetchResponse = await fetch(targetUrl, {
        headers: { ...request.headers, host: new URL(targetUrl).host },
        method: request.method,
        body: request.body,
        redirect: 'follow'
    });

    // 将目标响应的头信息复制到我们的响应中
    for (const [key, value] of fetchResponse.headers.entries()) {
        response.setHeader(key, value);
    }

    // 注意：这里的代码非常基础，没有像Cloudflare版本那样重写HTML中的URL
    // 它更适合作为API代理，而不是完整的网页浏览代理
    response.status(fetchResponse.status).send(fetchResponse.body);

  } catch (error) {
    response.status(500).send(`Error fetching the URL: ${error.message}`);
  }
}
