import { tool } from '@openai/agents';
import { z } from 'zod';
import { HOMEBREW_CN_CONFIGURE_COMMAND, HOMEBREW_CN_LINUX_CONFIGURE_COMMAND, HOMEBREW_CN_DIAGNOSTIC_RULES, HOMEBREW_CN_DOCTOR_SUMMARIES } from './_skill';

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
  commit_ref?: string | null;
  error: string | null;
  sync_status: 'upstream' | 'synced' | 'different' | 'unverified' | 'failed' | 'network_restricted';
  method?: 'edge_fetch' | 'sandbox' | 'sandbox_deep';
  dns_ms?: number | null;
  tcp_ms?: number | null;
  tls_ms?: number | null;
  git_ms?: number | null;
  git_ok?: boolean;
  git_error?: string | null;
  ip?: string | null;
  network_note?: string | null;
}

interface AnalyzeIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  suggestion: string;
  evidence?: string[];
  verification?: string;
  commands?: string[];
  impact_scope?: string;
  installation_impact?: string;
  action_required?: string;
}

export interface AnalyzeResult {
  ok: true;
  analyzed_lines: number;
  issues_found: number;
  issues: AnalyzeIssue[];
  scope?: 'provided_text';
  doctor?: { warning_count: number; unrecognized_count: number; ready: boolean; assessment: { installation_impact: string; action_required: string } };
  configuration?: ConfigurationComparison;
}

interface ConfigurationRow {
  key: string;
  label: string;
  terminal: string | null;
  desktop: string | null;
  status: 'same' | 'different' | 'incomplete';
  candidate_sources: string[];
}

interface ConfigurationComparison {
  terminal_provided: boolean;
  desktop_provided: boolean;
  rows: ConfigurationRow[];
  sources: Array<{ source: string; values: Record<string, string[]> }>;
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

const TENCENT_DUMB_HTTP_NOTE = '腾讯云 Homebrew Git 镜像使用 dumb HTTP 协议，不支持 shallow clone；安装脚本选择它时会自动使用完整克隆。';

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
      ? await withTimeout(checkTargetWithDeepSandbox(name, url, options.sandbox), 13000)
      : null;
    const finalResult = result?.commit_hash && !result.error
      ? result
      : preferProbeResult(result, await checkMirror(name, url, options));
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

function isDumbHttpMirror(name: string, url?: string) {
  return name.includes('Tencent') || name.includes('腾讯云') || !!url?.includes('mirrors.cloud.tencent.com');
}

function getGitRefsEndpoint(name: string, url: string) {
  return `${url}/info/refs${isDumbHttpMirror(name, url) ? '' : '?service=git-upload-pack'}`;
}

function getMirrorNetworkNote(name: string, url?: string) {
  return isDumbHttpMirror(name, url) ? TENCENT_DUMB_HTTP_NOTE : null;
}

function updateSyncStatus(report: MirrorDiagnosticResult[]) {
  const official = report.find((r) => r.name === 'Official (官方源)');
  const officialHash = !official?.error ? official?.commit_hash : null;

  for (const r of report) {
    const notes = [getMirrorNetworkNote(r.name)];
    if (!r.commit_hash || r.error) {
      if (r.http_status >= 200 && r.http_status < 300) {
        r.sync_status = 'unverified';
        notes.push('HTTP 已连通，但未取得完整分支引用，无法判断同步状态；不等同于镜像故障。');
      } else if (r.name === 'Official (官方源)') {
        r.sync_status = 'network_restricted';
        notes.push('当前检测节点未能取得 GitHub 官方基准；不代表官方源发生故障。');
      } else {
        r.sync_status = 'failed';
        notes.push('本次检测未成功，请结合下方错误及本地网络复测；不能据此确认镜像全局故障。');
      }
    } else if (r.name === 'Official (官方源)') {
      r.sync_status = 'upstream';
    } else if (!officialHash || !official?.commit_ref || r.commit_ref !== official.commit_ref) {
      r.sync_status = 'unverified';
      notes.push(!officialHash ? '未取得官方分支基准，仅确认该镜像可读取，不能确认同步正常。' : '与官方取得的分支不同，不能跨分支比较同步状态。');
    } else {
      // A different hash alone does not establish which commit is ahead.
      r.sync_status = r.commit_hash === officialHash ? 'synced' : 'different';
    }
    r.network_note = notes.filter(Boolean).join(' ') || null;
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
  return preferProbeResult(edgeResult, sandboxResult);
}

function preferProbeResult(first: MirrorDiagnosticResult | null, second: MirrorDiagnosticResult | null): MirrorDiagnosticResult {
  const score = (r: MirrorDiagnosticResult | null) => !r ? -1
    : (r.commit_hash && !r.error ? 100 : 0)
      + (r.http_status >= 200 && r.http_status < 300 ? 20 : 0)
      + (r.http_status > 0 ? 10 : 0);
  // A failed retry must not erase HTTP 200 or a valid ref observed earlier.
  return (score(second) > score(first) ? second : first)!;
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
    network_note: getMirrorNetworkNote(name),
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
    network_note: getMirrorNetworkNote(name, url),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const abortListener = () => controller.abort();
  signal?.addEventListener('abort', abortListener, { once: true });

  try {
    const response = await fetch(getGitRefsEndpoint(name, url), {
      headers: { 'User-Agent': 'git/2.0.0' },
      signal: controller.signal,
    });
    result.latency_ms = Date.now() - start;
    result.ssl_ok = true;
    result.http_status = response.status;

    if (!response.ok) {
      await response.body?.cancel();
      result.error = `Git refs endpoint returned HTTP ${response.status}`;
      return result;
    }
    const ref = await readGitRef(response);
    result.commit_hash = ref?.hash ?? null;
    result.commit_ref = ref?.ref ?? null;
    result.latency_ms = Date.now() - start;
    if (!ref) result.error = 'Git refs response did not contain a supported branch (main/stable/master)';
  } catch (error) {
    const err = error as Error;
    result.error = signal?.aborted ? 'Request aborted' : controller.signal.aborted ? 'Git refs read timed out after 8s' : err.message;
    if (/certificate|ssl/i.test(result.error)) result.ssl_ok = false;
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
        quoteShellArg(buildMirrorProbePython(name, url)),
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
      const cmd = ['python3', '-c', quoteShellArg(buildMirrorDeepProbePython(name, url))].join(' ');
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

function quoteShellArg(value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

function gitRefReaderPython() {
  return `
def extract_ref(text):
  for branch in ("main", "stable", "master"):
    ref = "refs/heads/" + branch
    match = re.search(r"([0-9a-f]{40})\\s+" + ref + r"(?:[\\s\\x00])", text or "")
    if match:
      return match.group(1), ref
  return None, None

def read_ref(response):
  content = b""
  while len(content) < 1024 * 1024:
    chunk = response.read1(4096)
    if not chunk:
      return extract_ref(content.decode("utf-8", errors="ignore") + "\\n")
    content += chunk
    found = extract_ref(content.decode("utf-8", errors="ignore"))
    if found[1] == "refs/heads/main":
      return found
  raise ValueError("Git refs response exceeded 1 MiB probe limit before main was found")
`;
}

function buildMirrorProbePython(name: string, url: string) {
  return `
import json, re, ssl, time, urllib.request
${gitRefReaderPython()}
name = ${JSON.stringify(name)}
url = ${JSON.stringify(url)}
refs_url = ${JSON.stringify(getGitRefsEndpoint(name, url))}
result = {
  "name": name,
  "latency_ms": 9999,
  "ssl_ok": False,
  "http_status": 0,
  "commit_hash": None,
  "commit_ref": None,
  "error": None,
  "sync_status": "failed",
  "network_note": ${getMirrorNetworkNote(name, url) ? JSON.stringify(getMirrorNetworkNote(name, url)) : 'None'}
}
start = time.time()
try:
  ctx = ssl.create_default_context()
  req = urllib.request.Request(refs_url, headers={"User-Agent": "git/2.0.0"})
  with urllib.request.urlopen(req, timeout=4, context=ctx) as response:
    result["ssl_ok"] = True
    result["http_status"] = response.status
    result["latency_ms"] = int((time.time() - start) * 1000)
    result["commit_hash"], result["commit_ref"] = read_ref(response)
except Exception as e:
  result["error"] = str(e)
  if re.search(r"certificate|ssl", result["error"], re.I):
    result["ssl_ok"] = False
print(json.dumps(result, ensure_ascii=False))
`.trim();
}

function buildMirrorDeepProbePython(name: string, url: string) {
  return `
import json, re, socket, ssl, subprocess, time, urllib.parse, urllib.request
${gitRefReaderPython()}

name = ${JSON.stringify(name)}
url = ${JSON.stringify(url)}
refs_url = ${JSON.stringify(getGitRefsEndpoint(name, url))}
parsed = urllib.parse.urlparse(url)
host = parsed.hostname or ""
port = parsed.port or (443 if parsed.scheme == "https" else 80)

result = {
  "name": name,
  "latency_ms": 9999,
  "ssl_ok": False,
  "http_status": 0,
  "commit_hash": None,
  "commit_ref": None,
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
  "network_note": ${getMirrorNetworkNote(name, url) ? JSON.stringify(getMirrorNetworkNote(name, url)) : 'None'},
}

def elapsed_ms(start):
  return int((time.time() - start) * 1000)

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
  req = urllib.request.Request(refs_url, headers={"User-Agent": "git/2.0.0"})
  with urllib.request.urlopen(req, timeout=6) as response:
    result["http_status"] = response.status
    result["latency_ms"] = elapsed_ms(t)
    result["commit_hash"], result["commit_ref"] = read_ref(response)

except Exception as e:
  result["error"] = str(e)
  if re.search(r"certificate|ssl", result["error"], re.I):
    result["ssl_ok"] = False

try:
  t = time.time()
  proc = subprocess.run(
    ["git", "ls-remote", "--heads", url, "main", "stable", "master"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=8,
  )
  result["git_ms"] = elapsed_ms(t)
  result["git_ok"] = proc.returncode == 0
  if proc.returncode == 0:
    git_hash, git_ref = extract_ref(proc.stdout + "\\n")
    if git_hash and (git_ref == "refs/heads/main" or not result["commit_hash"]):
      result["commit_hash"], result["commit_ref"] = git_hash, git_ref
      result["error"] = None
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
      commit_ref: parsed.commit_ref || null,
      error: parsed.error || null,
      sync_status: 'failed',
      network_note: parsed.network_note || null,
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

interface GitRef { hash: string; ref: string }

function extractGitRef(content: string): GitRef | null {
  // Homebrew's current upstream advertises main as HEAD. master can remain
  // present but frozen, so it must not be preferred over main.
  for (const branch of ['main', 'stable', 'master']) {
    const ref = `refs/heads/${branch}`;
    const match = content.match(new RegExp(`([0-9a-f]{40})\\s+${ref}(?:[\\s\\x00])`));
    if (match) return { hash: match[1], ref };
  }
  return null;
}

async function readGitRef(response: Response): Promise<GitRef | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let content = '';
  let bytes = 0;
  try {
    while (bytes < 1024 * 1024) {
      const { done, value } = await reader.read();
      if (done) return extractGitRef(content + decoder.decode() + '\n');
      bytes += value.byteLength;
      content += decoder.decode(value, { stream: true });
      const ref = extractGitRef(content);
      if (ref?.ref === 'refs/heads/main') return ref;
    }
    // Do not claim a legacy branch is current when the response was truncated.
    throw new Error('Git refs response exceeded the 1 MiB probe limit before main was found');
  } finally {
    await reader.cancel().catch(() => {});
  }
}

const MIRROR_KEYS = [
  'HOMEBREW_BREW_GIT_REMOTE', 'HOMEBREW_CORE_GIT_REMOTE', 'HOMEBREW_CASK_GIT_REMOTE',
  'HOMEBREW_BOTTLE_DOMAIN', 'HOMEBREW_API_DOMAIN', 'HOMEBREW_ARTIFACT_DOMAIN',
  'HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK',
] as const;
const REPORT_KEYS = new Set<string>(['HOMEBREW_PREFIX', 'ORIGIN', ...MIRROR_KEYS]);
const CONFIG_LABELS: Record<string, string> = {
  HOMEBREW_PREFIX: 'Homebrew 安装位置',
  ORIGIN: 'Homebrew 当前更新地址',
  HOMEBREW_BREW_GIT_REMOTE: '指定的 Homebrew 更新地址',
  HOMEBREW_CORE_GIT_REMOTE: '工具说明仓库地址',
  HOMEBREW_CASK_GIT_REMOTE: '应用说明仓库地址',
  HOMEBREW_BOTTLE_DOMAIN: '工具安装包下载地址',
  HOMEBREW_API_DOMAIN: '软件目录下载地址',
  HOMEBREW_ARTIFACT_DOMAIN: '其他下载的代理地址',
  HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK: '代理失败后是否停止下载',
};
const CONFIG_KEYS = new Set<string>([...REPORT_KEYS, 'HOMEBREW_SYSTEM_ENV_TAKES_PRIORITY', 'HOMEBREW_XDG_CONFIG_HOME', 'XDG_CONFIG_HOME']);
type DiagnosticRuleId = keyof typeof HOMEBREW_CN_DIAGNOSTIC_RULES;

const DOCTOR_HEADINGS: Array<[RegExp, DiagnosticRuleId]> = [
  [/^The current git origin is:/i, 'doctor_origin'],
  [/^Some installed casks are deprecated or disabled\./i, 'doctor_deprecated_casks'],
  [/^Some installed kegs have no formulae!/i, 'doctor_orphaned_kegs'],
  [/^Some installed formulae are deprecated or disabled\./i, 'doctor_deprecated_formulae'],
  [/^Unbrewed dylibs were found in /i, 'doctor_unbrewed_dylibs'],
  [/^The following taps are not trusted:/i, 'doctor_untrusted_taps'],
];

export function redactDiagnosticText(text: string): string {
  return text
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/(?:https?|socks5h?|socks4a?|ftp|ssh):\/\/[^\s<>"'`]+/gi, raw => {
      try {
        const url = new URL(raw);
        const credentials = url.username || url.password ? '[redacted]@' : '';
        return `${url.protocol}//${credentials}${url.host}${url.pathname}${url.search ? '?[redacted]' : ''}${url.hash ? '#[redacted]' : ''}`;
      } catch { return '[redacted-url]'; }
    })
    .replace(/\b([A-Z_]*(?:TOKEN|PASSWORD|SECRET|API_KEY|AUTHORIZATION)[A-Z_]*\s*[:=]\s*)[^\r\n]+/gi, '$1[redacted]')
    .replace(/\/Users\/[^/\s]+/g, '~')
    .replace(/\/home\/(?!linuxbrew(?:\/|\b))[^/\s]+/g, '~');
}

function diagnosticIssue(id: DiagnosticRuleId, evidence: string[] = [], commands: string[] = []): AnalyzeIssue {
  const rule = HOMEBREW_CN_DIAGNOSTIC_RULES[id];
  return {
    id, severity: rule.severity, title: rule.title, message: rule.message,
    suggestion: rule.suggestion, verification: rule.verification,
    evidence: evidence.slice(0, 30),
    commands: [...('commands' in rule ? rule.commands : []), ...commands].slice(0, 12),
    ...('impact_scope' in rule ? { impact_scope: rule.impact_scope, installation_impact: rule.installation_impact, action_required: rule.action_required } : {}),
  };
}

function doctorBlocks(text: string) {
  const clean = text.replace(/\*\*/g, '');
  const matches = [...clean.matchAll(/^\s*(Warning|Error):\s*([^\n]+)([\s\S]*?)(?=^\s*(?:Warning|Error):|$(?![\s\S]))/gm)];
  return matches.map(match => ({ level: match[1], heading: match[2].trim(), body: match[3] }));
}

function configSection(line: string): string | null {
  const heading = line.match(/^\s*(?:#{1,6}\s+(.+)|\[([^\]]+)\]|(终端|桌面端|BrewUI|Terminal|Shell)(?:\s+(?:brew config|Configuration))?[:：])\s*$/i);
  if (!heading) return null;
  return (heading[1] ?? heading[2] ?? heading[3]).trim().replace(/[:：]$/, '');
}

function sectionKind(label: string): 'terminal' | 'desktop' | 'file' | 'shell' | 'unknown' {
  if (/brew\.env$/.test(label)) return 'file';
  if (/^(?:terminal|终端)(?:\s+brew config)?$/i.test(label)) return 'terminal';
  if (/^(?:desktop|桌面端|BrewUI)(?:\s+(?:configuration|配置|brew config))?$/i.test(label)) return 'desktop';
  if (/^(?:shell|\.zshrc|\.bashrc|\.zprofile|\.bash_profile)$/i.test(label)) return 'shell';
  return 'unknown';
}

export function hasHomebrewDiagnosticReport(text: string): boolean {
  const clean = text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').replace(/\*\*/g, '');
  if (/^\s*Your system is ready to brew\.\s*$/m.test(clean)) return true;
  const blocks = doctorBlocks(clean);
  if (blocks.some(block => DOCTOR_HEADINGS.some(([pattern]) => pattern.test(block.heading)))) return true;
  if (blocks.length && /\b(?:Homebrew|BrewUI|brew doctor)\b|Doctor|诊断报告/i.test(clean)) return true;
  const lines = clean.split(/\r?\n/);
  const hasSections = lines.some(line => {
    const label = configSection(line);
    return label !== null && sectionKind(label) !== 'unknown';
  });
  return (hasSections && /^\s*(?:export\s+)?(?:HOMEBREW_[A-Z_]+|ORIGIN)\s*[:=]/m.test(clean))
    || /^HOMEBREW_PREFIX\s*[:=]/m.test(clean);
}

function analyzeDoctor(text: string): { issues: AnalyzeIssue[]; doctor: NonNullable<AnalyzeResult['doctor']> } | null {
  const blocks = doctorBlocks(text);
  const ready = /^\s*Your system is ready to brew\.\s*$/m.test(text);
  if (!ready && !(blocks.length && (/\b(?:Homebrew|BrewUI|brew doctor)\b|Doctor|诊断报告/i.test(text)
    || blocks.some(block => DOCTOR_HEADINGS.some(([pattern]) => pattern.test(block.heading)))))) return null;
  let unrecognized = 0;
  const issues = blocks.map(block => {
    const id = DOCTOR_HEADINGS.find(([pattern]) => pattern.test(block.heading))?.[1] ?? 'doctor_unknown';
    if (id === 'doctor_unknown') unrecognized++;
    // Only parse indented identities. Never reuse Doctor's suggested shell commands.
    const items = block.body.split('\n').filter(line => /^\s{2,}\S/.test(line)).map(line => line.trim())
      .filter(line => /^[a-z0-9][a-z0-9@+_.-]*(?:\/[a-z0-9][a-z0-9@+_.-]*){0,2}$/.test(line));
    const localItems = [...new Set(items)].filter(item => !item.includes('/')).slice(0, 6);
    const commands = id === 'doctor_deprecated_casks'
      ? localItems.map(item => `brew info --cask ${quoteShellArg(item)}`)
      : id === 'doctor_deprecated_formulae' || id === 'doctor_orphaned_kegs'
        ? localItems.flatMap(item => [`brew list --versions ${quoteShellArg(item)}`, `brew uses --installed ${quoteShellArg(item)}`])
        : [];
    if (id === 'doctor_deprecated_formulae') commands.unshift(...localItems.map(item => `brew info --formula ${quoteShellArg(item)}`));
    const paths = id === 'doctor_unbrewed_dylibs'
      ? block.body.split('\n').map(line => line.trim()).filter(line => /^\/[^\r\n]+\.dylib$/.test(line)) : [];
    const origin = id === 'doctor_origin' ? block.body.match(/https?:\/\/\S+/)?.[0] : undefined;
    const issue = diagnosticIssue(id, [block.heading, ...items, ...paths, ...(origin ? [origin] : [])], commands);
    if (block.level === 'Error') issue.severity = 'error';
    return issue;
  });
  const failedLines = text.split('\n').map(line => line.trim()).filter(line =>
    /^(?:(?:zsh|bash):\s*)?(?:command not found: brew|brew:\s*(?:command not found|not found))|^(?:fatal:|error:)\s*\S/i.test(line) && !/^Error:/.test(line));
  if (failedLines.length) issues.push(diagnosticIssue('doctor_command_failure', failedLines));
  const summaryKind = failedLines.length || blocks.some(block => block.level === 'Error') ? 'errors'
    : unrecognized ? 'unknown' : blocks.length ? 'known' : 'ready';
  const assessment = summaryKind === 'known' && issues.length === 1
    ? { installation_impact: issues[0].installation_impact!, action_required: issues[0].action_required! }
    : { ...HOMEBREW_CN_DOCTOR_SUMMARIES[summaryKind] };
  return { issues, doctor: { warning_count: issues.length, unrecognized_count: unrecognized,
    ready: ready && !issues.length, assessment } };
}

// A natural-language follow-up is not a log. Keep direct analysis tied to
// actual supplied evidence; conversational interpretation belongs to the model.
export function hasLocalEnvironmentEvidence(text: string): boolean {
  return hasHomebrewDiagnosticReport(text)
    || /(?:command not found: brew|brew: command not found|brew:\s*not found)/i.test(text)
    || /^\s*(?:export\s+)?(?:PATH|HOMEBREW_[A-Z_]+|https?_proxy|all_proxy)\s*[:=]/mi.test(text)
    || /^\s*(?:fatal:|Error:|Warning:|url\..*insteadof\s)/mi.test(text);
}

// Only fill the missing side from the immediately relevant earlier report.
// New output from a side always replaces its previous snapshot.
export function combineConfigurationReports(currentText: string, previousText?: string): string {
  if (!previousText || analyzeDoctor(redactDiagnosticText(currentText))) return currentText;
  const current = analyzeConfiguration(redactDiagnosticText(currentText))?.configuration;
  const previous = analyzeConfiguration(redactDiagnosticText(previousText))?.configuration;
  if (!current || !previous || current.terminal_provided === current.desktop_provided) return currentText;
  const missingSide = current.terminal_provided ? 'desktop' : 'terminal';
  if (!(missingSide === 'desktop' ? previous.desktop_provided : previous.terminal_provided)) return currentText;
  const fragments = previous.sources.filter(source => sectionKind(source.source) === missingSide
    || (['file', 'shell'].includes(sectionKind(source.source)) && !current.sources.some(item => item.source === source.source)))
    .map(source => `[${source.source}]\n${Object.entries(source.values).map(([key, values]) => values.map(value => `${key}: ${value}`).join('\n')).join('\n')}`);
  if (!fragments.length) return currentText;
  return `${currentText}\n\n另一侧信息来自本次对话中较早提供的报告，并非重新检查：\n${fragments.join('\n\n')}`;
}

function analyzeConfiguration(text: string): { issues: AnalyzeIssue[]; configuration: ConfigurationComparison } | null {
  const sections: Array<{ source: string; kind: ReturnType<typeof sectionKind>; values: Record<string, string[]> }> = [];
  let section = { source: '未标注来源', kind: 'unknown' as ReturnType<typeof sectionKind>, values: {} as Record<string, string[]> };
  sections.push(section);
  const invalid: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const label = configSection(line);
    if (label !== null) {
      section = { source: label, kind: sectionKind(label), values: {} };
      sections.push(section);
      continue;
    }
    const assignment = line.match(/^\s*(export\s+)?([A-Z_]+)\s*[:=]\s*(.*?)\s*$/);
    if (!assignment || !CONFIG_KEYS.has(assignment[2])) continue;
    const [, exported, key, raw] = assignment;
    if (section.kind === 'file' && (exported || /\$|`/.test(raw))) invalid.push(`${section.source}: ${key}`);
    const value = raw.replace(/^(['"])(.*)\1$/, '$2');
    (section.values[key] ??= []).push(value);
  }
  if (!sections.some(item => Object.keys(item.values).length && item.kind !== 'unknown')
    && !sections[0].values.HOMEBREW_PREFIX) return null;
  const provided = (kind: string) => sections.some(item => item.kind === kind && Object.keys(item.values).length);
  const files = sections.filter(item => item.kind === 'file' || item.kind === 'shell');
  const keys = [...REPORT_KEYS].filter(key => sections.some(item => item.values[key]));
  const observed = (kind: string, key: string): string | null => {
    const values = sections.filter(item => item.kind === kind).flatMap(item => item.values[key] ?? []);
    const unique = [...new Set(values)];
    return unique.length === 1 ? unique[0] : null;
  };
  const rows: ConfigurationRow[] = keys.map(key => {
    const terminal = observed('terminal', key);
    const desktop = observed('desktop', key);
    const comparable = terminal !== null && desktop !== null && !/\[redacted[^\]]*\]/.test(terminal + desktop);
    return {
      key, label: CONFIG_LABELS[key] ?? key, terminal, desktop,
      status: comparable ? (terminal === desktop ? 'same' : 'different') : 'incomplete',
      candidate_sources: files.filter(file => file.values[key]?.some(value => (value === terminal || value === desktop)
        && !/\[redacted[^\]]*\]/.test(value))).map(file => file.source),
    };
  });
  const issues: AnalyzeIssue[] = [];
  const differences = rows.filter(row => row.status === 'different');
  if (differences.length) {
    const issue = diagnosticIssue('configuration_difference', differences.map(row => row.key));
    if (rows.some(row => row.key === 'HOMEBREW_PREFIX' && row.status === 'same')) {
      issue.suggestion = HOMEBREW_CN_DIAGNOSTIC_RULES.configuration_difference.same_prefix_suggestion;
    }
    issues.push(issue);
  }
  if (!provided('terminal') || !provided('desktop') || rows.some(row => row.status === 'incomplete') || !rows.length) {
    const rule = HOMEBREW_CN_DIAGNOSTIC_RULES.configuration_incomplete;
    const issue = diagnosticIssue('configuration_incomplete');
    issue.suggestion = provided('terminal') && provided('desktop') ? rule.both_reports_suggestion
      : provided('desktop') ? rule.missing_terminal_suggestion
      : provided('terminal') ? rule.missing_desktop_suggestion : rule.missing_source_suggestion;
    issues.push(issue);
  }
  const conflicts = MIRROR_KEYS.filter(key => {
    const all = files.flatMap(file => file.values[key] ?? []);
    return new Set(all).size > 1 || files.some(file => (file.values[key]?.length ?? 0) > 1);
  });
  if (conflicts.length) issues.push(diagnosticIssue('configuration_file_conflict', conflicts));
  if (invalid.length) issues.push(diagnosticIssue('configuration_invalid_env', invalid));
  return { issues, configuration: {
    terminal_provided: provided('terminal'), desktop_provided: provided('desktop'), rows,
    sources: sections.filter(item => Object.keys(item.values).length).map(({ source, values }) => ({ source, values })),
  } };
}

export function analyzeHomebrewText(input: string): AnalyzeResult {
  const text = redactDiagnosticText(input);
  const doctor = analyzeDoctor(text.replace(/\*\*/g, ''));
  const configuration = analyzeConfiguration(text);
  if (doctor || configuration) {
    const issues = [...(doctor?.issues ?? []), ...(configuration?.issues ?? [])];
    return {
      ok: true, scope: 'provided_text', analyzed_lines: text.split(/\r?\n/).length,
      issues_found: issues.length, issues,
      ...(doctor ? { doctor: doctor.doctor } : {}),
      ...(configuration ? { configuration: configuration.configuration } : {}),
    };
  }
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
      title: '当前信息未确认 brew 在 PATH 中可用',
      message: '提供的输出提示当前环境可能找不到 brew；仅凭这些信息不能确认 Homebrew 已安装成功。',
      suggestion: '先提供 command -v brew、brew --version 和实际安装路径的输出，区分未安装、PATH 缺失和不同启动环境。确认 prefix 后先临时验证，不要直接重复追加 shell 配置。',
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
      title: '多处二进制源配置 (HOMEBREW_BOTTLE_DOMAIN)',
      message: '提供的信息中出现了多个 HOMEBREW_BOTTLE_DOMAIN；需要核对配置文件来源和有效值，不能据此断定本机已经发生冲突。',
      suggestion: '已安装 Homebrew 时可运行 --configure 配置模式，按提示检查并迁移镜像设置至 prefix/etc/homebrew/brew.env，同时处理用户级或 XDG 配置中的覆盖值。',
    });
  }

  if (lines.some((line) => /^\s*export\s+HOMEBREW_(?:BREW_GIT_REMOTE|CORE_GIT_REMOTE|BOTTLE_DOMAIN|API_DOMAIN)=/.test(line))) {
    issues.push({
      id: 'legacy_mirror_shell_config',
      severity: 'info',
      title: '镜像设置使用 shell export',
      message: '贴出的镜像配置使用了 shell export。BrewUI 的隔离环境不会读取 .zshrc；这不等于已经确认本机没有 brew.env。',
      suggestion: '使用现有安装的 --configure 模式检查并迁移共享镜像配置。brew.env 使用 NAME=value，不加 export；PATH 与 brew shellenv 仍保留在 shell 配置中。',
    });
  }

  return {
    ok: true,
    analyzed_lines: lines.length,
    issues_found: issues.length,
    issues,
    scope: 'provided_text',
  };
}

export function inferFixOptions(text: string, issues: AnalyzeIssue[]): FixOptions | null {
  const issueIds = issues
    .filter((issue) => ['brew_missing_from_path', 'git_insteadof_conflict', 'duplicate_bottle_domain', 'legacy_mirror_shell_config'].includes(issue.id))
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

export function generateFixScript({ issue_ids, os_type, arch }: FixOptions): string {
  const scriptLines = ['# homebrew-cn 根据已提供信息生成的验证与配置命令', '# 尚未执行本机诊断；执行前请确认路径，迁移时保留配置备份'];
  let stepNumber = 1;

  if (issue_ids.includes('brew_missing_from_path')) {
    const prefix = os_type === 'linux'
      ? '/home/linuxbrew/.linuxbrew'
      : (arch === 'arm64' ? '/opt/homebrew' : '/usr/local');
    scriptLines.push('');
    scriptLines.push(`# ${stepNumber++}. 仅在已存在可执行文件时临时验证 PATH`);
    scriptLines.push(`if [ -x "${prefix}/bin/brew" ]; then`);
    scriptLines.push(`  eval "$(${prefix}/bin/brew shellenv)"`);
    scriptLines.push('  brew --version');
    scriptLines.push('else');
    scriptLines.push('  echo "未找到预期的 brew 可执行文件，请先确认安装位置。"');
    scriptLines.push('fi');
    scriptLines.push('# 临时验证成功后，再确认对应 shell profile 的持久 PATH 配置。');
  }

  if (issue_ids.includes('git_insteadof_conflict')) {
    scriptLines.push('');
    scriptLines.push(`# ${stepNumber++}. 查看可能影响 Homebrew 的 insteadOf 规则`);
    scriptLines.push('echo "建议运行以下命令查看可能冲突的全局 Git 代写规则："');
    scriptLines.push('echo "  git config --global --get-regexp \\"url\\..*\\""');
  }

  if (issue_ids.includes('duplicate_bottle_domain') || issue_ids.includes('legacy_mirror_shell_config')) {
    scriptLines.push('');
    scriptLines.push(`# ${stepNumber++}. 为现有 Homebrew 交互配置共享镜像，无需重新安装`);
    scriptLines.push('# 按提示迁移旧 shell exports，检查用户/XDG 覆盖配置；持久镜像设置写入 prefix/etc/homebrew/brew.env。');
    scriptLines.push(os_type === 'linux' ? HOMEBREW_CN_LINUX_CONFIGURE_COMMAND : HOMEBREW_CN_CONFIGURE_COMMAND);
    scriptLines.push(os_type === 'linux' ? '# 完成后打开新终端验证。' : '# 完成后打开新终端；若使用 BrewUI，退出后重新打开再验证。');
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
    [/\b(ss|shadowsocks)\b/i, 'shadowsocks'],
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
        'Analyze user-provided Homebrew Doctor warnings, labeled Terminal/BrewUI configuration reports, selected mirror assignments or terminal logs. Returns evidence, Chinese guidance, configuration comparisons and verification steps. Does not inspect or modify the local computer.',
      parameters: z.object({
        text: z.string().describe('User-provided Doctor output or labeled [terminal]/[desktop] reports and selected mirror settings. Do not request a full env dump; redact credentials before sharing.'),
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
