// FAQ + 环境变量配置详情模板
// FAQ + 环境变量配置详情模板
export function getEnvDetails() {
  return `
        <div class="card reveal section">
            <div class="merged-grid">
                <!-- 左侧: 自动化配置 -->
                <div class="merged-col">
                    <div class="card-title" style="margin-bottom: 8px;">⚙️ 自动化配置详情</div>
                    <p class="muted" style="margin-bottom: 20px; font-size: 0.85rem;">安装脚本会自动写入以下环境变量，实现国内网络极速下载：</p>
                    <div class="env-vertical-list">
                        <div class="env-row-item">
                            <span class="env-row-badge">HOMEBREW_BREW_GIT_REMOTE</span>
                            <span class="env-row-desc">Homebrew 核心 Git 仓库 (用于更新 brew 主程序及内置命令)</span>
                        </div>
                        <div class="env-row-item">
                            <span class="env-row-badge">HOMEBREW_CORE_GIT_REMOTE</span>
                            <span class="env-row-desc">Homebrew Core 软件源仓库 (用于存储核心命令行工具安装公式)</span>
                        </div>
                        <div class="env-row-item">
                            <span class="env-row-badge">HOMEBREW_BOTTLE_DOMAIN</span>
                            <span class="env-row-desc">Homebrew Bottles 二进制预编译包源 (免去本地源码编译的漫长等待)</span>
                        </div>
                        <div class="env-row-item">
                            <span class="env-row-badge">HOMEBREW_API_DOMAIN</span>
                            <span class="env-row-desc">Homebrew API 极速源 (用于免下载极速查询最新的软件元数据)</span>
                        </div>
                    </div>
                </div>
                
                <!-- 右侧: 官方资源 -->
                <div class="merged-col">
                    <div class="card-title" style="margin-bottom: 8px;">📚 官方资源</div>
                    <p class="muted" style="margin-bottom: 20px; font-size: 0.85rem;">Homebrew 官方及国内各大高校提供的镜像源使用与配置指南：</p>
                    <div class="resources-vertical-list">
                        <a href="https://brew.sh/" target="_blank" class="resource-row-link">
                            <span class="res-icon">🌐</span>
                            <div class="res-info">
                                <span class="res-name">Homebrew 官网</span>
                                <span class="res-desc">官方主页与安装说明</span>
                            </div>
                            <span class="res-arrow">↗</span>
                        </a>
                        <a href="https://docs.brew.sh/" target="_blank" class="resource-row-link">
                            <span class="res-icon">📖</span>
                            <div class="res-info">
                                <span class="res-name">官方中文文档</span>
                                <span class="res-desc">使用、配置与开发完整指南</span>
                            </div>
                            <span class="res-arrow">↗</span>
                        </a>
                        <a href="https://docs.brew.sh/Homebrew-on-Linux" target="_blank" class="resource-row-link">
                            <span class="res-icon">🐧</span>
                            <div class="res-info">
                                <span class="res-name">Linux 安装指南</span>
                                <span class="res-desc">Linux 环境要求与配置说明</span>
                            </div>
                            <span class="res-arrow">↗</span>
                        </a>
                        <a href="https://mirrors.ustc.edu.cn/help/brew.git.html" target="_blank" class="resource-row-link">
                            <span class="res-icon">⚡</span>
                            <div class="res-info">
                                <span class="res-name">USTC 镜像帮助</span>
                                <span class="res-desc">中国科学技术大学镜像配置指引</span>
                            </div>
                            <span class="res-arrow">↗</span>
                        </a>
                        <a href="https://mirrors.tuna.tsinghua.edu.cn/help/homebrew/" target="_blank" class="resource-row-link">
                            <span class="res-icon">🐟</span>
                            <div class="res-info">
                                <span class="res-name">清华 TUNA 帮助</span>
                                <span class="res-desc">清华大学开源镜像源使用文档</span>
                            </div>
                            <span class="res-arrow">↗</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>`;
}



