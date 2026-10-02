// 折叠参考区域中的共享配置说明与官方资源。
export function getEnvDetails() {
  return `
    <section class="section technical-details" aria-labelledby="configuration-title"><h2 id="configuration-title">配置详情与官方资源</h2>
    <div class="merged-grid"><div><dl class="env-list">
      <dt>$(brew --prefix)/etc/homebrew/brew.env</dt><dd>终端与 BrewUI 共享的镜像配置，使用 NAME=value 格式，不加 export。PATH 与 brew shellenv 仍由 Shell 配置负责。</dd>
      <dt>HOMEBREW_BREW_GIT_REMOTE</dt><dd>Homebrew 主程序 Git 仓库</dd>
      <dt>HOMEBREW_BOTTLE_DOMAIN</dt><dd>预编译软件包下载地址，不代表所有 Cask 应用下载源</dd>
      <dt>HOMEBREW_API_DOMAIN</dt><dd>软件元数据 API 地址</dd>
    </dl><p class="mirror-note">BrewUI 不读取 Shell 启动文件，也不继承 XDG_CONFIG_HOME。修改后重启应用并检查 Configuration；如有差异，核对 ~/.homebrew/brew.env 与终端的 XDG 配置。</p></div><div><h3>官方资源</h3><ul class="resources-list">
      <li><a href="https://github.com/Homebrew/BrewUI" target="_blank" rel="noopener noreferrer">BrewUI 官方桌面版（macOS 26+）</a></li>
      <li><a href="https://brew.sh/" target="_blank" rel="noopener noreferrer">Homebrew 官网</a></li>
      <li><a href="https://docs.brew.sh/" target="_blank" rel="noopener noreferrer">Homebrew 文档</a></li>
      <li><a href="https://docs.brew.sh/Homebrew-on-Linux" target="_blank" rel="noopener noreferrer">Linux 环境要求与安装指南</a></li>
    </ul></div></div>
  </section>`;
}
