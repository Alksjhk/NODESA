// main.ts - Deno边缘代理主模块
import { Status } from "https://deno.land/std/http/mod.ts";

// 环境变量配置
const GAPI_ENDPOINT = "https://generativelanguage.googleapis.com";
const API_KEY = Deno.env.get("GAPI_SECRET") || "";

// 请求处理器
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // 创建代理目标URL
  const proxyUrl = new URL(
    url.pathname + url.search,
    GAPI_ENDPOINT
  );

  // 安全检查
  if (!API_KEY || API_KEY.length < 30) {
    return new Response(
      JSON.stringify({ error: "Invalid API key configuration" }),
      { status: Status.InternalServerError }
    );
  }

  try {
    // 构建代理请求
    const proxyRequest = new Request(proxyUrl.toString(), {
      method: request.method,
      headers: createProxyHeaders(request.headers),
      body: request.body || null
    });

    // 添加Google API密钥（使用查询参数）
    proxyUrl.searchParams.set("key", API_KEY);

    // 执行代理请求
    const response = await fetch(proxyUrl.toString(), proxyRequest);

    // 处理响应
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: createResponseHeaders(response.headers)
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(JSON.stringify({ error: "Internal proxy error" }), {
      status: Status.InternalServerError
    });
  }
}

// 创建代理请求头
function createProxyHeaders(originalHeaders: Headers): Headers {
  const headers = new Headers(originalHeaders);
  
  // 移除敏感头
  headers.delete("cookie");
  headers.delete("authorization");
  
  // 添加代理标识
  headers.set("x-proxy-agent", "deno-edge");
  
  return headers;
}

// 创建响应头
function createResponseHeaders(originalHeaders: Headers): Headers {
  const headers = new Headers(originalHeaders);
  
  // CORS配置（按需调整）
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS");
  
  // 缓存控制
  headers.set("cache-control", "no-store");
  
  return headers;
}

// 启动边缘服务
Deno.serve((req) => handleRequest(req));
