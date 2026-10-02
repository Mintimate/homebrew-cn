import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildSystemPrompt, shouldCheckDesktopConfigurationFirst } from '../agents/chat/_prompt.ts';
import { __desktopGuidanceTestHooks as hooks } from '../agents/chat/index.ts';
import { analyzeHomebrewText, generateFixScript, inferFixOptions } from '../agents/chat/_tools.ts';
import { HOMEBREW_CN_CONFIGURE_COMMAND, HOMEBREW_CN_LINUX_CONFIGURE_COMMAND, HOMEBREW_CN_RESTORE_OFFICIAL_REPLY, buildIntentClassificationPrompt } from '../agents/chat/_skill.ts';

const intent = (route) => ({ ok: true, route, is_homebrew_related: true, needs_sandbox: route === 'mirror_probe_deep', reason: 'classifier response' });

test('desktop-only failures use configuration guidance without pretending to diagnose the Mac', () => {
  for (const message of ['BrewUI 下载很慢', '终端已经换源，桌面端还是失败', '从 Dock 打开 GUI 不读取 .zshrc', 'BrewUI 很慢，不要在线检测镜像，只看配置']) {
    assert.equal(shouldCheckDesktopConfigurationFirst(message), true, message);
    for (const route of ['mirror_probe_deep', 'analysis_fix']) {
      const result = hooks.applyDesktopIntentGuard(intent(route), message);
      assert.equal(result.route, 'general_homebrew', message);
      assert.equal(result.needs_sandbox, false);
    }
    assert.deepEqual(hooks.getAllowedTools(message), ['formula_check']);
  }
});

test('desktop users can still explicitly request network diagnostics', () => {
  for (const message of ['BrewUI 很慢，帮我在线检测镜像', 'BrewUI 很慢，请帮我测速', 'BrewUI 下载失败，测一下网络', 'BrewUI is slow; please test the mirrors']) {
    assert.equal(shouldCheckDesktopConfigurationFirst(message), false, message);
    assert.equal(hooks.applyDesktopIntentGuard(intent('mirror_probe_deep'), message).route, 'mirror_probe_deep');
    assert.ok(hooks.getAllowedTools(message).includes('mirror_probe_deep'));
  }
  assert.equal(hooks.applyDesktopIntentGuard(intent('mirror_probe_deep'), 'brew 下载很慢').route, 'mirror_probe_deep');
});

test('desktop configuration guidance disables optional thinking before generic error heuristics', () => {
  for (const message of ['BrewUI 下载很慢', '终端已换源但桌面端更新失败', 'BrewUI failed to download; check my configuration']) {
    assert.equal(hooks.needsThinking(message), false, message);
    assert.equal(hooks.needsThinking(message, 'HOMEBREW_API_DOMAIN=https://mirror.example/homebrew-bottles/api'), false, message);
  }
  assert.equal(hooks.needsThinking('brew update failed with an SSL error'), true);
  assert.equal(hooks.needsThinking('BrewUI 下载失败，请在线检测镜像'), true);
});

test('desktop guard preserves restore, package, PATH and unrelated routes', () => {
  for (const route of ['restore_official', 'formula_check', 'brew_missing', 'reject']) {
    assert.equal(hooks.applyDesktopIntentGuard(intent(route), 'BrewUI 镜像配置').route, route);
  }
  assert.equal(shouldCheckDesktopConfigurationFirst('Docker Desktop 怎么安装'), false);
});

test('generated skill supplies desktop support, shared config and routing rules', () => {
  const prompt = buildSystemPrompt('BrewUI 换源');
  assert.match(prompt, /macOS 26/);
  assert.match(prompt, /--no-rcs --no-global-rcs/);
  assert.match(prompt, /XDG_CONFIG_HOME/);
  assert.match(prompt, /NAME=value/);
  assert.match(prompt, /\$\(brew --prefix\)\/etc\/homebrew\/brew\.env/);
  assert.ok(prompt.includes(HOMEBREW_CN_CONFIGURE_COMMAND));
  assert.match(buildIntentClassificationPrompt(), /终端已换源但桌面端很慢/);
});

test('direct restore reply comes from the skill and covers persistent GUI configuration', async () => {
  const reference = readFileSync(new URL('../skills/homebrew-cn-agent/references/restore-official.md', import.meta.url), 'utf8');
  assert.equal(HOMEBREW_CN_RESTORE_OFFICIAL_REPLY, reference.split('## Direct Reply\n')[1].trim());
  const chunks = [];
  for await (const chunk of hooks.runDirectRestoreOfficial()) chunks.push(chunk);
  const event = chunks.map(chunk => JSON.parse(chunk.replace(/^data: /, '').trim())).find(item => item.type === 'ai_response');
  assert.equal(event.content, HOMEBREW_CN_RESTORE_OFFICIAL_REPLY);
  assert.ok(event.content.includes(HOMEBREW_CN_CONFIGURE_COMMAND));
  assert.ok(event.content.includes(HOMEBREW_CN_LINUX_CONFIGURE_COMMAND));
  assert.match(event.content, /brew\.env/);
  assert.match(event.content, /HOMEBREW_BREW_GIT_REMOTE HOMEBREW_CORE_GIT_REMOTE HOMEBREW_BOTTLE_DOMAIN HOMEBREW_API_DOMAIN/);
  assert.match(event.content, /退出后重新打开 BrewUI/);
});

test('legacy mirror exports produce an interactive migration, not more profile exports', () => {
  const input = 'export HOMEBREW_BOTTLE_DOMAIN=https://mirror.example/bottles\nexport HOMEBREW_API_DOMAIN=https://mirror.example/api';
  const analysis = analyzeHomebrewText(input);
  assert.ok(analysis.issues.some(issue => issue.id === 'legacy_mirror_shell_config'));
  const fix = inferFixOptions(input, analysis.issues);
  assert.ok(fix);
  const script = generateFixScript(fix);
  assert.ok(script.includes(HOMEBREW_CN_CONFIGURE_COMMAND));
  assert.doesNotMatch(script, />>|source\s|export HOMEBREW_/);
  assert.match(script, /尚未执行本机诊断/);
  const linuxScript = generateFixScript({ ...fix, os_type: 'linux', shell_type: 'bash' });
  assert.ok(linuxScript.includes(HOMEBREW_CN_LINUX_CONFIGURE_COMMAND));
  assert.doesNotMatch(linuxScript, /\/bin\/zsh|BrewUI/);
});

test('generic slowness and missing PATH do not prove installation or trigger persistent repair', () => {
  const analysis = analyzeHomebrewText('BrewUI 下载很慢');
  assert.equal(analysis.issues_found, 0);
  assert.equal(inferFixOptions('BrewUI 下载很慢', analysis.issues), null);
  const missing = analyzeHomebrewText('command not found: brew');
  assert.ok(missing.issues.some(issue => issue.id === 'brew_missing_from_path'));
  assert.doesNotMatch(JSON.stringify(missing), /已成功下载|>>|source\s/);
  assert.equal(inferFixOptions('command not found: brew', missing.issues), null);
  const temporary = generateFixScript({ issue_ids: ['brew_missing_from_path'], os_type: 'macos', arch: 'arm64', shell_type: 'zsh' });
  assert.match(temporary, /if \[ -x "\/opt\/homebrew\/bin\/brew" \]; then/);
  assert.doesNotMatch(temporary, />>|source\s|修复完毕/);
});
