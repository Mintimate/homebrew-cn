// FAQ + 环境变量配置详情模板
export function getEnvDetails() {
  return `
        <div class="card reveal section">
            <div class="card-title">自动化配置详情</div>
            <p class="muted" style="margin-bottom:16px">脚本会自动配置以下环境变量，确保 <code>brew install</code> 速度飞快：</p>
            <ul class="env-list">
                <li><span class="env-key">HOMEBREW_BREW_GIT_REMOTE</span><span class="env-comment">brew 核心仓库镜像</span></li>
                <li><span class="env-key">HOMEBREW_CORE_GIT_REMOTE</span><span class="env-comment">核心软件仓库镜像</span></li>
                <li><span class="env-key">HOMEBREW_BOTTLE_DOMAIN</span><span class="env-comment">二进制预编译包镜像</span></li>
                <li><span class="env-key">HOMEBREW_API_DOMAIN</span><span class="env-comment">Homebrew API 镜像</span></li>
            </ul>
        </div>`;
}

export function getFaq() {
  return `
        <div class="card reveal section">
            <div class="card-title">常见问题解答</div>
            <div class="faq-grid">
                <div class="faq-item"><div class="faq-q">安装后提示 "command not found: brew"</div><div class="faq-a">这是因为环境变量未生效。请执行 <code>source ~/.zshrc</code> (或 <code>~/.bash_profile</code>)，或者直接关闭当前终端窗口并重新打开一个新的。</div></div>
                <div class="faq-item"><div class="faq-q">brew update 报错或卡住</div><div class="faq-a">可能是 git 仓库状态异常。尝试运行 <code>brew update-reset</code> 重置仓库，或者重新运行本安装脚本选择「重置配置」。</div></div>
                <div class="faq-item"><div class="faq-q">如何更换其他镜像源？</div><div class="faq-a">无需卸载，直接重新运行安装脚本，在菜单中选择新的镜像源即可。脚本会自动覆盖旧的配置。</div></div>
                <div class="faq-item"><div class="faq-q">需要安装 Xcode Command Line Tools 吗？</div><div class="faq-a">是的，这是 Homebrew 的必要依赖。脚本会自动检测，如果未安装会弹出系统提示，点击「安装」即可。</div></div>
            </div>
        </div>`;
}
