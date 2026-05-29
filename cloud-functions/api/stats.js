import { getStore } from '@edgeone/pages-blob';

const RES_CODE = { SUCCESS: 0, FAIL: 1000 };
const STATS_STORE_NAME = 'homebrew-cn-stats';
const STATS_KEY = 'install-stats.json';
const RECENT_INSTALLS_KEY = 'recent_installs.json';

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request),
    });
  }

  try {
    if (request.method === 'GET') {
      const store = getStore({ name: STATS_STORE_NAME, consistency: 'strong' });
      const stats = await getInstallStats(store);

      return new Response(JSON.stringify({ code: RES_CODE.SUCCESS, data: stats }), {
        headers: getCorsHeaders(request),
      });
    }

    return new Response(JSON.stringify({ code: RES_CODE.FAIL, message: 'Method not allowed' }), {
      status: 405,
      headers: getCorsHeaders(request),
    });
  } catch (e) {
    return new Response(JSON.stringify({ code: RES_CODE.FAIL, message: e.message }), {
      headers: getCorsHeaders(request),
    });
  }
}

async function getInstallStats(store) {
  const [stats, recentInstalls] = await Promise.all([
    store.get(STATS_KEY, {
      type: 'json',
      consistency: 'strong',
    }),
    store.get(RECENT_INSTALLS_KEY, {
      type: 'json',
      consistency: 'strong',
    }),
  ]);

  return {
    totalCalls: Number.parseInt(stats?.totalCalls || '0', 10) || 0,
    lastCallTime: stats?.lastCallTime || null,
    recentInstalls: Array.isArray(recentInstalls)
      ? recentInstalls
      : Array.isArray(stats?.recentInstalls) ? stats.recentInstalls : [],
  };
}

function getCorsHeaders(request) {
  const origin = request.headers.get('origin') || '*';
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
  };
}
