// /api/[...path].js

const TARGET_HOST = 'www.baidu.com';
const TARGET_ORIGIN = `https://${TARGET_HOST}`;

export default async function handler(request, response) {
  // 1. 从 Vercel 的请求中重建目标路径和查询参数
  // request.query.path 是一个数组，如 ['s', 'test']
  const path = (request.query.path || []).join('/');
  // 获取原始的查询字符串，如 "wd=Vercel&ie=UTF-8"
  const queryString = request.url.split('?')[1] || '';
  const targetUrl = `${TARGET_ORIGIN}/${path}${queryString ? '?' + queryString : ''}`;
  
  try {
    // 2. 准备转发请求
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('host', TARGET_HOST);
    requestHeaders.set('referer', TARGET_ORIGIN + '/'); // 很多网站会检查 referer
    // 删除 Vercel 添加的头
    requestHeaders.delete('x-vercel-id');
    requestHeaders.delete('x-vercel-deployment-url');
    requestHeaders.delete('x-vercel-proxied-for');
    requestHeaders.delete('x-real-ip');

    // 3. 向百度服务器发起 fetch 请求
    const targetResponse = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'manual', // 我们自己处理重定向
    });

    // 4. 处理响应头
    const responseHeaders = new Headers(targetResponse.headers);

    // 清理可能导致问题的安全相关头
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('content-security-policy-report-only');
    responseHeaders.delete('strict-transport-security');
    responseHeaders.delete('x-frame-options');

    // 特别处理 Set-Cookie 头，将 Domain 替换掉，否则浏览器不会保存
    const setCookieHeader = responseHeaders.get('set-cookie');
    if (setCookieHeader) {
        // 将 domain=.baidu.com 替换为空，使其成为当前域的 cookie
        const newCookie = setCookieHeader.replace(/domain=\.baidu\.com/gi, '');
        responseHeaders.set('set-cookie', newCookie);
    }

    // 5. 处理重定向
    if (targetResponse.status >= 300 && targetResponse.status < 400 && responseHeaders.has('location')) {
      let location = responseHeaders.get('location');
      // 如果重定向地址是百度的绝对地址，则替换为相对路径
      if (location.startsWith(TARGET_ORIGIN)) {
          location = location.substring(TARGET_ORIGIN.length);
      }
      // 将重写的 location 设置回去
      response.setHeader('Location', location);
      return response.status(targetResponse.status).end();
    }
    
    // 将所有处理过的响应头设置到 Vercel 的响应中
    responseHeaders.forEach((value, name) => {
        response.setHeader(name, value);
    });
    
    // 6. 根据内容类型决定是否重写内容
    const contentType = responseHeaders.get('content-type') || '';
    
    if (contentType.includes('text/html') || contentType.includes('application/javascript')) {
      const originalBody = await targetResponse.text();
      // 核心：重写 body 中的所有 baidu.com 链接到我们自己的相对路径
      const rewrittenBody = originalBody
        .replace(new RegExp(`https://${TARGET_HOST}`, 'g'), '')
        .replace(new RegExp(`http://${TARGET_HOST}`, 'g'), '');

      response.status(targetResponse.status).send(rewrittenBody);
    } else {
      // 对于图片、CSS、字体等其他资源，直接流式传输
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
    response.status(502).json({ error: 'Bad Gateway', details: error.message });
  }
}
