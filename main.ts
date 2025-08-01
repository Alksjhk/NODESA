// server.ts
import { serve } from "https://deno.land/std/http/server.ts";

const PORT = 8000;
const TARGET_URL = "https://generativelanguage.googleapis.com";

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const targetUrl = `${TARGET_URL}${url.pathname}`;
  
  const headers = new Headers(req.headers);
  // 可选：如果需要，可以修改请求头
  headers.set("Origin", TARGET_URL);
  
  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : null,
  });

  const resHeaders = new Headers(response.headers);
  resHeaders.set("Access-Control-Allow-Origin", "*"); // 允许跨域请求

  return new Response(response.body, {
    status: response.status,
    headers: resHeaders,
  });
};

console.log(`代理服务器正在运行，监听 http://localhost:${PORT}`);
await serve(handler, { port: PORT });
