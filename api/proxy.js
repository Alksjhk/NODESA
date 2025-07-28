// /api/getSub.js

export default async function handler(request, response) {
  // --- 配置CORS，允许任何来源的跨域请求 ---
  // 这对于在其他网页上通过JS调用此API非常重要
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理浏览器发送的 preflight "OPTIONS" 请求
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // --- 主逻辑开始 ---
  try {
    // 1. 定义目标GitHub文件的 raw URL
    // 注意：必须使用 raw.githubusercontent.com 才能获取纯文本内容
    const githubRawUrl = 'https://raw.githubusercontent.com/toshare5/toshare5.github.io/main/README.md';

    // 2. 发起 fetch 请求获取文件内容
    const fetchResponse = await fetch(githubRawUrl);

    // 如果请求失败（例如404 Not Found），则返回错误
    if (!fetchResponse.ok) {
      throw new Error(`从GitHub获取文件失败: ${fetchResponse.statusText}`);
    }

    // 读取响应的文本内容
    const markdownContent = await fetchResponse.text();

    // 3. 使用正则表达式解析内容
    // 这个正则表达式会查找 "## 免费v2rayN订阅链接" 标题，然后匹配其下方的第一个代码块（```...```）里的内容
    const regex = /##\s*免费v2rayN订阅链接\s*```\s*([\s\S]*?)\s*```/;
    const match = markdownContent.match(regex);

    // 4. 判断是否找到匹配项并返回结果
    if (match && match[1]) {
      // match[1] 包含的是第一个捕获组的内容，也就是我们需要的订阅链接
      const subscriptionLink = match[1].trim(); // trim() 用于删除可能存在的前后空格和换行符

      // 设置响应头为纯文本
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      // 返回200成功状态码和找到的链接
      return response.status(200).send(subscriptionLink);
    } else {
      // 如果没有找到匹配的内容，返回404
      return response.status(404).send('在指定的README文件中未找到"免费v2rayN订阅链接"部分。');
    }

  } catch (error) {
    // 捕获任何在try块中发生的错误（如网络问题）
    console.error(error); // 在Vercel后台日志中打印错误，方便排查
    return response.status(500).send('服务器内部错误，无法处理您的请求。');
  }
}
