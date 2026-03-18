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

    ${getClientScript()}
</body>
</html>`;
}
