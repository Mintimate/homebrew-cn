// 核心特性、教程和折叠帮助沿用线上页面结构。
export function getFeatures() {
  return `
    <section class="feature-highlights" id="feature-highlights" aria-label="脚本核心特性">
    <ul><li><span class="feature-symbol"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path></svg></span><div><h2>多镜像可选</h2><p>中科大、阿里云、清华等镜像</p></div></li><li><span class="feature-symbol"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="3" rx="2"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></svg></span><div><h2>跨平台兼容</h2><p>macOS / Linux，自动识别架构</p></div></li><li><span class="feature-symbol"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19h8"></path><path d="m4 17 6-6-6-6"></path></svg></span><div><h2>终端 / 桌面共享</h2><p>镜像写入 brew.env，路径单独配置</p></div></li><li><span class="feature-symbol"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg></span><div><h2>配置自动备份</h2><p>修改已有配置前保留备份</p></div></li></ul>
  </section>`;
}

export function getVideoCard() {
  return `
    <a class="video-direct-link" href="https://www.bilibili.com/video/BV1AEX9BsELi/" target="_blank" rel="noopener noreferrer" aria-label="在 Bilibili 观看 Homebrew 安装教程">
    <span class="video-cover"><img class="video-sidebar-preview" src="/assets/startShell.webp" width="2382" height="1056" alt="Homebrew CN 安装脚本的镜像源选择界面" loading="lazy"><span class="video-play"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path></svg></span></span>
    <span><strong>视频安装教程 <svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg></strong><span class="video-description">macOS / Linux 安装全过程</span><span class="video-address">bilibili.com/video/BV1AEX9BsELi/</span></span>
  </a>`;
}

export function getQuickHelp() {
  return `
    <section class="quick-help-grid" id="quick-help" aria-label="安装指引与常见问题">
  <details class="quick-help-panel" data-responsive-help>
    <summary><h2 id="steps-title">安装、配置与验证</h2><svg class="icon disclosure-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></summary>
    <div class="quick-help-content">
    <ol class="steps-grid">
      <li><span class="step-number">01</span><h3>运行对应命令</h3><p>首次安装执行安装命令；已安装用户使用 --configure 配置镜像，无需重装。</p></li>
      <li><span class="step-number">02</span><h3>选择镜像并应用配置</h3><p>按提示选择镜像，配置写入 brew.env。完成后重新打开终端；BrewUI 用户退出后重新打开应用。</p></li>
      <li><span class="step-number">03</span><h3>验证当前环境</h3><div class="verify-command"><code id="verify-command">brew --version</code><button class="icon-btn" onclick="copyCommand('verify-command',this)" aria-label="复制版本检查命令" data-tooltip="复制命令"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button></div><p>需要进一步检查时运行 <code>brew doctor</code>；BrewUI 用户可在 Configuration 中核对镜像。</p></li>
    </ol>
    </div>
  </details>
  <details class="quick-help-panel" data-responsive-help>
    <summary><h2 id="faq-title">常见问题</h2><svg class="icon disclosure-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></summary>
    <div class="quick-help-content">
    <div class="faq-list">
      <details><summary>安装后提示 brew: command not found？</summary><p>先重新打开终端，或执行安装末尾输出的环境配置命令。如果仍找不到 brew，请将报错与系统信息交给 AI 排障。</p></details>
      <details><summary>已经安装了 Homebrew，能只更换镜像吗？</summary><p>可以。使用上方配置命令的 <code>--configure</code> 模式，只调整现有 Homebrew 的镜像配置。脚本会备份并迁移旧镜像设置，PATH 配置单独保留；选择 <code>4) 官方源</code> 可恢复上游。</p></details>
      <details><summary>哪些系统可以使用 Homebrew 桌面版？</summary><p>官方 BrewUI 需要 <code>macOS 26+</code>。其他受支持系统仍可使用 Homebrew 命令行；Linux 不提供 BrewUI。</p></details>
      <details><summary>终端已换源，BrewUI 为什么没有生效？</summary><p>BrewUI 不读取 <code>.zshrc</code> 等 Shell 启动文件。使用 <code>--configure</code> 将镜像迁移到 <code>$(brew --prefix)/etc/homebrew/brew.env</code>，再退出并重启 BrewUI，在 Configuration 中核对。仍有差异时，检查用户级或 XDG 配置是否覆盖。</p></details>
      <details><summary>提示安装 Xcode Command Line Tools？</summary><p>这是 macOS 的前置依赖。完成系统弹窗中的安装，再重新运行 Homebrew 安装命令。</p></details>
      <details><summary>镜像检测结果能代表本机下载速度吗？</summary><p>不能。在线检测来自服务端节点，用于检查可达性和同步情况；你的运营商、地区和网络环境都会影响实际下载速度。</p></details>
    </div>
    <button class="text-action quick-help-action" data-open-chat>更多问题，交给 AI 排障 <svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg></button>
    </div>
  </details>
  </section>`;
}

export function getStepsAndMirrors() {
  return `
    <section class="section" aria-labelledby="mirrors-title">
    <div class="section-heading"><h2 id="mirrors-title">镜像源</h2><button class="text-action" data-run-mirror><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path></svg>在线检测</button></div>
    <div class="table-wrap"><table><thead><tr><th>镜像</th><th>配置范围</th><th>参考文档</th></tr></thead><tbody>
      <tr><td class="td-name">USTC 中科大</td><td>brew Git / Bottles / API</td><td><a href="https://mirrors.ustc.edu.cn/help/brew.git.html" target="_blank" rel="noopener noreferrer">镜像说明 <svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg></a></td></tr>
      <tr><td class="td-name">Aliyun 阿里云</td><td>brew Git / Bottles / API</td><td><a href="https://mirrors.aliyun.com/homebrew/" target="_blank" rel="noopener noreferrer">镜像目录 <svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg></a></td></tr>
      <tr><td class="td-name">TUNA 清华</td><td>brew Git / Bottles / API</td><td><a href="https://mirrors.tuna.tsinghua.edu.cn/help/homebrew/" target="_blank" rel="noopener noreferrer">镜像说明 <svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg></a></td></tr>
      <tr><td class="td-name">官方源</td><td>恢复 Homebrew 上游来源</td><td><a href="https://docs.brew.sh/" target="_blank" rel="noopener noreferrer">官方文档 <svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg></a></td></tr>
      <tr id="mirror-egg"><td class="td-name">Tencent 腾讯云</td><td colspan="2">安装时输入 5 选择，使用完整克隆。</td></tr>
    </tbody></table></div>
    <p class="mirror-note">镜像在安装或 --configure 配置过程中选择，不作为速度排名。在线检测来自云端节点；Cask 应用文件仍可能从软件厂商下载。</p>
    <p class="mirror-note">现代 Homebrew 默认通过 API 获取软件信息，无需预先克隆 core/cask；USTC 的 core/cask Git 镜像已停用。</p>
    <div class="path-grid" aria-label="默认安装路径">
      <div class="path-item"><span>Apple Silicon</span><code>/opt/homebrew</code></div>
      <div class="path-item"><span>Intel Mac</span><code>/usr/local</code></div>
      <div class="path-item"><span>Linux</span><code>/home/linuxbrew/.linuxbrew</code></div>
    </div>
  </section>`;
}
