// CSS 样式模板
export function getStyles() {
  return `
    <style>
        :root {
            --accent: #ff8c42;
            --accent-light: #ffb347;
            --green: #2e9f62;
            --gold: #f4b400;
            --bg: #fffaf0;
            --card-bg: rgba(255, 255, 255, 0.9);
            --card-border: rgba(255, 184, 77, 0.25);
            --text: #3e3528;
            --text-muted: #7a6a55;
            --code-bg: #fff3d9;
            --radius: 16px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.7; color: var(--text); background: var(--bg); overflow-x: hidden; }
body::before { content: ''; position: fixed; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(ellipse at 20% 50%, rgba(255,179,71,.22) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(90,169,230,.2) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(244,180,0,.18) 0%, transparent 50%); z-index: -1; }
        .container { max-width: 1440px; margin: 0 auto; padding: 0 clamp(24px, 3vw, 40px); }

        .hero { text-align: center; padding: 100px 0 60px; position: relative; opacity: 0; transform: translateY(20px); animation: fadeInUp .8s ease-out forwards; }
        .hero-top { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
        .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(180deg, rgba(255, 248, 230, .95), rgba(255, 234, 196, .92)); border: 1px solid rgba(220, 122, 28, .34); padding: 7px 16px; border-radius: 100px; font-size: .85rem; color: #6a3500; margin-bottom: 0; box-shadow: 0 4px 14px rgba(224, 132, 36, .18), inset 0 1px 0 rgba(255,255,255,.55); backdrop-filter: blur(4px); position: relative; overflow: hidden; }
        .hero-badge::after { content: ''; position: absolute; inset: 0; background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.32) 42%, transparent 72%); transform: translateX(-130%); transition: transform .72s cubic-bezier(.22,.61,.36,1); }
        .hero-badge:hover::after { transform: translateX(130%); }
        .hero-badge .dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; animation: pulse 2s ease-in-out infinite; box-shadow: 0 0 0 0 rgba(255, 140, 66, .32); }
        .theme-toggle { border: 1px solid rgba(255,184,77,.45); background: rgba(255,255,255,.72); color: #6d5a44; border-radius: 999px; padding: 4px; cursor: pointer; transition: transform .28s cubic-bezier(.22,.61,.36,1), box-shadow .28s cubic-bezier(.22,.61,.36,1), border-color .3s ease; font-family: inherit; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(255, 179, 71, .15); position: relative; isolation: isolate; }
        .theme-toggle::after { content: ''; position: absolute; inset: -2px; border-radius: inherit; background: radial-gradient(circle at 20% 20%, rgba(255, 200, 120, .35), transparent 55%), radial-gradient(circle at 80% 80%, rgba(125, 154, 255, .18), transparent 60%); opacity: 0; transition: opacity .35s ease; z-index: -1; }
        .theme-toggle:hover { border-color: var(--accent); transform: translateY(-1px); box-shadow: 0 8px 18px rgba(255, 179, 71, .25); }
        .theme-toggle:hover::after { opacity: 1; }
        .theme-toggle:active { transform: translateY(0) scale(.975); }
        .theme-toggle:focus-visible { outline: 2px solid rgba(255,140,66,.55); outline-offset: 2px; }
        .theme-track { position: relative; width: 88px; height: 30px; border-radius: 999px; background: linear-gradient(135deg, #f5c96a, #e8a030); border: 1px solid rgba(180,110,20,.38); display: inline-grid; grid-template-columns: repeat(3, 1fr); align-items: center; padding: 0 4px; gap: 2px; transition: background .42s cubic-bezier(.22,.61,.36,1), border-color .32s ease, box-shadow .32s ease; overflow: hidden; box-shadow: inset 0 1px 0 rgba(255,255,255,.45), 0 2px 6px rgba(180,110,20,.18); }
        .theme-track::before { content: ''; position: absolute; inset: 0; background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.35) 35%, transparent 65%); transform: translateX(-120%); transition: transform .6s ease; }
        .theme-toggle:hover .theme-track::before { transform: translateX(120%); }
        .theme-icon { font-size: .84rem; line-height: 1; opacity: .75; transform: scale(.92); transition: opacity .32s cubic-bezier(.22,.61,.36,1), transform .32s cubic-bezier(.22,.61,.36,1), filter .32s ease; user-select: none; pointer-events: none; z-index: 2; text-align: center; }
        .theme-icon.sun { filter: drop-shadow(0 0 4px rgba(255,166,0,.35)); }
        .theme-icon.system { filter: drop-shadow(0 0 4px rgba(73, 110, 190, .22)); }
        .theme-icon.moon { filter: drop-shadow(0 0 5px rgba(80,110,220,.4)); }
        .theme-thumb { position: absolute; top: 2px; left: 2px; width: 26px; height: 24px; border-radius: 999px; background: linear-gradient(180deg, #fffef8 0%, #ffe8bf 100%); box-shadow: 0 1px 2px rgba(0,0,0,.15), 0 6px 12px rgba(255,179,71,.35); transition: transform .42s cubic-bezier(.22,.61,.36,1), background .32s ease, box-shadow .32s ease; z-index: 1; }
        .theme-thumb::before { content: ''; position: absolute; inset: 0; border-radius: inherit; background: radial-gradient(circle at 30% 28%, rgba(255,255,255,.95), rgba(255,255,255,0) 52%); opacity: .8; }
        .theme-toggle[data-theme="dark"] .theme-track { background: linear-gradient(135deg, #2b3248, #1c2238); border-color: rgba(144,169,255,.45); box-shadow: inset 0 0 0 1px rgba(169, 188, 255, .08); }
        .theme-toggle[data-theme="dark"] .theme-thumb { transform: translateX(56px); background: linear-gradient(180deg, #f0f4ff 0%, #cfd9ff 100%); box-shadow: 0 1px 2px rgba(0,0,0,.25), 0 6px 14px rgba(115,146,255,.35); }
        .theme-toggle[data-theme="dark"] .theme-icon.sun { opacity: .38; transform: scale(.9); filter: grayscale(.22); }
        .theme-toggle[data-theme="dark"] .theme-icon.system { opacity: .42; transform: scale(.9); filter: grayscale(.16); }
        .theme-toggle[data-theme="dark"] .theme-icon.moon { opacity: 1; transform: scale(1.05); }
        .theme-toggle[data-theme="system"] .theme-track { background: linear-gradient(135deg, #f0d8ae, #b8c7ee 70%); border-color: rgba(140, 154, 210, .45); box-shadow: inset 0 0 0 1px rgba(180, 191, 231, .2); }
        .theme-toggle[data-theme="system"] .theme-thumb { transform: translateX(28px); background: linear-gradient(180deg, #f6f8ff 0%, #dbe4ff 100%); box-shadow: 0 1px 2px rgba(0,0,0,.18), 0 6px 12px rgba(116,138,224,.3); }
        .theme-toggle[data-theme="system"] .theme-icon.system { opacity: 1; transform: scale(1.05); }
        .theme-toggle[data-theme="system"] .theme-icon.sun { opacity: .5; transform: scale(.92); }
        .theme-toggle[data-theme="system"] .theme-icon.moon { opacity: .66; transform: scale(.94); }
        .theme-toggle[data-theme="light"] .theme-icon.sun { opacity: 1; transform: scale(1.05); }
        .theme-toggle[data-theme="light"] .theme-icon.system { opacity: .5; transform: scale(.9); filter: grayscale(.16); }
        .theme-toggle[data-theme="light"] .theme-icon.moon { opacity: .82; transform: scale(.95); filter: drop-shadow(0 0 3px rgba(80,110,220,.3)); }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
        h1 { font-size: clamp(2.5rem,6vw,4rem); font-weight: 800; letter-spacing: -.02em; background: linear-gradient(135deg,#8a4b08 0%,#ff8c42 55%,#f4b400 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px; }
        .hero-desc { font-size: 1.2rem; color: var(--text-muted); max-width: 700px; margin: 0 auto; }

        .grid-2-1, .grid-1-1 { display: grid; gap: 24px; margin-bottom: 40px; width: 100%; }
        .grid-2-1 { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
        .grid-1-1 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .grid-2-1 > *, .grid-1-1 > * { min-width: 0; }
        .section { margin-bottom: 40px; }

        .card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 32px; height: 100%; backdrop-filter: blur(10px); transition: transform .3s, border-color .3s, box-shadow .3s; display: flex; flex-direction: column; }
        .card:hover { border-color: rgba(255,140,66,.35); box-shadow: 0 8px 40px rgba(255,179,71,.22); transform: translateY(-2px); }
        .card-title { font-size: 1.35rem; font-weight: 700; color: #3d2f1d; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }

        .command-wrapper { margin: 16px 0; flex-grow: 1; display: flex; flex-direction: column; justify-content: center; gap: 10px; }
        .command-box { background: var(--code-bg); border: 1px solid rgba(255,184,77,.35); color: #8a4b08; padding: 16px 18px; border-radius: 12px; font-family: "SF Mono","Fira Code","JetBrains Mono",Consolas,monospace; font-size: 15px; overflow-x: auto; white-space: nowrap; line-height: 1.6; box-shadow: inset 0 1px 3px rgba(138,75,8,.08); width: 100%; max-width: 100%; }
        .command-box .prompt { color: var(--green); user-select: none; margin-right: 8px; }
        .copy-btn { background: rgba(255,255,255,.75); color: #6d5a44; border: 1px solid rgba(255,184,77,.45); border-radius: 8px; padding: 8px 14px; cursor: pointer; font-size: .85rem; font-weight: 600; transition: all .2s; font-family: inherit; align-self: flex-end; }
        .copy-btn:hover { background: rgba(255,179,71,.22); border-color: var(--accent); color: #51391c; }
        .copy-btn.copied { background: rgba(39,174,96,.2); border-color: var(--green); color: var(--green); }
        .command-hint { font-size: .9rem; color: var(--text-muted); margin-top: 12px; }
        .muted { color: var(--text-muted); }
        .muted-sm { color: var(--text-muted); font-size: .92rem; }
        .support-links { margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap; }
        .support-links a { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; text-decoration: none !important; font-size: .9rem; font-weight: 600; transition: all .2s; }
        .link-afdian { color: #d35400; background: rgba(255,179,71,.2); border: 1px solid rgba(255,179,71,.4); }
        .link-afdian:hover { background: rgba(255,179,71,.3); }
        .link-bilibili { color: #fb7299; background: rgba(251,114,153,.15); border: 1px solid rgba(251,114,153,.3); }
        .link-bilibili:hover { background: rgba(251,114,153,.25); }
        .td-name { color: #3d2f1d; font-weight: 700; }
        .sub-title { font-size: 1.1rem; margin-bottom: 12px; }
        .footer-sub { margin-top: 8px; font-size: .8rem; opacity: .6; }

        .os-tabs { display: flex; gap: 8px; }
        .os-tab { padding: 8px 20px; border-radius: 10px; border: 1px solid rgba(255,184,77,.35); background: rgba(255,255,255,.65); color: var(--text-muted); font-size: .9rem; font-weight: 600; cursor: pointer; transition: all .25s ease; font-family: inherit; }
        .os-tab:hover { background: rgba(255,179,71,.15); border-color: rgba(255,140,66,.45); }
        .os-tab.active { background: linear-gradient(135deg, rgba(255,140,66,.2), rgba(244,180,0,.15)); border-color: var(--accent); color: var(--accent); box-shadow: 0 2px 8px rgba(255,140,66,.18); }

        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: 100%; align-items: center; }
        .stat-card { background: rgba(255,255,255,.65); border: 1px solid rgba(255,184,77,.22); border-radius: 12px; padding: 24px; text-align: center; transition: all .3s; height: 100%; display: flex; flex-direction: column; justify-content: center; }
        .stat-card:hover { background: rgba(255,179,71,.18); border-color: rgba(255,140,66,.32); }
        .stat-value { font-size: 2.5rem; font-weight: 800; background: linear-gradient(135deg,var(--accent-light),var(--gold)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; display: block; margin-bottom: 8px; line-height: 1.1; }
        .stat-label { font-size: .9rem; color: var(--text-muted); }

        .recent-list { display: flex; flex-direction: column; gap: 8px; }
        .recent-item { position: relative; display: flex; align-items: center; gap: 10px; padding: 11px 14px 11px 18px; background: linear-gradient(180deg, rgba(255,255,255,.74), rgba(255,251,242,.66)); border: 1px solid rgba(255,184,77,.2); border-radius: 12px; font-size: .9rem; transition: transform .28s cubic-bezier(.22,.61,.36,1), background .28s ease, border-color .28s ease, box-shadow .28s ease; overflow: hidden; backdrop-filter: blur(6px); }
        .recent-item::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 0 8px 8px 0; background: linear-gradient(180deg, #56d38b, #2e9f62); box-shadow: 0 0 12px rgba(46,159,98,.45); opacity: .95; }
        .recent-item.is-offline::before { background: linear-gradient(180deg, #ff8a8a, #ef5350); box-shadow: 0 0 12px rgba(239,83,80,.45); }
        .recent-item:hover { background: rgba(255,244,220,.95); border-color: rgba(255,184,77,.35); transform: translateY(-1px); box-shadow: 0 8px 18px rgba(198, 120, 34, .14); }
        .recent-item .ri-icon { font-size: 1.2rem; }
        .recent-item .ri-location { font-weight: 600; color: #3d2f1d; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .recent-item .ri-ip { font-family: "SF Mono",Consolas,monospace; font-size: .75rem; color: #c05621; background: rgba(237, 137, 54, 0.15); padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(237, 137, 54, 0.25); margin: 0 4px; }
        .recent-item .ri-time { font-size: .8rem; color: var(--text-muted); white-space: nowrap; }

        .features-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 20px; }
        .feature-item { padding: 24px; background: rgba(255,255,255,.65); border: 1px solid rgba(255,184,77,.2); border-radius: 12px; transition: all .3s; }
        .feature-item:hover { background: rgba(255,244,220,.95); border-color: rgba(255,184,77,.42); transform: translateY(-4px); }
        .feature-title { font-weight: 700; color: #3d2f1d; margin-bottom: 8px; display: block; font-size: 1.1rem; }
        .feature-desc { font-size: .9rem; color: var(--text-muted); line-height: 1.6; }

        .table-wrap { overflow-x: auto; margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; font-size: .95rem; }
        th { text-align: left; padding: 16px; background: rgba(255,184,77,.2); color: #3d2f1d; font-weight: 600; white-space: nowrap; }
        td { padding: 16px; border-top: 1px solid rgba(255,184,77,.22); color: var(--text-muted); }
        tr:hover td { background: rgba(255,248,232,.9); }
        th:first-child { border-radius: 8px 0 0 8px; }
        th:last-child { border-radius: 0 8px 8px 0; }
        .mirror-tag { display: inline-block; padding: 4px 12px; border-radius: 100px; font-size: .75rem; font-weight: 600; }
        .tag-recommend { background: rgba(39,174,96,.15); color: var(--green); border: 1px solid rgba(39,174,96,.3); }
        .tag-fast { background: rgba(52,152,219,.15); color: #3498db; border: 1px solid rgba(52,152,219,.3); }
        .tag-edu { background: rgba(243,156,18,.15); color: var(--gold); border: 1px solid rgba(243,156,18,.3); }
        .tag-egg { background: rgba(155,89,182,.15); color: #9b59b6; border: 1px solid rgba(155,89,182,.3); }
        #mirror-egg.egg-show { display: table-row !important; animation: eggReveal .6s cubic-bezier(.22,.61,.36,1) forwards; }
        @keyframes eggReveal { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        html[data-theme="dark"] .tag-egg { background: rgba(187,134,252,.15); color: #bb86fc; border-color: rgba(187,134,252,.3); }

        .path-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin: 16px 0; }
        .path-item { background: rgba(255,255,255,.65); border: 1px solid rgba(255,184,77,.22); border-radius: 12px; padding: 20px; display: flex; align-items: center; justify-content: space-between; }
        .path-item .arch { font-weight: 700; color: #3d2f1d; font-size: 1.1rem; }
        .path-item .path { font-family: "SF Mono",Consolas,monospace; color: var(--accent-light); font-size: 1rem; background: rgba(0,0,0,.2); padding: 4px 8px; border-radius: 6px; }
        .path-item .note { font-size: .85rem; color: var(--text-muted); }

        .steps { counter-reset: step; display: grid; gap: 24px; }
        .step { position: relative; padding-left: 60px; }
        .step::before { counter-increment: step; content: counter(step); position: absolute; left: 0; top: 0; width: 40px; height: 40px; background: linear-gradient(135deg,var(--accent),var(--gold)); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; box-shadow: 0 4px 10px rgba(255,140,66,.25); }
        .step-title { font-weight: 700; color: #3d2f1d; margin-bottom: 6px; font-size: 1.1rem; }
        .step-desc { font-size: .95rem; color: var(--text-muted); }

        .faq-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(300px,1fr)); gap: 24px; }
        @media (min-width: 1024px) { .faq-grid { grid-template-columns: repeat(2,1fr); } }
        .faq-item { background: rgba(255,255,255,.65); border: 1px solid rgba(255,184,77,.2); border-radius: 12px; padding: 20px; }
        .faq-q { font-weight: 700; color: #3d2f1d; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
        .faq-q::before { content: 'Q'; display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; background: rgba(233,69,96,.15); color: var(--accent-light); border-radius: 8px; font-size: .85rem; font-weight: 800; }
        .faq-a { color: var(--text-muted); font-size: .95rem; line-height: 1.6; }
        .faq-a code { background: rgba(255,255,255,.06); padding: 2px 6px; border-radius: 4px; font-family: "SF Mono",Consolas,monospace; font-size: .85rem; color: var(--accent-light); }

        .env-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit,minmax(300px,1fr)); gap: 12px; }
        .env-list li { padding: 12px; background: var(--code-bg); border-radius: 8px; border: 1px solid rgba(255,184,77,.25); font-family: "SF Mono",Consolas,monospace; font-size: .85rem; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center; }
        .env-list .env-key { color: #e5c07b; font-weight: 600; }
        .env-list .env-comment { color: #5c6370; font-style: italic; font-size: .8rem; }

        a { color: var(--accent); text-decoration: none; transition: color .25s ease, text-decoration-color .25s ease; }
        a:hover { color: var(--accent-light); text-decoration: underline; text-decoration-color: rgba(255,140,66,.4); text-underline-offset: 3px; }
        .footer { text-align: center; padding: 60px 0 40px; color: var(--text-muted); font-size: .9rem; border-top: 1px solid rgba(255,184,77,.25); margin-top: 40px; }
        .footer a { color: var(--accent-light); font-weight: 600; }
        .footer a:hover { color: var(--accent); }
        .footer-links { display: flex; justify-content: center; gap: 32px; margin-bottom: 20px; }
        .footer-links a { color: var(--text-muted); text-decoration: none; font-weight: 500; position: relative; }
        .footer-links a::after { content: ''; position: absolute; left: 0; bottom: -2px; width: 0; height: 1.5px; background: var(--accent-light); transition: width .3s cubic-bezier(.22,.61,.36,1); }
        .footer-links a:hover { color: var(--accent-light); text-decoration: none; }
        .footer-links a:hover::after { width: 100%; }

        .reveal { opacity: 0; transform: translateY(30px); transition: all .8s ease-out; }
        .reveal.active { opacity: 1; transform: translateY(0); }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @media (min-width:1800px) { .container{max-width:1680px} }
        @media (max-width:1024px) { .grid-2-1,.grid-1-1{grid-template-columns:1fr} .stats-grid{grid-template-columns:1fr 1fr} }
        @media (max-width:768px) { .hero{padding:60px 0 40px} .hero-top{margin-bottom:18px} .card{padding:24px} .stats-grid{grid-template-columns:1fr} .path-item{flex-direction:column;align-items:flex-start;gap:8px} .command-box{white-space:pre-wrap;word-break:break-all} .copy-btn{width:100%;text-align:center;align-self:stretch} }

        @media (prefers-reduced-motion: reduce) {
            .theme-toggle,
            .theme-track,
            .theme-icon,
            .theme-thumb,
            .theme-toggle::after,
            .theme-track::before,
            .hero-badge .dot { transition: none !important; animation: none !important; }
        }

        @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) {
                --accent: #ffb36b; --accent-light: #ffc98f; --green: #67d49a; --gold: #ffd166;
                --bg: #15120f; --card-bg: rgba(30,24,19,.85); --card-border: rgba(255,179,71,.2);
                --text: #f5e6d3; --text-muted: #c8b39a; --code-bg: #2a2118;
            }
        }

        :root[data-theme="light"] {
            --accent: #ff8c42;
            --accent-light: #ffb347;
            --green: #2e9f62;
            --gold: #f4b400;
            --bg: #fffaf0;
            --card-bg: rgba(255, 255, 255, 0.9);
            --card-border: rgba(255, 184, 77, 0.25);
            --text: #3e3528;
            --text-muted: #7a6a55;
            --code-bg: #fff3d9;
        }

        :root[data-theme="dark"] {
            --accent: #ffb36b;
            --accent-light: #ffc98f;
            --green: #67d49a;
            --gold: #ffd166;
            --bg: #15120f;
            --card-bg: rgba(30, 24, 19, 0.85);
            --card-border: rgba(255, 179, 71, 0.2);
            --text: #f5e6d3;
            --text-muted: #c8b39a;
            --code-bg: #2a2118;
        }

        html[data-theme="dark"] body::before {
            background: radial-gradient(ellipse at 20% 50%, rgba(255,179,71,.14) 0%, transparent 52%), radial-gradient(ellipse at 80% 20%, rgba(90,169,230,.12) 0%, transparent 52%), radial-gradient(ellipse at 50% 80%, rgba(244,180,0,.1) 0%, transparent 55%);
        }

        html[data-theme="dark"] .hero-badge { color: #ffe7ca; background: linear-gradient(180deg, rgba(55, 36, 24, .9), rgba(39, 27, 20, .88)); border-color: rgba(255, 176, 90, .34); box-shadow: 0 8px 20px rgba(10, 7, 4, .35), inset 0 1px 0 rgba(255, 220, 176, .12); }
        html[data-theme="dark"] .hero-badge::after { background: linear-gradient(120deg, transparent 0%, rgba(255, 214, 161, .16) 45%, transparent 74%); }
        html[data-theme="dark"] .hero-badge .dot { background: #ffb36b; box-shadow: 0 0 0 4px rgba(255, 179, 107, .16), 0 0 12px rgba(255, 179, 107, .38); }
        html[data-theme="dark"] .card,
        html[data-theme="dark"] .stat-card,
        html[data-theme="dark"] .feature-item,
        html[data-theme="dark"] .faq-item,
        html[data-theme="dark"] .path-item { background: rgba(36, 28, 22, 0.72); border-color: rgba(255, 179, 71, 0.22); }
        html[data-theme="dark"] .recent-item { background: linear-gradient(180deg, rgba(50, 36, 28, .74), rgba(30, 22, 18, .68)); border-color: rgba(255, 179, 107, .3); box-shadow: inset 0 1px 0 rgba(255, 210, 156, .09), inset 0 -1px 0 rgba(0,0,0,.15); backdrop-filter: blur(9px); }
        html[data-theme="dark"] .recent-item::before { background: linear-gradient(180deg, #63e09a, #2ea96a); box-shadow: 0 0 14px rgba(67, 214, 139, .5), 0 0 24px rgba(67, 214, 139, .25); }
        html[data-theme="dark"] .recent-item.is-offline::before { background: linear-gradient(180deg, #ff9a92, #f2645e); box-shadow: 0 0 14px rgba(255, 122, 114, .5), 0 0 24px rgba(255, 122, 114, .25); }
        html[data-theme="dark"] .recent-item:hover,
        html[data-theme="dark"] .feature-item:hover,
        html[data-theme="dark"] tr:hover td { background: rgba(57, 44, 34, 0.9); }
        html[data-theme="dark"] .recent-item:hover { border-color: rgba(255, 179, 107, .46); box-shadow: 0 12px 28px rgba(0,0,0,.36), inset 0 1px 0 rgba(255, 219, 173, .12); }
        html[data-theme="dark"] .card-title,
        html[data-theme="dark"] .td-name,
        html[data-theme="dark"] .feature-title,
        html[data-theme="dark"] .step-title,
        html[data-theme="dark"] .faq-q,
        html[data-theme="dark"] .path-item .arch,
        html[data-theme="dark"] th { color: #f6d8b1; }
        html[data-theme="dark"] .hero-desc,
        html[data-theme="dark"] .muted,
        html[data-theme="dark"] .muted-sm,
        html[data-theme="dark"] .command-hint,
        html[data-theme="dark"] .stat-label,
        html[data-theme="dark"] .feature-desc,
        html[data-theme="dark"] .step-desc,
        html[data-theme="dark"] .faq-a,
        html[data-theme="dark"] td,
        html[data-theme="dark"] .footer,
        html[data-theme="dark"] .path-item .note,
        html[data-theme="dark"] .footer-links a,
        html[data-theme="dark"] .recent-item .ri-time { color: var(--text-muted); }
        html[data-theme="dark"] .recent-item .ri-location { color: #f5dcc0; }
        html[data-theme="dark"] .recent-item .ri-ip { color: #ffd6ae; background: rgba(255, 179, 107, .16); border-color: rgba(255, 179, 107, .34); }
        html[data-theme="dark"] .command-box,
        html[data-theme="dark"] .env-list li { background: #2b2118; color: #ffd8ad; border-color: rgba(255, 179, 71, 0.3); }
        html[data-theme="dark"] .copy-btn { background: rgba(33, 26, 21, 0.9); color: #e9c9a5; border-color: rgba(255, 179, 71, 0.35); }
        html[data-theme="dark"] .copy-btn:hover { color: #ffe3c2; }
        html[data-theme="dark"] .os-tab { background: rgba(36, 28, 22, 0.72); border-color: rgba(255, 179, 71, 0.22); color: var(--text-muted); }
        html[data-theme="dark"] .os-tab:hover { background: rgba(255,179,71,.12); }
        html[data-theme="dark"] .os-tab.active { background: linear-gradient(135deg, rgba(255,179,107,.18), rgba(255,209,102,.12)); border-color: var(--accent); color: var(--accent); }
        html[data-theme="dark"] .theme-toggle { background: rgba(28, 24, 37, .88); border-color: rgba(134, 160, 255, .4); box-shadow: 0 6px 14px rgba(88, 114, 220, .22); }
        html[data-theme="dark"] .theme-toggle:hover { box-shadow: 0 10px 22px rgba(96, 128, 255, .35); }
        html[data-theme="dark"] .path-item .path { background: rgba(0, 0, 0, 0.35); color: var(--accent-light); }
        html[data-theme="dark"] .faq-a code { background: rgba(255,255,255,.08); color: var(--accent-light); }
        html[data-theme="dark"] .env-list .env-key { color: #ffd58a; }
        html[data-theme="dark"] .env-list .env-comment { color: #a8957d; }
        html[data-theme="dark"] .footer { border-top-color: rgba(255, 179, 71, 0.2); }

        html[data-theme="light"] .hero-badge { color: #5f2f00; background: linear-gradient(180deg, rgba(255,247,226,.97), rgba(255,232,188,.95)); border-color: rgba(201,108,18,.38); box-shadow: 0 4px 14px rgba(224,132,36,.16), inset 0 1px 0 rgba(255,255,255,.62); }
        html[data-theme="light"] .hero-badge .dot { background: #ff7a1a; box-shadow: 0 0 0 3px rgba(255,122,26,.18); }
        html[data-theme="light"] .theme-toggle { background: rgba(255,255,255,.72); border-color: rgba(255,184,77,.45); box-shadow: 0 4px 12px rgba(255,179,71,.15); }
    </style>`;
}
