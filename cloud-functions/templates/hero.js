// Hero 区域模板
export function getHero() {
  return `
        <!-- Hero -->
        <div class="hero">
            <div class="hero-top">
                <div class="hero-badge">
                    <span class="dot"></span>
                    <span>开源 · 免费 · 极速</span>
                </div>
                <button id="theme-toggle" class="theme-toggle" type="button" aria-label="切换主题（亮色/跟随系统/暗色）">
                    <span class="theme-track" aria-hidden="true">
                        <span class="theme-icon sun">☀️</span>
                        <span class="theme-icon system">🖥️</span>
                        <span class="theme-icon moon">🌙</span>
                        <span class="theme-thumb"></span>
                    </span>
                </button>
            </div>
            <h1>Homebrew CN 镜像安装</h1>
            <p class="hero-desc">专为国内用户打造的 Homebrew 一键安装脚本，支持 macOS 和 Linux，智能选择最佳镜像源，解决下载慢、安装失败等问题。</p>
        </div>`;
}
