// 顶栏与介绍沿用线上页面的紧凑布局。
export function getHero() {
  return `
    <header class="site-header">
      <a class="wordmark" href="/" aria-label="Homebrew CN 首页"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19h8"></path><path d="m4 17 6-6-6-6"></path></svg><span>Homebrew <strong>CN</strong></span></a>
      <div class="header-actions">
        <a class="header-source" href="https://github.com/Mintimate/homebrew-cn" target="_blank" rel="noopener noreferrer"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path></svg><span>源码</span></a>
        <button id="support-open" class="header-support" type="button" aria-label="赞赏支持" aria-haspopup="dialog" aria-controls="support-dialog" aria-expanded="false"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9M16 10h2a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-2M9 12v5m4-5v5"/><path d="M5 9a3 3 0 0 1 0-6 3 3 0 0 1 5-1 3 3 0 0 1 5 2 2.5 2.5 0 1 1 2 5H5Z"/></svg><span>赞赏<span class="support-long-label">支持</span></span></button>
        <div class="theme-picker" role="group" aria-label="主题">
          <button class="icon-btn theme-option" type="button" data-theme-mode="light" aria-label="亮色" aria-pressed="false" data-tooltip="亮色"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg></button><button class="icon-btn theme-option" type="button" data-theme-mode="system" aria-label="跟随系统" aria-pressed="true" data-tooltip="跟随系统"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="3" rx="2"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></svg></button><button class="icon-btn theme-option" type="button" data-theme-mode="dark" aria-label="暗色" aria-pressed="false" data-tooltip="暗色"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path></svg></button>
        </div>
      </div>
    </header>
    <div class="hero">
      <div class="hero-copy">
        <h1>Homebrew 国内镜像安装</h1>
        <p>macOS 与 Linux，一条命令完成安装与镜像配置。</p>
      </div>
      <span class="hero-note"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>开源 · 免费</span>
    </div>`;
}
