/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// 定义我们期望的环境变量，特别是我们的 Gemini API 密钥。
// 这提供了类型安全。
export interface Env {
	GEMINI_API_KEY: string;
}

// Gemini API 的上游主机地址
const GEMINI_HOST = "generativelanguage.googleapis.com";

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// 首先，处理浏览器可能会发送的 CORS 预检请求 (preflight request)。
		if (request.method === 'OPTIONS') {
			return handleOptions(request);
		}

		// 从原始请求中解析 URL，以便我们可以获取路径和查询参数。
		const url = new URL(request.url);
		
		// 构造指向 Gemini API 的目标 URL。
		// 我们保留原始请求的路径和查询参数。
		// 例如，如果请求是 `https://my-worker.dev/v1beta/models/gemini-pro:generateContent?alt=sse`
		// 目标 URL 将是 `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?alt=sse`
		const proxyUrl = `https://${GEMINI_HOST}${url.pathname}${url.search}`;

		// 复制原始请求的头部，以便我们可以对其进行修改。
		const headers = new Headers(request.headers);

		// 设置目标主机头部。
		headers.set('Host', GEMINI_HOST);

		// 关键步骤：添加 Gemini API 密钥。
		// 我们从环境变量 (Secrets) 中安全地获取密钥，并将其添加到 `x-goog-api-key` 头部。
		// 这是 Google API 所要求的身份验证方式。
		headers.set('x-goog-api-key', env.GEMINI_API_KEY);

		// （可选）如果客户端发送了 Authorization 头部，最好将其移除，以避免与我们的密钥冲突。
		headers.delete('Authorization');

		// 创建一个新的请求，发送到 Gemini API。
		// 我们使用原始请求的方法 (POST, GET, etc.) 和请求体。
		const proxyRequest = new Request(proxyUrl, {
			method: request.method,
			headers: headers,
			body: request.body,
			redirect: 'follow', // 遵循重定向
		});

		// 发送请求到 Gemini API 并等待响应。
		try {
			const response = await fetch(proxyRequest);
      
      		// 由于我们需要支持跨域访问，需要修改响应头
			const responseHeaders = new Headers(response.headers);
			responseHeaders.set('Access-Control-Allow-Origin', '*'); // 允许任何来源访问
			responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
			responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

			// 返回一个带有正确 CORS 头的新响应
			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: responseHeaders,
			});

		} catch (error) {
			console.error('Error fetching from Gemini API:', error);
			return new Response('Failed to fetch from upstream API', { status: 502 });
		}
	},
};

// 处理 CORS 预检请求的辅助函数
function handleOptions(request: Request): Response {
	const headers = new Headers();
	// 获取请求中的 Access-Control-Request-Headers，并将其设置到响应中
	const requestHeaders = request.headers.get('Access-Control-Request-Headers');
	if (requestHeaders) {
		headers.set('Access-Control-Allow-Headers', requestHeaders);
	}
	
	headers.set('Access-Control-Allow-Origin', '*'); // 允许任何来源
	headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // 允许的方法
	headers.set('Access-Control-Max-Age', '86400'); // 预检请求的缓存时间

	return new Response(null, {
		status: 204, // No Content
		headers: headers,
	});
}

