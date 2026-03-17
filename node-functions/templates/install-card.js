// 安装命令卡片模板
export function getInstallCard() {
  return `
            <div class="card reveal">
                <div class="card-title">立即开始</div>
                <p class="muted" style="margin-bottom:8px">复制以下命令到终端（Terminal）运行：</p>
                <p class="muted-sm">安装命令</p>
                <div class="command-wrapper">
                    <div class="command-box"><span class="prompt">$</span><span id="install-command">/bin/zsh -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)"</span></div>
                    <button class="copy-btn" onclick="copyCommand('install-command',this)">复制安装命令</button>
                </div>
                <p class="muted-sm" style="margin-top:8px">卸载命令</p>
                <div class="command-wrapper">
                    <div class="command-box"><span class="prompt">$</span><span id="uninstall-command">/bin/zsh -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)" -- --uninstall</span></div>
                    <button class="copy-btn" onclick="copyCommand('uninstall-command',this)">复制卸载命令</button>
                </div>
                <p class="command-hint">自动适配 macOS (Intel/Apple Silicon) · 脚本运行后可交互选择镜像源</p>
                <div class="support-links">
                    <a href="https://ifdian.net/a/mintimate" target="_blank" class="link-afdian">❤ 觉得好用？去爱发电支持一下</a>
                    <a href="https://space.bilibili.com/355567627" target="_blank" class="link-bilibili">📺 助力 Mintimate 突破 1w 粉丝！</a>
                </div>
            </div>`;
}
