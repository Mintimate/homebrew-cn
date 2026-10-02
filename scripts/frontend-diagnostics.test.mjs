import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { analyzeHomebrewText } from '../agents/chat/_tools.ts';
import { getClientScript } from '../cloud-functions/templates/client-script.js';

const comparison = `[terminal]
HOMEBREW_PREFIX: /opt/homebrew
ORIGIN: https://mirrors.ustc.edu.cn/brew.git
HOMEBREW_API_DOMAIN: https://mirrors.ustc.edu.cn/homebrew-bottles/api
HOMEBREW_BOTTLE_DOMAIN: https://mirrors.ustc.edu.cn/homebrew-bottles
[desktop]
HOMEBREW_PREFIX: /opt/homebrew
ORIGIN: https://mirrors.ustc.edu.cn/brew.git
HOMEBREW_API_DOMAIN: https://formulae.brew.sh/api
[/opt/homebrew/etc/homebrew/brew.env]
HOMEBREW_API_DOMAIN=https://mirrors.ustc.edu.cn/homebrew-bottles/api
[~/.homebrew/brew.env]
HOMEBREW_API_DOMAIN=https://formulae.brew.sh/api
`;

test('configuration cards escape report text and keep evidence, verification and unknown fields visible', () => {
  const script = getClientScript();
  const code = script.slice(script.indexOf('function renderDiagnosticRichContent('), script.indexOf('function setStatus('));
  const result = analyzeHomebrewText(comparison);
  result.configuration.rows[0].terminal = '<img src=x onerror=alert(1)>';
  const context = vm.createContext({ diagnosticState: { analysis: result, fix: '' },
    escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    parseMarkdown: value => value,
    renderCollapsibleRawOutput: () => '',
  });
  vm.runInContext(code, context);
  const container = { innerHTML: '' };
  context.renderDiagnosticRichContent(container);
  assert.match(container.innerHTML, /&lt;img/);
  assert.doesNotMatch(container.innerHTML, /<img/);
  assert.match(container.innerHTML, /候选配置来源/);
  assert.match(container.innerHTML, /未提供或无法确认/);
  assert.match(container.innerHTML, /复查：/);
});

test('tool summaries do not present agreement in supplied fields as a healthy local environment', () => {
  const script = getClientScript();
  const code = script.slice(script.indexOf('function formatToolSummary('), script.indexOf('function loadHtml2Canvas('));
  const context = vm.createContext({});
  vm.runInContext(code, context);
  const same = analyzeHomebrewText('[terminal]\nORIGIN=https://example.com/brew\n[desktop]\nORIGIN=https://example.com/brew');
  assert.match(context.formatToolSummary('analyze', JSON.stringify(same)), /已提供/);
  assert.doesNotMatch(context.formatToolSummary('analyze', JSON.stringify(same)), /正常|未发现/);
  assert.match(context.formatToolSummary('analyze', JSON.stringify(analyzeHomebrewText('Your system is ready to brew.'))), /报告/);
});
