import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const installer = fileURLToPath(new URL('../install.sh', import.meta.url));
const installerSource = readFileSync(installer, 'utf8');
const shells = ['/bin/bash', '/bin/zsh'].filter(existsSync);

// Every command runs in a disposable HOME/prefix with a mock brew and git.
// No actual Homebrew install, network request, sudo or user dotfile is touched.
function fixture(t, shell) {
  const root = mkdtempSync(join(tmpdir(), 'homebrew-cn-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const home = join(root, 'user');
  const prefix = join(root, 'prefix');
  const mockBin = join(root, 'mock-bin');
  for (const directory of [home, prefix, mockBin, join(prefix, 'bin'), join(prefix, '.git')]) mkdirSync(directory, { recursive: true });
  const log = join(root, 'calls.log');
  writeFileSync(log, '');
  function put(path, contents, executable = false) {
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, contents);
    if (executable) chmodSync(path, 0o755);
  }
  put(join(prefix, 'bin/brew'), `#!/bin/bash
printf 'brew %s\\n' "$*" >> "$TEST_LOG"
case "$1" in
  --prefix) printf '%s\\n' "$TEST_PREFIX" ;;
  --repo) printf '%s\\n' "$TEST_PREFIX" ;;
  --version) echo 'Homebrew 7.0.0'; exit "\${TEST_VERSION_STATUS:-0}" ;;
  update) echo 'mock update diagnostic' >&2; exit "\${TEST_UPDATE_STATUS:-0}" ;;
  *) echo "unexpected brew operation: $*" >&2; exit 90 ;;
esac
`, true);
  put(join(mockBin, 'git'), `#!/bin/bash
printf 'git %s\\n' "$*" >> "$TEST_LOG"
if [[ "$1" == ls-remote ]]; then
  [[ "\${TEST_MAIN:-present}" == present ]] || exit 2
  printf 'abc123\\trefs/heads/main\\n'
fi
if [[ "$1" == -C && "$3" == init ]]; then mkdir -p "$2/.git"; fi
if [[ "$1" == -C && "$3" == checkout && -n "\${TEST_BREW_TEMPLATE:-}" ]]; then
  mkdir -p "$2/bin"
  cp "$TEST_BREW_TEMPLATE" "$2/bin/brew"
  chmod +x "$2/bin/brew"
fi
exit 0
`, true);
  put(join(mockBin, 'sw_vers'), '#!/bin/bash\nprintf "%s\\n" "${TEST_MACOS:-26.0}"\n', true);
  put(join(mockBin, 'sudo'), '#!/bin/bash\necho "unexpected sudo" >&2\nexit 90\n', true);
  const env = {
    PATH: `${mockBin}:/usr/bin:/bin:/usr/sbin:/sbin`,
    HOME: home,
    SHELL: shell,
    INSTALLER_FILE: installer,
    TEST_PREFIX: prefix,
    TEST_LOG: log,
  };
  const bootstrap = `source "$INSTALLER_FILE"
get_homebrew_prefix() { printf '%s\\n' "$TEST_PREFIX"; }
detect_os() { echo macos; }
detect_arch() { echo arm64; }
preflight_check() { echo 'unexpected preflight' >&2; return 90; }
`;
  return {
    root, home, prefix, env, put, mockBin,
    run(code, overrides = {}) {
      return spawnSync(shell, ['-c', bootstrap + code], { cwd: root, env: { ...env, ...overrides }, encoding: 'utf8', timeout: 10_000 });
    },
    contents: (path) => readFileSync(path, 'utf8'),
    calls: () => readFileSync(log, 'utf8'),
  };
}

function ok(result) {
  assert.equal(result.status, 0, `${result.error || ''}\n${result.stdout}\n${result.stderr}`);
}

for (const shell of shells) {
  const label = shell.split('/').at(-1);
  test(`${label}: direct and curl-style -c entry points forward arguments`, (t) => {
    const f = fixture(t, shell);
    for (const args of [[installer, '--help'], ['-c', installerSource, '--', '--help']]) {
      const result = spawnSync(shell, args, { cwd: f.root, env: f.env, encoding: 'utf8', timeout: 10_000 });
      ok(result);
      assert.match(result.stdout, /--configure/);
      assert.equal(f.calls(), '');
    }
    const result = f.run('echo sourced');
    ok(result);
    assert.equal(result.stdout.trim(), 'sourced');
  });

  test(`${label}: configure migrates shell and user/XDG env without losing unrelated settings; repeat is idempotent`, (t) => {
    const f = fixture(t, shell);
    const profile = join(f.home, label === 'zsh' ? '.zshrc' : '.bash_profile');
    const xdg = join(f.home, 'xdg');
    const userEnv = join(f.home, '.homebrew/brew.env');
    const xdgEnv = join(xdg, 'homebrew/brew.env');
    const prefixEnv = join(f.prefix, 'etc/homebrew/brew.env');
    f.put(profile, '# unrelated\nexport EDITOR=vim\n# Homebrew 镜像配置 (TUNA)\nexport HOMEBREW_API_DOMAIN="https://old.example/api"\n');
    f.put(userEnv, 'HOMEBREW_API_DOMAIN=https://old-user.example/api\nHOMEBREW_NO_ANALYTICS=1\n');
    f.put(xdgEnv, 'HOMEBREW_BOTTLE_DOMAIN=https://old-xdg.example\nHOMEBREW_NO_ENV_HINTS=1\n');
    f.put(prefixEnv, 'HOMEBREW_NO_AUTO_UPDATE=1\nHOMEBREW_API_DOMAIN=https://old-prefix.example/api\n');
    const result = f.run("main --configure <<<'1'", { XDG_CONFIG_HOME: xdg });
    ok(result);
    assert.match(result.stdout, /未更新或升级已有 Homebrew/);
    assert.match(f.contents(profile), /export EDITOR=vim/);
    assert.doesNotMatch(f.contents(profile), /HOMEBREW_API_DOMAIN/);
    assert.equal(f.contents(userEnv), 'HOMEBREW_NO_ANALYTICS=1\n');
    assert.equal(f.contents(xdgEnv), 'HOMEBREW_NO_ENV_HINTS=1\n');
    assert.match(f.contents(prefixEnv), /HOMEBREW_NO_AUTO_UPDATE=1/);
    assert.match(f.contents(prefixEnv), /^HOMEBREW_API_DOMAIN=https:\/\/mirrors\.ustc\.edu\.cn\/homebrew-bottles\/api$/m);
    assert.doesNotMatch(f.contents(prefixEnv), /export |HOMEBREW_CORE_GIT_REMOTE|HOMEBREW_CASK_GIT_REMOTE/);
    assert.doesNotMatch(f.calls(), /brew update|git .*fetch|checkout|reset/);
    const before = [profile, prefixEnv, userEnv, xdgEnv].map(f.contents);
    const profileBackups = readdirSync(f.home).filter(name => name.startsWith(`${profile.split('/').at(-1)}.homebrew-cn-backup.`));
    assert.ok(profileBackups.length);
    ok(f.run("main --configure <<<'1'", { XDG_CONFIG_HOME: xdg }));
    assert.deepEqual([profile, prefixEnv, userEnv, xdgEnv].map(f.contents), before);
    assert.equal(readdirSync(f.home).filter(name => name.startsWith(`${profile.split('/').at(-1)}.homebrew-cn-backup.`)).length, profileBackups.length);
  });

  test(`${label}: official restore cleans only mirror keys and restores existing tap remotes`, (t) => {
    const f = fixture(t, shell);
    for (const tap of ['core', 'cask']) mkdirSync(join(f.prefix, `Library/Taps/homebrew/homebrew-${tap}/.git`), { recursive: true });
    const envFile = join(f.prefix, 'etc/homebrew/brew.env');
    f.put(envFile, 'HOMEBREW_NO_ANALYTICS=1\n');
    ok(f.run("main --configure <<<'1'"));
    assert.match(f.contents(envFile), /HOMEBREW_CORE_GIT_REMOTE=https:\/\/github.com\/Homebrew\/homebrew-core/);
    assert.match(f.calls(), /homebrew-cask remote set-url origin https:\/\/github.com\/Homebrew\/homebrew-cask/);
    ok(f.run("main --configure <<<'4'"));
    assert.equal(f.contents(envFile), 'HOMEBREW_NO_ANALYTICS=1\n');
    assert.match(f.calls(), /remote set-url origin https:\/\/github.com\/Homebrew\/brew/);
  });

  test(`${label}: prefix-selected user brew.env is migrated alongside the terminal XDG file`, (t) => {
    const f = fixture(t, shell);
    const sharedConfig = join(f.root, 'shared config');
    const terminalConfig = join(f.home, 'terminal-config');
    const prefixEnv = join(f.prefix, 'etc/homebrew/brew.env');
    const sharedEnv = join(sharedConfig, 'homebrew/brew.env');
    const terminalEnv = join(terminalConfig, 'homebrew/brew.env');
    const prefixOriginal = `HOMEBREW_XDG_CONFIG_HOME=${sharedConfig}\nHOMEBREW_NO_ANALYTICS=1\n`;
    const sharedOriginal = 'HOMEBREW_API_DOMAIN=https://old-shared.example/api\nHOMEBREW_NO_ENV_HINTS=1\n';
    f.put(prefixEnv, prefixOriginal);
    f.put(sharedEnv, sharedOriginal);
    f.put(terminalEnv, 'HOMEBREW_API_DOMAIN=https://old-terminal.example/api\n');
    ok(f.run("main --configure <<<'1'", { XDG_CONFIG_HOME: terminalConfig }));
    assert.equal(f.contents(sharedEnv), 'HOMEBREW_NO_ENV_HINTS=1\n');
    assert.equal(f.contents(terminalEnv), '');
    assert.ok(f.contents(prefixEnv).startsWith(prefixOriginal));
    const backup = readdirSync(join(sharedConfig, 'homebrew')).find(name => name.startsWith('brew.env.homebrew-cn-backup.'));
    assert.equal(f.contents(join(sharedConfig, 'homebrew', backup)), sharedOriginal);
    f.put(sharedEnv, sharedOriginal);
    ok(f.run("main --configure <<<'4'"));
    assert.equal(f.contents(sharedEnv), 'HOMEBREW_NO_ENV_HINTS=1\n');
    assert.equal(f.contents(prefixEnv), prefixOriginal);
    f.put(sharedEnv, sharedOriginal);
    ok(f.run('cleanup_homebrew_config "$TEST_PREFIX"'));
    assert.equal(f.contents(sharedEnv), 'HOMEBREW_NO_ENV_HINTS=1\n');
  });

  test(`${label}: unsafe brew.env XDG paths block migration without executing configuration`, (t) => {
    const f = fixture(t, shell);
    const prefixEnv = join(f.prefix, 'etc/homebrew/brew.env');
    for (const value of ['relative-config', '$HOME/.config', `${f.root}/$(touch xdg-evaluated)`]) {
      const original = `HOMEBREW_XDG_CONFIG_HOME=${value}\nHOMEBREW_API_DOMAIN=https://old.example/api\n`;
      f.put(prefixEnv, original);
      const result = f.run("main --configure <<<'1'");
      assert.equal(result.status, 1);
      assert.match(result.stdout, /无法安全迁移/);
      assert.equal(f.contents(prefixEnv), original);
      assert.equal(existsSync(join(f.root, 'xdg-evaluated')), false);
      assert.doesNotMatch(f.calls(), /remote set-url|ls-remote/);
    }
  });

  test(`${label}: system brew.env XDG discovery reads literal values and preserves system priority`, (t) => {
    const f = fixture(t, shell);
    const systemFixture = join(f.root, 'system-brew.env');
    const systemConfig = join(f.root, 'system-selected');
    const original = `HOMEBREW_SYSTEM_ENV_TAKES_PRIORITY=1\nHOMEBREW_XDG_CONFIG_HOME=/old-unused\nHOMEBREW_XDG_CONFIG_HOME=${systemConfig}\n`;
    f.put(systemFixture, original);
    const result = f.run('USER_ENV_FILES=(); collect_env_xdg_file "$TEST_SYSTEM_ENV"; printf "%s\\n" "${USER_ENV_FILES[@]}"', { TEST_SYSTEM_ENV: systemFixture });
    ok(result);
    assert.equal(result.stdout.trim(), join(systemConfig, 'homebrew/brew.env'));
    assert.equal(f.contents(systemFixture), original);
  });

  test(`${label}: missing main fails before touching configuration or Git remotes`, (t) => {
    const f = fixture(t, shell);
    const profile = join(f.home, '.zshrc');
    const original = 'export HOMEBREW_API_DOMAIN="https://old.example/api"\n';
    f.put(profile, original);
    const result = f.run("main --configure <<<'1'", { TEST_MAIN: 'missing' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /不会回退到已冻结的 master/);
    assert.equal(f.contents(profile), original);
    assert.doesNotMatch(f.calls(), /remote set-url|fetch|checkout/);
    assert.doesNotMatch(result.stdout, /安装\/配置完成/);
  });

  test(`${label}: complex shell statements and artifact overrides remain intact and block migration`, (t) => {
    const f = fixture(t, shell);
    const profile = join(f.home, '.zshrc');
    for (const line of [
      'export HOMEBREW_API_DOMAIN=https://old.example; echo keep-me\n',
      'export HOMEBREW_API_DOMAIN=https://old.example&echo-keep-me\n',
      'export HOMEBREW_ARTIFACT_DOMAIN=https://artifact.example\n',
    ]) {
      f.put(profile, line);
      const result = f.run("main --configure <<<'1'");
      assert.equal(result.status, 1);
      assert.equal(f.contents(profile), line);
      assert.doesNotMatch(f.calls(), /remote set-url|ls-remote/);
    }
  });

  test(`${label}: missing brew in configure never invokes installation preflight`, (t) => {
    const f = fixture(t, shell);
    const result = f.run('find_existing_homebrew() { return 1; }; main --configure');
    assert.equal(result.status, 1);
    assert.match(result.stdout, /不会安装/);
    assert.doesNotMatch(result.stderr, /unexpected preflight/);
    assert.equal(f.calls(), '');
  });

  test(`${label}: failed update remains visible and cannot print success`, (t) => {
    const f = fixture(t, shell);
    const result = f.run('update_and_verify "$TEST_PREFIX"', { TEST_UPDATE_STATUS: '17' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /mock update diagnostic/);
    assert.match(result.stdout, /安装尚未完成/);
    assert.doesNotMatch(result.stdout, /安装验证通过/);
    assert.doesNotMatch(f.calls(), /brew --version/);
  });

  test(`${label}: fresh install fetches and checks out main before successful update verification`, (t) => {
    const f = fixture(t, shell);
    const template = join(f.root, 'brew.template');
    f.put(template, f.contents(join(f.prefix, 'bin/brew')));
    rmSync(join(f.prefix, 'bin/brew'));
    rmSync(join(f.prefix, '.git'), { recursive: true });
    const result = f.run(`
sudo() { [[ "$1" == chown ]] || abort 'unexpected sudo operation'; }
select_mirror <<<'1'
install_homebrew arm64 macos
`, { TEST_BREW_TEMPLATE: template });
    ok(result);
    assert.match(f.calls(), /fetch --force --depth=1 origin \+refs\/heads\/main:refs\/remotes\/origin\/main/);
    assert.match(f.calls(), /checkout --force -B main origin\/main/);
    assert.doesNotMatch(f.calls(), /master|reset/);
    assert.match(f.calls(), /brew update --force[\s\S]*brew --version/);
    assert.match(result.stdout, /安装验证通过/);
  });

  test(`${label}: version validation gates success even after update succeeds`, (t) => {
    const f = fixture(t, shell);
    const result = f.run('update_and_verify "$TEST_PREFIX"', { TEST_VERSION_STATUS: '18' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /验证失败/);
    assert.doesNotMatch(result.stdout, /安装验证通过/);
    ok(f.run('update_and_verify "$TEST_PREFIX"'));
  });

  test(`${label}: macOS eligibility gates new installs and GUI guidance`, (t) => {
    const f = fixture(t, shell);
    let result = f.run('check_macos_support macos x86_64 new', { TEST_MACOS: '10.15.7' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /不支持 macOS 10.15/);
    result = f.run('check_macos_support macos x86_64 existing', { TEST_MACOS: '15.0' });
    ok(result);
    assert.match(result.stdout, /Tier 3/);
    assert.match(result.stdout, /当前系统请继续使用命令行/);
    result = f.run('MIRROR_NAME=USTC; show_finish_info "$TEST_PREFIX" macos', { TEST_MACOS: '26.0' });
    ok(result);
    assert.match(result.stdout, /brew install --cask homebrew-app/);
    result = f.run('MIRROR_NAME=USTC; show_finish_info "$TEST_PREFIX" macos', { TEST_MACOS: '15.0' });
    ok(result);
    assert.doesNotMatch(result.stdout, /brew install --cask homebrew-app/);
  });

  test(`${label}: uninstall configuration cleanup preserves unrelated variables and backs up prefix env outside prefix`, (t) => {
    const f = fixture(t, shell);
    const profile = join(f.home, '.zshrc');
    const prefixEnv = join(f.prefix, 'etc/homebrew/brew.env');
    const userEnv = join(f.home, '.homebrew/brew.env');
    f.put(profile, `# personal\nexport EDITOR=vim\n# Homebrew 镜像配置 (USTC)\nexport HOMEBREW_API_DOMAIN="https://old.example"\n# Homebrew 环境配置\neval "$("${f.prefix}/bin/brew" shellenv)"\n`);
    f.put(prefixEnv, 'HOMEBREW_API_DOMAIN=https://old.example\nHOMEBREW_NO_ANALYTICS=1\n');
    f.put(userEnv, 'HOMEBREW_API_DOMAIN=https://old.example\nHOMEBREW_NO_ENV_HINTS=1\n');
    ok(f.run('cleanup_homebrew_config "$TEST_PREFIX"'));
    assert.equal(f.contents(profile), '# personal\nexport EDITOR=vim\n: # homebrew-cn mirror configuration removed\n');
    assert.equal(f.contents(prefixEnv), 'HOMEBREW_NO_ANALYTICS=1\n');
    assert.equal(f.contents(userEnv), 'HOMEBREW_NO_ENV_HINTS=1\n');
    assert.ok(readdirSync(f.home).some(name => name.startsWith('.homebrew-cn-uninstall-brew.env.')));
    assert.equal(f.calls(), '');
  });

  test(`${label}: migration keeps shell syntax valid when an assignment is the only branch command`, (t) => {
    const f = fixture(t, shell);
    const profile = join(f.home, '.zshrc');
    f.put(profile, 'if true; then\nexport HOMEBREW_API_DOMAIN="https://old.example"\nfi\n');
    ok(f.run("main --configure <<<'1'"));
    assert.doesNotMatch(f.contents(profile), /HOMEBREW_API_DOMAIN/);
    ok(spawnSync(shell, ['-n', profile], { env: f.env, encoding: 'utf8' }));
  });

  test(`${label}: shellenv treats custom prefix paths as literal data and remains idempotent`, (t) => {
    const f = fixture(t, shell);
    const unusualPrefix = join(f.root, 'prefix $(touch injected)');
    f.put(join(unusualPrefix, 'bin/brew'), '#!/bin/bash\nprintf "brew %s\\n" "$*" >> "$TEST_LOG"\n', true);
    const profile = join(f.home, label === 'zsh' ? '.zshrc' : '.bash_profile');
    const code = 'configure_shell_env arm64 "$TEST_UNUSUAL_PREFIX" macos';
    ok(f.run(code, { TEST_UNUSUAL_PREFIX: unusualPrefix }));
    const before = f.contents(profile);
    ok(f.run(code, { TEST_UNUSUAL_PREFIX: unusualPrefix }));
    assert.equal(f.contents(profile), before);
    ok(f.run('source "$(get_shell_profile)"'));
    assert.equal(existsSync(join(f.root, 'injected')), false);
    assert.equal(f.calls(), 'brew shellenv\n');
  });
}

test('zsh PATH is written to ZDOTDIR and preserves its other configuration', { skip: !existsSync('/bin/zsh') }, (t) => {
  const f = fixture(t, '/bin/zsh');
  const zdot = join(f.home, 'zsh-config');
  const profile = join(zdot, '.zshrc');
  f.put(profile, 'export EDITOR=vim\n');
  ok(f.run("main --configure <<<'1'", { ZDOTDIR: zdot }));
  assert.match(f.contents(profile), /export EDITOR=vim/);
  assert.match(f.contents(profile), /brew shellenv/);
  assert.equal(existsSync(join(f.home, '.zshrc')), false);
});
