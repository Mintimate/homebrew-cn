import { getClientScript } from './client-script.js';
import { getEnvDetails, getFaq } from './faq.js';
import { getFeatures, getStepsAndMirrors } from './features.js';
import { getFooter } from './footer.js';
import { getHero } from './hero.js';
import { getInstallCard } from './install-card.js';
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
</head>
<body>
    <div class="container">
        ${getHero()}

        <div class="grid-2-1">
            ${getInstallCard()}
            ${getStatsCard()}
        </div>

        ${getFeatures()}
        ${getStepsAndMirrors()}
        ${getEnvDetails()}
        ${getFaq()}
        ${getFooter()}
    </div>

    <!-- AI Chat Widget -->
    <div id="ai-chat-widget" class="ai-chat-widget">
        <!-- Floating Toggle Button -->
        <button id="ai-chat-toggle" class="ai-chat-toggle" aria-label="打开 AI 助手" title="打开 AI 助手">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                <!-- Beer Mug Body Outline -->
                <path d="M6.5 9.5 v8.5 a2 2 0 0 0 2 2 h3 a2 2 0 0 0 2 -2 v-8.5" />
                <!-- Handle -->
                <path d="M13.5 11.5 h2 a1.5 1.5 0 0 1 1.5 1.5 v3 a1.5 1.5 0 0 1 -1.5 1.5 h-2" />
                <!-- Foam -->
                <path d="M6 9.5 a2 2 0 0 1 2.5 -2.2 a2.5 2.5 0 0 1 4 -0.3 a1.8 1.8 0 0 1 1 2.5 Z" fill="currentColor" fill-opacity="0.25" stroke="none" />
                <path d="M6 9.5 a2 2 0 0 1 2.5 -2.2 a2.5 2.5 0 0 1 4 -0.3 a1.8 1.8 0 0 1 1 2.5" />
                <!-- Vertical stripes inside -->
                <path d="M9 12.5 v4.5 M11 12.5 v4.5" stroke-width="1.5" opacity="0.5" />
                <!-- AI Sparkle Large (Top Right, filled) -->
                <path d="M18 3 Q18 7 22 7 Q18 7 18 11 Q18 7 14 7 Q18 7 18 3 Z" fill="currentColor" stroke="none" />
                <!-- AI Sparkle Small (Top Left, filled) -->
                <path d="M6 1.5 Q6 4 8.5 4 Q6 4 6 6.5 Q6 4 3.5 4 Q6 4 6 1.5 Z" fill="currentColor" stroke="none" />
            </svg>
        </button>

        <!-- Chat Window -->
        <div id="ai-chat-window" class="ai-chat-window" style="display: none;">
            <div class="chat-header">
                <div class="header-info">
                    <span class="header-title">homebrew-cn 助手</span>
                    <span class="header-status"><span class="status-dot"></span>在线服务</span>
                </div>
                <button id="ai-chat-close" class="chat-close-btn" aria-label="关闭">&times;</button>
            </div>

            <div id="chat-messages" class="chat-messages">
                <div class="message system">
                    <div class="msg-content">
                        你好！我是 <strong>homebrew-cn 智能助手</strong>。<br><br>我可以帮你快速安装 Homebrew、进行国内镜像源深度检测、查询软件是否能用 Homebrew 安装，或者解决各种安装/环境变量问题。
                    </div>
                </div>
            </div>

            <!-- Persistent Quick Actions Bar -->
            <div class="chat-quick-actions-bar">
                <div class="quick-actions">
                    <button class="action-btn" onclick="sendQuickAction('运行在线镜像检测')">运行在线镜像检测</button>
                    <button class="action-btn" onclick="sendQuickAction('Mac 找不到 brew 命令')">Mac 找不到 brew 命令</button>
                    <button class="action-btn" onclick="sendQuickAction('VS Code 能不能用 brew 装？')">查询软件能否安装</button>
                    <button class="action-btn" onclick="sendQuickAction('如何恢复官方源？')">如何恢复官方源？</button>
                </div>
            </div>

            <div class="chat-input-area">
                <div id="chat-attachments" class="chat-attachments" aria-live="polite"></div>
                <textarea id="chat-input" placeholder="粘贴终端输出，或问：VS Code 能不能用 brew 装..." rows="1"></textarea>
                <button id="chat-send-btn" class="chat-send-btn" disabled>发送</button>
            </div>
        </div>
    </div>

    ${getClientScript()}
</body>
</html>`;
}
