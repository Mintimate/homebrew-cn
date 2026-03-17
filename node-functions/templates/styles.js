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
        body::before { content: ''; position: fixed; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(ellipse at 20% 50%, rgba(255,179,71,.18) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(90,169,230,.16) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(244,180,0,.14) 0%, transparent 50%); z-index: -1; animation: bgFloat 20s ease-in-out infinite; }
        @keyframes bgFloat { 0%,100%{transform:translate(0,0) rotate(0deg)} 33%{transform:translate(2%,-2%) rotate(1deg)} 66%{transform:translate(-1%,1%) rotate(-1deg)} }
        .container { max-width: 1440px; margin: 0 auto; padding: 0 clamp(24px, 3vw, 40px); }

        .hero { text-align: center; padding: 100px 0 60px; position: relative; opacity: 0; transform: translateY(20px); animation: fadeInUp .8s ease-out forwards; }
        .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,179,71,.25); border: 1px solid rgba(255,179,71,.4); padding: 6px 16px; border-radius: 100px; font-size: .85rem; color: #8a4b08; margin-bottom: 24px; }
        .hero-badge .dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
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
        .support-links a { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; text-decoration: none; font-size: .9rem; font-weight: 600; transition: all .2s; }
        .link-afdian { color: #d35400; background: rgba(255,179,71,.2); border: 1px solid rgba(255,179,71,.4); }
        .link-afdian:hover { background: rgba(255,179,71,.3); }
        .link-bilibili { color: #fb7299; background: rgba(251,114,153,.15); border: 1px solid rgba(251,114,153,.3); }
        .link-bilibili:hover { background: rgba(251,114,153,.25); }
        .td-name { color: #3d2f1d; font-weight: 700; }
        .sub-title { font-size: 1.1rem; margin-bottom: 12px; }
        .footer-sub { margin-top: 8px; font-size: .8rem; opacity: .6; }

        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: 100%; align-items: center; }
        .stat-card { background: rgba(255,255,255,.65); border: 1px solid rgba(255,184,77,.22); border-radius: 12px; padding: 24px; text-align: center; transition: all .3s; height: 100%; display: flex; flex-direction: column; justify-content: center; }
        .stat-card:hover { background: rgba(255,179,71,.18); border-color: rgba(255,140,66,.32); }
        .stat-value { font-size: 2.5rem; font-weight: 800; background: linear-gradient(135deg,var(--accent-light),var(--gold)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; display: block; margin-bottom: 8px; line-height: 1.1; }
        .stat-label { font-size: .9rem; color: var(--text-muted); }

        .recent-list { display: flex; flex-direction: column; gap: 8px; }
        .recent-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: rgba(255,255,255,.65); border: 1px solid rgba(255,184,77,.18); border-radius: 10px; font-size: .9rem; transition: all .3s; }
        .recent-item:hover { background: rgba(255,244,220,.95); border-color: rgba(255,184,77,.35); }
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

        .footer { text-align: center; padding: 60px 0 40px; color: var(--text-muted); font-size: .9rem; border-top: 1px solid rgba(255,184,77,.25); margin-top: 40px; }
        .footer-links { display: flex; justify-content: center; gap: 32px; margin-bottom: 20px; }
        .footer-links a { color: var(--text-muted); text-decoration: none; transition: color .2s; font-weight: 500; }
        .footer-links a:hover { color: var(--accent-light); }

        .reveal { opacity: 0; transform: translateY(30px); transition: all .8s ease-out; }
        .reveal.active { opacity: 1; transform: translateY(0); }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @media (min-width:1800px) { .container{max-width:1680px} }
        @media (max-width:1024px) { .grid-2-1,.grid-1-1{grid-template-columns:1fr} .stats-grid{grid-template-columns:1fr 1fr} }
        @media (max-width:768px) { .hero{padding:60px 0 40px} .card{padding:24px} .stats-grid{grid-template-columns:1fr} .path-item{flex-direction:column;align-items:flex-start;gap:8px} .command-box{white-space:pre-wrap;word-break:break-all} .copy-btn{width:100%;text-align:center;align-self:stretch} }
    </style>`;
}
