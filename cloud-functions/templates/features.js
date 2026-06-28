// 核心特性 + 安装流程 + 镜像对比模板
export function getFeatures() {
  return `
        <div class="card reveal section">
            <div class="merged-grid">
                <!-- 左侧: 核心特性 -->
                <div class="merged-col">
                    <div class="card-title" style="margin-bottom: 20px;">🌟 核心特性</div>
                    <div class="features-vertical-list">
                        <div class="feature-row-item">
                            <span class="feature-icon-badge">🚀</span>
                            <div class="feature-info">
                                <span class="feature-name">多镜像源支持</span>
                                <span class="feature-desc">内置中科大 USTC、阿里云、清华 TUNA 等国内优质镜像源，支持一键切换。</span>
                            </div>
                        </div>
                        <div class="feature-row-item">
                            <span class="feature-icon-badge">💻</span>
                            <div class="feature-info">
                                <span class="feature-name">全架构兼容</span>
                                <span class="feature-desc">完美支持 macOS Intel (x86_64)、Apple Silicon (M1-M4) 以及 Linux。</span>
                            </div>
                        </div>
                        <div class="feature-row-item">
                            <span class="feature-icon-badge">⚙️</span>
                            <div class="feature-info">
                                <span class="feature-name">Shell 自动配置</span>
                                <span class="feature-desc">自动识别 Zsh/Bash，智能写入环境变量配置，无需手动编辑配置文件。</span>
                            </div>
                        </div>
                        <div class="feature-row-item">
                            <span class="feature-icon-badge">🛡️</span>
                            <div class="feature-info">
                                <span class="feature-name">安全备份机制</span>
                                <span class="feature-desc">修改任何系统配置文件前都会自动创建备份，确保系统安全，随时可回滚。</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 右侧: 安装流程 -->
                <div class="merged-col">
                    <div class="card-title" style="margin-bottom: 20px;">📝 安装流程</div>
                    <div class="timeline-container">
                        <div class="timeline-item">
                            <div class="timeline-badge">1</div>
                            <div class="timeline-content">
                                <span class="timeline-title">运行脚本</span>
                                <span class="timeline-desc">复制上方命令并在终端中执行，脚本会自动检测您的系统环境。</span>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-badge">2</div>
                            <div class="timeline-content">
                                <span class="timeline-title">选择镜像源</span>
                                <span class="timeline-desc">根据交互提示选择下载源（推荐中科大或阿里云），输入对应数字并回车。</span>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-badge">3</div>
                            <div class="timeline-content">
                                <span class="timeline-title">等待安装</span>
                                <span class="timeline-desc">脚本将自动下载并配置 Homebrew，通常在 1-3 分钟内即可完成。</span>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-badge">4</div>
                            <div class="timeline-content">
                                <span class="timeline-title">生效配置</span>
                                <span class="timeline-desc">安装完成后，根据提示执行 <code>source</code> 命令或者重启终端即可开始使用 <code>brew</code>！</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

export function getVideoCard() {
  return `
            <div class="card reveal">
                <div class="card-title">视频教程</div>
                <div style="position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <iframe src="//player.bilibili.com/player.html?isOutside=true&aid=116313569627982&bvid=BV1AEX9BsELi&cid=37079747128&p=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>
                </div>
                <div style="margin-top: 16px; text-align: center;">
                    <a href="https://www.bilibili.com/video/BV1AEX9BsELi/" target="_blank" class="link-bilibili" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: .95rem; font-weight: 600; transition: all .2s; color: #fb7299; background: rgba(251,114,153,.15); border: 1px solid rgba(251,114,153,.3);">📺 去 Bilibili 观看高清版 (点个关注，助力破1w粉丝)</a>
                </div>
            </div>`;
}

export function getStepsAndMirrors() {
  return `
        <div class="card reveal section">
            <div class="card-title">镜像源对比</div>
            <div class="table-wrap">
                <table>
                    <thead><tr><th>镜像源</th><th>特点</th><th>推荐指数</th></tr></thead>
                    <tbody>
                        <tr><td class="td-name">USTC 中科大</td><td>同步频率高，极其稳定</td><td><span class="mirror-tag tag-recommend">⭐⭐⭐⭐⭐</span></td></tr>
                        <tr><td class="td-name">Aliyun 阿里云</td><td>CDN 加速，下载极快</td><td><span class="mirror-tag tag-fast">⭐⭐⭐⭐⭐</span></td></tr>
                        <tr><td class="td-name">Tsinghua 清华</td><td>教育网首选，老牌镜像</td><td><span class="mirror-tag tag-edu">⭐⭐⭐⭐</span></td></tr>
                        <tr id="mirror-egg" style="display:none"><td class="td-name">🎉 Tencent 腾讯云</td><td>隐藏彩蛋！安装时输入 5 选择（完整克隆，速度较慢）</td><td><span class="mirror-tag tag-egg">🥚 彩蛋</span></td></tr>
                    </tbody>
                </table>
            </div>
            <div style="margin-top:24px">
                <div class="card-title sub-title">默认安装路径</div>
                <div class="path-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
                    <div class="path-item"><div><span class="arch">Apple Silicon (M1/M2/M3)</span> <span class="note">ARM64 架构</span></div><span class="path">/opt/homebrew</span></div>
                    <div class="path-item"><div><span class="arch">Intel Mac</span> <span class="note">x86_64 架构</span></div><span class="path">/usr/local</span></div>
                    <div class="path-item"><div><span class="arch">Linux</span> <span class="note">x86_64 / ARM64</span></div><span class="path">/home/linuxbrew/.linuxbrew</span></div>
                </div>
            </div>
        </div>`;
}
