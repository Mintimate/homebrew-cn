const installUrl = 'https://brew-cn.mintimate.cn/install';
const icon = (paths, extra = '') => `<svg class="icon ${extra}" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const copyIcon = icon('<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/>');
const arrowIcon = icon('<path d="M7 7h10v10M7 17 17 7"/>');
const shieldIcon = icon('<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6c3 0 6-1.5 8-4 2 2.5 5 4 8 4z"/><path d="m9 12 2 2 4-4"/>');
const trashIcon = icon('<path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>');
const chevronIcon = icon('<path d="m6 9 6 6 6-6"/>', 'disclosure-icon');

function command(id, label, value, shell, primary = true) {
  return `<div class="command-block${primary ? ' primary-command' : ''}">
    <div class="cmd-header"><span class="cmd-label">${label}</span><span class="code-language">${shell}</span></div>
    <div class="command-line"><pre class="cmd-box-modern"><span class="prompt" aria-hidden="true">$ </span><code id="${id}">${value}</code></pre>
      <button class="icon-btn copy-btn-modern" type="button" onclick="copyCommand('${id}', this)" aria-label="复制${label}" data-tooltip="复制命令">${copyIcon}</button>
    </div>
  </div>`;
}

function management(os, shell) {
  return `<details class="uninstall-details management-details">
    <summary>${trashIcon}卸载 Homebrew${chevronIcon}</summary>
    <p class="danger-note">将移除 Homebrew 及已安装的软件包。仅需换源时，请使用「配置镜像」；卸载脚本会要求确认后再执行。</p>
    ${command('uninstall-command-' + os, '卸载命令', `/bin/${shell} -c "$(curl -fsSL ${installUrl})" -- --uninstall`, shell, false)}
  </details>`;
}

function platformPanel(os, shell) {
  const isMac = os === 'macos';
  return `<div class="os-panel" id="os-${os}" role="tabpanel" aria-labelledby="os-tab-${os}"${isMac ? '' : ' hidden'}>
    <div class="onboarding-content" data-onboarding-panel="install">
      ${command('install-command-' + os, '安装命令', `/bin/${shell} -c "$(curl -fsSL ${installUrl})"`, shell)}
      <p class="panel-hint">${isMac ? '需要 Xcode Command Line Tools，脚本会检测并提示安装。' : '需要 Git、curl 及构建依赖，脚本会检测并提示安装。'}</p>
    </div>
    <div class="onboarding-content" data-onboarding-panel="configure" hidden>
      ${command('configure-command-' + os, '换源命令', `/bin/${shell} -c "$(curl -fsSL ${installUrl})" -- --configure`, shell)}
      <p class="panel-hint">仅配置已有 Homebrew，备份并迁移旧镜像设置，不重新安装或升级软件。${isMac ? '完成后重新打开终端和 BrewUI。' : '完成后重新打开终端。'}</p>
      <details class="configuration-details"><summary>镜像配置写入哪里？</summary>
        <p>写入 <code>$(brew --prefix)/etc/homebrew/brew.env</code>，使用 <code>NAME=value</code>，不加 <code>export</code>。脚本会检查用户级与 XDG 配置中的覆盖设置。${isMac ? 'BrewUI 不读取 .zshrc；修改后重启应用，在 Configuration 中核对生效地址。' : ''}</p>
      </details>
    </div>
    <div class="onboarding-content" data-onboarding-panel="desktop"${isMac ? ' id="desktop-guide"' : ''} hidden>
      ${isMac ? `<div class="desktop-heading"><h3>Homebrew 官方桌面版</h3><span class="compatibility-tag">macOS 26+</span></div>
      <p class="panel-hint">先完成 Homebrew 安装与镜像配置，再安装 BrewUI：</p>
      ${command('desktop-install-command', '桌面版安装命令', 'brew install --cask homebrew-app', shell)}
      <p class="panel-hint">桌面版和终端可共用下载设置；修改后重新打开应用，在「配置」页面确认。</p>
      <div class="desktop-actions"><button type="button" class="text-action" onclick="switchOnboardingTask('configure')">先配置镜像 ${arrowIcon}</button><button type="button" class="text-action" onclick="openDesktopHelp()">桌面版下载慢？跟着检查 ${arrowIcon}</button><a href="https://github.com/Homebrew/BrewUI" target="_blank" rel="noopener noreferrer">官方说明 ${arrowIcon}</a></div>`
      : `<h3>BrewUI 当前仅支持 macOS 26+</h3><p class="panel-hint">Linux 可继续使用 Homebrew 命令行、镜像配置与 AI 排障。</p><div class="desktop-actions"><button type="button" class="text-action" onclick="switchOnboardingTask('configure')">配置 Linux 镜像 ${arrowIcon}</button><button type="button" class="text-action" onclick="switchTerminalTab('ai-chat')">打开 AI 排障 ${arrowIcon}</button></div>`}
    </div>
    <div class="install-meta"><span>${shieldIcon}修改已有配置前自动备份</span><a href="https://github.com/Mintimate/homebrew-cn/blob/main/install.sh" target="_blank" rel="noopener noreferrer">查看脚本源码 ${arrowIcon}</a></div>
    ${management(os, shell)}
  </div>`;
}

export function getOnboardingPanel() {
  return `<div class="terminal-panel active" id="panel-install" role="tabpanel" aria-labelledby="tab-install">
    <div class="onboarding-toolbar">
      <div class="os-selector-wrapper"><span class="selector-label">系统</span>
        <div class="os-segmented-control" role="tablist" aria-label="操作系统">
          <button id="os-tab-macos" class="os-segment active" data-os="macos" role="tab" aria-controls="os-macos" aria-selected="true" onclick="switchOS('macos')">macOS</button>
          <button id="os-tab-linux" class="os-segment" data-os="linux" role="tab" aria-controls="os-linux" aria-selected="false" tabindex="-1" onclick="switchOS('linux')">Linux</button>
        </div>
      </div>
      <div class="onboarding-tasks" role="group" aria-label="选择操作">
        <button type="button" class="onboarding-task active" data-onboarding-task="install" aria-pressed="true" onclick="switchOnboardingTask('install')">安装</button>
        <button type="button" class="onboarding-task" data-onboarding-task="configure" aria-pressed="false" onclick="switchOnboardingTask('configure')">配置镜像</button>
        <button type="button" class="onboarding-task" data-onboarding-task="desktop" aria-pressed="false" onclick="switchOnboardingTask('desktop')">桌面版</button>
      </div>
    </div>
    ${platformPanel('macos', 'zsh')}
    ${platformPanel('linux', 'bash')}
  </div>`;
}
