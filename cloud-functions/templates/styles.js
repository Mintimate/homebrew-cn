// CSS 样式模板
export function getStyles() {
  return `
    <style>
        /* ─── 核心变量 ─── */
        :root {
            --accent: #ff8c42;
            --accent-light: #ffb347;
            --green: #2e9f62;
            --gold: #f4b400;
            --bg: #fffaf0;
            --card-bg: rgba(255, 255, 255, 0.8);
            --card-border: rgba(255, 184, 77, 0.25);
            --text: #3e3528;
            --text-muted: #7a6a55;
            --code-bg: #fff3d9;
            --radius: 16px;
            --font-mono: "SF Mono", "Fira Code", "JetBrains Mono", Consolas, monospace;
        }

        :root[data-theme="dark"] {
            --accent: #ffb36b;
            --accent-light: #ffc98f;
            --green: #67d49a;
            --gold: #ffd166;
            --bg: #15120f;
            --card-bg: rgba(30, 24, 19, 0.8);
            --card-border: rgba(255, 179, 71, 0.15);
            --text: #f5e6d3;
            --text-muted: #c8b39a;
            --code-bg: #2a2118;
        }

        /* ─── 基础样式 ─── */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: var(--text);
            background: var(--bg);
            overflow-x: hidden;
            transition: background 0.3s, color 0.3s;
        }

        /* 动态背景光晕 */
        body::before {
            content: '';
            position: fixed;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle at 20% 30%, rgba(255, 179, 71, 0.12) 0%, transparent 50%),
                        radial-gradient(circle at 80% 70%, rgba(244, 180, 0, 0.08) 0%, transparent 50%);
            z-index: -1;
            pointer-events: none;
        }
        
        html[data-theme="dark"] body::before {
            background: radial-gradient(circle at 20% 30%, rgba(255, 179, 71, 0.06) 0%, transparent 50%),
                        radial-gradient(circle at 80% 70%, rgba(244, 180, 0, 0.04) 0%, transparent 50%);
        }

        .container {
            max-width: 1280px;
            margin: 0 auto;
            padding: 40px 24px;
        }

        /* ─── 头部 (Hero) ─── */
        .hero {
            text-align: center;
            padding: 60px 0 40px;
            opacity: 0;
            transform: translateY(20px);
            animation: fadeInUp 0.8s ease-out forwards;
        }
        
        .hero-top {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-bottom: 24px;
        }

        .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(180deg, rgba(255, 248, 230, 0.9), rgba(255, 234, 196, 0.85));
            border: 1px solid rgba(220, 122, 28, 0.25);
            padding: 6px 14px;
            border-radius: 100px;
            font-size: 0.82rem;
            color: #6a3500;
            box-shadow: 0 4px 12px rgba(224, 132, 36, 0.1);
        }
        
        html[data-theme="dark"] .hero-badge {
            background: linear-gradient(180deg, rgba(55, 36, 24, 0.8), rgba(39, 27, 20, 0.75));
            border-color: rgba(255, 176, 90, 0.25);
            color: #ffe7ca;
        }

        .hero-badge .dot {
            width: 7px;
            height: 7px;
            background: var(--accent);
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        h1 {
            font-size: clamp(2.2rem, 5vw, 3.6rem);
            font-weight: 800;
            letter-spacing: -0.02em;
            background: linear-gradient(135deg, #8a4b08 0%, #ff8c42 50%, #f4b400 100%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 16px;
        }
        
        html[data-theme="dark"] h1 {
            background: linear-gradient(135deg, #ffb36b 0%, #ff8c42 60%, #ffd166 100%);
            -webkit-background-clip: text;
            background-clip: text;
        }

        .hero-desc {
            font-size: 1.15rem;
            color: var(--text-muted);
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.6;
        }

        /* 主题切换按钮 */
        .theme-toggle {
            border: 1px solid rgba(255,184,77,0.4);
            background: rgba(255,255,255,0.8);
            color: #6d5a44;
            border-radius: 99px;
            padding: 3px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            box-shadow: 0 4px 10px rgba(255,179,71,0.1);
            transition: all 0.3s;
        }
        
        html[data-theme="dark"] .theme-toggle {
            background: rgba(30, 24, 19, 0.8);
            border-color: rgba(255,179,71,0.25);
            color: #ffe7ca;
        }

        .theme-toggle:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 14px rgba(255,179,71,0.2);
        }

        .theme-track {
            position: relative;
            width: 84px;
            height: 28px;
            border-radius: 99px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            align-items: center;
            padding: 0 2px;
        }

        .theme-icon {
            font-size: 0.8rem;
            text-align: center;
            z-index: 2;
            transition: opacity 0.3s;
            opacity: 0.6;
        }

        .theme-thumb {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: linear-gradient(180deg, #ffffff, #ffe8bf);
            box-shadow: 0 2px 5px rgba(0,0,0,0.15);
            transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
            z-index: 1;
        }

        .theme-toggle[data-theme="light"] .theme-icon.sun { opacity: 1; }
        .theme-toggle[data-theme="system"] .theme-icon.system { opacity: 1; }
        .theme-toggle[data-theme="dark"] .theme-icon.moon { opacity: 1; }

        .theme-toggle[data-theme="light"] .theme-thumb { transform: translateX(0); }
        .theme-toggle[data-theme="system"] .theme-thumb { transform: translateX(27px); }
        .theme-toggle[data-theme="dark"] .theme-thumb { transform: translateX(54px); }

        /* ─── 终端仪表盘 (Terminal) ─── */
        .terminal-dashboard {
            background: #110e0c;
            border: 1px solid rgba(255, 184, 77, 0.15);
            border-radius: 16px;
            box-shadow: 0 24px 60px rgba(0,0,0,0.35);
            overflow: hidden;
            margin-bottom: 40px;
            opacity: 0;
            transform: translateY(20px);
            animation: fadeInUp 0.8s ease-out 0.2s forwards;
            height: 540px;
            min-height: 450px;
            max-height: 950px;
            resize: vertical;
            display: flex;
            flex-direction: column;
        }

        .terminal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 20px;
            background: #191411;
            border-bottom: 1px solid rgba(255, 184, 77, 0.08);
            flex-shrink: 0;
        }

        .terminal-dots {
            display: flex;
            gap: 8px;
            width: 80px;
        }

        .terminal-dot {
            width: 11px;
            height: 11px;
            border-radius: 50%;
        }
        .terminal-dot.red { background: #ff5f56; }
        .terminal-dot.yellow { background: #ffbd2e; }
        .terminal-dot.green { background: #27c93f; }

        .terminal-tabs {
            display: flex;
            gap: 4px;
            background: rgba(0, 0, 0, 0.2);
            padding: 3px;
            border-radius: 8px;
        }

        .terminal-tab {
            background: transparent;
            border: none;
            color: #8a7a6b;
            padding: 6px 16px;
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
            font-family: inherit;
        }
        .terminal-tab:hover {
            color: #ffe7ca;
        }
        .terminal-tab.active {
            color: #ff8c42;
            background: rgba(255, 140, 66, 0.12);
        }

        .tab-icon {
            opacity: 0.7;
        }

        .terminal-status {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.75rem;
            color: #8a7a6b;
            font-family: var(--font-mono);
            width: 80px;
            justify-content: flex-end;
        }

        .status-indicator {
            width: 6px;
            height: 6px;
            border-radius: 50%;
        }
        .status-indicator.online {
            background: #27c93f;
            box-shadow: 0 0 8px rgba(39, 201, 63, 0.6);
        }

        .terminal-body {
            padding: 24px;
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .terminal-panel {
            display: none;
            opacity: 0;
            transition: opacity 0.25s ease;
            height: 100%;
        }
        .terminal-panel.active {
            display: flex;
            flex-direction: column;
            opacity: 1;
            flex: 1;
            height: 100%;
        }

        /* ─── 安装控制面板 ─── */
        .os-selector-wrapper {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            border-bottom: 1px solid rgba(255, 184, 77, 0.06);
            padding-bottom: 16px;
            flex-wrap: wrap;
            gap: 12px;
        }

        .selector-label {
            font-size: 0.88rem;
            color: #a8957d;
            font-weight: 600;
        }

        .os-segmented-control {
            display: flex;
            background: #191411;
            padding: 3px;
            border-radius: 8px;
            border: 1px solid rgba(255, 184, 77, 0.08);
        }

        .os-segment {
            background: transparent;
            border: none;
            color: #8a7a6b;
            padding: 6px 18px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 600;
            transition: all 0.2s;
            font-family: inherit;
        }
        .os-segment:hover {
            color: #ffe7ca;
        }
        .os-segment.active {
            background: #ff8c42;
            color: #fff;
            box-shadow: 0 2px 8px rgba(255, 140, 66, 0.25);
        }

        .cmd-section {
            margin-bottom: 20px;
        }

        .cmd-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .cmd-label {
            font-size: 0.82rem;
            color: #8a7a6b;
            font-weight: 600;
        }

        .copy-btn-modern {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 184, 77, 0.12);
            color: #a8957d;
            padding: 5px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.78rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
            font-family: inherit;
        }
        .copy-btn-modern:hover {
            background: rgba(255, 140, 66, 0.1);
            border-color: var(--accent);
            color: var(--accent);
        }
        .copy-btn-modern.copied {
            background: rgba(103, 212, 154, 0.12);
            border-color: var(--green);
            color: var(--green);
        }

        .cmd-box-modern {
            background: #080605;
            border: 1px solid rgba(255, 184, 77, 0.06);
            color: #ffb36b;
            padding: 16px 18px;
            border-radius: 10px;
            font-family: var(--font-mono);
            font-size: 0.88rem;
            overflow-x: auto;
            white-space: nowrap;
            box-shadow: inset 0 2px 6px rgba(0,0,0,0.3);
        }
        .cmd-box-modern .prompt {
            color: var(--green);
            margin-right: 8px;
            user-select: none;
        }

        .panel-hint {
            font-size: 0.8rem;
            color: #8a7a6b;
            margin-top: 6px;
        }

        .panel-footer-links {
            margin-top: auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid rgba(255, 184, 77, 0.06);
            padding-top: 18px;
            flex-wrap: wrap;
            gap: 12px;
        }

        .footer-hint {
            font-size: 0.78rem;
            color: #6a5a4a;
        }

        .footer-actions {
            display: flex;
            gap: 14px;
        }

        .footer-action-link {
            font-size: 0.82rem;
            font-weight: 600;
            text-decoration: none !important;
            transition: opacity 0.2s;
        }
        .footer-action-link:hover {
            opacity: 0.85;
        }
        .footer-action-link.link-bili { color: #fb7299; }
        .footer-action-link.link-afd { color: #ff8c42; }

        /* ─── AI 诊断面板 ─── */
        .ai-chat-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            flex: 1;
        }

        .chat-messages {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 14px;
            padding-right: 4px;
            margin-bottom: 16px;
            scrollbar-width: thin;
            scrollbar-color: rgba(255,184,77,0.15) transparent;
        }
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-thumb { background: rgba(255,184,77,0.15); border-radius: 10px; }

        .message {
            max-width: 88%;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 0.9rem;
            line-height: 1.5;
            word-wrap: break-word;
            animation: fadeIn 0.25s ease-out;
        }
        .message.system {
            align-self: flex-start;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 184, 77, 0.08);
            color: #ffe7ca;
        }
        .message.system a {
            color: var(--accent);
            text-decoration: none;
            font-weight: 600;
        }
        .message.system a:hover {
            color: var(--accent-light);
            text-decoration: underline;
        }

        /* ─── Assistant Message Row (AI 消息结构) ─── */
        .agent-message-row {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
            align-items: flex-start;
            width: 100%;
            animation: fadeIn 0.25s ease-out;
        }

        .agent-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(255, 140, 66, 0.08);
            border: 1px solid rgba(255, 140, 66, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent);
            flex-shrink: 0;
            margin-top: 2px;
        }
        .agent-avatar svg {
            width: 18px;
            height: 18px;
            display: block;
        }

        .agent-bubble {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        /* 最终回答的文本内容 */
        .agent-text-content {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 184, 77, 0.08);
            color: #ffe7ca;
            padding: 14px 16px;
            border-radius: 12px;
            font-size: 0.9rem;
            line-height: 1.6;
            word-wrap: break-word;
            width: 100%;
        }
        
        /* Inside agent text content, style markdown */
        .agent-text-content p {
            margin-bottom: 8px;
        }
        .agent-text-content p:last-child {
            margin-bottom: 0;
        }

        .agent-usage {
            margin-top: 2px;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 184, 77, 0.12);
            color: #8a7a6b;
            font-family: var(--font-mono);
            font-size: 0.68rem;
            line-height: 1.4;
            word-break: break-word;
        }

        .chat-messages a {
            color: var(--accent);
            text-decoration: none;
            font-weight: 600;
        }
        .chat-messages a:hover {
            color: var(--accent-light);
            text-decoration: underline;
        }
        .agent-text-content code {
            background: rgba(255, 140, 66, 0.12);
            color: #ffb36b;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: var(--font-mono);
            font-size: 0.88rem;
        }
        .agent-text-content ul, .agent-text-content ol {
            margin-top: 8px;
            margin-bottom: 8px;
            padding-left: 20px;
        }
        .agent-text-content li {
            margin-bottom: 4px;
            line-height: 1.5;
        }
        .agent-text-content h1, .agent-text-content h2, .agent-text-content h3, .agent-text-content h4 {
            color: #ffe7ca;
            margin: 16px 0 8px 0;
            font-weight: 700;
        }
        .agent-text-content h1 { font-size: 1.2rem; }
        .agent-text-content h2 { font-size: 1.1rem; }
        .agent-text-content h3 { font-size: 1.0rem; }

        /* Tables inside markdown */
        .agent-text-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 14px 0;
            font-size: 0.85rem;
            background: rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 184, 77, 0.08);
            border-radius: 8px;
            overflow: hidden;
        }
        .agent-text-content th, .agent-text-content td {
            padding: 10px 14px;
            border: 1px solid rgba(255, 184, 77, 0.06);
        }
        .agent-text-content th {
            background: rgba(255, 184, 77, 0.05);
            font-weight: 700;
            color: #ffe7ca;
        }
        
        /* Markdown formatting inside messages */
        .message p {
            margin-bottom: 8px;
        }
        .message p:last-child {
            margin-bottom: 0;
        }
        .message code {
            background: rgba(255, 140, 66, 0.12);
            color: #ffb36b;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: var(--font-mono);
            font-size: 0.85em;
        }
        .message ul, .message ol {
            margin: 8px 0 8px 20px;
        }
        .message li {
            margin-bottom: 4px;
        }
        .message h1, .message h2, .message h3, .message h4 {
            color: #ffe7ca;
            margin: 16px 0 8px 0;
            font-weight: 700;
        }
        .message h1 { font-size: 1.2rem; }
        .message h2 { font-size: 1.1rem; }
        .message h3 { font-size: 1.0rem; }

        /* Code snippets (Markdown blocks) */
        .code-snippet {
            position: relative;
            margin: 12px 0;
            padding: 14px 16px;
            background: #080605 !important;
            border: 1px solid rgba(255, 184, 77, 0.1) !important;
            border-radius: 8px;
            font-family: var(--font-mono);
            font-size: 0.85rem;
            overflow-x: auto;
            white-space: pre;
        }
        .code-snippet code {
            background: transparent !important;
            color: #ffb36b !important;
            padding: 0 !important;
            font-size: inherit !important;
        }
        .code-copy-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 184, 77, 0.15);
            color: #a8957d;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
            opacity: 0;
            font-family: inherit;
        }
        .code-snippet:hover .code-copy-btn {
            opacity: 1;
        }
        .code-copy-btn:hover {
            background: rgba(255, 140, 66, 0.12);
            border-color: #ff8c42;
            color: #ff8c42;
        }
        .code-copy-btn.copied {
            background: rgba(103, 212, 154, 0.12);
            border-color: var(--green);
            color: var(--green);
        }

        .message.user {
            align-self: flex-end;
            background: linear-gradient(135deg, rgba(255,140,66,0.15), rgba(244,180,0,0.12));
            border: 1px solid rgba(255, 140, 66, 0.25);
            color: #ffb36b;
        }

        /* ─── 推理链 & 工具调用样式 ─── */
        .thinking-wrapper {
            margin: 10px 0;
            border: 1px solid rgba(255, 184, 77, 0.08);
            border-radius: 10px;
            background: rgba(0, 0, 0, 0.15);
            overflow: hidden;
            width: 100%;
        }
        .thinking-wrapper.collapsed .thinking-content,
        .thinking-wrapper.collapsed .thinking-body {
            display: none !important;
        }

        .thinking-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            background: rgba(255, 184, 77, 0.03);
            font-size: 0.82rem;
            color: #a8957d;
            font-weight: 600;
            cursor: pointer;
            user-select: none;
            border-bottom: 1px solid rgba(255, 184, 77, 0.04);
        }
        .thinking-header svg {
            transition: transform 0.2s;
            color: #8a7a6b;
            flex-shrink: 0;
        }

        .thinking-content {
            padding: 14px;
            font-size: 0.85rem;
            color: #a8957d;
            border-bottom: 1px solid rgba(255, 184, 77, 0.04);
            line-height: 1.5;
            background: rgba(0, 0, 0, 0.2);
            overflow-y: auto;
            max-height: 200px;
        }

        .thinking-body {
            padding: 10px 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        /* 工具调用记录 */
        .tool-call-log {
            border: 1px solid rgba(255, 184, 77, 0.06);
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.2);
            overflow: hidden;
            width: 100%;
        }

        .tool-call-header {
            display: flex;
            align-items: center;
            padding: 10px 14px;
            font-size: 0.82rem;
            font-weight: 600;
            gap: 8px;
        }
        .tool-call-header svg {
            width: 14px;
            height: 14px;
            flex-shrink: 0;
        }
        
        .tool-call-header.running {
            color: var(--accent);
            background: rgba(255, 140, 66, 0.03);
        }
        .tool-call-header.success {
            color: var(--green);
            background: rgba(39, 201, 63, 0.03);
        }
        .tool-call-header.failed {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.03);
        }

        .tool-time {
            margin-left: auto;
            font-size: 0.78rem;
            color: #54493f;
            font-family: var(--font-mono);
        }

        .tool-call-args {
            border-top: 1px solid rgba(255, 184, 77, 0.04);
        }
        .tool-call-args summary {
            padding: 8px 14px;
            font-size: 0.78rem;
            color: #8a7a6b;
            cursor: pointer;
            user-select: none;
            background: rgba(255, 184, 77, 0.01);
        }
        .tool-call-args summary:hover {
            color: #ffe7ca;
        }

        .tool-call-output {
            padding: 12px 14px;
            background: #080605;
            color: #a8957d;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            max-height: 150px;
            overflow-y: auto;
            white-space: pre-wrap;
            border-top: 1px solid rgba(255, 184, 77, 0.04);
            width: 100%;
        }

        /* ─── 诊断工具富内容表格 & 卡片 ─── */
        .tool-rich-body {
            padding: 12px;
            background: rgba(0, 0, 0, 0.2);
            border-top: 1px solid rgba(255, 184, 77, 0.06);
        }

        .tool-empty {
            padding: 16px;
            text-align: center;
            color: #8a7a6b;
            font-size: 0.82rem;
        }

        .tool-grid-head {
            display: grid;
            grid-template-columns: 2fr 80px 80px 60px 100px;
            gap: 10px;
            padding: 8px 12px;
            background: rgba(255, 184, 77, 0.04);
            border-radius: 6px;
            font-size: 0.78rem;
            font-weight: 700;
            color: #ffe7ca;
            margin-bottom: 8px;
        }

        .tool-row {
            display: grid;
            grid-template-columns: 2fr 80px 80px 60px 100px;
            gap: 10px;
            padding: 10px 12px;
            border-bottom: 1px solid rgba(255, 184, 77, 0.04);
            align-items: center;
            font-size: 0.8rem;
        }
        .tool-row:last-child {
            border-bottom: none;
        }
        .tool-row:hover {
            background: rgba(255, 255, 255, 0.01);
        }

        .tool-main {
            display: flex;
            flex-direction: column;
            gap: 2px;
            color: #ffe7ca;
        }
        .tool-main span {
            font-size: 0.72rem;
            color: #8a7a6b;
        }

        .tool-mono {
            font-family: var(--font-mono);
            color: #a8957d;
        }

        .tool-badge {
            font-size: 0.72rem;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
            text-align: center;
            width: fit-content;
        }
        .tool-badge.ok { background: rgba(39, 201, 63, 0.12); color: var(--green); }
        .tool-badge.warn { background: rgba(244, 180, 0, 0.12); color: var(--gold); }
        .tool-badge.bad { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
        .tool-badge.info { background: rgba(255, 140, 66, 0.12); color: var(--accent); }

        /* 诊断问题列表 */
        .diagnostic-section {
            padding: 12px;
            border-bottom: 1px solid rgba(255, 184, 77, 0.04);
        }
        .diagnostic-section:last-child {
            border-bottom: none;
        }
        .diagnostic-section-title {
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--accent);
            margin-bottom: 8px;
        }
        .issue-suggest {
            font-size: 0.78rem;
            color: #8a7a6b;
            margin-top: 4px;
            padding-left: 12px;
            border-left: 2px solid rgba(255, 184, 77, 0.1);
        }

        @media (max-width: 576px) {
            .tool-grid-head {
                grid-template-columns: 1.2fr 80px 80px;
            }
            .tool-row {
                grid-template-columns: 1.2fr 80px 80px;
            }
            .tool-hide-sm {
                display: none;
            }
        }

        /* 复制按钮与正在输入跳动点 */
        .tool-copy-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 140, 66, 0.08);
            border: 1px solid rgba(255, 140, 66, 0.25);
            color: #ffb36b;
            padding: 5px 12px;
            border-radius: 6px;
            font-size: 0.78rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 12px;
            font-family: inherit;
            user-select: none;
        }
        .tool-copy-btn:hover {
            background: rgba(255, 140, 66, 0.15);
            border-color: rgba(255, 140, 66, 0.4);
            color: #ffe7ca;
        }
        .tool-copy-btn:active {
            transform: scale(0.98);
        }

        .typing-indicator {
            display: flex;
            align-items: center;
            gap: 5px;
            height: 16px;
            padding-left: 2px;
        }
        .typing-indicator span {
            width: 5px;
            height: 5px;
            background: #a8957d;
            border-radius: 50%;
            display: inline-block;
            animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0.2); opacity: 0.4; }
            40% { transform: scale(1.0); opacity: 1; }
        }

        .status-hint {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            font-size: 0.82rem;
            color: #a8957d;
            background: rgba(255, 184, 77, 0.03);
            border: 1px solid rgba(255, 184, 77, 0.06);
            border-radius: 6px;
            margin: 10px 0;
            width: fit-content;
            animation: fadeIn 0.25s ease-out;
        }

        .spin-svg {
            width: 14px;
            height: 14px;
            flex-shrink: 0;
            animation: spin 1.2s linear infinite;
        }
        @keyframes spin {
            100% { transform: rotate(360deg); }
        }

        .chat-footer {
            margin-top: auto;
        }

        .chat-top-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 10px;
        }

        .chat-doc-link {
            display: inline-flex;
            align-items: center;
            min-height: 31px;
            padding: 6px 12px;
            border: 1px solid rgba(42, 167, 160, 0.22);
            border-radius: 8px;
            background: rgba(42, 167, 160, 0.08);
            color: #6bd2ca;
            font-size: 0.78rem;
            font-weight: 700;
            text-decoration: none !important;
            transition: all 0.2s ease;
        }
        .chat-doc-link:hover {
            border-color: rgba(42, 167, 160, 0.5);
            background: rgba(42, 167, 160, 0.14);
            color: #8ee8e2;
            transform: translateY(-1px);
        }

        .chat-quick-flags {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 12px;
        }

        .flag-btn {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 184, 77, 0.08);
            color: #8a7a6b;
            padding: 5px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.74rem;
            font-family: var(--font-mono);
            transition: all 0.2s;
        }
        .flag-btn:hover {
            border-color: rgba(255, 140, 66, 0.3);
            color: var(--accent);
            background: rgba(255, 140, 66, 0.05);
        }

        .chat-input-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #080605;
            border: 1px solid rgba(255, 184, 77, 0.08);
            padding: 8px 14px;
            border-radius: 10px;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .chat-input-wrapper:focus-within {
            border-color: rgba(255, 140, 66, 0.4);
            box-shadow: 0 0 0 3px rgba(255, 140, 66, 0.1);
        }

        .input-prompt {
            color: var(--accent);
            font-family: var(--font-mono);
            font-size: 0.88rem;
            font-weight: 700;
            user-select: none;
        }

        #chat-input {
            flex: 1;
            border: none;
            background: transparent;
            color: #ffe7ca;
            font-size: 0.88rem;
            outline: none;
            resize: none;
            font-family: inherit;
            max-height: 80px;
            padding: 4px 0;
        }

        .chat-send-btn {
            background: transparent;
            border: none;
            color: var(--accent);
            cursor: pointer;
            padding: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s;
        }
        .chat-send-btn:hover:not(:disabled) {
            background: rgba(255, 140, 66, 0.1);
            transform: scale(1.05);
        }
        .chat-send-btn:disabled {
            color: #3d342b;
            cursor: not-allowed;
        }

        /* ─── 媒体与数据区域 (Media Grid) ─── */
        .media-grid {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 24px;
            margin-bottom: 40px;
            align-items: start;
        }
        @media (max-width: 768px) {
            .media-grid { grid-template-columns: 1fr; }
        }

        /* ─── 卡片样式 (Card) ─── */
        .card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: var(--radius);
            padding: 28px;
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
            display: flex;
            flex-direction: column;
        }
        .card:hover {
            border-color: rgba(255, 140, 66, 0.3);
            box-shadow: 0 12px 30px rgba(255, 179, 71, 0.08);
            transform: translateY(-2px);
        }

        .card-title {
            font-size: 1.2rem;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        html[data-theme="dark"] .card-title {
            color: #ffe7ca;
        }

        /* 实时数据子卡片 */
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: rgba(255, 255, 255, 0.4);
            border: 1px solid rgba(255, 184, 77, 0.15);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        html[data-theme="dark"] .stat-card {
            background: rgba(255, 255, 255, 0.02);
            border-color: rgba(255, 179, 71, 0.1);
        }

        .stat-value {
            font-size: 1.8rem;
            font-weight: 800;
            color: var(--accent);
            letter-spacing: -0.02em;
        }

        .stat-label {
            font-size: 0.78rem;
            color: var(--text-muted);
            margin-top: 4px;
        }

        /* 最近安装滚动列表 */
        .recent-list {
            max-height: 180px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding-right: 4px;
            scrollbar-width: thin;
        }
        .recent-list::-webkit-scrollbar { width: 3px; }
        .recent-list::-webkit-scrollbar-thumb { background: rgba(255, 184, 77, 0.15); border-radius: 10px; }

        .recent-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: rgba(255, 255, 255, 0.3);
            border: 1px solid rgba(255, 184, 77, 0.1);
            border-radius: 10px;
            font-size: 0.82rem;
        }
        html[data-theme="dark"] .recent-item {
            background: rgba(255, 255, 255, 0.01);
            border-color: rgba(255, 179, 71, 0.05);
        }

        .ri-location {
            color: var(--text);
            font-weight: 500;
            flex: 1;
            margin-left: 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .ri-ip {
            font-family: var(--font-mono);
            color: var(--accent);
            background: rgba(255, 140, 66, 0.08);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.76rem;
            margin-right: 12px;
        }

        .ri-time {
            color: var(--text-muted);
            font-size: 0.76rem;
        }

        /* ─── 核心特性 (Features) ─── */
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
        }

        .feature-item {
            background: rgba(255, 255, 255, 0.3);
            border: 1px solid rgba(255, 184, 77, 0.1);
            border-radius: 12px;
            padding: 20px;
            transition: all 0.25s;
        }
        html[data-theme="dark"] .feature-item {
            background: rgba(255, 255, 255, 0.01);
            border-color: rgba(255, 179, 71, 0.05);
        }
        .feature-item:hover {
            border-color: rgba(255, 140, 66, 0.25);
            background: var(--card-bg);
            transform: translateY(-1px);
        }

        .feature-title {
            font-size: 1rem;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 8px;
            display: block;
        }
        html[data-theme="dark"] .feature-title {
            color: #ffe7ca;
        }

        .feature-desc {
            font-size: 0.85rem;
            color: var(--text-muted);
            line-height: 1.5;
        }

        /* ─── 安装流程 (Steps) ─── */
        .steps-horizontal {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }

        .step {
            position: relative;
            padding: 20px;
            background: rgba(255, 255, 255, 0.3);
            border: 1px solid rgba(255, 184, 77, 0.1);
            border-radius: 12px;
        }
        html[data-theme="dark"] .step {
            background: rgba(255, 255, 255, 0.01);
            border-color: rgba(255, 179, 71, 0.05);
        }

        .step-title {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--accent);
            margin-bottom: 8px;
        }

        .step-desc {
            font-size: 0.82rem;
            color: var(--text-muted);
            line-height: 1.5;
        }

        /* ─── 镜像对比与路径 ─── */
        .table-wrap {
            overflow-x: auto;
            border: 1px solid var(--card-border);
            border-radius: 12px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 0.88rem;
        }

        th, td {
            padding: 14px 18px;
            border-bottom: 1px solid var(--card-border);
        }
        tr:last-child td {
            border-bottom: none;
        }

        th {
            background: rgba(255, 184, 77, 0.06);
            font-weight: 700;
            color: var(--text);
        }
        html[data-theme="dark"] th {
            color: #ffe7ca;
        }

        .mirror-tag {
            font-size: 0.8rem;
        }

        .path-grid {
            display: grid;
            gap: 16px;
            margin-top: 16px;
        }

        .path-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 18px;
            background: rgba(255, 255, 255, 0.3);
            border: 1px solid rgba(255, 184, 77, 0.1);
            border-radius: 12px;
            flex-wrap: wrap;
            gap: 12px;
        }
        html[data-theme="dark"] .path-item {
            background: rgba(255, 255, 255, 0.01);
            border-color: rgba(255, 179, 71, 0.05);
        }

        .path-item .arch {
            font-weight: 700;
            font-size: 0.88rem;
            color: var(--text);
        }
        html[data-theme="dark"] .path-item .arch {
            color: #ffe7ca;
        }

        .path-item .note {
            font-size: 0.78rem;
            color: var(--text-muted);
            margin-left: 8px;
        }

        .path-item .path {
            font-family: var(--font-mono);
            font-size: 0.82rem;
            color: var(--accent);
            background: rgba(255, 140, 66, 0.08);
            padding: 4px 10px;
            border-radius: 6px;
        }

        /* ─── FAQ 区域 ─── */
        .faq-list {
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .faq-item {
            background: rgba(255, 255, 255, 0.3);
            border: 1px solid rgba(255, 184, 77, 0.1);
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s;
        }
        html[data-theme="dark"] .faq-item {
            background: rgba(255, 255, 255, 0.01);
            border-color: rgba(255, 179, 71, 0.05);
        }

        .faq-q {
            padding: 18px 22px;
            font-weight: 700;
            font-size: 0.95rem;
            color: var(--text);
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        }
        html[data-theme="dark"] .faq-q {
            color: #ffe7ca;
        }

        .faq-a {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s cubic-bezier(0, 1, 0, 1);
            padding: 0 22px;
            font-size: 0.88rem;
            color: var(--text-muted);
            line-height: 1.6;
        }
        
        .faq-item.active .faq-a {
            max-height: 1000px;
            padding-bottom: 18px;
            transition: max-height 0.3s cubic-bezier(1, 0, 1, 0);
        }

        .faq-icon {
            transition: transform 0.3s;
            opacity: 0.6;
        }
        .faq-item.active .faq-icon {
            transform: rotate(180deg);
        }

        /* ─── 页脚 (Footer) ─── */
        .footer {
            text-align: center;
            padding: 40px 0 20px;
            border-top: 1px solid var(--card-border);
            margin-top: 60px;
            font-size: 0.82rem;
            color: var(--text-muted);
        }

        .footer-links {
            margin-bottom: 12px;
            display: flex;
            justify-content: center;
            gap: 16px;
        }

        .footer-links a {
            color: var(--text-muted);
            text-decoration: none;
            transition: color 0.2s;
        }
        .footer-links a:hover {
            color: var(--accent);
        }

        .footer a {
            color: var(--accent);
            text-decoration: none;
            font-weight: 600;
            transition: color 0.2s;
        }
        .footer a:hover {
            color: var(--accent-light);
            text-decoration: underline;
        }

        /* 最近安装数据收起/展开按钮 */
        .recent-toggle-btn {
            display: block;
            width: 100%;
            padding: 10px;
            margin-top: 14px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 184, 77, 0.15);
            border-radius: 10px;
            color: var(--text-muted);
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            font-family: inherit;
            text-align: center;
        }
        html[data-theme="dark"] .recent-toggle-btn {
            background: rgba(255, 255, 255, 0.01);
            border-color: rgba(255, 179, 71, 0.05);
        }
        .recent-toggle-btn:hover {
            border-color: var(--accent);
            color: var(--accent);
            background: rgba(255, 140, 66, 0.06);
        }

        /* ─── 动画与辅助 ─── */
        .section {
            margin-bottom: 40px;
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 140, 66, 0.4); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(255, 140, 66, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 140, 66, 0); }
        }

        /* ─── 合并区域 (Merged Grid) ─── */
        .merged-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
        }
        @media (max-width: 992px) {
            .merged-grid {
                grid-template-columns: 1fr;
                gap: 32px;
            }
        }
        .merged-col {
            display: flex;
            flex-direction: column;
        }
        
        /* 左侧：环境变量垂直列表 */
        .env-vertical-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .env-row-item {
            background: rgba(255, 255, 255, 0.25);
            border: 1px solid rgba(255, 184, 77, 0.08);
            border-radius: 10px;
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            transition: all 0.3s ease;
        }
        html[data-theme="dark"] .env-row-item {
            background: rgba(255, 255, 255, 0.01);
            border-color: rgba(255, 179, 71, 0.04);
        }
        .env-row-item:hover {
            border-color: rgba(255, 140, 66, 0.2);
            background: rgba(255, 140, 66, 0.01);
            transform: translateX(4px);
        }
        .env-row-badge {
            font-family: var(--font-mono);
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--accent);
            align-self: start;
        }
        .env-row-desc {
            font-size: 0.8rem;
            color: var(--text-muted);
        }

        /* ─── FAQ 交互增强 ─── */
        .faq-item:hover {
            border-color: rgba(255, 140, 66, 0.2);
            background: rgba(255, 140, 66, 0.01);
        }
        .faq-item.active {
            border-color: rgba(255, 140, 66, 0.3);
            background: rgba(255, 140, 66, 0.02) !important;
        }

        /* 右侧：官方资源垂直列表 */
        .resources-vertical-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .resource-row-link {
            background: rgba(255, 255, 255, 0.25);
            border: 1px solid rgba(255, 184, 77, 0.08);
            border-radius: 10px;
            padding: 10px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: inherit;
            transition: all 0.3s ease;
        }
        html[data-theme="dark"] .resource-row-link {
            background: rgba(255, 255, 255, 0.01);
            border-color: rgba(255, 179, 71, 0.04);
        }
        .resource-row-link:hover {
            border-color: rgba(255, 140, 66, 0.2);
            background: rgba(255, 140, 66, 0.01);
            transform: translateX(4px);
        }
        .res-icon {
            font-size: 1.4rem;
            flex-shrink: 0;
        }
        .res-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex-grow: 1;
            min-width: 0;
        }
        .res-name {
            font-weight: 700;
            font-size: 0.85rem;
            color: var(--text);
            transition: color 0.2s;
        }
        html[data-theme="dark"] .res-name {
            color: #ffe7ca;
        }
        .resource-row-link:hover .res-name {
            color: var(--accent);
        }
        .res-desc {
            font-size: 0.75rem;
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .res-arrow {
            font-size: 0.8rem;
            color: var(--text-muted);
            opacity: 0.4;
            transition: transform 0.3s, color 0.3s, opacity 0.3s;
        }
        .resource-row-link:hover .res-arrow {
            transform: translate(2px, -2px);
            color: var(--accent);
            opacity: 1;
        }

        /* ─── 核心特性垂直列表 ─── */
        .features-vertical-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .feature-row-item {
            background: rgba(255, 255, 255, 0.25);
            border: 1px solid rgba(255, 184, 77, 0.08);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: flex-start;
            gap: 16px;
            transition: all 0.3s ease;
        }
        html[data-theme="dark"] .feature-row-item {
            background: rgba(255, 255, 255, 0.01);
            border-color: rgba(255, 179, 71, 0.04);
        }
        .feature-row-item:hover {
            border-color: rgba(255, 140, 66, 0.2);
            background: rgba(255, 140, 66, 0.01);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 140, 66, 0.04);
        }
        .feature-icon-badge {
            font-size: 1.5rem;
            width: 40px;
            height: 40px;
            background: rgba(255, 140, 66, 0.08);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .feature-info {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .feature-name {
            font-weight: 700;
            font-size: 0.95rem;
            color: var(--text);
        }
        html[data-theme="dark"] .feature-name {
            color: #ffe7ca;
        }
        .feature-desc {
            font-size: 0.82rem;
            color: var(--text-muted);
            line-height: 1.5;
        }

        /* ─── 安装流程垂直时间轴 ─── */
        .timeline-container {
            display: flex;
            flex-direction: column;
            position: relative;
            padding-left: 20px;
        }
        .timeline-container::before {
            content: '';
            position: absolute;
            left: 31px;
            top: 15px;
            bottom: 15px;
            width: 2px;
            background: rgba(255, 140, 66, 0.15);
        }
        .timeline-item {
            display: flex;
            gap: 20px;
            position: relative;
            padding-bottom: 24px;
        }
        .timeline-item:last-child {
            padding-bottom: 0;
        }
        .timeline-badge {
            width: 24px;
            height: 24px;
            background: #110e0c;
            border: 2px solid var(--accent);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: 700;
            color: var(--accent);
            z-index: 1;
            flex-shrink: 0;
            box-shadow: 0 0 0 4px rgba(255, 140, 66, 0.05);
        }
        html[data-theme="light"] .timeline-badge {
            background: #fff;
        }
        .timeline-content {
            display: flex;
            flex-direction: column;
            gap: 6px;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 184, 77, 0.05);
            border-radius: 12px;
            padding: 14px 18px;
            flex-grow: 1;
            transition: all 0.3s ease;
        }
        html[data-theme="dark"] .timeline-content {
            background: rgba(255, 255, 255, 0.005);
            border-color: rgba(255, 179, 71, 0.03);
        }
        .timeline-item:hover .timeline-content {
            border-color: rgba(255, 140, 66, 0.15);
            background: rgba(255, 140, 66, 0.01);
            transform: translateX(4px);
        }
        .timeline-title {
            font-weight: 700;
            font-size: 0.92rem;
            color: var(--text);
        }
        html[data-theme="dark"] .timeline-title {
            color: #ffe7ca;
        }
        .timeline-desc {
            font-size: 0.82rem;
            color: var(--text-muted);
            line-height: 1.5;
        }

        /* ─── 分享对话按钮 ─── */
        .ai-chat-container {
            position: relative;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        .chat-share-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: rgba(25, 20, 17, 0.75);
            border: 1px solid rgba(255, 184, 77, 0.15);
            border-radius: 8px;
            color: #a8957d;
            font-size: 0.78rem;
            font-weight: 600;
            cursor: pointer;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all 0.3s ease;
        }
        .chat-share-btn:hover {
            border-color: var(--accent);
            color: var(--accent);
            background: rgba(255, 140, 66, 0.08);
            transform: translateY(-1px);
        }
        .chat-share-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .chat-share-btn .spin-loader {
            width: 12px;
            height: 12px;
            border: 2px solid rgba(255, 184, 77, 0.2);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            display: inline-block;
            flex-shrink: 0;
        }

        /* ─── 终端和诊断工具 亮色模式适配 ─── */
        html[data-theme="light"] .terminal-dashboard {
            background: #faf8f6;
            border-color: rgba(220, 122, 28, 0.15);
            box-shadow: 0 24px 60px rgba(220, 122, 28, 0.08);
        }
        html[data-theme="light"] .terminal-header {
            background: #f1ede9;
            border-bottom-color: rgba(220, 122, 28, 0.08);
        }
        html[data-theme="light"] .terminal-tab {
            background: rgba(0, 0, 0, 0.03);
            border-color: rgba(220, 122, 28, 0.08);
            color: #5c544d;
        }
        html[data-theme="light"] .terminal-tab.active {
            background: #faf8f6;
            color: var(--accent);
            border-bottom-color: transparent;
        }
        html[data-theme="light"] .terminal-header .status-indicator {
            color: #5c544d;
        }
        html[data-theme="light"] .terminal-panel {
            background: #faf8f6;
        }
        html[data-theme="light"] .cmd-box-modern {
            background: #f1ede9;
            border-color: rgba(220, 122, 28, 0.08);
            color: #2c221e;
            box-shadow: none;
        }
        html[data-theme="light"] .cmd-box-modern .prompt {
            color: var(--accent);
        }
        html[data-theme="light"] .copy-btn-modern {
            background: rgba(0, 0, 0, 0.03);
            border-color: rgba(220, 122, 28, 0.08);
            color: #5c544d;
        }
        html[data-theme="light"] .copy-btn-modern:hover {
            background: rgba(220, 122, 28, 0.06);
            color: var(--accent);
            border-color: var(--accent);
        }
        html[data-theme="light"] .panel-hint {
            color: #8a7a6b;
        }
        
        /* Chat Input & Share */
        html[data-theme="light"] .chat-input-wrapper {
            background: #f1ede9;
            border-color: rgba(220, 122, 28, 0.12);
        }
        html[data-theme="light"] #chat-input {
            color: #2c221e;
        }
        html[data-theme="light"] #chat-input::placeholder {
            color: #bfaea0;
        }
        html[data-theme="light"] .input-prompt {
            color: var(--accent);
        }
        html[data-theme="light"] .flag-btn {
            background: rgba(0, 0, 0, 0.03);
            border-color: rgba(220, 122, 28, 0.08);
            color: #5c544d;
        }
        html[data-theme="light"] .flag-btn:hover {
            background: rgba(220, 122, 28, 0.06);
            border-color: var(--accent);
            color: var(--accent);
        }
        html[data-theme="light"] .chat-doc-link {
            background: rgba(42, 167, 160, 0.08);
            border-color: rgba(42, 167, 160, 0.22);
            color: #247b76;
        }
        html[data-theme="light"] .chat-doc-link:hover {
            background: rgba(42, 167, 160, 0.13);
            border-color: rgba(42, 167, 160, 0.4);
            color: #176661;
        }
        html[data-theme="light"] .chat-share-btn {
            background: rgba(241, 237, 233, 0.8);
            border-color: rgba(220, 122, 28, 0.15);
            color: #5c544d;
        }
        html[data-theme="light"] .chat-share-btn:hover {
            background: rgba(220, 122, 28, 0.06);
            color: var(--accent);
            border-color: var(--accent);
        }
        
        /* Code blocks inside chat */
        html[data-theme="light"] .code-snippet {
            background: #f1ede9 !important;
            border-color: rgba(220, 122, 28, 0.12) !important;
        }
        html[data-theme="light"] .code-snippet code {
            color: #2c221e !important;
        }
        html[data-theme="light"] .code-copy-btn {
            background: rgba(241, 237, 233, 0.9);
            border-color: rgba(220, 122, 28, 0.12);
            color: #5c544d;
        }
        html[data-theme="light"] .code-copy-btn:hover {
            background: rgba(220, 122, 28, 0.06);
            color: var(--accent);
            border-color: var(--accent);
        }
        
        /* OS Switcher */
        html[data-theme="light"] .os-segmented-control {
            background: #f1ede9;
            border-color: rgba(220, 122, 28, 0.12);
        }
        html[data-theme="light"] .os-segment {
            color: #8a7a6b;
        }
        html[data-theme="light"] .os-segment:hover {
            color: var(--accent);
        }
        html[data-theme="light"] .os-segment.active {
            background: var(--accent);
            color: #fff;
            box-shadow: 0 2px 8px rgba(220, 122, 28, 0.25);
        }
        
        /* Chat Messages & Bubbles */
        html[data-theme="light"] .chat-messages {
            scrollbar-color: rgba(220, 122, 28, 0.15) transparent;
        }
        html[data-theme="light"] .chat-messages::-webkit-scrollbar-thumb {
            background: rgba(220, 122, 28, 0.15);
        }
        html[data-theme="light"] .message.system {
            background: #faf8f6;
            border-color: rgba(220, 122, 28, 0.10);
            color: #2c221e;
        }
        html[data-theme="light"] .message.system strong {
            color: var(--accent);
        }
        html[data-theme="light"] .message.user {
            background: linear-gradient(135deg, rgba(220,122,28,0.08), rgba(244,180,0,0.05));
            border-color: rgba(220, 122, 28, 0.15);
            color: #b85f00;
        }
        html[data-theme="light"] .agent-bubble {
            background: #faf8f6;
            border-color: rgba(220, 122, 28, 0.10);
        }
        html[data-theme="light"] .agent-text-content {
            color: #2c221e;
        }
        html[data-theme="light"] .agent-text-content code {
            background: rgba(220, 122, 28, 0.06);
            color: #b85f00;
        }
        html[data-theme="light"] .agent-text-content pre {
            background: #f1ede9;
            border-color: rgba(220, 122, 28, 0.08);
        }
        html[data-theme="light"] .agent-text-content pre code {
            color: #2c221e;
            background: transparent;
        }
        html[data-theme="light"] .agent-usage {
            border-top-color: rgba(220, 122, 28, 0.12);
            color: #8a7a6b;
        }
        html[data-theme="light"] .code-header {
            background: #e8e2dd;
            border-bottom-color: rgba(220, 122, 28, 0.06);
            color: #5c544d;
        }

        /* Thinking & Tool Logs */
        html[data-theme="light"] .thinking-wrapper {
            background: rgba(0, 0, 0, 0.015);
            border-color: rgba(220, 122, 28, 0.08);
        }
        html[data-theme="light"] .thinking-header {
            background: rgba(0, 0, 0, 0.01);
            border-bottom-color: rgba(220, 122, 28, 0.04);
            color: #5c544d;
        }
        html[data-theme="light"] .thinking-header svg {
            color: #8a7a6b;
        }
        html[data-theme="light"] .thinking-content {
            background: rgba(0, 0, 0, 0.015);
            border-bottom-color: rgba(220, 122, 28, 0.04);
            color: #5c544d;
        }
        
        /* Tool Calls */
        html[data-theme="light"] .tool-call-log {
            border-color: rgba(220, 122, 28, 0.08);
            background: rgba(0, 0, 0, 0.01);
        }
        html[data-theme="light"] .tool-call-header.running {
            background: rgba(220, 122, 28, 0.04);
        }
        html[data-theme="light"] .tool-call-header.success {
            background: rgba(39, 201, 63, 0.04);
        }
        html[data-theme="light"] .tool-call-header.failed {
            background: rgba(239, 68, 68, 0.04);
        }
        html[data-theme="light"] .tool-time {
            color: #8a7a6b;
        }
        html[data-theme="light"] .tool-call-args {
            border-top-color: rgba(220, 122, 28, 0.04);
        }
        html[data-theme="light"] .tool-call-args summary {
            background: rgba(220, 122, 28, 0.01);
            color: #8a7a6b;
        }
        html[data-theme="light"] .tool-call-args summary:hover {
            color: var(--accent);
        }
        html[data-theme="light"] .tool-call-output {
            background: #f1ede9;
            color: #2c221e;
            border-top-color: rgba(220, 122, 28, 0.04);
        }
        html[data-theme="light"] .tool-rich-body {
            background: rgba(0, 0, 0, 0.015);
            border-top-color: rgba(220, 122, 28, 0.06);
        }
        html[data-theme="light"] .tool-grid-head {
            background: rgba(220, 122, 28, 0.05);
            color: #2c221e;
        }
        html[data-theme="light"] .tool-row {
            border-bottom-color: rgba(220, 122, 28, 0.04);
            color: #5c544d;
        }

        /* ─── 隐藏彩蛋样式 ─── */
        #mirror-egg.egg-show {
            display: table-row !important;
            animation: highlight-egg 1.5s ease-out;
        }
        @keyframes highlight-egg {
            0% { background: rgba(255, 140, 66, 0.25); }
            100% { background: transparent; }
        }

        /* Scroll Animation Target */
        .reveal {
            opacity: 0;
            transform: translateY(15px);
            transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .reveal.active {
            opacity: 1;
            transform: translateY(0);
        }

        /* ─── 移动端终端面板优化 ─── */
        @media (max-width: 640px) {
            .container {
                padding: 22px 12px 32px;
            }

            .hero {
                padding: 30px 0 22px;
            }

            .hero-top {
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 18px;
            }

            h1 {
                font-size: 2rem;
                line-height: 1.18;
                margin-bottom: 12px;
            }

            .hero-desc {
                font-size: 0.95rem;
                line-height: 1.55;
            }

            .terminal-dashboard {
                width: 100%;
                height: auto;
                min-height: 0;
                max-height: none;
                resize: none;
                border-radius: 14px;
                margin-bottom: 28px;
            }

            .terminal-header {
                display: grid;
                grid-template-columns: auto minmax(0, 1fr);
                gap: 10px;
                align-items: center;
                padding: 10px;
            }

            .terminal-dots {
                width: auto;
                gap: 6px;
            }

            .terminal-dot {
                width: 10px;
                height: 10px;
            }

            .terminal-tabs {
                min-width: 0;
                width: 100%;
            }

            .terminal-tab {
                flex: 1 1 0;
                justify-content: center;
                min-width: 0;
                padding: 7px 8px;
                gap: 6px;
                font-size: 0.78rem;
            }

            .terminal-tab .tab-icon {
                flex-shrink: 0;
            }

            .terminal-status {
                display: none;
            }

            .terminal-body {
                padding: 18px 14px;
                overflow: visible;
            }

            .terminal-panel,
            .terminal-panel.active {
                height: auto;
                min-width: 0;
            }

            .os-selector-wrapper {
                display: block;
                margin-bottom: 20px;
                padding-bottom: 18px;
            }

            .selector-label {
                display: block;
                margin-bottom: 10px;
            }

            .os-segmented-control {
                width: 100%;
            }

            .os-segment {
                flex: 1 1 0;
                min-width: 0;
                padding: 8px 10px;
                text-align: center;
            }

            .cmd-section {
                margin-bottom: 18px;
            }

            .cmd-header {
                gap: 10px;
            }

            .cmd-label {
                min-width: 0;
            }

            .copy-btn-modern {
                flex-shrink: 0;
                padding: 6px 10px;
            }

            .cmd-box-modern {
                width: 100%;
                max-width: 100%;
                padding: 14px;
                border-radius: 9px;
                font-size: 0.8rem;
                line-height: 1.7;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }

            .cmd-box-modern .prompt {
                display: inline-block;
                margin-right: 8px;
            }

            .panel-hint,
            .footer-hint {
                font-size: 0.78rem;
                line-height: 1.6;
            }

            .panel-footer-links {
                align-items: stretch;
                gap: 14px;
            }

            .footer-actions {
                width: 100%;
                flex-direction: column;
                gap: 8px;
            }

            .footer-action-link {
                line-height: 1.45;
            }

            .card {
                padding: 20px;
                border-radius: 12px;
            }
        }

        @media (max-width: 380px) {
            .container {
                padding-inline: 10px;
            }

            .terminal-body {
                padding: 16px 12px;
            }

            .terminal-tab {
                font-size: 0.74rem;
                padding-inline: 6px;
            }

            .cmd-box-modern {
                font-size: 0.76rem;
                padding: 12px;
            }
        }
    </style>
  `;
}
