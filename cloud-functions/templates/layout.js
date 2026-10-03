import { getAdvertisement } from './advertisement.js';
import { getClientScript } from './client-script.js';
import { getEnvDetails } from './faq.js';
import { getFeatures, getQuickHelp, getStepsAndMirrors, getVideoCard } from './features.js';
import { getFooter } from './footer.js';
import { getHero } from './hero.js';
import { getOnboardingPanel } from './onboarding.js';
import { getStatsCard } from './stats-card.js';
import { getStyles } from './styles.js';
import { getTroubleshootingGuide } from './troubleshooting.js';
import { getSupportDialog } from './support.js';

// 沿用生产站工作区结构，将 V7 引导融合到安装面板。
export function renderPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Homebrew CN 镜像一键安装 — 国内极速安装 Homebrew (macOS/Linux)</title>
    <meta name="description" content="专为国内用户优化的 Homebrew 一键安装脚本，支持 macOS 和 Linux，内置中科大 USTC、阿里云、清华 TUNA 镜像源，告别龟速下载。">
    <meta name="keywords" content="Homebrew,安装,镜像,国内,macOS,Linux,brew,USTC,TUNA,阿里云,linuxbrew">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
    <link rel="canonical" href="https://brew-cn.mintimate.cn/">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="zh_CN">
    <meta property="og:site_name" content="Homebrew CN">
    <meta property="og:title" content="Homebrew CN 镜像一键安装 — 国内极速安装 Homebrew">
    <meta property="og:description" content="面向国内网络环境的 Homebrew 一键安装脚本，支持 macOS、Linux 与 USTC、阿里云、清华 TUNA 镜像源。">
    <meta property="og:url" content="https://brew-cn.mintimate.cn/">
    <meta property="og:image" content="https://brew-cn.mintimate.cn/assets/startShell.webp">
    <meta property="og:image:width" content="2382">
    <meta property="og:image:height" content="1056">
    <meta property="og:image:alt" content="Homebrew CN 安装脚本终端界面">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="Homebrew CN 镜像一键安装">
    <meta name="twitter:description" content="面向国内网络环境的 Homebrew 一键安装脚本，支持 macOS、Linux 与多个镜像源。">
    <meta name="twitter:image" content="https://brew-cn.mintimate.cn/assets/startShell.webp">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"https://brew-cn.mintimate.cn/#website","url":"https://brew-cn.mintimate.cn/","name":"Homebrew CN","inLanguage":"zh-CN"},{"@type":"WebPage","@id":"https://brew-cn.mintimate.cn/#webpage","url":"https://brew-cn.mintimate.cn/","name":"Homebrew CN 镜像一键安装","description":"面向国内网络环境的 Homebrew 一键安装脚本，支持 macOS、Linux 与多个镜像源。","inLanguage":"zh-CN","isPartOf":{"@id":"https://brew-cn.mintimate.cn/#website"},"mainEntity":{"@type":"SoftwareApplication","name":"Homebrew CN 安装脚本","applicationCategory":"DeveloperApplication","operatingSystem":"macOS, Linux","downloadUrl":"https://brew-cn.mintimate.cn/install","license":"https://opensource.org/license/mit","isAccessibleForFree":true}}]}</script>
    <script>try{var t=localStorage.getItem('brew-cn-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){}</script>
${getStyles()}
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8322854923336162" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js" defer></script>
</head>
<body>
    <a class="skip-link" href="#main">跳到主要内容</a>
    <div class="container">
        ${getHero()}
        <main id="main">
            <section class="terminal-dashboard" id="ai-chat-window" aria-label="安装与 AI 排障">
    <div class="terminal-header">
      <div class="terminal-identity" aria-hidden="true"><span class="terminal-dot red"></span><span class="terminal-dot yellow"></span><span class="terminal-dot green"></span></div>
      <div class="terminal-tabs" role="tablist" aria-label="工作区">
        <button id="tab-install" class="terminal-tab active" role="tab" aria-selected="true" aria-controls="panel-install" data-tab="install" onclick="switchTerminalTab('install')"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19h8"></path><path d="m4 17 6-6-6-6"></path></svg>安装</button>
        <button id="tab-ai-chat" class="terminal-tab" role="tab" aria-selected="false" aria-controls="panel-ai-chat" tabindex="-1" data-tab="ai-chat" onclick="switchTerminalTab('ai-chat')"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"></path></svg>AI 排障</button>
      </div>
      <button id="workspace-expand" class="icon-btn" type="button" aria-label="展开工作区" aria-pressed="false" data-tooltip="展开工作区"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"></path><path d="m21 3-7 7"></path><path d="m3 21 7-7"></path><path d="M9 21H3v-6"></path></svg></button>
    </div>
    <div class="terminal-body">
      ${getOnboardingPanel()}
      <div class="terminal-panel" id="panel-ai-chat" role="tabpanel" aria-labelledby="tab-ai-chat" hidden>
        <div class="ai-chat-container">
          <div class="chat-top-actions"><div id="agent-tool-panel" role="status" aria-live="polite">Homebrew 助手</div>
            <button type="button" class="text-action" id="help-guide-resume" hidden>继续填写信息</button>
            <button type="button" class="text-action" id="chat-new-conversation" title="开始新对话，保留未发送的内容">新对话</button>
            <button class="icon-btn chat-share-btn" onclick="shareConversation()" aria-label="导出对话图片" data-tooltip="导出对话图片"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path></svg></button>
          </div>
          <div class="chat-messages" id="chat-messages" role="region" aria-label="对话记录" tabindex="0">
            ${getTroubleshootingGuide()}
            <div class="chat-empty" id="chat-empty"><span class="chat-empty-emblem"><svg class="icon assistant-mark empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M6.5 9.5 v8.5 a2 2 0 0 0 2 2 h3 a2 2 0 0 0 2 -2 v-8.5"/>
    <path d="M13.5 11.5 h2 a1.5 1.5 0 0 1 1.5 1.5 v3 a1.5 1.5 0 0 1 -1.5 1.5 h-2"/>
    <path d="M18 3 Q18 7 22 7 Q18 7 18 11 Q18 7 14 7 Q18 7 18 3 Z" fill="currentColor" stroke="none" opacity="0.8"/>
  </svg></span><h2>Homebrew 遇到什么问题？</h2>
              <div class="chat-quick-flags">
                <button class="flag-btn" data-quick-action="mirror"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path></svg>检测镜像</button>
                <button class="flag-btn" data-quick-action="missing"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19h8"></path><path d="m4 17 6-6-6-6"></path></svg>找不到 brew</button>
                <button class="flag-btn" data-quick-action="search"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></svg>查询软件包</button>
                <button class="flag-btn" data-quick-action="restore"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>恢复官方源</button>
              </div>
              <div class="help-scenarios" aria-label="按遇到的问题获取帮助">
                <button type="button" class="flag-btn help-scenario" data-quick-action="doctor"><strong>这些警告需要处理吗？</strong><span>先判断影响哪些软件、能否继续安装，以及是否需要处理。</span><span class="help-scenario-link">粘贴提示，帮我判断 →</span></button>
                <button type="button" class="flag-btn help-scenario" data-quick-action="desktop"><strong>桌面版下载慢或失败？</strong><span>先检查下载设置，再判断从哪里排查。</span><span class="help-scenario-link">跟着指引检查 →</span></button>
              </div>
            </div>
          </div>
          <div class="chat-footer" id="chat-footer">
            <button id="chat-jump-latest" class="icon-btn jump-latest" type="button" aria-label="回到最新回复" data-tooltip="最新回复" hidden><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path></svg></button>
            <div id="chat-feedback" class="chat-feedback" role="status"></div>
            <div id="package-query-mode" class="package-query-mode" hidden><span>查询软件包</span><button id="package-query-cancel" class="icon-btn" type="button" aria-label="取消软件查询" data-tooltip="取消软件查询"><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg></button></div>
            <div id="chat-attachments" class="chat-attachments" aria-label="待发送截图"></div>
            <div class="chat-input-wrapper">
              <textarea id="chat-input" aria-label="Homebrew 问题" aria-describedby="chat-input-hint" placeholder="输入问题，或粘贴多行终端日志…" rows="3"></textarea>
              <button id="chat-send-btn" class="icon-btn chat-send-btn" aria-label="发送消息" aria-keyshortcuts="Control+Enter Meta+Enter" data-tooltip="发送消息" disabled><svg class="icon " xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg></button>
            </div>
            <p class="chat-input-hint" id="chat-input-hint">可以接着追问，不用重复粘贴报告 · Enter 换行 · Ctrl / ⌘ + Enter 发送</p>
          </div>
        </div>
      </div>
    </div>
  </section>
            ${getAdvertisement()}
            <section class="project-overview" id="project-overview" aria-label="项目数据与视频教程">
                ${getStatsCard()}
                ${getVideoCard()}
            </section>
            ${getFeatures()}
            ${getQuickHelp()}
            <details class="support-details" id="installation-help">
                <summary>镜像与配置参考 <svg class="icon disclosure-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></summary>
                ${getStepsAndMirrors()}
                ${getEnvDetails()}
            </details>
        </main>
        ${getFooter()}
    </div>
    ${getSupportDialog()}
    <div id="copy-feedback" class="toast" role="status" aria-live="polite"></div>
    ${getClientScript()}
</body>
</html>`;
}
