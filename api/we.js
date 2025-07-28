// /api/proxy.js

// Node.js 18+ 内置了 URL, fetch 等
import { URL } from 'url';

export default async function handler(request, response) {
  // 1. 从查询参数中获取目标 URL
  const targetUrl = request.query.url;

  // 2. 验证 URL 是否存在且有效
  if (!targetUrl || !isValidUrl(targetUrl)) {
    return response.status(400).json({ error: 'A valid "url" query parameter is required.' });
  }

  try {
    const targetUrlObj = new URL(targetUrl);
    
    // 3. 准备转发给目标服务器的请求头
    const requestHeaders = new Headers(request.headers);
    // 必须删除或重写 host，否则请求会失败
    requestHeaders.set('host', targetUrlObj.host);
    // 转发真实的客户端IP，有些服务可能会用到
    requestHeaders.set('x-forwarded-for', request.headers['x-forwarded-for'] || request.socket.remoteAddress);
    // 保持连接打开以提高性能
    requestHeaders.set('connection', 'keep-alive');
    // 删除 vercel 相关的内部头
    requestHeaders.delete('x-vercel-id');
    requestHeaders.delete('x-vercel-deployment-url');
    requestHeaders.delete('x-vercel-proxied-for');
    requestHeaders.delete('x-real-ip');


    // 4. 向目标服务器发起 fetch 请求
    const targetResponse = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      // 如果是 POST 等请求，需要转发 body
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      // Vercel 可能会重定向，我们手动处理
      redirect: 'manual', 
    });

    // 5. 处理响应头
    const responseHeaders = new Headers(targetResponse.headers);
    // 删除可能导致问题的安全头，因为域已经改变
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('content-security-policy-report-only');
    responseHeaders.delete('strict-transport-security');
    responseHeaders.delete('x-frame-options'); // 允许在 iframe 中加载（如果需要）

    // 6. 获取内容类型，以决定是否需要重写 URL
    const contentType = responseHeaders.get('content-type') || '';

    // 对于需要重定向的响应 (301, 302, 307, 308)
    if (targetResponse.status >= 300 && targetResponse.status < 400 && responseHeaders.has('location')) {
      const location = responseHeaders.get('location');
      const redirectedUrl = new URL(location, targetUrl).href;
      // 重写 location 头，使其指向我们的代理
      response.setHeader('Location', `/api/proxy?url=${encodeURIComponent(redirectedUrl)}`);
      return response.status(targetResponse.status).end();
    }
    
    // 将所有处理过的响应头设置到 Vercel 的响应中
    responseHeaders.forEach((value, name) => {
        response.setHeader(name, value);
    });

    // 7. 根据内容类型分别处理
    if (contentType.includes('text/html') || contentType.includes('text/css')) {
      // 对于 HTML 和 CSS，我们需要读取内容并重写 URL
      const originalBody = await targetResponse.text();
      const rewrittenBody = rewriteUrls(originalBody, targetUrl, contentType);
      
      response.status(targetResponse.status).send(rewrittenBody);

    } else {
      // 对于图片、字体等二进制文件，直接流式传输，不修改内容
      // 使用 Node.js 的 stream piping
      // targetResponse.body 是一个 ReadableStream
      if (targetResponse.body) {
        response.status(targetResponse.status);
        const reader = targetResponse.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          response.write(value);
        }
        response.end();
      } else {
        response.status(targetResponse.status).end();
      }
    }

  } catch (error) {
    console.error(`Proxy Error: ${error.message}`);
    response.status(500).json({ error: 'An error occurred while proxying the request.', details: error.message });
  }
}

// 辅助函数：检查是否是有效的 URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// 核心函数：重写 HTML/CSS 中的 URL
function rewriteUrls(body, baseUrl, contentType) {
  const proxyUrlPrefix = `/api/proxy?url=`;

  const resolveUrl = (relativeUrl) => {
    try {
      // 使用 URL 对象来正确解析相对路径
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      return ''; // 如果解析失败，返回空字符串
    }
  };

  if (contentType.includes('text/html')) {
    // 使用正则表达式替换 HTML 中的 src, href, action 属性
    // 这个正则表达式可以处理带引号和不带引号的属性
    return body.replace(/(<[^>]+(?:href|src|action)\s*=\s*)(['"]?)(.*?)\2/gi, (match, p1, p2, p3) => {
      if (p3.startsWith('data:') || p3.startsWith('#') || p3.startsWith('javascript:')) {
        return match; // 不处理 data URIs, hash links, 和 javascript links
      }
      const resolved = resolveUrl(p3);
      return resolved ? `${p1}${p2}${proxyUrlPrefix}${encodeURIComponent(resolved)}${p2}` : match;
    });
  }

  if (contentType.includes('text/css')) {
    // 替换 CSS 中的 url(...)
    return body.replace(/url\((['"]?)(.*?)\1\)/gi, (match, p1, p2) => {
      if (p2.startsWith('data:')) {
        return match; // 不处理 data URIs
      }
      const resolved = resolveUrl(p2);
      return resolved ? `url(${p1}${proxyUrlPrefix}${encodeURIComponent(resolved)}${p1})` : match;
    });
  }

  return body;
}
