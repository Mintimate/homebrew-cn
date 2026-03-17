const RES_CODE = { SUCCESS: 0, FAIL: 1000 };

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request)
    });
  }

  if (typeof WEBSITE_KV === 'undefined') {
    return new Response(JSON.stringify({ code: RES_CODE.FAIL, message: 'WEBSITE_KV 未绑定' }), {
      headers: getCorsHeaders(request)
    });
  }

  try {
    if (request.method === 'GET') {
      const totalCalls = await WEBSITE_KV.get('homebrew_cn_stats:total_calls');
      const lastCallTime = await WEBSITE_KV.get('homebrew_cn_stats:last_call_time');
      const recentInstallsStr = await WEBSITE_KV.get('homebrew_cn_stats:recent_installs');
      
      let recentInstalls = [];
      try {
        if (recentInstallsStr) {
          recentInstalls = JSON.parse(recentInstallsStr);
        }
      } catch (_) {}

      const stats = {
        totalCalls: parseInt(totalCalls || '0'),
        lastCallTime: lastCallTime || null,
        recentInstalls
      };

      return new Response(JSON.stringify({ code: RES_CODE.SUCCESS, data: stats }), {
        headers: getCorsHeaders(request)
      });
    }
    
    return new Response(JSON.stringify({ code: RES_CODE.FAIL, message: 'Method not allowed' }), {
      status: 405,
      headers: getCorsHeaders(request)
    });
  } catch (e) {
    return new Response(JSON.stringify({ code: RES_CODE.FAIL, message: e.message }), {
      headers: getCorsHeaders(request)
    });
  }
}

function getCorsHeaders(request) {
  const origin = request.headers.get('origin') || '*';
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600'
  };
}
