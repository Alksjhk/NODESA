// 导入Deno标准库中的serve函数
import { serve } from "https://deno.land/std/http/server.ts";

// 代理的核心逻辑
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // 从访问路径中提取目标URL
  // 例如，访问 https://my-proxy.deno.dev/https://example.com
  // targetUrlStr 将会是 "https://example.com"
  const targetUrlStr = url.pathname.substring(1) + url.search;

  // 如果路径不是一个合法的URL，返回使用说明
  if (!targetUrlStr.startsWith('http')) {
    return new Response(
      `欢迎使用 Deno Deploy 网页代理！\n\n使用方法: \n${url.origin}/<你想访问的完整网址>\n\n例如: \n${url.origin}/https://www.wikipedia.org`,
      {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }

  try {
    // 复制原始请求的头信息、方法和主体，向目标URL发起请求
    const response = await fetch(targetUrlStr, {
      headers: req.headers,
      method: req.method,
      body: req.body,
    });
    
    // 直接将目标服务器的响应返回给用户
    // 注意：这是一个基础代理，它不会重写HTML页面内的链接。
    // 对于API代理或访问简单网页非常有效。
    return response;

  } catch (e) {
    // 如果发生错误，返回错误信息
    return new Response(e.toString(), { status: 500 });
  }
}

// 启动服务，监听所有传入的请求
serve(handler);
