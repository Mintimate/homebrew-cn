import { getClientScript } from './client-script.js';
import { getEnvDetails } from './faq.js';
import { getFeatures, getStepsAndMirrors, getVideoCard } from './features.js';
import { getFooter } from './footer.js';
import { getHero } from './hero.js';
import { getStatsCard } from './stats-card.js';
import { getStyles } from './styles.js';

// 组装完整 HTML 页面
export function renderPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Homebrew CN 镜像一键安装 — 国内极速安装 Homebrew (macOS/Linux)</title>
    <meta name="description" content="专为国内用户优化的 Homebrew 一键安装脚本，支持 macOS 和 Linux，内置中科大 USTC、阿里云、清华 TUNA 镜像源，告别龟速下载。">
    <meta name="keywords" content="Homebrew,安装,镜像,国内,macOS,Linux,brew,USTC,TUNA,阿里云,linuxbrew">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    ${getStyles()}
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
</head>
<body>
    <div class="container">
        ${getHero()}

        <!-- 终端仪表盘 (核心组件) -->
        <div class="terminal-dashboard reveal" id="ai-chat-window">
            <!-- 终端头部 -->
            <div class="terminal-header">
                <div class="terminal-dots">
                    <span class="terminal-dot red"></span>
                    <span class="terminal-dot yellow"></span>
                    <span class="terminal-dot green"></span>
                </div>
                <div class="terminal-tabs">
                    <button class="terminal-tab active" data-tab="install" onclick="switchTerminalTab('install')">
                        <svg class="tab-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                        install.sh
                    </button>
                    <button class="terminal-tab" data-tab="ai-chat" onclick="switchTerminalTab('ai-chat')">
                        <svg class="tab-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        brew-ai
                    </button>
                </div>
                <div class="terminal-status">
                    <span class="status-indicator online"></span>
                    <span class="status-text">connected</span>
                </div>
            </div>
            
            <!-- 终端主体 -->
            <div class="terminal-body">
                <!-- 面板 1: 安装与卸载命令 -->
                <div class="terminal-panel active" id="panel-install">
                    <div class="os-selector-wrapper">
                        <span class="selector-label">选择你的系统:</span>
                        <div class="os-segmented-control">
                            <button class="os-segment active" data-os="macos" onclick="switchOS('macos')">🍎 macOS</button>
                            <button class="os-segment" data-os="linux" onclick="switchOS('linux')">🐧 Linux</button>
                        </div>
                    </div>
                    
                    <!-- macOS 面板 -->
                    <div class="os-panel" id="os-macos">
                        <div class="cmd-section">
                            <div class="cmd-header">
                                <span class="cmd-label">🚀 安装命令</span>
                                <button class="copy-btn-modern" onclick="copyCommand('install-command-macos', this)">
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    <span>复制</span>
                                </button>
                            </div>
                            <div class="cmd-box-modern"><span class="prompt">brew-cn $</span> <span id="install-command-macos">/bin/zsh -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)"</span></div>
                        </div>
                        
                        <div class="cmd-section">
                            <div class="cmd-header">
                                <span class="cmd-label">🗑️ 卸载命令</span>
                                <button class="copy-btn-modern" onclick="copyCommand('uninstall-command-macos', this)">
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    <span>复制</span>
                                </button>
                            </div>
                            <div class="cmd-box-modern"><span class="prompt">brew-cn $</span> <span id="uninstall-command-macos">/bin/zsh -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)" -- --uninstall</span></div>
                        </div>
                        <p class="panel-hint">⚠️ macOS 用户需先安装 Xcode Command Line Tools（脚本会自动检测并提示安装）</p>
                    </div>
                    
                    <!-- Linux 面板 -->
                    <div class="os-panel" id="os-linux" style="display:none">
                        <div class="cmd-section">
                            <div class="cmd-header">
                                <span class="cmd-label">🚀 安装命令</span>
                                <button class="copy-btn-modern" onclick="copyCommand('install-command-linux', this)">
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    <span>复制</span>
                                </button>
                            </div>
                            <div class="cmd-box-modern"><span class="prompt">brew-cn $</span> <span id="install-command-linux">/bin/bash -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)"</span></div>
                        </div>
                        
                        <div class="cmd-section">
                            <div class="cmd-header">
                                <span class="cmd-label">🗑️ 卸载命令</span>
                                <button class="copy-btn-modern" onclick="copyCommand('uninstall-command-linux', this)">
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    <span>复制</span>
                                </button>
                            </div>
                            <div class="cmd-box-modern"><span class="prompt">brew-cn $</span> <span id="uninstall-command-linux">/bin/bash -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)" -- --uninstall</span></div>
                        </div>
                        <p class="panel-hint">⚠️ Linux 用户需先安装构建依赖（build-essential / Development Tools 等，脚本会自动检测并提示安装）</p>
                    </div>
                    
                    <div class="panel-footer-links">
                        <span class="footer-hint">💡 自动适配 Intel/Apple Silicon (ARM64) · 运行后可交互选择镜像源</span>
                        <div class="footer-actions">
                            <a href="https://www.bilibili.com/video/BV1AEX9BsELi/" target="_blank" rel="noopener noreferrer" class="footer-action-link link-bili">📺 视频安装教程 (点个关注，助力破1w粉丝)</a>
                            <a href="https://ifdian.net/a/mintimate" target="_blank" rel="noopener noreferrer" class="footer-action-link link-afd">❤ 去爱发电支持</a>
                        </div>
                    </div>
                </div>
                
                <div class="terminal-panel" id="panel-ai-chat" style="display:none">
                    <div class="ai-chat-container">
                        <div class="chat-top-actions">
                            <a href="https://www.mintimate.cn/2026/06/30/workbuddyMakeAgent" target="_blank" rel="noopener noreferrer" class="chat-doc-link">🤖 Agent 实现教程</a>
                            <button class="chat-share-btn" onclick="shareConversation()" title="分享对话为图片">
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                <span>分享对话</span>
                            </button>
                        </div>
                        
                        <div class="chat-messages" id="chat-messages">
                            <div class="message system">
                                <div class="msg-content">
                                    你好！我是 <strong>homebrew-cn 智能助手</strong>。<br><br>我可以帮你快速安装 Homebrew、进行国内镜像源检测、查询软件安装，或者解决各种环境变量与安装报错问题。
                                </div>
                            </div>
                        </div>
                        
                        <div class="chat-footer">
                            <!-- 快捷操作建议 -->
                            <div class="chat-quick-flags">
                                <button class="flag-btn" onclick="sendQuickAction('运行在线镜像检测')">镜像检测 --check-mirror</button>
                                <button class="flag-btn" onclick="sendQuickAction('搜索软件 vscode')">软件搜索 --search-formula</button>
                                <button class="flag-btn" onclick="sendQuickAction('Mac 找不到 brew 命令')">找不到命令 --no-command</button>
                                <button class="flag-btn" onclick="sendQuickAction('如何恢复官方源？')">恢复官方源 --restore-official</button>
                            </div>
                            
                            <!-- 输入框 -->
                            <div class="chat-input-wrapper">
                                <span class="input-prompt">brew-ai $</span>
                                <textarea id="chat-input" placeholder="输入问题或粘贴报错..." rows="1"></textarea>
                                <button id="chat-send-btn" class="chat-send-btn" disabled>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 媒体与数据区域 -->
        <div class="media-grid">
            ${getStatsCard()}
            ${getVideoCard()}
        </div>

        ${getFeatures()}
        ${getStepsAndMirrors()}
        ${getEnvDetails()}
        ${getFooter()}
    </div>

    ${getClientScript()}
</body>
</html>`;
}
