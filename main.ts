// main.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// 目标 API 的主机名
const TARGET_API_HOST = "generativelanguage.googleapis.com";

// 从环境变量中安全地获取 API Key
// 在 Deno Deploy 平台设置这个环境变量
const API_KEY = Deno.env.get("GOOGLE_API_KEY");

if (!API_KEY) {
  // 如果没有设置 API Key，服务将无法启动，并给出明确的错误提示
  console.error("错误：环境变量 GOOGLE_API_KEY 未设置。");
  console.error("请在 Deno Deploy 项目的设置中添加此环境变量。");
  Deno.exit(1); // 退出进程
}

// Deno.serve 会启动一个 HTTP 服务器来处理请求
serve(async (request) => {
  // 1. 解析原始请求的 URL
  const url = new URL(request.url);

  // 2. 构建目标 URL
  // 我们将原始请求的路径和查询参数拼接到目标主机上
  // 例如，如果请求是 https://my-proxy.deno.dev/v1beta/models/gemini-pro:generateContent
  // 目标 URL 会变成 https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
  const targetUrl = new URL(url.pathname + url.search, `https://${TARGET_API_HOST}`);

  // 3. 复制请求头，并进行修改
  const headers = new Headers(request.headers);
  headers.set("Host", TARGET_API_HOST); // 设置正确的主机头
  
  // 关键步骤：移除原始请求中可能存在的 key 参数，并使用我们服务器端安全的 key
  targetUrl.searchParams.delete('key');
  headers.set("x-goog-api-key", API_KEY);

  console.log(`正在代理请求至: ${targetUrl}`);

  try {
    // 4. 使用 fetch API 将请求转发到目标服务器
    // request.body 是一个可读流，我们直接将其传递，这样可以高效处理大文件或流式响应
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: "follow" // 允许跟随重定向
    });

    // 5. 将目标服务器的响应直接返回给客户端
    // 这也支持流式响应（streaming responses），对于 Gemini API 的流式生成非常重要
    return response;

  } catch (error) {
    // 如果转发过程中出现网络错误等问题，返回一个 502 Bad Gateway 错误
    console.error("代理请求时出错:", error);
    return new Response("代理请求失败: " + error.message, { status: 502 });
  }
});

console.log(`代理服务器已启动，正在监听 http://localhost:8000`);
console.log(`将代理所有请求至 ${TARGET_API_HOST}`);
