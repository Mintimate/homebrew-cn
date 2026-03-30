// 安装命令卡片模板
export function getInstallCard() {
  return `
            <div class="card reveal">
                <div class="card-title">立即开始</div>
                <p class="muted" style="margin-bottom:8px">复制以下命令到终端运行：</p>

                <div class="os-tabs" style="margin-bottom:12px">
                    <button class="os-tab active" data-os="macos" onclick="switchOS('macos')">🍎 macOS</button>
                    <button class="os-tab" data-os="linux" onclick="switchOS('linux')">🐧 Linux</button>
                </div>

                <div class="os-panel" id="os-macos">
                    <p class="muted-sm">安装命令</p>
                    <div class="command-wrapper">
                        <div class="command-box"><span class="prompt">$</span><span id="install-command-macos">/bin/zsh -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)"</span></div>
                        <button class="copy-btn" onclick="copyCommand('install-command-macos',this)">复制安装命令</button>
                    </div>
                    <p class="muted-sm" style="margin-top:8px">卸载命令</p>
                    <div class="command-wrapper">
                        <div class="command-box"><span class="prompt">$</span><span id="uninstall-command-macos">/bin/zsh -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)" -- --uninstall</span></div>
                        <button class="copy-btn" onclick="copyCommand('uninstall-command-macos',this)">复制卸载命令</button>
                    </div>
                    <p class="command-hint" style="margin-top:8px">⚠️ macOS 用户需先安装 Xcode Command Line Tools（脚本会自动检测并提示安装）</p>
                </div>

                <div class="os-panel" id="os-linux" style="display:none">
                    <p class="muted-sm">安装命令</p>
                    <div class="command-wrapper">
                        <div class="command-box"><span class="prompt">$</span><span id="install-command-linux">/bin/bash -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)"</span></div>
                        <button class="copy-btn" onclick="copyCommand('install-command-linux',this)">复制安装命令</button>
                    </div>
                    <p class="muted-sm" style="margin-top:8px">卸载命令</p>
                    <div class="command-wrapper">
                        <div class="command-box"><span class="prompt">$</span><span id="uninstall-command-linux">/bin/bash -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)" -- --uninstall</span></div>
                        <button class="copy-btn" onclick="copyCommand('uninstall-command-linux',this)">复制卸载命令</button>
                    </div>
                    <p class="command-hint" style="margin-top:8px">⚠️ Linux 用户需先安装构建依赖（build-essential / Development Tools 等，脚本会自动检测并提示安装）</p>
                </div>

                <p class="command-hint">自动适配 macOS (Intel/Apple Silicon) · Linux (x86_64/ARM64) · 脚本运行后可交互选择镜像源</p>
                <div class="support-links">
                    <a href="https://www.bilibili.com/video/BV1AEX9BsELi/" target="_blank" class="link-bilibili">📺 观看视频安装教程</a>
                    <a href="https://ifdian.net/a/mintimate" target="_blank" class="link-afdian">❤ 去爱发电支持一下</a>
                    <a href="https://space.bilibili.com/355567627" target="_blank" class="link-bilibili" style="background: rgba(52,152,219,.15); color: #3498db; border-color: rgba(52,152,219,.3);">🚀 助力突破 1w 粉丝！</a>
                </div>
            </div>`;
}
