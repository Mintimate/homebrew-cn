export async function onRequest(context) {
  const { request } = context;
  
  // 统计调用次数 & 记录安装者来源
  if (typeof WEBSITE_KV !== 'undefined') {
    try {
      const totalCalls = await WEBSITE_KV.get('homebrew_cn_stats:total_calls');
      const newTotal = parseInt(totalCalls || '0') + 1;
      const now = new Date().toISOString();
      
      await WEBSITE_KV.put('homebrew_cn_stats:total_calls', newTotal.toString());
      await WEBSITE_KV.put('homebrew_cn_stats:last_call_time', now);

      const eo = request.eo || {};
      const geo = eo.geo || {};
      
      const clientIp = eo.clientIp || 'unknown';
      const country = geo.countryName || '';
      const region = geo.regionName || '';
      const city = geo.cityName || '';

      // 脱敏 IP：只保留前两段
      const maskedIp = clientIp !== 'unknown'
        ? clientIp.split('.').slice(0, 2).join('.') + '.*.*'
        : 'unknown';

      const installRecord = {
        ip: maskedIp,
        country,
        region,
        city,
        time: now,
      };

      // 读取已有的最近安装记录，保留最近 5 条
      let recentInstalls = [];
      try {
        const existing = await WEBSITE_KV.get('homebrew_cn_stats:recent_installs');
        if (existing) {
          recentInstalls = JSON.parse(existing);
        }
      } catch (_) {}

      recentInstalls.unshift(installRecord);
      if (recentInstalls.length > 5) {
        recentInstalls = recentInstalls.slice(0, 5);
      }

      await WEBSITE_KV.put('homebrew_cn_stats:recent_installs', JSON.stringify(recentInstalls));
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
