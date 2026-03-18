// 核心特性 + 安装流程 + 镜像对比模板
export function getFeatures() {
  return `
        <div class="card reveal section">
            <div class="card-title">核心特性</div>
            <div class="features-grid">
                <div class="feature-item"><span class="feature-title">多镜像源支持</span><span class="feature-desc">内置中科大 USTC、阿里云、清华 TUNA 等国内优质镜像源，支持一键切换。</span></div>
                <div class="feature-item"><span class="feature-title">全架构兼容</span><span class="feature-desc">完美支持 macOS Intel (x86_64)、Apple Silicon (M1/M2/M3/M4) 以及 Linux (x86_64/ARM64)。</span></div>
                <div class="feature-item"><span class="feature-title">Shell 自动配置</span><span class="feature-desc">自动识别 Zsh/Bash，智能写入环境变量配置，无需手动编辑配置文件。</span></div>
                <div class="feature-item"><span class="feature-title">安全备份</span><span class="feature-desc">修改任何系统配置文件前都会自动创建备份，确保系统安全，随时可回滚。</span></div>
            </div>
        </div>`;
}

export function getStepsAndMirrors() {
  return `
        <div class="grid-1-1">
            <div class="card reveal">
                <div class="card-title">安装流程</div>
                <div class="steps">
                    <div class="step"><div class="step-title">运行脚本</div><p class="step-desc">复制命令并在终端执行，脚本会自动检测系统环境。</p></div>
                    <div class="step"><div class="step-title">选择镜像源</div><p class="step-desc">根据提示选择下载源（推荐中科大或阿里云），输入对应数字回车。</p></div>
                    <div class="step"><div class="step-title">等待安装</div><p class="step-desc">脚本自动下载并配置 Homebrew，通常只需 1-3 分钟。</p></div>
                    <div class="step"><div class="step-title">生效配置</div><p class="step-desc">安装完成后，执行 <code>source ~/.zshrc</code>（macOS）或 <code>source ~/.bashrc</code>（Linux）或重启终端即可使用。</p></div>
                </div>
            </div>
            <div class="card reveal">
                <div class="card-title">镜像源对比</div>
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>镜像源</th><th>特点</th><th>推荐指数</th></tr></thead>
                        <tbody>
                            <tr><td class="td-name">USTC 中科大</td><td>同步频率高，极其稳定</td><td><span class="mirror-tag tag-recommend">⭐⭐⭐⭐⭐</span></td></tr>
                            <tr><td class="td-name">Aliyun 阿里云</td><td>CDN 加速，下载极快</td><td><span class="mirror-tag tag-fast">⭐⭐⭐⭐⭐</span></td></tr>
                            <tr><td class="td-name">Tsinghua 清华</td><td>教育网首选，老牌镜像</td><td><span class="mirror-tag tag-edu">⭐⭐⭐⭐</span></td></tr>
                        </tbody>
                    </table>
                </div>
                <div style="margin-top:24px">
                    <div class="card-title sub-title">默认安装路径</div>
                    <div class="path-grid">
                        <div class="path-item"><div><span class="arch">Apple Silicon (M1/M2/M3)</span> <span class="note">ARM64 架构</span></div><span class="path">/opt/homebrew</span></div>
                        <div class="path-item"><div><span class="arch">Intel Mac</span> <span class="note">x86_64 架构</span></div><span class="path">/usr/local</span></div>
                        <div class="path-item"><div><span class="arch">Linux</span> <span class="note">x86_64 / ARM64</span></div><span class="path">/home/linuxbrew/.linuxbrew</span></div>
                    </div>
                </div>
            </div>
        </div>`;
}
