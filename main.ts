// main.ts

// Google API 的基础 URL
const GOOGLE_API_HOST = 'https://generativelanguage.googleapis.com';

// 从环境变量中获取 API 密钥
// 在 Deno Deploy 中，这将在项目设置中配置
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// 定义处理 CORS 预检请求的函数
function handleCorsPreflight(): Response {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*', // 生产环境建议替换为你的网站域名
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-key',
  });
  return new Response(null, { status: 204, headers });
}

// 启动 Deno HTTP 服务器
Deno.serve(async (request: Request) => {
  // 检查 API 密钥是否已设置
  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY is not set in environment variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 处理 CORS 预检请求 (OPTIONS)
  if (request.method === 'OPTIONS') {
    return handleCorsPreflight();
  }

  const url = new URL(request.url);
  
  // 构建目标 API URL
  const apiUrl = `${GOOGLE_API_HOST}${url.pathname}${url.search}`;

  // 创建一个新的请求头对象，复制原始请求的所有请求头
  const headers = new Headers(request.headers);
  headers.set('Host', new URL(GOOGLE_API_HOST).host);
  // **核心步骤**: 添加我们安全的 API Key
  headers.set('x-goog-api-key', GEMINI_API_KEY);

  try {
    // 使用 fetch 将请求转发到 Google API
    const response = await fetch(apiUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      duplex: 'half', // 关键！用于处理流式响应
    });

    // 创建一个新的响应，并将 Google API 的响应流式传回给客户端
    const responseHeaders = new Headers(response.headers);
    // 添加必要的 CORS 头，以便浏览器接收
    responseHeaders.set('Access-Control-Allow-Origin', '*'); // 或设置为你的特定域名
    responseHeaders.set('Access-Control-Expose-Headers', '*'); // 允许前端访问所有响应头

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
