import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTracingDisabled } from '@openai/agents';
import { __desktopGuidanceTestHooks as hooks, onRequestPost } from '../agents/chat/index.ts';
import { analyzeHomebrewText, combineConfigurationReports } from '../agents/chat/_tools.ts';

setTracingDisabled(true);
const env = { AI_GATEWAY_API_KEY: 'test-only-key', AI_GATEWAY_BASE_URL: 'https://example.invalid/v1', AI_GATEWAY_MODEL: 'test-model' };
const report = 'brew doctor\nWarning: The following taps are not trusted:\n  vendor/tap';
const originReport = 'Warning: The current git origin is:\n  https://mirrors.ustc.edu.cn/brew.git';
const intent = route => ({ ok: true, route, is_homebrew_related: route !== 'reject', needs_sandbox: route === 'mirror_probe_deep', reason: 'fixture' });
const history = [{ role: 'user', content: report }, { role: 'assistant', content: '只影响这个第三方仓库的软件。' }];

function sessionFixture(initial = []) {
  const items = [...initial];
  return { items, async getSessionId() { return 'conversation-fixture'; },
    async getItems(limit) { return limit ? items.slice(-limit) : [...items]; },
    async addItems(next) { items.push(...next); }, async popItem() { return items.pop(); },
    async clearSession() { items.length = 0; } };
}
function parseStream(text) {
  return text.split('\n').filter(line => line.startsWith('data: ') && !line.includes('[DONE]')).map(line => JSON.parse(line.slice(6)));
}
function modelStream(content) {
  const chunk = (delta, finish_reason = null) => ({ id: 'test-answer', object: 'chat.completion.chunk', created: 1, model: 'test-model', choices: [{ index: 0, delta, finish_reason }] });
  return new Response([chunk({ role: 'assistant', content }), chunk({}, 'stop')].map(item => `data: ${JSON.stringify(item)}\n\n`).join('') + 'data: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
}
function installGatewayFixture(t, route = 'analysis_fix') {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, init = {}) => {
    if (String(url).includes('/chat/completions')) {
      const body = JSON.parse(init.body); requests.push(body);
      if (body.stream) return modelStream('根据上一份报告，这条提示只涉及那个第三方仓库，不能据此说所有软件都无法安装。');
      return Response.json({ id: 'intent', object: 'chat.completion', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(intent(route)) } }] });
    }
    if (String(url).endsWith('/formula/git.json')) return Response.json({ name: 'git', full_name: 'git', desc: 'Distributed version control', homepage: 'https://git-scm.com', versions: { stable: '2.0' } });
    if (String(url).endsWith('/cask/git.json')) return new Response('{}', { status: 404 });
    throw new Error(`Unexpected network call: ${url}`);
  });
  return requests;
}
async function request(message, session, extra = {}) {
  const response = await onRequestPost({ request: { body: { message, ...extra }, headers: { 'makers-conversation-id': 'test-conversation' } }, env,
    store: { openaiSession: () => session }, sandbox: { runCode() { throw new Error('No cloud probe expected'); } } });
  return parseStream(await response.text());
}

test('every known Doctor warning exposes scope, installation impact and action timing; unknown and errors do not reassure', () => {
  for (const heading of ['The current git origin is:', 'Some installed casks are deprecated or disabled.', 'Some installed kegs have no formulae!', 'Some installed formulae are deprecated or disabled.', 'Unbrewed dylibs were found in /usr/local/lib.', 'The following taps are not trusted:']) {
    const result = analyzeHomebrewText(`brew doctor\nWarning: ${heading}\n  example`);
    const issue = result.issues[0];
    assert.ok(issue.impact_scope && issue.installation_impact && issue.action_required, heading);
    assert.ok(result.doctor.assessment.installation_impact);
  }
  const unknown = analyzeHomebrewText('brew doctor\nWarning: new diagnostic type');
  assert.match(unknown.doctor.assessment.installation_impact, /不能|尚未/);
  assert.doesNotMatch(unknown.doctor.assessment.installation_impact, /可以继续安装/);
  const error = analyzeHomebrewText(`${originReport}\nError: failed to complete checks`);
  assert.match(error.doctor.assessment.action_required, /优先.*错误/);
  for (const text of ['Your system is ready to brew.\ncommand not found: brew', `${originReport}\nfatal: unable to access remote`, 'Your system is ready to brew.\nerror: download failed']) {
    const mixed = analyzeHomebrewText(text);
    assert.equal(mixed.doctor.ready, false);
    assert.ok(mixed.issues.some(issue => issue.severity === 'error'));
    assert.doesNotMatch(mixed.doctor.assessment.installation_impact, /可以继续安装/);
  }
});

test('first reply answers installation impact and action required before requesting more evidence', async () => {
  const chunks = [];
  for await (const chunk of hooks.runDirectAnalysisAndFix({ message: report })) chunks.push(chunk);
  const events = parseStream(chunks.join(''));
  const answer = events.find(event => event.type === 'ai_response').content;
  assert.ok(answer.startsWith('**是否影响安装软件：**'));
  assert.ok(answer.indexOf('**现在是否需要处理：**') < answer.indexOf('如需进一步排查'));
  assert.match(answer, /影响范围：/);
  assert.match(answer, /官方|该仓库|这些仓库/);
  const actions = events.find(event => event.type === 'suggest_actions').actions;
  assert.equal(actions.length, 3);
  assert.ok(actions.every(action => action.label && action.prompt));
});

test('evidence-free diagnostic and troubleshooting replies use conversation instead of an empty analysis', () => {
  for (const message of ['那现在还能安装软件吗？', '先不处理可以吗？', '没看懂，解释简单一点', '临时验证成功', '带我做下一步']) {
    for (const route of ['analysis_fix', 'brew_missing', 'reject', 'mirror_probe_deep']) {
      const result = hooks.applyConversationIntentGuard(intent(route), message, undefined, history);
      assert.equal(result.route, 'conversation', `${message} / ${route}`);
      assert.equal(result.needs_sandbox, false);
    }
  }
  assert.equal(hooks.applyConversationIntentGuard(intent('analysis_fix'), '不确定怎么做', undefined, []).route, 'conversation');
  assert.equal(hooks.applyConversationIntentGuard(intent('analysis_fix'), 'PATH=/usr/bin', undefined, history).route, 'analysis_fix');
});

test('fresh tasks and explicit probes take precedence over a previous diagnostic context', () => {
  for (const [message, route] of [['那帮我安装 git', 'formula_check'], ['那 git 能安装吗？', 'formula_check'], ['那 wget 怎么安装？', 'formula_check'], ['这些问题之后，ffmpeg 能不能用 brew 装？', 'formula_check'], ['请在线检测镜像', 'mirror_probe_deep'], ['恢复官方源', 'restore_official'], ['换个问题，天气怎么样？', 'reject']]) {
    assert.equal(hooks.applyConversationIntentGuard(intent(route), message, undefined, history).route, route);
  }
  assert.equal(hooks.applyConversationIntentGuard(intent('conversation'), report, undefined, history).route, 'analysis_fix');
});

test('classifier history includes compact SDK user messages and completed direct exchanges', async () => {
  const session = sessionFixture([{ role: 'user', content: report }, { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '已解释' }] }, { type: 'function_call', name: 'ignored' }]);
  const messages = await hooks.sessionItemsToMessages(session);
  assert.equal(messages.length, 2);
  assert.match(messages[0].content, /vendor\/tap/);
  const output = `data: ${JSON.stringify({ type: 'ai_response', content: '已完成软件查询' })}\n\n`;
  for await (const _chunk of hooks.persistDirectExchange([output], { session, userInput: 'git 能装吗？' })) {}
  assert.equal(session.items.at(-2).type, 'message');
  assert.equal((await hooks.sessionItemsToMessages(session)).at(-2).content, 'git 能装吗？');
});

test('failed or aborted direct turns are not stored as completed', async () => {
  const session = sessionFixture();
  const event = data => `data: ${JSON.stringify(data)}\n\n`;
  for await (const _chunk of hooks.persistDirectExchange([event({ type: 'ai_response', content: 'partial' }), event({ type: 'error_message', content: 'failed' })], { session, userInput: 'test' })) {}
  assert.equal(session.items.length, 0);
  const controller = new AbortController();
  async function* interrupted() { yield event({ type: 'ai_response', content: 'partial' }); controller.abort(); }
  for await (const _chunk of hooks.persistDirectExchange(interrupted(), { session, userInput: 'test', signal: controller.signal })) {}
  assert.equal(session.items.length, 0);
});

test('separately supplied configuration reports are compared with source labels and a freshness note', async () => {
  const previous = '[desktop]\nHOMEBREW_PREFIX: /opt/homebrew\nHOMEBREW_API_DOMAIN: https://desktop.example/api';
  const current = '[terminal]\nHOMEBREW_PREFIX: /opt/homebrew\nHOMEBREW_API_DOMAIN: https://terminal.example/api';
  const combined = analyzeHomebrewText(combineConfigurationReports(current, previous));
  assert.equal(combined.configuration.rows.find(row => row.key === 'HOMEBREW_API_DOMAIN').status, 'different');
  assert.equal(combineConfigurationReports('Your system is ready to brew.', report), 'Your system is ready to brew.');
  const chunks = [];
  for await (const chunk of hooks.runDirectAnalysisAndFix({ message: current, previousReport: previous })) chunks.push(chunk);
  assert.match(parseStream(chunks.join('')).find(event => event.type === 'ai_response').content, /两次提供的信息/);
  assert.equal(hooks.findPreviousReport([...history, { role: 'user', content: '换个问题，安装 Git' }]), undefined);
  assert.equal(hooks.findPreviousReport([...history, { role: 'user', content: '好了' }]), undefined);
  assert.equal(hooks.findPreviousReport([...history, { role: 'user', content: '好的' }]), report);
  assert.equal(hooks.getCasualReplyKind('好的'), 'acknowledgement');
  assert.equal(hooks.getCasualReplyKind('解决了'), 'resolved');
  const withFile = previous + '\n[/opt/homebrew/etc/homebrew/brew.env]\nHOMEBREW_API_DOMAIN=https://desktop.example/api';
  const provenance = analyzeHomebrewText(combineConfigurationReports(current, withFile));
  assert.deepEqual(provenance.configuration.rows.find(row => row.key === 'HOMEBREW_API_DOMAIN').candidate_sources, ['/opt/homebrew/etc/homebrew/brew.env']);
});

test('a long chain of contextual follow-ups retains the active report in bounded model history', () => {
  const old = [{ type: 'message', role: 'user', content: report }, { type: 'message', role: 'assistant', content: 'assessment' }];
  for (let i = 0; i < 6; i++) old.push({ role: 'user', content: '解释简单一点' }, { role: 'assistant', content: `explanation ${i}` });
  const retained = hooks.limitSessionHistory(old, [{ role: 'user', content: '那它会影响安装吗？' }]);
  assert.equal(retained[0].content, report);
  assert.ok(retained.length <= 11);
  assert.equal(hooks.limitSessionHistory(old, [{ role: 'user', content: '换个问题' }]).length, 9);
});

test('diagnosis followed by an installation-impact question reaches the model with the original report', async (t) => {
  const requests = installGatewayFixture(t);
  const session = sessionFixture();
  const first = await request(report, session);
  assert.ok(first.some(event => event.type === 'suggest_actions'));
  const second = await request('那现在还能安装软件吗？', session);
  assert.ok(second.some(event => event.type === 'ai_response' && event.content.includes('根据上一份报告')));
  assert.equal(second.some(event => event.type === 'tool_call' && event.name === 'analyze'), false);
  const classifier = requests.filter(item => !item.stream).at(-1);
  const answer = requests.find(item => item.stream);
  assert.match(JSON.stringify(classifier.messages), /vendor\/tap/);
  assert.match(JSON.stringify(answer.messages), /vendor\/tap/);
  assert.ok(!answer.tools || answer.tools.length === 0);
  assert.doesNotMatch(JSON.stringify(second), /暂时没有发现明显的 PATH/);
});

test('greetings, thanks and completion acknowledgements need no network or diagnostic tools', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Small talk must not use the gateway'); });
  const session = sessionFixture();
  for (const message of ['你好', '谢谢', '好了，谢谢']) {
    const events = await request(message, session);
    assert.ok(events.some(event => event.type === 'ai_response'));
    assert.equal(events.some(event => event.type === 'tool_call' && event.name !== 'intent_classify'), false);
  }
  assert.equal(session.items.length, 6);
});

test('package lookup persists its target for a natural-language upgrade follow-up', async (t) => {
  const requests = installGatewayFixture(t, 'formula_check');
  const session = sessionFixture();
  await request('brew info git', session);
  assert.equal(session.items.length, 2);
  await request('那怎么升级它？', session);
  const answer = requests.find(item => item.stream);
  assert.ok(answer);
  assert.match(JSON.stringify(answer.messages), /git/);
  assert.ok(!answer.tools || answer.tools.length === 0);
});

test('PATH troubleshooting persists its instruction and accepts the promised progress reply', async (t) => {
  const requests = installGatewayFixture(t, 'brew_missing');
  const session = sessionFixture();
  await request('command not found: brew', session);
  assert.equal(session.items.length, 2);
  const events = await request('临时验证成功', session);
  assert.ok(requests.some(item => item.stream));
  assert.equal(events.some(event => event.type === 'tool_call' && event.name === 'analyze'), false);
});
