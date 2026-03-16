export async function onRequest(context) {
  const { request } = context;
  
  // 统计调用次数
  if (typeof WEBSITE_KV !== 'undefined') {
    try {
      const totalCalls = await WEBSITE_KV.get('homebrew_cn_stats:total_calls');
      const newTotal = parseInt(totalCalls || '0') + 1;
      const now = new Date().toISOString();
      
      await WEBSITE_KV.put('homebrew_cn_stats:total_calls', newTotal.toString());
      await WEBSITE_KV.put('homebrew_cn_stats:last_call_time', now);
    } catch (e) {
      console.error('KV 更新失败:', e);
    }
  }

  // 获取当前域名
  const url = new URL(request.url);
  
  // 默认使用 brew-cn.mintimate.cn，如果在本地测试则使用当前域名
  let baseUrl = 'https://brew-cn.mintimate.cn';
  if (url.host && !url.host.includes('localhost') && !url.host.includes('127.0.0.1')) {
      baseUrl = `${url.protocol}//${url.host}`;
  }
  
  const scriptUrl = `${baseUrl}/install.sh`;

  // 返回脚本内容
  const scriptResponse = await fetch(scriptUrl);
  const scriptContent = await scriptResponse.text();
  return new Response(scriptContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
