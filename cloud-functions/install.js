import { getStore } from '@edgeone/pages-blob';
import { INSTALL_SCRIPT } from './data/install-script.js';

const STATS_STORE_NAME = 'homebrew-cn-stats';
const STATS_KEY = 'install-stats.json';
const RECENT_INSTALLS_KEY = 'recent_installs.json';
const MAX_RECENT_INSTALLS = 100;

export async function onRequest(context) {
  const { request } = context;

  // 统计调用次数 & 记录安装者来源
  try {
    const store = getStore({ name: STATS_STORE_NAME, consistency: 'strong' });
    const stats = await getInstallStats(store);
    const recentInstalls = await getRecentInstalls(store);
    const now = new Date().toISOString();

    stats.totalCalls += 1;
    stats.lastCallTime = now;

    const geo = context.geo || request.eo?.geo || {};
    const clientIp = context.clientIp || request.eo?.clientIp || 'unknown';
    const country = geo.countryName || geo.country || '';
    const region = geo.regionName || geo.region || '';
    const city = geo.cityName || geo.city || '';

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

    const nextRecentInstalls = [installRecord, ...recentInstalls].slice(0, MAX_RECENT_INSTALLS);

    await Promise.all([
      store.setJSON(STATS_KEY, stats),
      store.setJSON(RECENT_INSTALLS_KEY, nextRecentInstalls),
    ]);
  } catch (e) {
    console.error('Blob 更新失败:', e);
  }

  // 直接返回预加载的脚本内容（通过 JS 模块导入，确保打包后可用）
  return new Response(INSTALL_SCRIPT, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

async function getInstallStats(store) {
  const stats = await store.get(STATS_KEY, {
    type: 'json',
    consistency: 'strong',
  });

  return {
    totalCalls: Number.parseInt(stats?.totalCalls || '0', 10) || 0,
    lastCallTime: stats?.lastCallTime || null,
  };
}

async function getRecentInstalls(store) {
  const [recentInstalls, legacyStats] = await Promise.all([
    store.get(RECENT_INSTALLS_KEY, {
      type: 'json',
      consistency: 'strong',
    }),
    store.get(STATS_KEY, {
      type: 'json',
      consistency: 'strong',
    }),
  ]);

  if (Array.isArray(recentInstalls)) {
    return recentInstalls;
  }

  if (Array.isArray(legacyStats?.recentInstalls)) {
    return legacyStats.recentInstalls;
  }

  return [];
}
