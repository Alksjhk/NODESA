// /api/get-readme.js

// 使用 Node.js 内置的 fetch API (Node.js 18+ 环境)
// Vercel 默认使用较新版本的 Node.js, 因此无需额外安装依赖

export default async function handler(request, response) {
  // 目标 GitHub raw content 的 URL
  const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/toshare5/toshare5.github.io/main/README.md';

  try {
    // 向 GitHub 发送请求
    const fetchResponse = await fetch(GITHUB_RAW_URL);

    // 检查 GitHub 的响应是否成功 (HTTP 状态码 200-299)
    if (!fetchResponse.ok) {
      // 如果 GitHub 返回错误（如 404 Not Found），则将该错误信息返回给客户端
      throw new Error(`Failed to fetch from GitHub: ${fetchResponse.status} ${fetchResponse.statusText}`);
    }

    // 获取响应的文本内容 (即 Markdown)
    const markdownContent = await fetchResponse.text();

    // 设置响应头，告诉客户端这是一个 Markdown 文件
    // 使用 UTF-8 编码以支持中文等字符
    response.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    
    // 发送 200 OK 状态码和 Markdown 内容
    response.status(200).send(markdownContent);

  } catch (error) {
    // 如果在请求过程中发生任何错误（网络问题、解析问题等）
    console.error(error); // 在 Vercel 后台日志中记录错误，方便排查
    
    // 向客户端返回一个 500 Internal Server Error 错误
    response.status(500).json({ 
      error: 'An error occurred while fetching the README file.',
      details: error.message 
    });
  }
}
