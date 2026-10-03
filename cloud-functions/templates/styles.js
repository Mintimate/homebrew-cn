// 生产站视觉基线：保留主题、工作区和响应式布局。
export function getStyles() {
  return `<style>
    :root {
      color-scheme: light;
      --bg: #fcf9f4;
      --surface: #fff;
      --surface-muted: #f4efe8;
      --border: #e5ddd2;
      --text: #302d29;
      --text-muted: #6b645c;
      --accent: #c2410c;
      --accent-hover: #9a3412;
      --on-accent: #ffffff;
      --accent-soft: #fff0e8;
      --green: #247448;
      --green-soft: #edf7f0;
      --gold: #866009;
      --gold-soft: #fff6d9;
      --danger: #b3313c;
      --danger-soft: #fdecf0;
      --link: var(--accent);
      --link-soft: var(--accent-soft);
      --code-bg: #f2f4f5;
      --chat-dot: #ded4c7;
      --font-mono: "SF Mono", "Fira Code", "JetBrains Mono", Consolas, monospace;
      --radius: 10px;
    }
    :root[data-theme="dark"] {
      color-scheme: dark;
      --bg: #191715;
      --surface: #211e1b;
      --surface-muted: #2b2723;
      --border: #433c35;
      --text: #f3eee7;
      --text-muted: #b9afa4;
      --accent: #fb923c;
      --accent-hover: #fdba74;
      --on-accent: #1c1e21;
      --accent-soft: #35271f;
      --green: #7dd6a3;
      --green-soft: #20352a;
      --gold: #e6c96c;
      --gold-soft: #373222;
      --danger: #ff929c;
      --danger-soft: #3c2429;
      --code-bg: #16181b;
      --chat-dot: #463d33;
    }
    * { box-sizing: border-box; letter-spacing: 0; }
    [hidden] { display: none !important; }
    body { margin: 0; font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
    button, textarea { font: inherit; }
    button, summary, a { -webkit-tap-highlight-color: transparent; }
    button { cursor: pointer; }
    button:disabled { cursor: not-allowed; opacity: .5; }
    button, a, summary { touch-action: manipulation; }
    button, a { color: inherit; }
    :focus-visible { outline: 2px solid var(--link); outline-offset: 4px; }
    a { color: var(--link); text-decoration: none; text-underline-offset: 4px; }
    a:hover { text-decoration: underline; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 2rem; line-height: 1.3; font-weight: 720; overflow-wrap: anywhere; }
    h2 { font-size: 1.125rem; line-height: 1.5; font-weight: 650; }
    h3 { font-size: 1rem; }
    code, pre { font-family: var(--font-mono); }
    code { font-size: .875em; overflow-wrap: anywhere; }
    p code, summary code { color: var(--accent); }
    svg { vertical-align: middle; }
    .icon { width: 18px; height: 18px; flex-shrink: 0; }
    .container { width: min(100%, 1840px); margin: auto; padding: 0 40px; }
    .site-header { min-height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--border); }
    .wordmark { display: inline-flex; align-items: center; gap: 10px; color: var(--text); font-size: 1.125rem; font-weight: 650; white-space: nowrap; }
    .wordmark strong, .wordmark > svg { color: var(--accent); }
    .wordmark:hover { text-decoration: none; }
    .header-actions, .header-source { display: flex; align-items: center; gap: 20px; }
    .header-source { gap: 6px; font-size: .875rem; color: var(--text-muted); }
    .header-support { display: inline-flex; align-items: center; gap: 6px; min-height: 38px; padding: 6px 12px; white-space: nowrap; border: 1px solid var(--border); border-radius: 7px; background: var(--accent-soft); color: var(--accent); font-size: .875rem; font-weight: 600; }
    .header-support:hover { border-color: var(--accent); }
    .header-support .icon { transition: transform .18s ease; }
    .header-support:hover .icon { transform: rotate(-10deg); }
    body.support-open { overflow: hidden; }
    .support-dialog { width: min(420px, calc(100% - 24px)); max-height: calc(100dvh - 24px); overflow-y: auto; padding: 20px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); color: var(--text); box-shadow: 0 20px 64px #0004; }
    .support-dialog::backdrop { background: #1c17129c; backdrop-filter: blur(3px); }
    .support-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .support-heading h2 { font-size: 1.125rem; font-weight: 650; }
    .support-dialog #support-close { color: var(--text-muted); width: 44px; height: 44px; }
    .support-description { margin: 8px 0 0; font-size: .8125rem; color: var(--text-muted); line-height: 1.7; }
    .support-description strong { color: var(--text); font-weight: 600; }
    .support-artwork { width: min(100%, 352px); margin: 16px auto 12px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: #fff; }
    .support-code { display: block; width: 100%; height: auto; margin: 0; background: #fff; object-fit: contain; }
    .support-scan-hint { text-align: center; color: var(--text-muted); font-size: .75rem; }
    .support-save { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 14px; padding: 10px 12px; min-height: 44px; border: 1px solid var(--border); border-radius: 7px; background: var(--accent-soft); color: var(--accent); font-size: .875rem; font-weight: 600; }
    .support-save:hover { border-color: var(--accent); text-decoration: none; }
    .theme-picker { display: flex; padding: 3px; border: 1px solid var(--border); border-radius: 8px; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 38px; height: 38px; padding: 0; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--text-muted); position: relative; }
    .icon-btn:hover:not(:disabled) { background: var(--surface-muted); color: var(--text); }
    .theme-option { width: 32px; height: 32px; }
    .theme-option[aria-pressed="true"] { background: var(--accent-soft); color: var(--accent); box-shadow: 0 1px 3px #00000012; }
    [data-tooltip]::after { content: attr(data-tooltip); position: absolute; z-index: 20; top: calc(100% + 8px); right: 0; width: max-content; max-width: 200px; padding: 4px 8px; font: 12px/1.5 -apple-system, BlinkMacSystemFont, sans-serif; background: var(--text); color: var(--bg); border-radius: 4px; opacity: 0; pointer-events: none; }
    [data-tooltip]:hover::after, [data-tooltip]:focus-visible::after { opacity: 1; }
    .hero { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 24px 0 20px; }
    .hero h1 { color: var(--accent); }
    .hero p { color: var(--text-muted); margin-top: 10px; }
    .hero-note { padding: 7px 12px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface); display: flex; gap: 6px; align-items: center; white-space: nowrap; font-size: .875rem; color: var(--text-muted); }
    .hero-note svg { color: var(--green); }
    .terminal-dashboard { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); box-shadow: 0 4px 20px #00000006; }
    .terminal-header { min-height: 60px; padding: 8px 16px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); border-radius: 8px 8px 0 0; background: var(--surface-muted); }
    .terminal-header > .icon-btn { justify-self: end; }
    .terminal-identity { display: flex; gap: 7px; }
    .terminal-dot { width: 9px; height: 9px; border-radius: 50%; }
    .terminal-dot.red { background: #df6a61; }
    .terminal-dot.yellow { background: #d7b359; }
    .terminal-dot.green { background: #6aac81; }
    .terminal-tabs, .os-segmented-control { display: flex; align-items: stretch; gap: 4px; }
    .terminal-tab { display: flex; gap: 8px; align-items: center; justify-content: center; min-height: 40px; padding: 6px 18px; font-size: .875rem; border: 0; border-radius: 6px; background: transparent; color: var(--text-muted); }
    .terminal-tab.active { background: var(--accent-soft); color: var(--accent); font-weight: 650; box-shadow: 0 1px 3px #00000010; }
    .terminal-tab:hover:not(.active) { color: var(--text); }
    .terminal-body { padding: 24px; }
    .os-selector-wrapper { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 20px; }
    .selector-label { font-size: .875rem; color: var(--text-muted); }
    .os-segmented-control { padding: 3px; border: 1px solid var(--border); border-radius: 6px; }
    .os-segment { border: 0; border-radius: 4px; padding: 4px 18px; min-height: 30px; background: transparent; color: var(--text-muted); font-size: .875rem; }
    .os-segment.active { background: var(--accent-soft); color: var(--accent); font-weight: 650; }
    .architecture-note { margin-left: auto; color: var(--text-muted); font: 12px/1.5 var(--font-mono); }
    /* 将 V7 的三个操作融入原有系统选择行，不额外占用首屏卡片。 */
    .onboarding-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px 20px; margin-bottom: 20px; }
    .onboarding-toolbar .os-selector-wrapper { margin-bottom: 0; }
    .onboarding-tasks { display: flex; align-items: center; gap: 4px; }
    .onboarding-task { border: 0; border-radius: 5px; background: transparent; color: var(--text-muted); font-size: .875rem; min-height: 34px; padding: 5px 12px; }
    .onboarding-task:hover { color: var(--accent); background: var(--surface-muted); }
    .onboarding-task.active { color: var(--accent); background: var(--accent-soft); font-weight: 650; }
    .configuration-details { margin: -6px 0 18px; font-size: .875rem; color: var(--text-muted); }
    .configuration-details summary { padding: 6px 0; }
    .configuration-details p { padding: 6px 0; overflow-wrap: anywhere; }
    .desktop-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
    .compatibility-tag { font-size: 12px; color: var(--accent); background: var(--accent-soft); padding: 2px 8px; border-radius: 4px; }
    .desktop-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 24px; margin: 0 0 20px; font-size: .875rem; }
    .command-block { border: 1px solid var(--border); border-radius: 6px; background: var(--code-bg); min-width: 0; }
    .primary-command { border-left: 3px solid var(--accent); }
    .cmd-header { display: flex; justify-content: space-between; padding: 10px 16px 0; gap: 16px; color: var(--text-muted); font-size: 12px; }
    .code-language { font-family: var(--font-mono); }
    .command-line { display: flex; align-items: center; gap: 12px; padding: 10px 12px 14px 16px; }
    .cmd-box-modern { margin: 0; min-width: 0; flex: 1; overflow-x: auto; padding: 3px 0 6px; font-size: .875rem; line-height: 1.8; white-space: pre; scrollbar-width: thin; }
    .cmd-box-modern code { font-size: inherit; overflow-wrap: normal; }
    .prompt { color: var(--green); user-select: none; }
    .copy-btn-modern { border-color: var(--border); background: var(--accent-soft); color: var(--accent); }
    .copy-btn-modern:hover:not(:disabled) { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-hover); }
    .icon-btn.copied { color: var(--green); border-color: var(--green); }
    .icon-btn.copy-failed { color: var(--danger); border-color: var(--danger); }
    .panel-hint { margin: 12px 0 16px; color: var(--text-muted); font-size: .875rem; }
    .install-meta { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px 24px; font-size: .875rem; padding-bottom: 18px; }
    .install-meta span, .install-meta a { display: inline-flex; align-items: center; gap: 6px; }
    .install-meta span { color: var(--text-muted); }
    .install-meta span svg { color: var(--green); }
    summary { cursor: pointer; font-size: .875rem; padding: 14px 0; }
    .uninstall-details { border-top: 1px solid var(--border); }
    .uninstall-details > summary { list-style: none; display: flex; gap: 8px; align-items: center; color: var(--text-muted); padding-bottom: 0; }
    .uninstall-details > summary::-webkit-details-marker { display: none; }
    .uninstall-details[open] > summary { padding-bottom: 14px; }
    .disclosure-icon { margin-left: auto; }
    details[open] > summary .disclosure-icon { transform: rotate(180deg); }
    .danger-note { font-size: .875rem; color: var(--danger); margin-bottom: 12px; }
    body.workspace-expanded { overflow: hidden; }
    .terminal-dashboard.expanded { position: fixed; inset: 16px; z-index: 100; display: flex; flex-direction: column; box-shadow: 0 0 0 100vmax #0008; }
    .expanded .terminal-header { flex-shrink: 0; }
    .expanded .terminal-body { flex: 1; min-height: 0; overflow: auto; }
    .expanded #panel-ai-chat, .expanded .ai-chat-container { height: 100%; }
    .expanded #panel-install { max-width: 960px; margin: auto; }
    .ai-chat-container { --chat-height: clamp(440px, calc(100dvh - 448px), 960px); display: flex; flex-direction: column; min-height: 0; height: var(--chat-height); }
    /* Welcome content owns its height; only an actual conversation is scroll-constrained. */
    .ai-chat-container:has(.chat-empty:not([hidden])) { height: auto; min-height: var(--chat-height); }
    .expanded .ai-chat-container:has(.chat-empty:not([hidden])) { min-height: 100%; }
    .chat-top-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; justify-content: space-between; padding-bottom: 12px; font-size: .875rem; color: var(--text-muted); }
    #agent-tool-panel { flex: 1; min-width: 100px; overflow-wrap: anywhere; }
    #chat-new-conversation { white-space: nowrap; }
    #agent-tool-panel.running { color: var(--accent); }
    .chat-messages { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--border) transparent; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background-color: var(--surface); background-image: radial-gradient(circle, var(--chat-dot) 1px, transparent 1px); background-size: 22px 22px; background-position: 11px 11px; }
    .chat-messages:has(.chat-empty:not([hidden])) { display: flex; flex: 1 0 auto; }
    .chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 0; gap: 16px; text-align: center; }
    .chat-empty > * { flex-shrink: 0; }
    .chat-empty-emblem { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 18px; border: 1px solid var(--border); background: var(--accent-soft); color: var(--accent); }
    .empty-icon { width: 44px; height: 44px; }
    .chat-empty h2 { background: var(--surface); padding: 4px 12px; border-radius: 8px; }
    .chat-empty h2 { font-size: 1.25rem; }
    .chat-quick-flags { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; width: min(100%, 440px); }
    .flag-btn { display: flex; align-items: center; justify-content: flex-start; text-align: left; gap: 10px; padding: 10px 14px; min-height: 44px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; font-size: .875rem; color: var(--text); }
    .flag-btn svg { color: var(--text-muted); }
    .flag-btn:hover { border-color: var(--accent); background: var(--accent-soft); }
    .help-scenarios { width: min(100%, 600px); display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .help-scenario { align-items: flex-start; flex-direction: column; gap: 6px; padding: 16px; }
    .help-scenario strong { font-size: .9375rem; font-weight: 650; }
    .help-scenario span { color: var(--text-muted); font-size: .8125rem; }
    .help-scenario .help-scenario-link { color: var(--link); margin-top: 4px; }
    .help-guide { max-width: 700px; margin: 0 auto; padding: 8px 4px; font-size: .875rem; }
    .help-guide-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
    .help-guide h2 { font-size: 1.125rem; }
    .help-guide p { margin: 12px 0; line-height: 1.7; }
    .help-guide-purpose { color: var(--text-muted); }
    .help-guide-note { color: var(--text-muted); font-size: .8125rem; }
    .help-source { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
    .help-source button { min-height: 40px; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); }
    .help-source button[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); }
    .help-guide label { display: block; margin: 16px 0 8px; font-weight: 600; }
    .help-guide textarea { display: block; width: 100%; min-height: 120px; max-height: 360px; resize: vertical; padding: 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); font: inherit; line-height: 1.6; }
    .help-primary { margin-top: 12px; min-height: 42px; padding: 10px 16px; border: 1px solid var(--accent); border-radius: 6px; background: var(--accent); color: var(--on-accent); font: inherit; font-weight: 600; }
    .help-primary:disabled { opacity: .5; cursor: not-allowed; }
    .help-step { font-weight: 650; color: var(--text); }
    .help-command { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--code-bg); }
    .help-command code { font-size: .9375rem; }
    .help-guide-actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .help-terminal-how summary { cursor: pointer; color: var(--link); }
    .ai-chat-container:has(.help-guide:not([hidden])) { height: auto; }
    .chat-messages:has(.help-guide:not([hidden])) { display: block; flex: 1 0 auto; }
    .chat-footer { position: relative; padding-top: 10px; flex-shrink: 0; }
    .chat-input-wrapper { display: flex; align-items: flex-end; gap: 12px; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--code-bg); }
    .chat-input-wrapper:focus-within { border-color: var(--link); box-shadow: 0 0 0 2px var(--link-soft); }
    #chat-input { flex: 1; width: 100%; min-width: 0; min-height: 96px; max-height: 200px; overflow-y: auto; padding: 7px 4px; color: var(--text); background: transparent; border: 0; outline: 0; resize: none; line-height: 1.6; font-size: 1rem; }
    .chat-input-hint { margin: 6px 2px 0; font-size: 12px; color: var(--text-muted); }
    #chat-input::placeholder { color: var(--text-muted); }
    .chat-send-btn { background: var(--accent); color: var(--on-accent); width: 40px; height: 40px; }
    .chat-send-btn:hover:not(:disabled) { background: var(--accent-hover); color: var(--on-accent); }
    .chat-send-btn.generating { background: var(--accent-soft); color: var(--accent); }
    .jump-latest { position: absolute; right: 8px; bottom: calc(100% + 8px); border: 1px solid var(--border); background: var(--surface); box-shadow: 0 2px 8px #0002; }
    .chat-feedback { color: var(--text-muted); font-size: .875rem; }
    .chat-feedback:not(:empty) { padding-bottom: 8px; }
    .package-query-mode { display: flex; align-items: center; gap: 8px; width: fit-content; margin-bottom: 8px; color: var(--accent); font-size: .875rem; }
    .package-query-mode .icon-btn { width: 28px; height: 28px; color: var(--accent); }
    .chat-attachments { display: flex; flex-wrap: wrap; gap: 8px; }
    .chat-attachments:not(:empty) { padding-bottom: 8px; }
    .attachment-chip { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; font-size: .875rem; }
    .attachment-chip small { color: var(--text-muted); }
    .attachment-chip button { background: transparent; border: 0; color: var(--text-muted); width: 32px; height: 32px; }
    .message { max-width: 85%; overflow-wrap: anywhere; font-size: 1rem; line-height: 1.7; margin: 0 0 24px; }
    .message.user { white-space: pre-wrap; margin-left: auto; padding: 10px 16px; width: fit-content; background: var(--surface-muted); border-radius: 8px; }
    .message-attachments { font-size: .875rem; color: var(--text-muted); }
    .agent-message-row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 24px; animation: message-arrive 180ms ease-out; }
    .agent-avatar { width: 34px; height: 34px; border: 1px solid var(--border); border-radius: 10px; background: var(--accent-soft); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
    .agent-avatar svg { width: 26px; height: 26px; }
    .agent-bubble { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 16px; min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .agent-text-content { order: 1; min-width: 0; overflow-wrap: anywhere; }
    .agent-text-content.is-revealing::after { content: ''; display: inline-block; width: 6px; height: 16px; background: var(--accent); border-radius: 1px; vertical-align: middle; animation: pulse 700ms ease-in-out infinite alternate; }
    .agent-text-content p, .agent-text-content ul, .agent-text-content ol { margin: 0 0 12px; }
    .agent-text-content p:last-child { margin-bottom: 0; }
    .agent-text-content ul, .agent-text-content ol { padding-left: 24px; }
    .agent-text-content h1, .agent-text-content h2, .agent-text-content h3, .agent-text-content h4 { color: var(--text); font-size: 1.125rem; margin: 16px 0 8px; background: none; }
    .agent-text-content :not(pre) > code { background: var(--code-bg); color: var(--accent); padding: 2px 4px; border-radius: 3px; }
    .agent-text-content blockquote { border-left: 2px solid var(--border); margin: 12px 0; padding-left: 16px; color: var(--text-muted); }
    .agent-text-content img { max-width: 100%; height: auto; }
    .agent-text-content table { display: block; max-width: 100%; overflow-x: auto; }
    .code-snippet { margin: 12px 0; border: 1px solid var(--border); border-radius: 6px; padding: 0; overflow: hidden; background: var(--code-bg); font-size: .875rem; white-space: pre; }
    .code-snippet > code { display: block; overflow-x: auto; max-width: 100%; padding: 12px 16px 16px; font-size: inherit; color: var(--text); }
    .code-copy-btn { display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; min-width: 80px; margin: 4px 4px 0 auto; padding: 4px 10px; color: var(--text-muted); border: 0; background: transparent; border-radius: 4px; font-size: 12px; }
    .code-copy-btn:hover { background: var(--surface-muted); }
    .code-copy-btn svg { width: 16px; height: 16px; }
    .thinking-wrapper { order: 0; border-top: 1px solid var(--border); min-width: 0; }
    .thinking-wrapper.is-working { border-color: var(--accent); }
    .thinking-header { display: flex; align-items: center; gap: 8px; font-size: .875rem; color: var(--text-muted); list-style: none; }
    .thinking-header::-webkit-details-marker { display: none; }
    .thinking-header svg { width: 16px; height: 16px; }
    .thinking-wrapper:not([open]) .thinking-header > svg { transform: rotate(-90deg); }
    .progress-icon { display: inline-flex; flex-shrink: 0; color: var(--text-muted); }
    .is-working .progress-icon { color: var(--accent); }
    .is-working .progress-icon svg { animation: spin 1.2s linear infinite; }
    .is-complete .progress-icon { color: var(--green); }
    .is-failed .progress-icon, .tool-call-header.interrupted { color: var(--danger); }
    .progress-title { min-width: 0; overflow-wrap: anywhere; }
    .progress-elapsed { margin-left: auto; white-space: nowrap; font: 12px var(--font-mono); font-variant-numeric: tabular-nums; }
    .thinking-content { padding: 0 0 12px 24px; color: var(--text-muted); font-size: .875rem; max-height: 180px; overflow: auto; overflow-wrap: anywhere; }
    .progress-summary { margin: 0 0 8px; animation: message-arrive 160ms ease-out; }
    .model-reasoning { margin: 0 0 14px 24px; min-width: 0; }
    .model-reasoning h3 { margin-bottom: 8px; font-size: .875rem; color: var(--accent); }
    .reasoning-content { max-height: 240px; overflow: auto; overscroll-behavior: contain; scrollbar-width: thin; white-space: pre-wrap; overflow-wrap: anywhere; padding: 0 12px; border-left: 2px solid var(--border); color: var(--text-muted); font-size: .875rem; line-height: 1.75; }
    .thinking-body { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    .agent-usage { font-size: 12px; color: var(--text-muted); padding: 12px 0; overflow-wrap: anywhere; }
    .tool-call-log { width: 100%; min-width: 0; border-bottom: 1px solid var(--border); animation: message-arrive 180ms ease-out; }
    .tool-call-header { display: flex; align-items: center; gap: 8px; font-size: .875rem; padding: 10px 0; overflow-wrap: anywhere; }
    .tool-call-header svg { width: 16px; height: 16px; flex-shrink: 0; }
    .tool-call-header.running { color: var(--accent); }
    .tool-call-header.success { color: var(--green); }
    .tool-call-header.failed, .chat-error { color: var(--danger); }
    .tool-time { margin-left: auto; color: var(--text-muted); font: 12px var(--font-mono); flex-shrink: 0; }
    .tool-call-output, .tool-raw-output { margin: 0; padding: 12px; font: 13px/1.65 var(--font-mono); background: var(--code-bg); color: var(--text-muted); max-height: 220px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; }
    .tool-rich-body { padding: 12px 0; min-width: 0; }
    .tool-grid-head, .tool-row { display: grid; grid-template-columns: minmax(140px, 2fr) 75px 90px 50px 90px; gap: 10px; align-items: center; padding: 10px; font-size: .875rem; border-bottom: 1px solid var(--border); }
    .tool-grid-head { font-weight: 600; background: var(--surface-muted); }
    .tool-main { display: flex; flex-direction: column; min-width: 0; overflow-wrap: anywhere; }
    .tool-main span { font-size: 12px; color: var(--text-muted); }
    .tool-mono { font: 12px var(--font-mono); color: var(--text-muted); }
    .tool-badge { width: fit-content; max-width: 100%; padding: 2px 6px; font-size: 12px; border-radius: 4px; }
    .tool-badge.ok { color: var(--green); background: var(--green-soft); }
    .tool-badge.warn { color: var(--gold); background: var(--gold-soft); }
    .tool-badge.bad { color: var(--danger); background: var(--danger-soft); }
    .tool-badge.info { color: var(--link); background: var(--link-soft); }
    .tool-empty { font-size: .875rem; color: var(--text-muted); padding: 12px 0; }
    .tool-copy-btn, .retry-btn { display: inline-flex; gap: 6px; align-items: center; padding: 6px 10px; min-height: 36px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--link); font-size: .875rem; margin-top: 12px; }
    .retry-btn { order: 3; align-self: flex-start; }
    .answer-followups { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; order: 3; }
    .answer-followup { padding: 8px 12px; min-height: 40px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--link); font-size: .875rem; text-align: left; }
    .answer-followup:hover:not(:disabled) { border-color: var(--accent); background: var(--accent-soft); }
    .answer-followup:disabled, #chat-new-conversation:disabled { opacity: .5; cursor: not-allowed; }
    .doctor-assessment { padding: 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); }
    .impact-summary { margin: 10px 0; line-height: 1.7; }
    .impact-summary dt { font-weight: 650; }
    .impact-summary dd { margin: 0 0 8px; overflow-wrap: anywhere; }
    .issue-card { padding: 12px 0; border-bottom: 1px solid var(--border); font-size: .875rem; }
    .issue-title { display: flex; align-items: baseline; gap: 8px; }
    .issue-suggest { color: var(--text-muted); margin-top: 8px; }
    .issue-details { margin-top: 8px; }
    .issue-details summary, details.diagnostic-section > summary { cursor: pointer; color: var(--link); }
    .diagnostic-section-title { font-weight: 650; margin: 12px 0; }
    .config-comparison { max-width: 100%; overflow-x: auto; }
    .config-comparison table { width: 100%; border-collapse: collapse; font-size: .8125rem; }
    .config-comparison th, .config-comparison td { min-width: 140px; max-width: 280px; padding: 8px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--border); overflow-wrap: anywhere; }
    .tool-command-box { overflow-x: auto; font-size: .875rem; padding: 12px; background: var(--code-bg); }
    .typing-indicator { display: flex; align-items: center; gap: 5px; height: 24px; }
    .typing-indicator span { width: 5px; height: 5px; border-radius: 50%; background: var(--text-muted); animation: pulse 1.2s infinite alternate; }
    .typing-indicator span:nth-child(2) { animation-delay: .2s; }
    .typing-indicator span:nth-child(3) { animation-delay: .4s; }
    .spin-svg, .spin-loader { animation: spin 1.2s linear infinite; }
    .spin-loader { width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; }
    .section { padding: 32px 0; border-bottom: 1px solid var(--border); }
    .installation-ad { width: 100%; min-width: 0; min-height: 220px; margin-top: 24px; padding-block: 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
    .ad-label { display: block; margin: 0 12px 8px; font-size: 11px; line-height: 1.5; color: var(--text-muted); }
    .installation-ad:has(.adsbygoogle[data-ad-status="unfilled"]) { display: none; }
    .project-overview { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px 24px; align-items: start; padding: 18px 0 8px; }
    .project-stats { min-width: 0; }
    .project-stats h2 { font-size: .875rem; }
    .video-direct-link { display: flex; align-items: center; gap: 12px; min-width: 0; padding-block: 4px; font-size: .875rem; }
    .video-cover { display: block; position: relative; width: 112px; flex-shrink: 0; aspect-ratio: 2.25; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; background: #fff; }
    .video-description { display: block; color: var(--text-muted); font-size: 12px; margin-top: 4px; }
    .video-direct-link > span { min-width: 0; }
    .video-direct-link strong { display: block; font-weight: 500; }
    .video-address { display: block; color: var(--text-muted); font-size: 12px; overflow-wrap: anywhere; margin-top: 2px; }
    .video-sidebar-preview { display: block; width: 100%; height: 100%; object-fit: contain; }
    .support-details { border-bottom: 1px solid var(--border); }
    .support-details > summary { display: flex; align-items: center; gap: 12px; min-height: 48px; list-style: none; color: var(--text-muted); }
    .support-details > summary::-webkit-details-marker { display: none; }
    .support-details > summary:hover { color: var(--text); }
    .support-details > .section:last-child { border-bottom: 0; }
    .feature-highlights { grid-column: 1 / -1; margin-top: 24px; padding: 20px 0; border-block: 1px solid var(--border); }
    .feature-highlights ul { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; list-style: none; margin: 0; padding: 0; }
    .feature-highlights li { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
    .feature-symbol { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px; background: var(--accent-soft); color: var(--accent); }
    .feature-highlights h2 { font-size: .875rem; }
    .feature-highlights p { margin-top: 4px; color: var(--text-muted); font-size: .8125rem; overflow-wrap: anywhere; }
    .quick-help-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px; margin-top: 28px; grid-column: 1 / -1; }
    .quick-help-panel { min-width: 0; border-top: 1px solid var(--border); }
    .quick-help-panel > summary { display: flex; align-items: center; gap: 12px; min-height: 60px; list-style: none; }
    .quick-help-panel > summary::-webkit-details-marker { display: none; }
    .quick-help-panel > summary .icon { color: var(--text-muted); }
    .quick-help-content { padding: 8px 0 20px; }
    .quick-help-action { margin-top: 12px; }
    .section-heading { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
    .section-heading a, .section-heading button { font-size: .875rem; }
    .text-action { display: inline-flex; align-items: center; gap: 6px; background: transparent; border: 0; color: var(--link); padding: 4px 0; }
    .steps-grid { display: grid; gap: 18px; list-style: none; padding: 0; margin: 0; }
    .steps-grid li { position: relative; display: grid; grid-template-columns: 32px minmax(0, 1fr); column-gap: 12px; row-gap: 4px; }
    .steps-grid li:not(:last-child)::after { content: ''; position: absolute; left: 15px; top: 34px; bottom: -10px; width: 1px; background: var(--border); }
    .steps-grid h3, .steps-grid p, .verify-command { grid-column: 2; }
    .step-number { grid-column: 1; grid-row: 1 / 3; align-self: start; width: 32px; height: 32px; border: 1px solid var(--border); border-radius: 50%; text-align: center; background: var(--surface); color: var(--accent); font: 12px/30px var(--font-mono); }
    .steps-grid p { color: var(--text-muted); font-size: .875rem; }
    .verify-command { display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid var(--border); max-width: 360px; }
    .verify-command code { min-width: 0; }
    .verify-command .icon-btn { width: 32px; height: 32px; }
    .faq-list > details { border-top: 1px solid var(--border); }
    .faq-list > details:first-child { border-top: 0; }
    .faq-list summary { font-size: 1rem; }
    .faq-list p { padding: 0 0 16px; color: var(--text-muted); font-size: .875rem; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: .875rem; text-align: left; }
    th { color: var(--text-muted); font-weight: 500; }
    th, td { padding: 12px 14px; border-bottom: 1px solid var(--border); }
    th:first-child, td:first-child { padding-left: 0; }
    .td-name { font-weight: 650; white-space: nowrap; }
    .mirror-note { font-size: .875rem; color: var(--text-muted); margin-top: 12px; }
    .path-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; margin-top: 24px; }
    .path-item { display: flex; flex-direction: column; gap: 6px; font-size: .875rem; }
    .path-item code { color: var(--text-muted); }
    .technical-details > h2 { margin-bottom: 24px; }
    .merged-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 40px; }
    .env-list { margin: 0; }
    .env-list dt { font: 12px/1.7 var(--font-mono); overflow-wrap: anywhere; }
    .env-list dd { margin: 4px 0 18px; color: var(--text-muted); font-size: .875rem; }
    .resources-list { list-style: none; margin: 12px 0 0; padding: 0; }
    .resources-list li { padding: 8px 0; font-size: .875rem; }
    .video-play { position: absolute; right: 6px; bottom: 6px; background: var(--accent); color: var(--on-accent); display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; }
    .video-play .icon { width: 14px; height: 14px; }
    .stats-grid { display: flex; gap: 4px 20px; margin: 6px 0 0; flex-wrap: wrap; }
    .stats-grid > div { display: flex; gap: 6px; align-items: baseline; }
    .stat-value { font-size: 1rem; font-weight: 650; font-variant-numeric: tabular-nums; color: var(--accent); }
    .stat-label { font-size: .875rem; color: var(--text-muted); }
    .recent-installs > summary { color: var(--text-muted); padding: 4px 0; font-size: 12px; }
    .recent-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; font-size: 12px; padding: 6px 0; }
    .ri-location { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .ri-time, .recent-placeholder { color: var(--text-muted); }
    .recent-toggle-btn { font-size: 12px; background: transparent; color: var(--link); border: 0; padding: 8px 0; }
    .footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding: 16px 0 20px; font-size: .875rem; color: var(--text-muted); }
    .footer-sub { font-size: 12px; margin-top: 6px; }
    .footer-links { display: flex; flex-wrap: wrap; gap: 18px; align-items: center; }
    .footer-links a { display: inline-flex; align-items: center; gap: 5px; }
    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 200; background: var(--text); color: var(--bg); border-radius: 6px; font-size: .875rem; max-width: calc(100% - 32px); width: max-content; pointer-events: none; }
    .toast:not(:empty) { padding: 10px 16px; box-shadow: 0 4px 16px #0002; }
    .skip-link { position: fixed; z-index: 200; top: -100px; left: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 8px 16px; }
    .skip-link:focus { top: 8px; }
    #mirror-egg { display: none; }
    #mirror-egg.egg-show { display: table-row; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { to { opacity: .35; } }
    @keyframes message-arrive { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @media (min-width: 1200px) {
      #main { display: grid; grid-template-columns: minmax(0, 1fr) 288px; align-items: start; column-gap: 32px; }
      #ai-chat-window { grid-column: 1; grid-row: 1; min-width: 0; }
      .installation-ad { grid-column: 1; grid-row: 2; }
      .project-overview { grid-column: 2; grid-row: 1 / span 2; display: flex; flex-direction: column; gap: 28px; padding: 8px 0 0 24px; border-left: 1px solid var(--border); min-width: 0; }
      .project-stats { width: 100%; }
      .project-stats h2 { font-size: 1rem; }
      .stats-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 14px; }
      .stats-grid > div { flex-wrap: wrap; }
      .stat-value { font-size: 1.25rem; }
      .recent-installs { margin-top: 14px; }
      .recent-installs > summary { min-height: 32px; }
      .video-direct-link { display: grid; grid-template-columns: minmax(0, 1fr); width: 100%; gap: 12px; border-top: 1px solid var(--border); padding-top: 20px; }
      .video-cover { width: 100%; }
      .video-play { width: 32px; height: 32px; right: 10px; bottom: 10px; }
      .support-details { grid-column: 1 / -1; margin-top: 8px; }
      .chat-messages > .message, .chat-messages > .agent-message-row { max-width: 1100px; }
      .chat-messages > .agent-message-row { margin-right: auto; }
      .chat-messages > .message.user { max-width: min(85%, 960px); }
    }
    @media (max-width: 1000px) {
      .feature-highlights ul { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
    }
    @media (max-width: 800px) {
      .hero-note, .architecture-note { display: none; }
      .steps-grid { gap: 16px; }
      .merged-grid { gap: 24px; }
      .tool-grid-head, .tool-row { grid-template-columns: minmax(100px, 1fr) 68px 84px; gap: 6px; padding-inline: 0; }
      .tool-hide-sm { display: none; }
      .quick-help-grid { grid-template-columns: minmax(0, 1fr); gap: 0; margin-top: 12px; }
      .quick-help-panel > summary { min-height: 50px; }
    }
    @media (max-width: 640px) {
      .container { padding: 0 16px; }
      .site-header { min-height: 64px; gap: 8px; }
      .header-actions { gap: 8px; }
      .header-support { padding: 6px 8px; gap: 4px; }
      .support-long-label { display: none; }
      .header-source span { display: none; }
      .header-source { padding: 8px; }
      .wordmark { font-size: 1rem; gap: 6px; }
      .hero { padding: 20px 0 18px; }
      h1 { font-size: 1.625rem; }
      .hero p { font-size: .875rem; }
      .theme-option { width: 30px; height: 34px; }
      .terminal-header { grid-template-columns: 1fr auto; padding: 8px; gap: 8px; }
      .terminal-identity { display: none; }
      .terminal-tabs { min-width: 0; }
      .terminal-tab { flex: 1; padding-inline: 10px; }
      .terminal-body { padding: 16px; }
      .os-selector-wrapper { gap: 10px; margin-bottom: 16px; }
      .os-segment { min-height: 36px; }
      .install-meta { align-items: flex-start; flex-direction: column; gap: 12px; }
      .command-line { gap: 8px; padding-left: 12px; }
      .cmd-header { padding-left: 12px; }
      .cmd-box-modern { font-size: 13px; }
      .copy-btn-modern { width: 40px; height: 40px; }
      .steps-grid, .merged-grid, .path-grid { grid-template-columns: 1fr; gap: 24px; }
      .feature-highlights { margin-top: 20px; padding-block: 16px; }
      .feature-highlights ul { gap: 16px 12px; }
      .feature-highlights li { gap: 8px; }
      .feature-symbol { width: 28px; height: 28px; border-radius: 8px; }
      .feature-symbol .icon { width: 16px; height: 16px; }
      .project-overview { grid-template-columns: minmax(0, 1fr); gap: 8px; padding-top: 14px; }
      .section { padding: 24px 0; }
      .path-grid { gap: 12px; }
      .path-item { flex-direction: row; justify-content: space-between; gap: 12px; }
      .path-item code { text-align: right; min-width: 0; }
      .terminal-dashboard.expanded { inset: 0; height: 100dvh; border-radius: 0; }
      .expanded .terminal-body { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
      .ai-chat-container { --chat-height: clamp(420px, calc(100dvh - 350px), 600px); }
      .expanded .ai-chat-container { min-height: 0; }
      #chat-input { max-height: 160px; }
      .chat-empty { padding: 0; gap: 10px; }
      .chat-empty-emblem { width: 40px; height: 40px; border-radius: 12px; }
      .chat-empty .empty-icon { width: 28px; height: 28px; }
      .chat-empty h2 { font-size: 1.125rem; }
      .flag-btn { padding: 10px; gap: 8px; }
      .help-scenarios { grid-template-columns: 1fr; }
      .help-guide-heading { align-items: flex-start; flex-direction: column; gap: 8px; }
      .agent-message-row { gap: 8px; }
      .agent-avatar { width: 26px; height: 26px; border-radius: 8px; }
      .agent-avatar svg { width: 20px; height: 20px; }
      .agent-bubble { padding: 10px; }
      .message { max-width: 94%; }
      .chat-messages { padding: 10px; }
      .tool-call-header { flex-wrap: wrap; }
      .tool-time { margin-left: 24px; }
      .tool-grid-head, .tool-row { grid-template-columns: minmax(0, 1fr) 58px 78px; }
      .footer { flex-direction: column; }
      th, td { padding: 12px 8px; }
      [data-tooltip]::after { display: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
    }
    @media (max-width: 520px) {
      .header-source { display: none; }
      .support-dialog { padding: 18px 16px 16px; }
    }
    @media (max-width: 380px) {
      .header-source { display: none; }
      .wordmark > svg { display: none; }
      .container { padding-inline: 12px; }
      .terminal-body { padding: 12px; }
    }
  </style>`;
}
