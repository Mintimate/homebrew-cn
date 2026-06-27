import { tool } from '@openai/agents';
import { z } from 'zod';

type ToolEnv = Record<string, string | undefined>;

interface MakersSandbox {
  runCode?: (
    code: string,
    options?: { language?: string; timeout?: number },
  ) => Promise<{ results?: unknown; logs?: unknown; error?: unknown }>;
  commands?: {
    run?: (
      cmd: string,
      options?: { cwd?: string; env?: Record<string, string>; timeout?: number },
    ) => Promise<{ stdout?: string; stderr?: string; exitCode?: number }>;
  };
}

export interface ToolOptions {
  env: ToolEnv;
  signal?: AbortSignal;
  sandbox?: MakersSandbox;
  allowedTools?: HomebrewToolName[];
}

export type HomebrewToolName = 'diagnose' | 'mirror_probe_deep' | 'analyze' | 'fix' | 'formula_check';

interface MirrorDiagnosticResult {
  name: string;
  latency_ms: number;
  ssl_ok: boolean;
  http_status: number;
  commit_hash: string | null;
  error: string | null;
  sync_status: 'upstream' | 'synced' | 'lagging' | 'failed';
  method?: 'edge_fetch' | 'sandbox' | 'sandbox_deep';
  dns_ms?: number | null;
  tcp_ms?: number | null;
  tls_ms?: number | null;
  git_ms?: number | null;
  git_ok?: boolean;
  git_error?: string | null;
  ip?: string | null;
}

interface AnalyzeIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  suggestion: string;
}

export interface AnalyzeResult {
  ok: true;
  analyzed_lines: number;
  issues_found: number;
  issues: AnalyzeIssue[];
}

export interface FixOptions {
  issue_ids: string[];
  os_type: 'macos' | 'linux';
  shell_type: 'zsh' | 'bash';
  arch: 'arm64' | 'x86_64';
}

interface FormulaCandidate {
  type: 'formula' | 'cask';
  token: string;
  name: string;
  desc: string;
  homepage: string;
  install_command: string;
  version?: string;
  score: number;
}

export interface FormulaCheckResult {
  ok: true;
  query: string;
  source: 'sandbox' | 'edge_fetch';
  exact: FormulaCandidate | null;
  candidates: FormulaCandidate[];
  checked_at: string;
}

export const HOMEBREW_MIRROR_TARGETS: Record<string, string> = {
  'Official (官方源)': 'https://github.com/Homebrew/brew.git',
  'USTC (中科大)': 'https://mirrors.ustc.edu.cn/brew.git',
  'TUNA (清华大学)': 'https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git',
  'Aliyun (阿里云)': 'https://mirrors.aliyun.com/homebrew/brew.git',
  'Tencent (腾讯云)': 'https://mirrors.cloud.tencent.com/homebrew/brew.git',
};

export interface DiagnoseOptions extends ToolOptions {
  targets?: Record<string, string>;
  onProgress?: (result: MirrorDiagnosticResult, report: MirrorDiagnosticResult[]) => void | Promise<void>;
}

export interface MirrorProbeDeepResult {
  ok: boolean;
  timestamp: string;
  duration_ms: number;
  report: MirrorDiagnosticResult[];
}

export async function diagnoseHomebrewMirrors(options: DiagnoseOptions) {
  const startedAt = Date.now();
  const targets = options.targets ?? HOMEBREW_MIRROR_TARGETS;
  const report: MirrorDiagnosticResult[] = [];

  const checks = Object.entries(targets).map(async ([name, url]) => {
    const result = await checkMirror(name, url, options);
    report.push(result);
    updateSyncStatus(report);
    await options.onProgress?.(result, [...report]);
    return result;
  });

  await Promise.allSettled(checks);
  updateSyncStatus(report);
  report.sort((a, b) => mirrorOrder(a.name) - mirrorOrder(b.name));

  return {
    ok: report.length > 0,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    report,
  };
}

export async function probeHomebrewMirrorsDeep(options: DiagnoseOptions): Promise<MirrorProbeDeepResult> {
  const startedAt = Date.now();
  const targets = options.targets ?? HOMEBREW_MIRROR_TARGETS;
  const report: MirrorDiagnosticResult[] = [];

  const checks = Object.entries(targets).map(async ([name, url]) => {
    const result = options.sandbox
      ? await withTimeout(checkTargetWithDeepSandbox(name, url, options.sandbox), 6500)
      : null;
    const finalResult = result ?? await checkMirror(name, url, options);
    report.push(finalResult);
    updateSyncStatus(report);
    await options.onProgress?.(finalResult, [...report]);
    return finalResult;
  });

  await Promise.allSettled(checks);
  updateSyncStatus(report);
  report.sort((a, b) => mirrorOrder(a.name) - mirrorOrder(b.name));

  return {
    ok: report.length > 0,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    report,
  };
}

function mirrorOrder(name: string) {
  const keys = Object.keys(HOMEBREW_MIRROR_TARGETS);
  const index = keys.indexOf(name);
  return index === -1 ? keys.length : index;
}

function updateSyncStatus(report: MirrorDiagnosticResult[]) {
  const officialReport = report.find((r) => r.name === 'Official (官方源)');
  const officialHash = officialReport?.commit_hash || null;

  for (const r of report) {
    if (r.name === 'Official (官方源)') {
      r.sync_status = 'upstream';
    } else if (!r.commit_hash) {
      r.sync_status = 'failed';
    } else if (officialHash) {
      r.sync_status = r.commit_hash === officialHash ? 'synced' : 'lagging';
    } else {
      r.sync_status = 'synced';
    }
  }
}

async function checkMirror(name: string, url: string, options: DiagnoseOptions): Promise<MirrorDiagnosticResult> {
  if (options.signal?.aborted) {
    return createFailedResult(name, 'Request aborted');
  }

  const edgeResult = await checkTargetWithFetch(name, url, options.signal);
  if (!edgeResult.error || !options.sandbox) {
    return edgeResult;
  }

  const sandboxResult = await checkTargetWithSandbox(name, url, options.sandbox);
  return sandboxResult ?? edgeResult;
}

function createFailedResult(name: string, error: string): MirrorDiagnosticResult {
  return {
    name,
    latency_ms: 9999,
    ssl_ok: false,
    http_status: 0,
    commit_hash: null,
    error,
    sync_status: 'failed',
  };
}

async function checkTargetWithFetch(
  name: string,
  url: string,
  signal?: AbortSignal,
): Promise<MirrorDiagnosticResult> {
  const start = Date.now();
  const result: MirrorDiagnosticResult = {
    name,
    latency_ms: 9999,
    ssl_ok: false,
    http_status: 0,
    commit_hash: null,
    error: null,
    sync_status: 'failed',
    method: 'edge_fetch',
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  const abortListener = () => controller.abort();
  signal?.addEventListener('abort', abortListener, { once: true });

  try {
    const response = await fetch(`${url}/info/refs?service=git-upload-pack`, {
      headers: { 'User-Agent': 'git/2.0.0' },
      signal: controller.signal,
    });
    result.latency_ms = Date.now() - start;
    result.ssl_ok = true;
    result.http_status = response.status;

    const content = await response.text();
    result.commit_hash = extractGitRef(content);
  } catch (error) {
    const err = error as Error;
    result.error = err.name === 'AbortError' ? 'Timeout after 3s' : err.message;
    result.ssl_ok = !/certificate|ssl/i.test(result.error);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortListener);
  }

  return result;
}

async function checkTargetWithSandbox(
  name: string,
  url: string,
  sandbox: MakersSandbox,
): Promise<MirrorDiagnosticResult | null> {
  try {
    if (sandbox.commands?.run) {
      const cmd = [
        'python3',
        '-c',
        JSON.stringify(buildMirrorProbePython(name, url)),
      ].join(' ');
      const res = await sandbox.commands.run(cmd, { timeout: 5 });
      const text = res.stdout || res.stderr || '';
      const parsed = parseProbeResult(text);
      return parsed ? { ...parsed, method: 'sandbox' } : null;
    }

    if (sandbox.runCode) {
      const res = await sandbox.runCode(buildMirrorProbePython(name, url), { language: 'python', timeout: 5 });
      const parsed = parseProbeResult(res.results ?? res.logs);
      return parsed ? { ...parsed, method: 'sandbox' } : null;
    }
  } catch {
    return null;
  }

  return null;
}

async function checkTargetWithDeepSandbox(
  name: string,
  url: string,
  sandbox: MakersSandbox,
): Promise<MirrorDiagnosticResult | null> {
  try {
    if (sandbox.commands?.run) {
      const cmd = ['python3', '-c', JSON.stringify(buildMirrorDeepProbePython(name, url))].join(' ');
      const res = await sandbox.commands.run(cmd, { timeout: 12 });
      const parsed = parseProbeResult(res.stdout || res.stderr || '');
      return parsed ? { ...parsed, method: 'sandbox_deep' } : null;
    }

    if (sandbox.runCode) {
      const res = await sandbox.runCode(buildMirrorDeepProbePython(name, url), { language: 'python', timeout: 12 });
      const parsed = parseProbeResult(res.results ?? res.logs);
      return parsed ? { ...parsed, method: 'sandbox_deep' } : null;
    }
  } catch {
    return null;
  }

  return null;
}

function buildMirrorProbePython(name: string, url: string) {
  return `
import json, re, ssl, time, urllib.request
url = ${JSON.stringify(url)}
result = {
  "name": ${JSON.stringify(name)},
  "latency_ms": 9999,
  "ssl_ok": False,
  "http_status": 0,
  "commit_hash": None,
  "error": None,
  "sync_status": "failed"
}
start = time.time()
try:
  ctx = ssl.create_default_context()
  req = urllib.request.Request(url + "/info/refs?service=git-upload-pack", headers={"User-Agent": "git/2.0.0"})
  with urllib.request.urlopen(req, timeout=4, context=ctx) as response:
    content = response.read().decode("utf-8", errors="ignore")
    result["latency_ms"] = int((time.time() - start) * 1000)
    result["ssl_ok"] = True
    result["http_status"] = response.status
    match = re.search(r"([0-9a-f]{40})\\\\s+refs/heads/(stable|master)", content)
    if match:
      result["commit_hash"] = match.group(1)
except Exception as e:
  result["error"] = str(e)
  result["ssl_ok"] = not bool(re.search(r"certificate|ssl", result["error"], re.I))
print(json.dumps(result, ensure_ascii=False))
`.trim();
}

function buildMirrorDeepProbePython(name: string, url: string) {
  return `
import json, re, socket, ssl, subprocess, time, urllib.parse, urllib.request

name = ${JSON.stringify(name)}
url = ${JSON.stringify(url)}
parsed = urllib.parse.urlparse(url)
host = parsed.hostname or ""
port = parsed.port or (443 if parsed.scheme == "https" else 80)

result = {
  "name": name,
  "latency_ms": 9999,
  "ssl_ok": False,
  "http_status": 0,
  "commit_hash": None,
  "error": None,
  "sync_status": "failed",
  "method": "sandbox_deep",
  "dns_ms": None,
  "tcp_ms": None,
  "tls_ms": None,
  "git_ms": None,
  "git_ok": False,
  "git_error": None,
  "ip": None,
}

def elapsed_ms(start):
  return int((time.time() - start) * 1000)

def extract_ref(text):
  m = re.search(r"([0-9a-f]{40})\\\\s+refs/heads/(stable|master)", text or "")
  return m.group(1) if m else None

started = time.time()
try:
  t = time.time()
  infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
  result["dns_ms"] = elapsed_ms(t)
  result["ip"] = infos[0][4][0] if infos else None

  t = time.time()
  sock = socket.create_connection((host, port), timeout=4)
  result["tcp_ms"] = elapsed_ms(t)

  if parsed.scheme == "https":
    t = time.time()
    ctx = ssl.create_default_context()
    tls_sock = ctx.wrap_socket(sock, server_hostname=host)
    result["tls_ms"] = elapsed_ms(t)
    result["ssl_ok"] = True
    tls_sock.close()
  else:
    sock.close()

  t = time.time()
  req = urllib.request.Request(url + "/info/refs?service=git-upload-pack", headers={"User-Agent": "git/2.0.0"})
  with urllib.request.urlopen(req, timeout=6) as response:
    body = response.read().decode("utf-8", errors="ignore")
    result["latency_ms"] = elapsed_ms(t)
    result["http_status"] = response.status
    result["commit_hash"] = extract_ref(body)

except Exception as e:
  result["error"] = str(e)
  result["ssl_ok"] = result["ssl_ok"] or not bool(re.search(r"certificate|ssl", result["error"], re.I))

try:
  t = time.time()
  proc = subprocess.run(
    ["git", "ls-remote", "--heads", url],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=8,
  )
  result["git_ms"] = elapsed_ms(t)
  result["git_ok"] = proc.returncode == 0
  if proc.returncode == 0:
    result["commit_hash"] = result["commit_hash"] or extract_ref(proc.stdout)
  else:
    result["git_error"] = (proc.stderr or proc.stdout or "").strip()[:240]
except Exception as e:
  result["git_error"] = str(e)

if result["error"] is None and not result["commit_hash"] and result["git_error"]:
  result["error"] = result["git_error"]

if result["latency_ms"] == 9999:
  result["latency_ms"] = elapsed_ms(started)

print(json.dumps(result, ensure_ascii=False))
`.trim();
}

function parseProbeResult(value: unknown): MirrorDiagnosticResult | null {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  const match = text.match(/\{[\s\S]*"name"[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    return {
      name: parsed.name || 'Unknown',
      latency_ms: typeof parsed.latency_ms === 'number' ? parsed.latency_ms : 9999,
      ssl_ok: !!parsed.ssl_ok,
      http_status: typeof parsed.http_status === 'number' ? parsed.http_status : 0,
      commit_hash: parsed.commit_hash || null,
      error: parsed.error || null,
      sync_status: 'failed',
      dns_ms: typeof parsed.dns_ms === 'number' ? parsed.dns_ms : null,
      tcp_ms: typeof parsed.tcp_ms === 'number' ? parsed.tcp_ms : null,
      tls_ms: typeof parsed.tls_ms === 'number' ? parsed.tls_ms : null,
      git_ms: typeof parsed.git_ms === 'number' ? parsed.git_ms : null,
      git_ok: !!parsed.git_ok,
      git_error: parsed.git_error || null,
      ip: parsed.ip || null,
    };
  } catch {
    return null;
  }
}

function extractGitRef(content: string): string | null {
  return content.match(/([0-9a-f]{40})\s+refs\/heads\/stable/)?.[1]
    ?? content.match(/([0-9a-f]{40})\s+refs\/heads\/master/)?.[1]
    ?? null;
}

export function analyzeHomebrewText(text: string): AnalyzeResult {
  const issues: AnalyzeIssue[] = [];
  const lines = text.split(/\r?\n/);

  const hasOptBrew = text.includes('/opt/homebrew');
  const hasLocalBrew = text.includes('/usr/local/bin/brew') || text.includes('/usr/local/Homebrew');
  const isArm64 = /arm64|aarch64|m1|m2|m3|m4|apple silicon/i.test(text);
  const isX86 = /x86_64|amd64|intel/i.test(text);

  if (isArm64 && hasLocalBrew && !hasOptBrew) {
    issues.push({
      id: 'architecture_mismatch_rosetta',
      severity: 'warning',
      title: 'Rosetta 兼容模式安装冲突',
      message: '检测到您当前处于 Apple Silicon (ARM64) 架构，但 Homebrew 被安装在 Intel 架构默认路径 `/usr/local` 下。这可能是因为您的终端以 Rosetta 2 模拟器模式运行，会导致所有编译包运行在 x86_64 模式下，损失性能。',
      suggestion: '建议使用原生 Terminal 重新执行安装脚本，Homebrew 将自动安装在 `/opt/homebrew` 路径。',
    });
  }

  const hasPath = lines.some((line) => /^PATH=/i.test(line.trim()) || line.includes('PATH='));
  const hasBrewInPath = text.includes('/bin/brew')
    || text.includes('brew shellenv')
    || (text.includes('PATH=') && (
      text.includes('/opt/homebrew/bin')
      || text.includes('/usr/local/bin')
      || text.includes('/home/linuxbrew/.linuxbrew/bin')
    ));

  if (text.toLowerCase().includes('command not found: brew') || (hasPath && !hasBrewInPath)) {
    issues.push({
      id: 'brew_missing_from_path',
      severity: 'error',
      title: 'Homebrew 未配置进系统环境变量 (PATH)',
      message: 'Homebrew 已成功下载，但在当前的 Shell 环境变量中找不到 `brew` 命令。',
      suggestion: isArm64 || hasOptBrew
        ? [
          '确认 `~/.zshrc` 内容无误后，可在终端分行执行：',
          '```zsh',
          'echo \'eval "$(/opt/homebrew/bin/brew shellenv)"\' >> ~/.zshrc',
          'source ~/.zshrc',
          '```',
        ].join('\n')
        : [
          '确认 `~/.zshrc` 内容无误后，可在终端分行执行：',
          '```zsh',
          'echo \'eval "$(/usr/local/bin/brew shellenv)"\' >> ~/.zshrc',
          'source ~/.zshrc',
          '```',
        ].join('\n'),
    });
  }

  const hasProxy = lines.some((line) => /http_proxy|https_proxy|all_proxy|socks5/i.test(line));
  const proxyLines = lines.filter((line) => /http_proxy|https_proxy|all_proxy/i.test(line));

  if (hasProxy) {
    issues.push({
      id: 'local_proxy_active',
      severity: 'info',
      title: '检测到活跃的终端代理设置',
      message: `终端配置了代理：\n${proxyLines.map((line) => `  - \`${line.trim()}\``).join('\n')}\n如果遇到连接超时或 SSL 握手失败，可能是代理服务器配置不正确或证书不被信任。`,
      suggestion: '如果遇到安装或更新失败，可尝试运行 `unset http_proxy https_proxy all_proxy` 临时禁用代理后再试。',
    });
  }

  const hasInsteadOf = text.includes('insteadOf') || text.includes('insteadof');
  if (hasInsteadOf) {
    issues.push({
      id: 'git_insteadof_conflict',
      severity: 'warning',
      title: 'Git insteadOf 重定向冲突',
      message: '检测到您的 Git 全局配置中含有 `insteadOf` 重定向规则（例如将 github.com 重定向至镜镜像站）。这可能会导致 Homebrew 内部更新或 Tap 校验失败。',
      suggestion: '建议通过命令 `git config --global --get-regexp "url\\..*"` 检查并临时注释冲突的规则。',
    });
  }

  const bottleExports = lines.filter((line) => /HOMEBREW_BOTTLE_DOMAIN/i.test(line));
  if (bottleExports.length > 1) {
    issues.push({
      id: 'duplicate_bottle_domain',
      severity: 'warning',
      title: '重复的二进制源配置 (HOMEBREW_BOTTLE_DOMAIN)',
      message: '您的 Shell 配置文件中导出了多个 `HOMEBREW_BOTTLE_DOMAIN` 环境变量，可能会导致冲突或加载顺序问题。',
      suggestion: '请清理配置文件，只保留一个最新的镜像源环境变量。',
    });
  }

  return {
    ok: true,
    analyzed_lines: lines.length,
    issues_found: issues.length,
    issues,
  };
}

export function inferFixOptions(text: string, issues: AnalyzeIssue[]): FixOptions | null {
  const issueIds = issues
    .filter((issue) => issue.id === 'brew_missing_from_path' || issue.id === 'git_insteadof_conflict' || issue.id === 'duplicate_bottle_domain')
    .map((issue) => issue.id);

  if (!issueIds.length) return null;

  const os_type: FixOptions['os_type'] = /linux|linuxbrew|\/home\/linuxbrew/i.test(text) ? 'linux' : 'macos';
  const shell_type: FixOptions['shell_type'] = /bash|bashrc|bash_profile/i.test(text) && !/zsh|zshrc/i.test(text) ? 'bash' : 'zsh';
  const hasReliablePrefixOrArch = /linux|linuxbrew|\/home\/linuxbrew|\/opt\/homebrew|\/usr\/local|arm64|aarch64|m1|m2|m3|m4|apple silicon|x86_64|intel/i.test(text);
  if (issueIds.includes('brew_missing_from_path') && !hasReliablePrefixOrArch) {
    return null;
  }

  const arch: FixOptions['arch'] = /x86_64|intel|\/usr\/local/i.test(text) && !/arm64|aarch64|m1|m2|m3|m4|apple silicon|\/opt\/homebrew/i.test(text)
    ? 'x86_64'
    : 'arm64';

  return {
    issue_ids: issueIds,
    os_type,
    shell_type,
    arch,
  };
}

export function generateFixScript({ issue_ids, os_type, shell_type, arch }: FixOptions): string {
  const scriptLines = ['# homebrew-cn 自动生成的环境修复命令', '# 执行前请确认路径及内容无误'];
  const shellProfile = shell_type === 'zsh'
    ? '~/.zshrc'
    : (os_type === 'macos' ? '~/.bash_profile' : '~/.bashrc');

  let needsShellSource = false;
  let stepNumber = 1;

  if (issue_ids.includes('brew_missing_from_path')) {
    const prefix = os_type === 'linux'
      ? '/home/linuxbrew/.linuxbrew'
      : (arch === 'arm64' ? '/opt/homebrew' : '/usr/local');
    scriptLines.push('');
    scriptLines.push(`# ${stepNumber++}. 将 Homebrew 注入 Shell 配置文件 (${shellProfile})`);
    scriptLines.push(`echo 'eval "$(${prefix}/bin/brew shellenv)"' >> ${shellProfile}`);
    needsShellSource = true;
  }

  if (issue_ids.includes('git_insteadof_conflict')) {
    scriptLines.push('');
    scriptLines.push(`# ${stepNumber++}. 备份现有的 Git 配置并提示用户排查 insteadOf 规则`);
    scriptLines.push('echo "建议运行以下命令查看可能冲突的全局 Git 代写规则："');
    scriptLines.push('echo "  git config --global --get-regexp \\"url\\..*\\""');
  }

  if (issue_ids.includes('duplicate_bottle_domain')) {
    scriptLines.push('');
    scriptLines.push(`# ${stepNumber++}. 提示清理 ${shellProfile} 中的冗余环境变量`);
    scriptLines.push(`echo "检测到 ${shellProfile} 中存在重复的 HOMEBREW_BOTTLE_DOMAIN。请使用编辑器手动打开该文件并清理冗余行。"`);
  }

  if (needsShellSource) {
    scriptLines.push('');
    scriptLines.push(`# ${stepNumber++}. 让配置立即在当前终端生效`);
    scriptLines.push(`source ${shellProfile}`);
    scriptLines.push('echo "修复完毕。请尝试运行 brew --version 验证是否成功。"');
  }

  return scriptLines.join('\n');
}

export async function checkHomebrewFormulaIndex(query: string, options: ToolOptions): Promise<FormulaCheckResult> {
  const normalized = normalizePackageAlias(query) || normalizeFormulaQuery(query);
  if (!normalized) {
    return {
      ok: true,
      query,
      source: 'edge_fetch',
      exact: null,
      candidates: [],
      checked_at: new Date().toISOString(),
    };
  }

  const sandboxResult = await withTimeout(
    checkFormulaIndexWithSandbox(normalized, options.sandbox),
    3500,
  );
  if (sandboxResult) return sandboxResult;
  return checkFormulaIndexWithFetch(normalized);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch(() => resolve(null))
      .finally(() => clearTimeout(timer));
  });
}

async function checkFormulaIndexWithSandbox(query: string, sandbox?: MakersSandbox): Promise<FormulaCheckResult | null> {
  if (sandbox?.runCode) {
    try {
      const result = await sandbox.runCode(buildFormulaIndexPython(query), { language: 'python', timeout: 10 });
      const parsed = parseFormulaCheckPayload(result.results ?? result.logs);
      if (parsed) return { ...parsed, source: 'sandbox' };
    } catch {
      // Fall through to commands.run below.
    }
  }

  if (sandbox?.commands?.run) {
    try {
      const cmd = ['python3', '-c', JSON.stringify(buildFormulaIndexPython(query))].join(' ');
      const result = await sandbox.commands.run(cmd, { timeout: 10 });
      const parsed = parseFormulaCheckPayload(result.stdout || result.stderr || '');
      if (parsed) return { ...parsed, source: 'sandbox' };
    } catch {
      return null;
    }
  }

  return null;
}

async function checkFormulaIndexWithFetch(query: string): Promise<FormulaCheckResult> {
  const [formulaExact, caskExact] = await Promise.all([
    fetchFormulaCandidate(`https://formulae.brew.sh/api/formula/${encodeURIComponent(query)}.json`, 'formula'),
    fetchFormulaCandidate(`https://formulae.brew.sh/api/cask/${encodeURIComponent(query)}.json`, 'cask'),
  ]);
  const exact = formulaExact ?? caskExact;
  if (exact) {
    return {
      ok: true,
      query,
      source: 'edge_fetch',
      exact,
      candidates: [exact],
      checked_at: new Date().toISOString(),
    };
  }

  const [formulae, casks] = await Promise.all([
    fetchFormulaList('https://formulae.brew.sh/api/formula.json', 'formula'),
    fetchFormulaList('https://formulae.brew.sh/api/cask.json', 'cask'),
  ]);

  const candidates = rankFormulaCandidates(query, [...formulae, ...casks]).slice(0, 8);
  const fallback = knownPackageFallback(query);
  const finalCandidates = candidates.length ? candidates : (fallback ? [fallback] : []);

  return {
    ok: true,
    query,
    source: 'edge_fetch',
    exact: fallback && !candidates.length ? fallback : null,
    candidates: finalCandidates,
    checked_at: new Date().toISOString(),
  };
}

function knownPackageFallback(query: string): FormulaCandidate | null {
  const token = normalizeFormulaQuery(query);
  const known: Record<string, Omit<FormulaCandidate, 'score'>> = {
    'visual-studio-code': {
      type: 'cask',
      token: 'visual-studio-code',
      name: 'Visual Studio Code',
      desc: 'Open-source code editor',
      homepage: 'https://code.visualstudio.com/',
      install_command: 'brew install --cask visual-studio-code',
    },
    'google-chrome': {
      type: 'cask',
      token: 'google-chrome',
      name: 'Google Chrome',
      desc: 'Web browser',
      homepage: 'https://www.google.com/chrome/',
      install_command: 'brew install --cask google-chrome',
    },
    'wechat': {
      type: 'cask',
      token: 'wechat',
      name: 'WeChat',
      desc: 'Messaging and calling application',
      homepage: 'https://www.wechat.com/',
      install_command: 'brew install --cask wechat',
    },
    'docker-desktop': {
      type: 'cask',
      token: 'docker-desktop',
      name: 'Docker Desktop',
      desc: 'App for building and sharing containerized applications',
      homepage: 'https://www.docker.com/products/docker-desktop/',
      install_command: 'brew install --cask docker-desktop',
    },
  };
  const candidate = known[token];
  return candidate ? { ...candidate, score: 80 } : null;
}

async function fetchFormulaCandidate(url: string, type: 'formula' | 'cask'): Promise<FormulaCandidate | null> {
  try {
    const item = await fetchJsonWithTimeout<any>(url, 5000);
    if (!item) return null;
    return formulaCandidateFromApiItem(item, type, 100);
  } catch {
    return null;
  }
}

async function fetchFormulaList(url: string, type: 'formula' | 'cask'): Promise<FormulaCandidate[]> {
  try {
    const items = await fetchJsonWithTimeout<any[]>(url, 8000);
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => formulaCandidateFromApiItem(item, type, 0))
      .filter((item): item is FormulaCandidate => Boolean(item));
  } catch {
    return [];
  }
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'homebrew-cn-agent' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

function rankFormulaCandidates(query: string, candidates: FormulaCandidate[], excludeToken?: string) {
  const q = normalizeFormulaQuery(query);
  return candidates
    .filter((item) => item.token !== excludeToken)
    .map((item) => ({ ...item, score: scoreFormulaCandidate(q, item) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.token.localeCompare(b.token));
}

function formulaCandidateFromApiItem(item: any, type: 'formula' | 'cask', score: number): FormulaCandidate | null {
  const token = String(item.token || item.name || '').trim();
  if (!token) return null;
  const fullName = Array.isArray(item.full_name) ? item.full_name[0] : item.full_name;
  const name = String(fullName || token);
  const desc = String(item.desc || item.description || '');
  const homepage = String(item.homepage || '');
  const version = String(item.versions?.stable || item.version || '').trim() || undefined;
  return {
    type,
    token,
    name,
    desc,
    homepage,
    version,
    install_command: type === 'cask' ? `brew install --cask ${token}` : `brew install ${token}`,
    score,
  };
}

function scoreFormulaCandidate(query: string, item: FormulaCandidate) {
  const token = item.token.toLowerCase();
  const name = item.name.toLowerCase();
  const desc = item.desc.toLowerCase();
  if (token === query) return 100;
  if (name === query) return 90;
  if (token.startsWith(query)) return 75;
  if (name.startsWith(query)) return 65;
  if (token.includes(query)) return 45;
  if (name.includes(query)) return 35;
  if (desc.includes(query)) return 20;
  return 0;
}

function normalizeFormulaQuery(query: string) {
  return query
    .trim()
    .replace(/^brew\s+install\s+(--cask\s+)?/i, '')
    .replace(/^brew\s+(info|search)\s+/i, '')
    .replace(/^--cask\s+/i, '')
    .replace(/[。？?，,]/g, ' ')
    .split(/\s+/)[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9@+._-]/g, '') ?? '';
}

function normalizePackageAlias(query: string) {
  const text = query.toLowerCase();
  const aliases: Array<[RegExp, string]> = [
    [/\b(vs\s*code|vscode|visual\s*studio\s*code)\b/i, 'visual-studio-code'],
    [/\b(google\s*chrome|chrome)\b|谷歌浏览器/i, 'google-chrome'],
    [/\b(qq)\b|腾讯qq/i, 'qq'],
    [/\b(wechat|weixin)\b|微信/i, 'wechat'],
    [/\b(nodejs|node\.js)\b/i, 'node'],
    [/\bpython3\b/i, 'python'],
    [/\bdocker\s*desktop\b/i, 'docker-desktop'],
  ];
  return aliases.find(([pattern]) => pattern.test(text))?.[1] ?? '';
}

function parseFormulaCheckPayload(value: unknown): FormulaCheckResult | null {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  const match = text.match(/\{[\s\S]*"candidates"[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as FormulaCheckResult;
    if (!Array.isArray(parsed.candidates)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function buildFormulaIndexPython(query: string) {
  return `
import json, urllib.request, urllib.error
query = ${JSON.stringify(query)}

def get_json(url):
  req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "homebrew-cn-agent"})
  try:
    with urllib.request.urlopen(req, timeout=8) as response:
      return json.loads(response.read().decode("utf-8", errors="ignore"))
  except Exception:
    return None

def candidate(item, typ, score=0):
  if not item:
    return None
  token = str(item.get("token") or item.get("name") or "").strip()
  if not token:
    return None
  full_name = item.get("full_name")
  if isinstance(full_name, list):
    full_name = full_name[0] if full_name else ""
  version = ""
  versions = item.get("versions")
  if isinstance(versions, dict):
    version = versions.get("stable") or ""
  version = str(version or item.get("version") or "").strip()
  return {
    "type": typ,
    "token": token,
    "name": str(full_name or token),
    "desc": str(item.get("desc") or item.get("description") or ""),
    "homepage": str(item.get("homepage") or ""),
    "version": version or None,
    "install_command": ("brew install --cask " if typ == "cask" else "brew install ") + token,
    "score": score,
  }

def score(item):
  token = item["token"].lower()
  name = item["name"].lower()
  desc = item["desc"].lower()
  if token == query: return 100
  if name == query: return 90
  if token.startswith(query): return 75
  if name.startswith(query): return 65
  if query in token: return 45
  if query in name: return 35
  if query in desc: return 20
  return 0

exact = None
for typ in ("formula", "cask"):
  item = get_json(f"https://formulae.brew.sh/api/{typ}/{query}.json")
  cand = candidate(item, typ, 100)
  if cand:
    exact = cand
    break

if exact:
  print(json.dumps({
    "ok": True,
    "query": query,
    "source": "sandbox",
    "exact": exact,
    "candidates": [exact],
    "checked_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
  }, ensure_ascii=False))
  raise SystemExit(0)

items = []
for typ in ("formula", "cask"):
  data = get_json(f"https://formulae.brew.sh/api/{typ}.json") or []
  if isinstance(data, list):
    for raw in data:
      cand = candidate(raw, typ)
      if not cand:
        continue
      if exact and cand["token"] == exact["token"]:
        continue
      cand["score"] = score(cand)
      if cand["score"] > 0:
        items.append(cand)

items.sort(key=lambda x: (-x["score"], x["token"]))
if exact:
  candidates = [exact] + items[:7]
else:
  candidates = items[:8]

print(json.dumps({
  "ok": True,
  "query": query,
  "source": "sandbox",
  "exact": exact,
  "candidates": candidates,
  "checked_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
}, ensure_ascii=False))
`.trim();
}

export function createHomebrewTools(options: ToolOptions) {
  const allowed = new Set<HomebrewToolName>(options.allowedTools ?? ['diagnose', 'mirror_probe_deep', 'analyze', 'fix', 'formula_check']);
  const tools = [
    tool({
      name: 'diagnose',
      description:
        'Query and diagnose a Chinese domestic Homebrew mirror in real-time using the EdgeOne server-side sandbox. Measures latency, SSL trust, and calculates git commit synchronization delay against the official Homebrew repository. Use this whenever the user complains about slow speeds, connection timeouts, or asks which mirror is best today.',
      parameters: z.object({
        mirror_name: z.string().optional().describe('The name of the mirror to check. If omitted, all mirrors will be checked in parallel. Example: "USTC (中科大)"'),
        mirror_url: z.string().optional().describe('The git URL of the mirror. Required if mirror_name is provided. Example: "https://mirrors.ustc.edu.cn/brew.git"'),
      }),
      async execute({ mirror_name, mirror_url }) {
        const targets: Record<string, string> = mirror_name && mirror_url
          ? { [mirror_name]: mirror_url }
          : HOMEBREW_MIRROR_TARGETS;

        try {
          const diagnostics = await diagnoseHomebrewMirrors({ ...options, targets });
          return JSON.stringify(diagnostics, null, 2);
        } catch (err) {
          return JSON.stringify({
            error: `Failed to run diagnostics: ${(err as Error).message}`,
          }, null, 2);
        }
      }
    }),

    tool({
      name: 'mirror_probe_deep',
      description:
        'Run a deeper Homebrew mirror probe from the EdgeOne sandbox, including DNS resolution, TCP connect, TLS handshake, HTTP git info/refs, and git ls-remote when available. Use for real network diagnostics of Homebrew mirrors.',
      parameters: z.object({
        mirror_name: z.string().optional().describe('The mirror name to check. If omitted, all mirrors are checked in parallel.'),
        mirror_url: z.string().optional().describe('The git URL of the mirror. Required if mirror_name is provided.'),
      }),
      async execute({ mirror_name, mirror_url }) {
        const targets: Record<string, string> = mirror_name && mirror_url
          ? { [mirror_name]: mirror_url }
          : HOMEBREW_MIRROR_TARGETS;

        try {
          const diagnostics = await probeHomebrewMirrorsDeep({ ...options, targets });
          return JSON.stringify(diagnostics, null, 2);
        } catch (err) {
          return JSON.stringify({
            error: `Failed to run deep mirror probe: ${(err as Error).message}`,
          }, null, 2);
        }
      }
    }),

    tool({
      name: 'analyze',
      description:
        'Analyze the user\'s local terminal logs, environment variables, or shell profiles (.zshrc, .bashrc). Detects incorrect PATH variables, Rosetta/Apple Silicon architecture mismatches, broken proxy settings, and conflicting git insteadOf configuration rules.',
      parameters: z.object({
        text: z.string().describe('The raw terminal output, environment variable list (env), or shell configuration file content copy-pasted by the user.'),
      }),
      execute({ text }) {
        return JSON.stringify(analyzeHomebrewText(text), null, 2);
      }
    }),

    tool({
      name: 'fix',
      description:
        'Generate a tailored shell command block or repair script based on the issues identified by the analyzer.',
      parameters: z.object({
        issue_ids: z.array(z.string()).describe('The list of issue IDs detected by analyze (e.g. ["brew_missing_from_path", "local_proxy_active"]).'),
        os_type: z.enum(['macos', 'linux']).describe('The user\'s operating system type.'),
        shell_type: z.enum(['zsh', 'bash']).describe('The user\'s active shell type.'),
        arch: z.enum(['arm64', 'x86_64']).describe('The user\'s hardware architecture.'),
      }),
      execute: generateFixScript,
    }),

    tool({
      name: 'formula_check',
      description:
        'Search the official Homebrew JSON API index for formulae and casks. Use when the user asks whether a package can be installed by Homebrew, asks for a brew install command, or compares formula vs cask.',
      parameters: z.object({
        query: z.string().describe('Package token or app name, for example "wget", "google-chrome", "visual-studio-code", or "python".'),
      }),
      async execute({ query }) {
        const result = await checkHomebrewFormulaIndex(query, options);
        return JSON.stringify(result, null, 2);
      },
    })
  ];

  return tools.filter((t) => allowed.has(t.name as HomebrewToolName));
}

export function shouldEnableModelTools(env: ToolEnv): boolean {
  return env.ENABLE_MODEL_TOOLS === 'true';
}
