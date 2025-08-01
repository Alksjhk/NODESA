// 配置常量
const TARGET_DOMAIN = "generativelanguage.googleapis.com";
const ENDPOINT_PATTERN = "/v1beta/*"; // 代理所有v1beta版本API
const CACHE_TTL = 60; // 缓存时间(秒)

// 主请求处理器
export default {
  async fetch(request, env) {
    try {
      // 处理CORS预检请求
      if (request.method === "OPTIONS") {
        return handleCORS();
      }
      
      // 验证请求路径
      const url = new URL(request.url);
      if (!url.pathname.match(new RegExp(ENDPOINT_PATTERN.replace('*', '.*')))) {
        return new Response("Invalid API endpoint", { status: 404 });
      }
      
      // 构建新请求
      const proxyUrl = `https://${TARGET_DOMAIN}${url.pathname}${url.search}`;
      const proxyRequest = new Request(proxyUrl, {
        method: request.method,
        headers: createProxyHeaders(request.headers, env.API_KEY),
        body: request.body
      });

      // 使用边缘缓存
      const cache = caches.default;
      const cacheKey = new Request(proxyUrl, request);
      let response = await cache.match(cacheKey);
      
      if (!response) {
        response = await fetch(proxyRequest);
        
        // 仅缓存成功响应
        if (response.status === 200) {
          response = new Response(response.body, response);
          response.headers.set("Cache-Control", `public, max-age=${CACHE_TTL}`);
          cache.put(cacheKey, response.clone());
        }
      }
      
      // 添加CORS头返回响应
      return addCORSHeaders(response);
    } catch (err) {
      return new Response(`Proxy error: ${err.message}`, { status: 500 });
    }
  }
};

// 构造代理请求头
function createProxyHeaders(originalHeaders, apiKey) {
  const headers = new Headers(originalHeaders);
  
  // 设置认证头（通过Workers Secrets注入）
  headers.set("Authorization", `Bearer ${apiKey}`);
  
  // 移除客户端敏感头
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ipcountry");
  
  // 添加内容类型
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  
  return headers;
}

// CORS响应处理
function handleCORS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

// 添加CORS头到响应
function addCORSHeaders(response) {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set("Access-Control-Allow-Origin", "*");
  newResponse.headers.set("Access-Control-Expose-Headers", "*");
  return newResponse;
}
