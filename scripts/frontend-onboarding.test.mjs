import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { renderPage } from '../cloud-functions/templates/layout.js';
import { getClientScript } from '../cloud-functions/templates/client-script.js';

const html = renderPage();
const client = getClientScript().replace(/^\s*<script>/, '').replace(/<\/script>\s*$/, '');
// A small event/visibility DOM fixture runs the real generated client without a browser,
// external scripts, local storage access or requests to the deployed service.
function createPage({ host = 'localhost:8080', userAgent = 'Macintosh', dark = false, clipboardFails = false } = {}) {
  const elements = [], queries = [], network = [], copied = [], storage = new Map(), media = new Map();
  let context, document;
  function matches(element, selector) {
    if (selector.includes(' > ')) {
      const [parent, child] = selector.split(' > ');
      return element.parent && matches(element.parent, parent) && matches(element, child);
    }
    const excluded = selector.match(/:not\(([^)]+)\)/);
    if (excluded) {
      if (excluded[1] === ':disabled' ? element.disabled : matches(element, excluded[1])) return false;
      selector = selector.replace(excluded[0], '');
    }
    const tag = selector.match(/^[a-z][\w-]*/i)?.[0];
    if (tag && element.tag !== tag.toLowerCase()) return false;
    for (const [, name] of selector.matchAll(/\.([\w-]+)/g)) if (!element.classList.contains(name)) return false;
    const id = selector.match(/#([\w-]+)/)?.[1];
    if (id && element.id !== id) return false;
    for (const [, name, value] of selector.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)) {
      if (!Object.hasOwn(element.attributes, name) || (value !== undefined && element.attributes[name] !== value)) return false;
    }
    return true;
  }
  function select(selector, root) {
    return elements.filter(element => {
      if (root) { let parent = element.parent; while (parent && parent !== root) parent = parent.parent; if (!parent) return false; }
      return selector.split(',').some(part => matches(element, part.trim()));
    });
  }
  function createElement(tag, attributes = {}) {
    const classes = new Set((attributes.class || '').split(/\s+/));
    const listeners = new Map();
    const element = { tag, tagName: tag.toUpperCase(), attributes, listeners, parent: null, children: [],
      dataset: Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith('data-')).map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase()), value])),
      hidden: Object.hasOwn(attributes, 'hidden'), open: Object.hasOwn(attributes, 'open'), disabled: Object.hasOwn(attributes, 'disabled'), inert: false,
      style: {}, textContent: '', innerHTML: '', value: '', scrollTop: 0, scrollHeight: 100, clientHeight: 100,
      tabIndex: Number(attributes.tabindex ?? (['button', 'textarea', 'a'].includes(tag) ? 0 : -1)),
      get id() { return this.attributes.id; },
      getAttribute(name) { return this.attributes[name] ?? null; },
      setAttribute(name, value) { this.attributes[name] = String(value); },
      removeAttribute(name) { delete this.attributes[name]; },
      classList: { contains: name => classes.has(name), add: name => classes.add(name), remove: (...names) => names.forEach(name => classes.delete(name)), toggle(name, force) { if (force ?? !classes.has(name)) classes.add(name); else classes.delete(name); } },
      addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(listener); },
      dispatch(type, values = {}) { const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...values }; for (const listener of listeners.get(type) || []) listener(event); return event; },
      click() { if (this.disabled) return; if (attributes.onclick) vm.runInContext(attributes.onclick, context); this.dispatch('click'); },
      focus() { document.activeElement = this; },
      scrollIntoView() {},
      getClientRects() { for (let node = this; node; node = node.parent) if (node.hidden) return []; return [{}]; },
      querySelectorAll(selector) { return select(selector, this); },
      querySelector(selector) { return select(selector, this)[0] || null; },
      appendChild(child) { this.children.push(child); child.parent = this; },
      append(...children) { children.forEach(child => this.appendChild(child)); },
    };
    elements.push(element);
    return element;
  }
  const stack = [];
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  for (const token of markup.match(/<[^>]+>|[^<]+/g) || []) {
    if (token.startsWith('</')) { const tag = token.match(/^<\/([\w-]+)/)?.[1]; while (stack.length && stack.pop().tag !== tag) {} continue; }
    if (token.startsWith('<!')) continue;
    const opening = token.match(/^<([a-z][\w-]*)\b([\s\S]*?)>/i);
    if (!opening) { if (stack.length) stack.at(-1).textContent += token; continue; }
    const [, tag, source] = opening;
    const attributes = Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]));
    for (const [, name] of source.matchAll(/(?:^|\s)(data-[\w-]+)(?=\s|\/?$)/g)) attributes[name] = '';
    for (const boolean of ['hidden', 'disabled', 'open']) if (new RegExp('(?:^|\\s)' + boolean + '(?:\\s|/|$)').test(source)) attributes[boolean] = '';
    const element = createElement(tag, attributes);
    stack.at(-1)?.appendChild(element);
    if (!token.endsWith('/>') && !['meta', 'link', 'br', 'hr', 'input', 'img', 'source'].includes(tag)) stack.push(element);
  }
  const byId = id => elements.find(element => element.id === id) || null;
  document = createElement('document');
  document.getElementById = byId;
  document.querySelectorAll = selector => select(selector);
  document.querySelector = selector => select(selector)[0] || null;
  document.documentElement = elements.find(element => element.tag === 'html');
  document.body = elements.find(element => element.tag === 'body');
  document.createElement = tag => createElement(tag);
  const windowEvents = createElement('window-events');
  let nextTimer = 0;
  context = vm.createContext({
    document, location: { host, protocol: 'https:' },
    navigator: { userAgent, clipboard: { async writeText(text) { if (clipboardFails) throw new Error('clipboard denied'); copied.push(text); } } },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    matchMedia(query) { if (!media.has(query)) media.set(query, { matches: query.includes('color-scheme') ? dark : false, addEventListener(type, listener) { this.listener = listener; } }); return media.get(query); },
    addEventListener: windowEvents.addEventListener.bind(windowEvents),
    visualViewport: { height: 800, addEventListener() {} },
    fetch: async(url, options) => { network.push({ url, options }); return { json: async() => ({ code: 0, data: { totalCalls: 7, lastCallTime: null, recentInstalls: [] } }) }; },
    setTimeout: () => ++nextTimer, clearTimeout() {}, setInterval: () => ++nextTimer, clearInterval() {},
    getComputedStyle: () => ({ minHeight: '96px', maxHeight: '200px' }), console,
  });
  context.window = context;
  vm.runInContext(client, context);
  context.sendQuickAction = text => queries.push(text);
  return { context, document, byId, elements, queries, network, copied, storage, media };
}

test('install and configure commands use the correct shell and preserve the existing installer route', () => {
  const { byId } = createPage();
  for (const [os, shell] of [['macos', 'zsh'], ['linux', 'bash']]) {
    const install = `/bin/${shell} -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)"`;
    assert.equal(byId('install-command-' + os).textContent, install);
    assert.equal(byId('configure-command-' + os).textContent, install + ' -- --configure');
    assert.equal(byId('uninstall-command-' + os).textContent, install + ' -- --uninstall');
  }
  const preview = createPage({ host: 'preview.example.com' });
  assert.match(preview.byId('configure-command-macos').textContent, /https:\/\/preview\.example\.com\/install/);
});

test('task selection survives an operating system switch and remains mutually exclusive', () => {
  const { context, byId, elements } = createPage();
  context.switchOnboardingTask('configure');
  context.switchOS('linux');
  assert.equal(byId('os-macos').hidden, true);
  assert.equal(byId('os-linux').hidden, false);
  const panels = elements.filter(element => element.dataset.onboardingPanel);
  assert.equal(panels.length, 6);
  for (const panel of panels) assert.equal(panel.hidden, panel.dataset.onboardingPanel !== 'configure');
  const buttons = elements.filter(element => element.dataset.onboardingTask);
  assert.deepEqual(buttons.filter(button => button.attributes['aria-pressed'] === 'true').map(button => button.dataset.onboardingTask), ['configure']);
  context.switchOnboardingTask('desktop');
  for (const panel of panels) assert.equal(panel.hidden, panel.dataset.onboardingPanel !== 'desktop');
  context.switchOnboardingTask('install');
  assert.equal(byId('os-linux').hidden, false);
  for (const panel of panels) assert.equal(panel.hidden, panel.dataset.onboardingPanel !== 'install');
});

test('Linux auto-selection uses terminal self-check instructions; desktop help opens a local guide', () => {
  const { context, byId, queries } = createPage({ userAgent: 'Linux x86_64' });
  assert.equal(byId('os-linux').hidden, false);
  context.openTroubleshootingGuide('doctor');
  assert.equal(byId('help-doctor-terminal').hidden, false);
  assert.equal(byId('help-doctor-desktop').hidden, true);
  context.openDesktopHelp();
  assert.equal(byId('panel-install').hidden, true);
  assert.equal(byId('panel-ai-chat').hidden, false);
  assert.equal(queries.length, 0);
  assert.equal(byId('help-config-first').hidden, false);
  assert.equal(byId('help-config-second').hidden, true);
});

test('problem cards explain outcomes and open instructions without sending a chat request', () => {
  const { byId, elements, queries, network, document } = createPage();
  for (const task of ['doctor', 'desktop']) {
    elements.find(element => element.dataset.quickAction === task).click();
    assert.equal(byId('help-guide').hidden, false);
    assert.equal(byId('chat-footer').hidden, true);
    assert.equal(document.activeElement, byId('help-guide-title'));
    assert.ok(byId('help-guide-purpose').textContent.length > 15);
  }
  assert.equal(queries.length, 0);
  assert.deepEqual(network.map(request => request.url), ['/api/stats']);
  assert.match(html, /这些警告需要处理吗/);
  assert.match(html, /先检查下载设置，再判断从哪里排查/);
});

test('warning guidance preserves text across source changes and sends only on explicit submit', () => {
  const { context, byId, elements, queries } = createPage();
  context.openTroubleshootingGuide('doctor');
  assert.equal(byId('help-doctor-submit').disabled, true);
  byId('help-warning-text').value = 'Warning: Some installed kegs have no formulae!\n  old-tool';
  byId('help-warning-text').dispatch('input');
  elements.find(element => element.dataset.helpSource === 'terminal').click();
  assert.equal(byId('help-doctor-terminal').hidden, false);
  assert.equal(queries.length, 0);
  byId('help-doctor-submit').click();
  assert.equal(queries.length, 1);
  assert.match(queries[0], /报告来自终端/);
  assert.match(queries[0], /old-tool/);
  assert.equal(byId('help-guide').hidden, true);
  assert.equal(byId('chat-footer').hidden, false);
});

test('warning introduction sets an evidence boundary and submission asks for the installation impact first', () => {
  const {context, byId, queries} = createPage();
  context.openTroubleshootingGuide('doctor');
  assert.match(byId('help-guide-purpose').textContent, /不等于 Homebrew 不能安装软件/);
  assert.match(byId('help-guide-purpose').textContent, /影响范围.*能否继续安装软件.*现在是否需要处理/);
  assert.match(byId('help-guide-purpose').textContent, /没有报告时还不能下结论/);
  assert.equal(queries.length, 0);
  byId('help-warning-text').value = 'Warning: Some installed formulae are deprecated';
  byId('help-warning-text').dispatch('input');
  byId('help-doctor-submit').click();
  assert.match(queries[0], /请先直接说明：影响范围是什么，是否影响 Homebrew 安装软件，现在是否需要处理/);
});

test('new conversation preserves guide controls and all unsent fields without sending anything', () => {
  const {context, byId, queries, network} = createPage();
  context.openTroubleshootingGuide('doctor');
  byId('chat-input').value = '稍后提问';
  byId('help-warning-text').value = 'Warning: saved report';
  byId('help-desktop-text').value = 'desktop report';
  byId('help-terminal-text').value = 'terminal report';
  byId('chat-input').dispatch('paste', {clipboardData:{items:[{kind:'file',type:'image/png',getAsFile:()=>({name:'draft.png',size:12,type:'image/png'})}]}});
  byId('chat-new-conversation').click();
  assert.equal(byId('chat-input').value, '稍后提问');
  assert.match(byId('chat-attachments').innerHTML, /attachment-chip/);
  assert.equal(byId('help-warning-text').value, 'Warning: saved report');
  assert.equal(byId('help-desktop-text').value, 'desktop report');
  assert.equal(byId('help-terminal-text').value, 'terminal report');
  assert.equal(byId('help-guide').hidden, true);
  assert.equal(byId('help-guide-resume').hidden, false);
  assert.equal(byId('chat-empty').hidden, false);
  assert.match(byId('chat-feedback').textContent, /新对话.*已保留/);
  byId('help-guide-resume').click();
  assert.equal(byId('help-guide').hidden, false);
  assert.equal(byId('help-doctor-submit').disabled, false);
  assert.equal(queries.length, 0);
  byId('help-doctor-submit').click();
  assert.match(queries[0], /Warning: saved report/);
  assert.deepEqual(network.map(request => request.url), ['/api/stats']);
});

test('configuration guidance collects one report at a time and labels sources automatically', () => {
  const { context, byId, queries, document } = createPage();
  context.openDesktopHelp();
  assert.equal(byId('help-config-next').disabled, true);
  assert.equal(byId('help-terminal-text').getClientRects().length, 0);
  byId('help-desktop-text').value = 'HOMEBREW_API_DOMAIN: https://app.example/api';
  byId('help-desktop-text').dispatch('input');
  byId('help-config-next').click();
  assert.equal(byId('help-desktop-text').getClientRects().length, 0);
  assert.equal(byId('help-config-second').hidden, false);
  assert.equal(byId('help-config-submit').disabled, true);
  assert.equal(document.activeElement, byId('help-terminal-text'));
  byId('help-terminal-text').value = 'HOMEBREW_API_DOMAIN: https://terminal.example/api';
  byId('help-terminal-text').dispatch('input');
  byId('help-config-back').click();
  assert.match(byId('help-desktop-text').value, /app.example/);
  byId('help-config-next').click();
  assert.match(byId('help-terminal-text').value, /terminal.example/);
  assert.equal(queries.length, 0);
  byId('help-config-submit').click();
  assert.equal(queries.length, 1);
  assert.match(queries[0], /\[desktop\]\nHOMEBREW_API_DOMAIN: https:\/\/app.example/);
  assert.match(queries[0], /\[terminal\]\nHOMEBREW_API_DOMAIN: https:\/\/terminal.example/);
});

test('leaving a guide preserves an existing question and does not send it', () => {
  const { context, byId, queries } = createPage();
  byId('chat-input').value = '已经写好的问题';
  context.openDesktopHelp();
  byId('help-guide-stuck').click();
  assert.equal(byId('chat-input').value, '已经写好的问题');
  assert.equal(byId('chat-footer').hidden, false);
  assert.equal(queries.length, 0);
  byId('chat-input').value = '';
  context.openTroubleshootingGuide('doctor');
  byId('help-guide-stuck').click();
  assert.match(byId('chat-input').value, /请一步一步教我/);
  assert.equal(queries.length, 0);
});

test('asking for help at step two retains the first report and offers a visible way back', () => {
  const { context, byId, queries } = createPage();
  context.openDesktopHelp();
  byId('help-desktop-text').value = 'HOMEBREW_PREFIX: /opt/homebrew';
  byId('help-desktop-text').dispatch('input');
  byId('help-config-next').click();
  byId('help-guide-stuck').click();
  assert.match(byId('chat-input').value, /\[desktop\]\nHOMEBREW_PREFIX: \/opt\/homebrew/);
  assert.equal(queries.length, 0);
  assert.equal(byId('help-guide-resume').hidden, false);
  byId('help-guide-resume').click();
  assert.equal(byId('help-config-second').hidden, false);
  assert.equal(byId('help-desktop-text').value, 'HOMEBREW_PREFIX: /opt/homebrew');
});

test('report submission excludes unrelated composer attachments and retains the unsent draft', () => {
  const { context, byId } = createPage();
  byId('chat-input').value = '另一个问题的草稿';
  byId('chat-input').dispatch('paste', { clipboardData: { items: [{ kind: 'file', type: 'image/png', getAsFile: () => ({ name: 'draft.png', size: 12, type: 'image/png' }) }] } });
  const submissions = [];
  context.sendQuickAction = (text, images) => submissions.push({ text, images });
  context.openTroubleshootingGuide('doctor');
  byId('help-warning-text').value = 'Your system is ready to brew.';
  byId('help-warning-text').dispatch('input');
  byId('help-doctor-submit').click();
  assert.equal(submissions.length, 1);
  assert.equal(submissions[0].images.length, 0);
  assert.equal(byId('chat-input').value, '另一个问题的草稿');
  assert.match(byId('chat-attachments').innerHTML, /attachment-chip/);
});

test('guide command copy reports success and failure without starting analysis', async () => {
  for (const clipboardFails of [true, false]) {
    const { context, elements, byId, copied, queries } = createPage({ clipboardFails });
    context.openDesktopHelp();
    const button = elements.find(element => element.dataset.helpCopy === 'config');
    await button.listeners.get('click')[0]();
    assert.deepEqual(copied, clipboardFails ? [] : ['brew config']);
    assert.match(byId('help-guide-feedback').textContent, clipboardFails ? /复制失败/ : /命令已复制/);
    assert.equal(queries.length, 0);
  }
});

test('uninstall is contained in closed management sections and the desktop requirements are explicit', () => {
  const sections = [...html.matchAll(/<details class="[^"]*\bmanagement-details\b[^"]*">([\s\S]*?)<\/details>/g)];
  assert.equal(sections.length, 2);
  assert.match(sections[0][1], /id="uninstall-command-macos"/);
  assert.match(sections[1][1], /id="uninstall-command-linux"/);
  assert.match(html, /BrewUI[\s\S]*macOS 26\+/);
  assert.match(html, /id="desktop-install-command">brew install --cask homebrew-app/);
  assert.match(html, /NAME=value/);
  assert.deepEqual(createPage().network.map(request => request.url), ['/api/stats'], 'loading the guide must not invoke local operations or a chat request');
  assert.match(html, /脚本获取/);
  assert.doesNotMatch(html, /累计安装次数|智能选择最佳镜像源|⭐⭐⭐⭐/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
  assert.equal(ids.length, new Set(ids).size, 'generated page must not duplicate command or panel ids');
  assert.match(html, /id="chat-attachments"/);
});

test('production theme buttons preserve explicit and system modes without storing chat state', () => {
  const { context, document, elements, storage, media } = createPage();
  const themes = elements.filter(element => element.dataset.themeMode);
  assert.deepEqual(themes.map(button => button.dataset.themeMode), ['light', 'system', 'dark']);
  themes[2].click();
  assert.equal(document.documentElement.attributes['data-theme'], 'dark');
  assert.equal(storage.get('brew-cn-theme'), 'dark');
  assert.equal(themes[2].attributes['aria-pressed'], 'true');
  themes[1].click();
  assert.equal(document.documentElement.attributes['data-theme'], 'light');
  const darkMedia = media.get('(prefers-color-scheme: dark)');
  darkMedia.matches = true;
  darkMedia.listener();
  assert.equal(document.documentElement.attributes['data-theme'], 'dark');
  assert.deepEqual([...storage.keys()], ['brew-cn-theme']);
  assert.equal(typeof context.switchOnboardingTask, 'function');
});

test('ARIA keyboard tabs switch operating systems and workspaces while preserving installer action', () => {
  const { context, document, byId, elements } = createPage();
  context.switchOnboardingTask('configure');
  const osTabs = elements.find(element => element.attributes['aria-label'] === '操作系统' && element.attributes.role === 'tablist');
  byId('os-tab-macos').focus();
  assert.equal(osTabs.dispatch('keydown', { key: 'ArrowRight' }).defaultPrevented, true);
  assert.equal(document.activeElement, byId('os-tab-linux'));
  assert.equal(byId('os-tab-linux').attributes['aria-selected'], 'true');
  assert.equal(byId('os-tab-linux').tabIndex, 0);
  assert.equal(byId('os-tab-macos').tabIndex, -1);
  assert.equal(byId('os-linux').hidden, false);
  assert.equal(elements.find(element => element.dataset.onboardingTask === 'configure').attributes['aria-pressed'], 'true');
  osTabs.dispatch('keydown', { key: 'Home' });
  assert.equal(document.activeElement, byId('os-tab-macos'));
  const workspaceTabs = elements.find(element => element.attributes['aria-label'] === '工作区' && element.attributes.role === 'tablist');
  byId('tab-install').focus();
  workspaceTabs.dispatch('keydown', { key: 'End' });
  assert.equal(byId('panel-ai-chat').hidden, false);
  assert.equal(byId('quick-help').hidden, true);
  assert.equal(byId('feature-highlights').hidden, true);
  workspaceTabs.dispatch('keydown', { key: 'Home' });
  assert.equal(byId('panel-install').hidden, false);
  assert.equal(byId('quick-help').hidden, false);
});

test('expanded workspace isolates surrounding content and Escape restores prior focus and inert state', () => {
  const { document, byId, elements } = createPage();
  const expand = byId('workspace-expand');
  const header = elements.find(element => element.classList.contains('site-header'));
  const hero = elements.find(element => element.classList.contains('hero'));
  header.inert = true;
  expand.click();
  assert.equal(byId('ai-chat-window').classList.contains('expanded'), true);
  assert.equal(document.body.classList.contains('workspace-expanded'), true);
  assert.equal(expand.attributes['aria-pressed'], 'true');
  assert.equal(hero.inert, true);
  assert.equal(byId('ai-chat-window').style.maxHeight, '800px');
  document.dispatch('keydown', { key: 'Escape', target: document.body });
  assert.equal(byId('ai-chat-window').classList.contains('expanded'), false);
  assert.equal(expand.attributes['aria-pressed'], 'false');
  assert.equal(hero.inert, false);
  assert.equal(header.inert, true);
  assert.equal(document.activeElement, expand);
});

test('copying a configure command reports clipboard success or failure accurately', async() => {
  for (const clipboardFails of [false, true]) {
    const { context, byId, elements, copied, network } = createPage({ clipboardFails });
    const button = elements.find(element => element.attributes.onclick?.includes("copyCommand('configure-command-macos'"));
    await context.copyCommand('configure-command-macos', button);
    if (clipboardFails) {
      assert.equal(copied.length, 0);
      assert.match(button.attributes['aria-label'], /复制失败/);
      assert.match(byId('copy-feedback').textContent, /手动复制/);
    } else {
      assert.equal(copied[0], byId('configure-command-macos').textContent);
      assert.match(button.attributes['aria-label'], /已复制/);
    }
    assert.deepEqual(network.map(request => request.url), ['/api/stats']);
  }
});

test('AI empty-state controls keep package query mode and screenshot limits usable', () => {
  const { context, byId, elements, document, network } = createPage();
  assert.equal(byId('chat-empty').hidden, false);
  elements.find(element => Object.hasOwn(element.attributes, 'data-open-chat')).click();
  assert.equal(byId('panel-ai-chat').hidden, false);
  assert.equal(document.activeElement, byId('chat-input'));
  elements.find(element => element.dataset.quickAction === 'search').click();
  assert.equal(byId('package-query-mode').hidden, false);
  byId('package-query-cancel').click();
  assert.equal(byId('package-query-mode').hidden, true);
  const event = byId('chat-input').dispatch('paste', { clipboardData: { items: Array.from({ length: 4 }, (_, index) => ({ kind: 'file', type: 'image/png', getAsFile: () => ({ name: `${index}.png`, size: 12, type: 'image/png' }) })) } });
  assert.equal(event.defaultPrevented, true);
  assert.equal((byId('chat-attachments').innerHTML.match(/class="attachment-chip/g) || []).length, 3);
  assert.match(byId('chat-feedback').textContent, /最多可添加 3 张/);
  assert.equal(byId('chat-send-btn').disabled, false);
  context.removeChatAttachment(0);
  assert.equal((byId('chat-attachments').innerHTML.match(/class="attachment-chip/g) || []).length, 2);
  assert.deepEqual(network.map(request => request.url), ['/api/stats']);
});
