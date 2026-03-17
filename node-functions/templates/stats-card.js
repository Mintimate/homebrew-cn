// 实时数据卡片模板
export function getStatsCard() {
  return `
            <div class="card reveal">
                <div class="card-title">实时数据</div>
                <div class="stats-grid">
                    <div class="stat-card"><span class="stat-value" id="total-calls">-</span><span class="stat-label">累计安装次数</span></div>
                    <div class="stat-card"><span class="stat-value" id="last-call" style="font-size:1.5rem">-</span><span class="stat-label">最近一次安装</span></div>
                </div>
                <div class="recent-installs" style="margin-top:20px">
                    <div class="card-title" style="font-size:1.1rem;margin-bottom:12px">🌍 最近安装的网友来自</div>
                    <div class="recent-list" id="recent-installs">
                        <div class="recent-placeholder" style="text-align:center;color:var(--text-muted);font-size:.9rem;padding:16px 0">加载中...</div>
                    </div>
                </div>
            </div>`;
}
