// 返回 project-overview 内的统计模块；数值由客户端请求更新。
export function getStatsCard() {
  return `
    <div class="project-stats"><h2>项目数据</h2><div class="stats-grid">
    <div><span class="stat-label">脚本获取</span><span class="stat-value" id="total-calls">—</span><span class="stat-label">次</span></div>
    <div><span class="stat-label">最近获取</span><span class="stat-value" id="last-call">—</span></div>
  </div><details class="recent-installs"><summary>最近获取地区</summary>
    <p class="recent-placeholder" style="font-size:12px;margin:6px 0 10px">按脚本请求计数，包含重复获取、配置及卸载请求，不代表成功安装人数。</p>
    <div id="recent-installs"><p class="recent-placeholder">加载中…</p></div><div id="recent-toggle-container"></div>
  </details></div>`;
}
