import { Agent, run, type Session } from '@openai/agents';
import { createGatewayClient, createGatewayModel, getAgentEnv, resolveGatewayModelName } from '../_model';
import { createLogger, createSSEResponse, jsonResponse, sseEvent, truncateText } from '../_shared';
import { buildSystemPrompt, buildUserInput } from './_prompt';
import {
  analyzeHomebrewText,
  checkHomebrewFormulaIndex,
  createHomebrewTools,
  diagnoseHomebrewMirrors,
  generateFixScript,
  inferFixOptions,
  probeHomebrewMirrorsDeep,
} from './_tools';

const logger = createLogger('chat');

export async function onRequest(context: any) {
  const body = context.request?.body ?? {};
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const extraContext = typeof body.context === 'string' ? body.context : undefined;
  const pastedImages = normalizePastedImages(body.images);
  const signal = context.request?.signal as AbortSignal | undefined;

  let conversationId = context.conversation_id as string | undefined;
  if (!conversationId && context.request?.headers) {
    const headers = context.request.headers;
    conversationId = headers['makers-conversation-id'] || headers['Makers-Conversation-Id'] || headers['MAKERS-CONVERSATION-ID'];
  }

  if (!message) {
    return jsonResponse({ error: "'message' is required" }, 400);
  }

  if (!conversationId) {
    return jsonResponse({ error: "Missing required 'makers-conversation-id' header" }, 400);
  }

  return createSSEResponse(
    async function* () {
      try {
        const combinedContext = extraContext ?? '';
        yield sseEvent({ type: 'thinking', content: '已收到问题，正在进行意图识别…' });
        const intent = classifyIntent(message, combinedContext);
        yield sseEvent({ type: 'tool_call', name: 'intent_classify', arguments: JSON.stringify({ message }) });
        yield sseEvent({ type: 'tool_result', name: 'intent_classify', content: JSON.stringify(intent) });

        if (!intent.is_homebrew_related) {
          yield sseEvent({
            type: 'ai_response',
            content: '我是 homebrew-cn Agent，主要处理 Homebrew 安装、镜像源、软件包安装查询和本地环境排查。这个问题不属于 Homebrew 或本助手能力范围，因此我不能继续回答。你可以把 Homebrew 安装日志、终端报错、镜像源问题或软件包安装问题发给我。',
          });
          return;
        }

        if (intent.route === 'model_identity') {
          yield* runDirectModelIdentity(context.env);
          return;
        }

        if (intent.route === 'restore_official') {
          yield* runDirectRestoreOfficial();
          return;
        }

        if (intent.route === 'mirror_probe_deep') {
          yield* runDirectDiagnostics({ sandbox: context.sandbox, signal });
          return;
        }

        if (intent.route === 'formula_check') {
          yield* runDirectFormulaCheck({ message, extraContext: combinedContext, signal });
          return;
        }

        const brewMissingFlow = isBrewMissingIntent(message, combinedContext);

        if (brewMissingFlow) {
          yield* runBrewMissingTroubleshooting({
            message,
            extraContext: combinedContext,
            pastedImageCount: pastedImages.length,
            signal,
          });
          return;
        }

        if (!brewMissingFlow && isAnalysisIntent(message, combinedContext)) {
          yield* runDirectAnalysisAndFix({ message, extraContext: combinedContext, signal });
          return;
        }

        const env = getAgentEnv(context.env);
        const systemPrompt = buildSystemPrompt(message);
        const userInput = buildUserInput(message, combinedContext);

        const allowedTools = getAllowedTools(message, combinedContext);
        const hasTools = allowedTools.length > 0;
        const traceSummary = getTraceSummary(message, combinedContext, hasTools);

        const enableThinking =
          context.env?.AI_GATEWAY_ENABLE_THINKING !== 'false' &&
          needsThinking(message, combinedContext);

        yield sseEvent({ type: 'thinking', content: '正在分析你的问题…' });
        if (traceSummary) {
          yield sseEvent({ type: 'thinking', content: traceSummary });
        }

        if (!hasTools) {
          yield* runDirectGatewayChat({
            env,
            systemPrompt,
            userInput,
            enableThinking,
            signal,
          });
          return;
        }

        const tools = createHomebrewTools({
          env: context.env ?? {},
          signal,
          allowedTools,
          sandbox: needsSandboxTool(message) ? context.sandbox : undefined,
        });

        // 只有工具路径需要 session adapter；常规问答直连上游，避免额外等待。
        const sessionPromise: Promise<Session | undefined> = (
          context.store && conversationId
            ? Promise.resolve(context.store.openaiSession(conversationId))
            : Promise.resolve(undefined)
        );

        const agent = new Agent({
          name: 'homebrew-cn Agent',
          instructions: systemPrompt,
          model: createGatewayModel(env),
          modelSettings: {
            parallelToolCalls: true,
            providerData: {
              chat_template_kwargs: {
                enable_thinking: enableThinking,
              },
            },
          },
          tools,
        });

        // 等待工具路径的 session 加载。
        const session = await sessionPromise;

        // 4. Run Agent Loop and stream events
        const result = await run(agent, userInput, {
          stream: true,
          signal,
          session,
          maxTurns: 5,
          sessionInputCallback: limitSessionHistory,
        });

        let usage: any = null;
        for await (const event of result.toStream()) {
          if (signal?.aborted) break;
          const mapped = toSseEvent(event);
          if (mapped) {
            yield sseEvent(mapped);
          }
          usage = extractUsage(event) ?? usage;
        }

        usage = extractUsage(result) ?? usage;
        if (usage) {
          yield sseEvent({ type: 'usage', ...usage });
        }

      } catch (error) {
        const err = error as Error;
        if (err.name === 'AbortError' || signal?.aborted || err.message?.includes('terminated')) return;
        logger.error(err);
        yield sseEvent({ type: 'error_message', content: err.message });
      }
    },
    signal,
  );
}

type IntentRoute =
  | 'model_identity'
  | 'restore_official'
  | 'mirror_probe_deep'
  | 'formula_check'
  | 'brew_missing'
  | 'analysis_fix'
  | 'general_homebrew'
  | 'reject';

interface IntentClassification {
  ok: true;
  is_homebrew_related: boolean;
  needs_sandbox: boolean;
  route: IntentRoute;
  reason: string;
}

function classifyIntent(message: string, extraContext?: string): IntentClassification {
  if (isModelIdentityIntent(message)) {
    return {
      ok: true,
      is_homebrew_related: true,
      needs_sandbox: false,
      route: 'model_identity',
      reason: '用户询问当前助手或模型身份，属于 homebrew-cn Agent 自身说明，无需沙盒。',
    };
  }

  if (isResetOfficialIntent(message)) {
    return {
      ok: true,
      is_homebrew_related: true,
      needs_sandbox: false,
      route: 'restore_official',
      reason: '用户请求恢复 Homebrew 官方源，使用固定官方仓库地址直接生成命令，不需要沙盒或模型等待。',
    };
  }

  if (isDiagnosticIntent(message) || shouldExposeDiagnoseTool(message, extraContext)) {
    return {
      ok: true,
      is_homebrew_related: true,
      needs_sandbox: true,
      route: 'mirror_probe_deep',
      reason: '用户请求镜像源检测、测速或实时可用性判断，需要从 EdgeOne 沙箱发起网络探测。',
    };
  }

  if (isFormulaCheckIntent(message, extraContext)) {
    return {
      ok: true,
      is_homebrew_related: true,
      needs_sandbox: false,
      route: 'formula_check',
      reason: '用户询问软件能否安装或需要 brew install 命令，只需查询 Homebrew JSON 索引，不需要沙盒。',
    };
  }

  if (isBrewMissingIntent(message, extraContext)) {
    return {
      ok: true,
      is_homebrew_related: true,
      needs_sandbox: false,
      route: 'brew_missing',
      reason: '用户描述 brew 命令不可用或 PATH 问题，直接基于终端证据生成排查建议。',
    };
  }

  if (isAnalysisIntent(message, extraContext)) {
    return {
      ok: true,
      is_homebrew_related: true,
      needs_sandbox: false,
      route: 'analysis_fix',
      reason: '用户提供 Homebrew 相关日志或环境信息，直接做本地文本诊断，不需要沙盒。',
    };
  }

  if (isOffTopic(message)) {
    return {
      ok: true,
      is_homebrew_related: false,
      needs_sandbox: false,
      route: 'reject',
      reason: '问题不属于 Homebrew、homebrew-cn 或当前助手能力范围。',
    };
  }

  return {
    ok: true,
    is_homebrew_related: true,
    needs_sandbox: false,
    route: 'general_homebrew',
    reason: '识别为常规 Homebrew 或 homebrew-cn 指引问题，交给模型直接回答，不启用沙盒。',
  };
}

async function* runDirectRestoreOfficial() {
  yield sseEvent({
    type: 'thinking',
    content: '步骤 1：识别为恢复官方源请求；步骤 2：无需联网测速或沙盒；步骤 3：直接使用 Homebrew 官方仓库地址生成恢复命令。',
  });

  yield sseEvent({
    type: 'ai_response',
    content: [
      '可以。恢复官方源主要做两件事：把 Homebrew 的 Git 远程地址切回 GitHub，并清理 shell 配置里的镜像环境变量。',
      '',
      '先执行这些命令：',
      '',
      '```bash',
      'git -C "$(brew --repo)" remote set-url origin https://github.com/Homebrew/brew',
      '',
      'if [ -d "$(brew --repo)/Library/Taps/homebrew/homebrew-core" ]; then',
      '  git -C "$(brew --repo)/Library/Taps/homebrew/homebrew-core" remote set-url origin https://github.com/Homebrew/homebrew-core',
      'fi',
      '',
      'if [ -d "$(brew --repo)/Library/Taps/homebrew/homebrew-cask" ]; then',
      '  git -C "$(brew --repo)/Library/Taps/homebrew/homebrew-cask" remote set-url origin https://github.com/Homebrew/homebrew-cask',
      'fi',
      '',
      'unset HOMEBREW_BOTTLE_DOMAIN HOMEBREW_API_DOMAIN',
      'brew update',
      '```',
      '',
      '注意：`unset` 只对当前终端生效。如果之前在 `~/.zshrc`、`~/.bashrc` 或 `~/.bash_profile` 里写过 `HOMEBREW_BOTTLE_DOMAIN`、`HOMEBREW_API_DOMAIN`，需要把对应行删掉后重新打开终端。',
    ].join('\n'),
  });
}

async function* runDirectModelIdentity(env: Record<string, string | undefined> | undefined) {
  const model = env?.AI_GATEWAY_MODEL || '@makers/deepseek-v4-flash';
  yield sseEvent({
    type: 'ai_response',
    content: `我是 homebrew-cn Agent，当前通过 EdgeOne Makers AI Gateway 调用的模型是 \`${model}\`。我的职责主要是处理 Homebrew 安装、镜像源、软件包安装查询和本地环境排查。`,
  });
}

async function* runDirectGatewayChat(options: {
  env: ReturnType<typeof getAgentEnv>;
  systemPrompt: string;
  userInput: string;
  enableThinking: boolean;
  signal?: AbortSignal;
}) {
  const client = createGatewayClient(options.env);
  const stream = await client.chat.completions.create({
    model: resolveGatewayModelName(options.env),
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userInput },
    ],
    stream: true,
    stream_options: { include_usage: true },
    chat_template_kwargs: {
      enable_thinking: options.enableThinking,
    },
  } as any, { signal: options.signal } as any) as unknown as AsyncIterable<any>;

  let usage: any = null;
  for await (const chunk of stream) {
    if (options.signal?.aborted) break;
    const delta = chunk.choices?.[0]?.delta;
    const reasoning = delta?.reasoning_content ?? delta?.reasoning;
    if (reasoning) {
      yield sseEvent({ type: 'reasoning', content: reasoning });
    }
    if (delta?.content) {
      yield sseEvent({ type: 'ai_response', content: delta.content });
    }
    usage = chunk.usage ?? usage;
  }

  if (usage) {
    yield sseEvent({
      type: 'usage',
      input_tokens: usage.prompt_tokens ?? usage.input_tokens ?? 0,
      output_tokens: usage.completion_tokens ?? usage.output_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
    });
  }
}

async function* runDirectDiagnostics(options: { sandbox?: any; signal?: AbortSignal }) {
  yield sseEvent({ type: 'tool_call', name: 'mirror_probe_deep', arguments: '{}' });

  const pending: string[] = [];
  let wake: (() => void) | null = null;
  let finished = false;
  let finalResult: Awaited<ReturnType<typeof probeHomebrewMirrorsDeep>> | null = null;

  const notify = () => {
    wake?.();
    wake = null;
  };

  const diagnosticsPromise = probeHomebrewMirrorsDeep({
    env: {},
    sandbox: options.sandbox,
    signal: options.signal,
    async onProgress(_, report) {
      pending.push(sseEvent({
        type: 'tool_result',
        name: 'mirror_probe_deep',
        partial: true,
        content: JSON.stringify({ ok: true, partial: true, report }),
      }));
      notify();
    },
  }).then((result) => {
    finalResult = result;
    finished = true;
    notify();
  }).catch((error) => {
    pending.push(sseEvent({ type: 'error_message', content: (error as Error).message }));
    finished = true;
    notify();
  });

  while (!finished || pending.length) {
    while (pending.length) {
      const next = pending.shift();
      if (next) yield next;
    }
    if (!finished) {
      await new Promise<void>((resolve) => { wake = resolve; });
    }
  }

  await diagnosticsPromise;

  if (finalResult) {
    yield sseEvent({
      type: 'tool_result',
      name: 'mirror_probe_deep',
      content: JSON.stringify(finalResult),
    });
    yield sseEvent({ type: 'ai_response', content: summarizeDiagnostics(finalResult) });
  }
}

function summarizeDiagnostics(result: Awaited<ReturnType<typeof diagnoseHomebrewMirrors>>) {
  const usable = result.report
    .filter((item) => !item.error && item.http_status >= 200 && item.http_status < 400)
    .sort((a, b) => a.latency_ms - b.latency_ms);
  const best = usable.find((item) => item.name !== 'Official (官方源)') ?? usable[0];
  const official = result.report.find((item) => item.name === 'Official (官方源)');

  const lines = [
    `在线镜像源诊断完成，用时 ${(result.duration_ms / 1000).toFixed(1)} 秒。`,
    '',
  ];

  if (best) {
    lines.push(`当前建议优先选择 **${best.name}**，延迟约 **${best.latency_ms} ms**，同步状态为 **${formatSyncStatus(best.sync_status)}**。`);
  } else {
    lines.push('本次没有检测到可直接访问的镜像源，建议检查本地网络、代理或稍后重试。');
  }

  if (official?.sync_status === 'network_restricted') {
    lines.push('官方源检测失败通常是 EdgeOne 沙箱无法访问 GitHub 导致，不代表 Homebrew 官方源本身不可用。');
  }

  lines.push('');
  lines.push('完整结果已在当前对话的工具卡片中展开，可直接复制报告用于排查。');
  return lines.join('\n');
}

function* runDirectAnalysisAndFix(options: { message: string; extraContext?: string; signal?: AbortSignal }) {
  const sourceText = buildAnalysisInput(options.message, options.extraContext);
  yield sseEvent({ type: 'tool_call', name: 'analyze', arguments: JSON.stringify({ text: summarizeToolInput(sourceText) }) });

  if (options.signal?.aborted) return;

  const analysis = analyzeHomebrewText(sourceText);
  yield sseEvent({
    type: 'tool_result',
    name: 'analyze',
    content: JSON.stringify(analysis),
  });

  const fixOptions = inferFixOptions(sourceText, analysis.issues);
  let fixScript = '';
  if (fixOptions && !options.signal?.aborted) {
    yield sseEvent({ type: 'tool_call', name: 'fix', arguments: JSON.stringify(fixOptions) });
    fixScript = generateFixScript(fixOptions);
    yield sseEvent({
      type: 'tool_result',
      name: 'fix',
      content: fixScript,
    });
  }

  yield sseEvent({
    type: 'ai_response',
    content: summarizeAnalysis(analysis, Boolean(fixScript)),
  });
}

function buildAnalysisInput(message: string, extraContext?: string) {
  const text = [message, extraContext].filter(Boolean).join('\n\n');
  if (/找不到.*brew|brew.*找不到|没有.*brew|brew.*not found/i.test(text) && !/command not found: brew|brew: command not found/i.test(text)) {
    return `${text}\ncommand not found: brew`;
  }
  return text;
}

function summarizeToolInput(text: string) {
  return text.length <= 240 ? text : `${text.slice(0, 240)}...`;
}

function summarizeAnalysis(analysis: ReturnType<typeof analyzeHomebrewText>, hasFix: boolean) {
  if (!analysis.issues_found) {
    return '我已经检查了你提供的终端信息，暂时没有发现明显的 PATH、代理或 Git 重定向结构性问题。可以继续贴出完整安装日志，我会进一步定位。';
  }

  const severe = analysis.issues.filter((issue) => issue.severity === 'error').length;
  const warnings = analysis.issues.filter((issue) => issue.severity === 'warning').length;
  const lines = [
    `已完成环境分析：发现 ${analysis.issues_found} 个问题，其中 ${severe} 个错误、${warnings} 个警告。`,
  ];

  if (hasFix) {
    lines.push('我已经根据检测结果生成了修复命令，显示在上方工具卡片里。执行前建议先备份对应 shell 配置文件。');
  } else {
    lines.push('上方工具卡片列出了问题说明和建议处理方式。');
  }

  return lines.join('\n\n');
}

async function* runDirectFormulaCheck(options: {
  message: string;
  extraContext?: string;
  sandbox?: any;
  signal?: AbortSignal;
}) {
  const query = extractFormulaQuery(options.message, options.extraContext);
  yield sseEvent({
    type: 'thinking',
    content: `步骤 1：识别为 Homebrew 软件包安装查询；步骤 2：准备查询 Homebrew JSON 索引；步骤 3：根据索引结果给出安装命令或未收录提示。查询对象：${query}`,
  });
  yield sseEvent({ type: 'tool_call', name: 'formula_check', arguments: JSON.stringify({ query }) });
  yield sseEvent({
    type: 'tool_result',
    name: 'formula_check',
    partial: true,
    content: JSON.stringify({
      ok: true,
      partial: true,
      query,
      source: 'pending',
      exact: null,
      candidates: [],
      checked_at: new Date().toISOString(),
    }),
  });

  if (options.signal?.aborted) return;

  const result = await checkHomebrewFormulaIndex(query, {
    env: {},
    sandbox: options.sandbox,
    signal: options.signal,
  });

  yield sseEvent({
    type: 'tool_result',
    name: 'formula_check',
    content: JSON.stringify(result),
  });

  yield sseEvent({
    type: 'ai_response',
    content: summarizeFormulaCheck(result),
  });
}

function summarizeFormulaCheck(result: Awaited<ReturnType<typeof checkHomebrewFormulaIndex>>) {
  const best = result.exact ?? result.candidates[0];
  if (!best) {
    return `我查了 Homebrew JSON 索引，暂时没有找到与 \`${result.query}\` 明确匹配的 formula 或 cask。可以换一个更接近软件官网名称的关键词再试。`;
  }

  const lines = [
    `我查了 Homebrew JSON 索引，最匹配的是 **${best.token}**（${best.type === 'cask' ? 'Cask 图形应用' : 'Formula 命令行/库'}）。`,
    '',
    best.desc ? `说明：${best.desc}` : '',
    best.version ? `当前版本：\`${best.version}\`` : '',
    `安装命令：`,
    '',
    '```bash',
    best.install_command,
    '```',
  ].filter(Boolean);

  const alternatives = result.candidates
    .filter((item) => item.token !== best.token)
    .slice(0, 3);

  if (alternatives.length) {
    lines.push('');
    lines.push('相近结果：');
    lines.push(alternatives.map((item) => `- \`${item.token}\` (${item.type})${item.desc ? `：${item.desc}` : ''}`).join('\n'));
  }

  return lines.join('\n');
}

// Translate SDK events to SSE stream payloads
function toSseEvent(event: unknown): Record<string, unknown> | null {
  const e = event as any;

  if (e.type === 'raw_model_stream_event') {
    if (e.data?.type === 'output_text_delta') {
      return { type: 'ai_response', content: e.data.delta as string };
    }
    if (e.data?.type === 'model') {
      const delta = e.data.event?.choices?.[0]?.delta;
      const reasoning = delta?.reasoning_content || delta?.reasoning;
      if (reasoning) {
        return { type: 'reasoning', content: reasoning };
      }
    }
  }

  if (e.type === 'run_item_stream_event' && e.name === 'tool_called') {
    const toolName = e.item?.name ?? e.item?.rawItem?.name;
    const args = e.item?.arguments ?? e.item?.rawItem?.arguments ?? e.item?.args ?? e.item?.rawItem?.args;
    if (toolName) {
      return { 
        type: 'tool_call', 
        name: toolName,
        arguments: typeof args === 'object' ? JSON.stringify(args) : args
      };
    }
  }

  if (e.type === 'run_item_stream_event' && e.name === 'tool_output') {
    const name = e.item?.name ?? e.item?.rawItem?.name ?? 'tool';
    const output = e.item?.output ?? e.item?.rawItem?.output;
    // 诊断结果 JSON 需要完整传递，不能截断
    const content = name === 'diagnose' && typeof output === 'string' ? output : truncateText(output, 1000);
    return { type: 'tool_result', name, content };
  }

  return null;
}

function extractUsage(value: unknown): Record<string, number> | null {
  const v = value as any;
  const usage = v?.usage ?? v?.data?.usage ?? v?.item?.rawItem?.usage;
  if (!usage) return null;

  const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? usage.inputTokens;
  const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? usage.outputTokens;
  const totalTokens = usage.total_tokens ?? usage.totalTokens;

  if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined) {
    return null;
  }

  return {
    input_tokens: typeof inputTokens === 'number' ? inputTokens : 0,
    output_tokens: typeof outputTokens === 'number' ? outputTokens : 0,
    total_tokens: typeof totalTokens === 'number' ? totalTokens : 0,
  };
}

function isDiagnosticIntent(message: string): boolean {
  return /运行.*(镜像|源).*检测|在线.*镜像.*检测|检测.*镜像源|哪个.*镜像.*(最快|最好|可用)|mirror.*(check|diagnose|fastest)/i.test(message);
}

function isModelIdentityIntent(message: string): boolean {
  const text = message.trim();
  return /^ai[？?]?$/i.test(text) || /你是(什么|哪个|哪种).*(模型|model|ai|助手|agent)|你.*(模型|ai|助手|agent)|当前.*模型|用的.*模型|model\s*(name|id)|which\s+model/i.test(text);
}

function isAnalysisIntent(message: string, extraContext?: string): boolean {
  const text = `${message}\n${extraContext ?? ''}`;
  return /command not found: brew|brew: command not found|找不到.*brew|brew.*找不到|PATH=|\.zshrc|\.bashrc|bash_profile|HOMEBREW_|insteadOf|insteadof|git config|http_proxy|https_proxy|all_proxy|SSL_ERROR_SYSCALL|Connection refused|Failed during|fatal:/i.test(text);
}

// Lightweight local classifier to shield off-topic queries without a second model call.
function isOffTopic(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const isObviousBrew = /brew|homebrew|linuxbrew|install\.sh|镜像|源|ustc|tuna|清华|中科大|aliyun|阿里云|tencent|腾讯云|opt\/homebrew|usr\/local|bashrc|zshrc|profile|path|command not found|ssl_error|brew doctor|brew update|brew install/i.test(lowerMessage);

  if (isObviousBrew) {
    return false;
  }

  const asksForGeneralCode = /写.*(程序|脚本|代码|网页|app|应用)|python|javascript|java|c\+\+|算法|爬虫|深拷贝|react|vue/i.test(lowerMessage);
  const asksGeneralKnowledge = /历史|做菜|天气|股票|翻译|作文|数学题|物理|化学/i.test(lowerMessage);
  return asksForGeneralCode || asksGeneralKnowledge;
}

interface PastedImage {
  name: string;
  type: string;
  size: number;
}

function normalizePastedImages(value: unknown): PastedImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 3)
    .map((item): PastedImage | null => {
      const raw = item as Record<string, unknown>;
      const type = typeof raw.type === 'string' ? raw.type : '';
      if (!type.startsWith('image/')) return null;
      return {
        name: typeof raw.name === 'string' ? raw.name.slice(0, 120) : '粘贴的截图',
        type,
        size: typeof raw.size === 'number' && Number.isFinite(raw.size) ? raw.size : 0,
      };
    })
    .filter((image): image is PastedImage => Boolean(image));
}

function formatSyncStatus(status: string) {
  const labels: Record<string, string> = {
    upstream: '官方源',
    synced: '同步正常',
    lagging: '延迟同步',
    failed: '异常',
    network_restricted: '沙箱网络受限',
  };
  return labels[status] || status;
}

function isBrewMissingIntent(message: string, extraContext?: string): boolean {
  const text = [message, extraContext].filter(Boolean).join('\n\n');
  return /command not found: brew|brew: command not found|zsh:\s*command not found:\s*brew|找不到.*brew|brew.*找不到|没有.*brew|brew.*not found|brew-not-in-PATH|command -v brew|\/opt\/homebrew\/bin\/brew|\/usr\/local\/bin\/brew/i.test(text);
}

function shouldExposeDiagnoseTool(message: string, extraContext?: string): boolean {
  const text = [message, extraContext].filter(Boolean).join('\n\n');
  if (isResetOfficialIntent(text)) return false;
  return isDiagnosticIntent(text) || needsSandboxTool(text);
}

function getAllowedTools(message: string, extraContext?: string) {
  const allowed: Array<'mirror_probe_deep' | 'formula_check'> = [];
  if (shouldExposeDiagnoseTool(message, extraContext)) allowed.push('mirror_probe_deep');
  if (isFormulaCheckIntent(message, extraContext)) allowed.push('formula_check');
  return allowed;
}

function isResetOfficialIntent(text: string): boolean {
  return /恢复官方|恢复成官方|切回官方|切换官方|重置官方|官方源|reset official|restore official/i.test(text);
}

function needsSandboxTool(message: string): boolean {
  return /镜像.*(速度|延迟|慢|快|超时|连接|可用|稳定|ping)|哪个.*(镜像|源).*(快|好|稳)|mirror.*(speed|latency|slow|fast|timeout|available|check|test)|检测.*(源|镜像|速度)|(源|镜像).*(检测|测速|测试)/i.test(message);
}

function isFormulaCheckIntent(message: string, extraContext?: string): boolean {
  const text = [message, extraContext].filter(Boolean).join('\n\n').trim();
  if (isResetOfficialIntent(text) || isDiagnosticIntent(text) || isAnalysisIntent(message, extraContext)) return false;
  if (extractKnownPackageAlias(text) && /安装|装|install|能不能|能否|可以|可不可以|有没有|查询|查|search|info/i.test(text)) return true;
  if (extractFormulaQueryCandidate(text)) return true;
  if (/Homebrew\s*(可以|能|是|有什么|干什么|做什么)|brew\s*(是什么|可以做什么|有什么用)/i.test(text)) return false;
  return /(brew|homebrew).*(安装|装|install|search|info|查|查询|有没有|能不能|支持)|怎么(安装|装).*(brew|homebrew)|能不能用\s*brew|用\s*brew\s*(装|安装)|brew\s+install\s+[\w@+._-]+|brew\s+(info|search)\s+[\w@+._-]+/i.test(text);
}

function extractFormulaQuery(message: string, extraContext?: string): string {
  const text = [message, extraContext].filter(Boolean).join(' ').trim();
  const alias = extractKnownPackageAlias(text);
  if (alias) return alias;

  const phrasedCandidate = extractFormulaQueryCandidate(text);
  if (phrasedCandidate) return phrasedCandidate;

  const commandMatch = text.match(/brew\s+(?:install\s+(?:--cask\s+)?|info\s+|search\s+)([\w@+._-]+)/i);
  if (commandMatch?.[1]) return commandMatch[1];

  const caskMatch = text.match(/--cask\s+([\w@+._-]+)/i);
  if (caskMatch?.[1]) return caskMatch[1];

  const latinTokens = text.match(/[\w@+._-]+/g) ?? [];
  const ignored = new Set(['brew', 'homebrew', 'install', 'info', 'search', 'cask', 'formula', 'formulae', 'can', 'use', 'with']);
  const candidate = latinTokens
    .map((token) => token.toLowerCase())
    .find((token) => token.length > 1 && !ignored.has(token));
  return candidate || text.replace(/[^\p{Letter}\p{Number}@+._-]+/gu, ' ').trim().split(/\s+/)[0] || text;
}

function extractFormulaQueryCandidate(text: string): string {
  const compact = text.replace(/[?？。！!，,；;：:]/g, ' ').replace(/\s+/g, ' ').trim();
  const patterns = [
    /(?:brew|homebrew)\s*(?:可以|可不可以|能不能|能否|能|是否|支持|有没有)?\s*(?:用\s*)?(?:brew\s*)?(?:安装|装|install)\s*([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})/i,
    /(?:brew|homebrew)\s*(?:里|上)?\s*(?:有|有没有|支持|查|查询|search|info)\s*([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})/i,
    /(?:^|\s)([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})\s+(?:可以|可不可以|能不能|能否|能|是否)?\s*(?:用\s*)?(?:brew|homebrew)\s*(?:安装|装|install)?/i,
    /(?:怎么|如何)\s*(?:用\s*)?(?:brew|homebrew)\s*(?:安装|装|install)\s*([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})/i,
    /(?:怎么|如何|怎样|怎麼)\s*(?:安装|装|install)\s*([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})/i,
    /(?:可以|可不可以|能不能|能否|能|是否)\s*(?:用来|拿来|通过)?\s*(?:安装|装|install)\s*([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})/i,
    /(?:^|\s)([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})\s*(?:可以|可不可以|能不能|能否|能|是否)\s*(?:安装|装|install)/i,
  ];

  for (const pattern of patterns) {
    const match = compact.match(pattern);
    const candidate = match?.[1] ? normalizeFormulaPhrase(match[1]) : '';
    if (candidate) return candidate;
  }

  return '';
}

function normalizeFormulaPhrase(value: string): string {
  const ignored = new Set(['brew', 'homebrew', 'install', 'info', 'search', 'cask', 'formula', 'formulae', 'can', 'use', 'with']);
  const tokens = (value.match(/[a-z0-9@+._-]+/gi) ?? [])
    .map((token) => token.toLowerCase())
    .filter((token) => token.length > 1 && !ignored.has(token));
  return tokens.join('-');
}

function extractKnownPackageAlias(text: string) {
  const aliases: Array<[RegExp, string]> = [
    [/\b(vs\s*code|vscode|visual\s*studio\s*code)\b/i, 'visual-studio-code'],
    [/\b(google\s*chrome|chrome)\b|谷歌浏览器/i, 'google-chrome'],
    [/\b(wechat|weixin)\b|微信/i, 'wechat'],
    [/\bqq\b|腾讯qq/i, 'qq'],
    [/\b(nodejs|node\.js)\b/i, 'node'],
    [/\bpython3\b/i, 'python'],
    [/\bdocker\s*desktop\b/i, 'docker-desktop'],
  ];
  return aliases.find(([pattern]) => pattern.test(text))?.[1] ?? '';
}

export const __formulaQueryTestHooks = {
  isFormulaCheckIntent,
  extractFormulaQuery,
};

function needsThinking(message: string, extraContext?: string): boolean {
  if (extraContext && extraContext.trim().length > 50) return true;
  if (/error|failed|fatal|crash|cannot|unable|refused|timeout|ssl_error|Traceback|exit code|segfault/i.test(message)) return true;
  if (/为什么|怎么回事|原因|排查|诊断|失败了|不生效|没有效果|还是不行|依然|一直|总是/i.test(message)) return true;
  if (/^(如何|怎么|怎样|怎麼|如何才能|能不能|可以|可否|是否可以|help me|how (to|do|can)|what is|what are)/i.test(message.trim())) return false;
  return true;
}

function getTraceSummary(message: string, extraContext: string, hasTools: boolean) {
  const text = [message, extraContext].filter(Boolean).join('\n\n');
  if (isResetOfficialIntent(text)) {
    return '步骤 1：识别为“恢复官方源”请求；步骤 2：跳过在线测速工具；步骤 3：基于 Homebrew 官方仓库地址生成恢复命令。';
  }
  if (!hasTools && !needsThinking(message, extraContext)) {
    return '步骤 1：识别为常规 Homebrew 指引问题；步骤 2：无需调用在线检测工具；步骤 3：直接生成可执行建议。';
  }
  return '';
}

function buildBrewMissingReply(text: string, pastedImageCount: number) {
  const evidence = readBrewEvidence(text);

  if (evidence.brewWorks) {
    const facts = [
      evidence.version ? `- 已看到 \`${evidence.version}\`` : '',
      evidence.brewPath ? `- \`command -v brew\` 指向 \`${evidence.brewPath}\`` : '',
      evidence.pathHasBrewBin ? `- \`PATH\` 里已经包含 \`${evidence.expectedBin}\`` : '',
    ].filter(Boolean);

    return [
      '当前这个终端里的 `brew` 已经是正常可用状态，不需要继续修 `.zshrc`，也不要重复追加 PATH。',
      '',
      facts.length ? facts.join('\n') : '我已经看到 `brew` 可以返回版本或路径信息。',
      '',
      '如果你仍然在另一个窗口、IDE、脚本任务里看到 `command not found: brew`，请只在那个出问题的环境里执行下面三行，把输出贴回来：',
      '',
      '```zsh',
      'command -v brew || echo "brew-not-in-PATH"',
      'echo "$PATH"',
      'echo "$SHELL"',
      '```',
    ].join('\n');
  }

  if (evidence.brewNotInPath && evidence.installedPath) {
    const prefix = evidence.installedPath === '/opt/homebrew/bin/brew' ? '/opt/homebrew' : '/usr/local';
    return [
      `Homebrew 可执行文件存在：\`${evidence.installedPath}\`，但当前 shell 还没有把它加入 PATH。`,
      '',
      '先做一次临时验证，不要先写配置文件：',
      '',
      '```zsh',
      `eval "$(${prefix}/bin/brew shellenv)"`,
      'brew --version',
      'command -v brew',
      'echo "$PATH"',
      '```',
      '',
      '如果这四行输出正常，再告诉我“临时验证成功”，我再给你对应的持久化命令。',
    ].join('\n');
  }

  if (evidence.brewNotInPath && !evidence.installedPath && evidence.hasLsCheck) {
    return [
      '这次输出里没有找到 Homebrew 的可执行文件，可能是还没安装成功，或者安装在了非默认目录。',
      '',
      '请把 Homebrew 安装日志最后 30 行贴回来，或者直接重新运行安装命令。',
    ].join('\n');
  }

  if (pastedImageCount > 0 && !hasTerminalText(text)) {
    return [
      '我收到你粘贴的截图了，但判断 PATH 和具体路径时最好有可复制文本，避免看错字符。',
      '',
      '先不要改 `.zshrc`。请在终端复制运行下面这组只读命令，然后把完整输出粘贴回来：',
      '',
      brewMissingDiagnosticCommandBlock(),
    ].join('\n');
  }

  return [
    '先不要改 `.zshrc`。这个问题要先确认是 Homebrew 没装、装了但不在 PATH，还是只在某个终端环境里失效。',
    '',
    '请复制运行下面这组只读命令，然后把完整输出粘贴回来：',
    '',
    brewMissingDiagnosticCommandBlock(),
  ].join('\n');
}

function readBrewEvidence(text: string) {
  const version = text.match(/Homebrew\s+[^\s]+/)?.[0] ?? '';
  const brewPath = text.match(/(?:^|\s)(\/opt\/homebrew\/bin\/brew|\/usr\/local\/bin\/brew)(?=\s|$)/m)?.[1] ?? '';
  const pathHasOpt = text.includes('/opt/homebrew/bin');
  const pathHasUsr = text.includes('/usr/local/bin');
  const installedPath = findInstalledBrewPath(text);
  const expectedBin = brewPath
    ? brewPath.replace(/\/brew$/, '')
    : installedPath
      ? installedPath.replace(/\/brew$/, '')
      : pathHasOpt
        ? '/opt/homebrew/bin'
        : pathHasUsr
          ? '/usr/local/bin'
          : '';
  const pathHasBrewBin = expectedBin ? text.includes(expectedBin) : false;

  return {
    version,
    brewPath,
    installedPath,
    expectedBin,
    pathHasBrewBin,
    brewWorks: Boolean(version || (brewPath && pathHasBrewBin)),
    brewNotInPath: /brew-not-in-PATH|command not found:\s*brew|brew:\s*command not found/i.test(text),
    hasLsCheck: /ls\s+-l\s+\/opt\/homebrew\/bin\/brew|\/usr\/local\/bin\/brew/.test(text),
  };
}

function findInstalledBrewPath(text: string) {
  for (const candidate of ['/opt/homebrew/bin/brew', '/usr/local/bin/brew']) {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^-|\\s-)\\S*\\s+.*${escaped}`, 'm').test(text)) return candidate;
    if (new RegExp(`${escaped}(?=\\s|$)`, 'm').test(text) && !/brew-not-in-PATH/i.test(text)) return candidate;
  }
  return '';
}

function hasTerminalText(text: string) {
  return /Homebrew\s+|command -v brew|brew-not-in-PATH|echo "\$PATH"|SHELL=|\/opt\/homebrew|\/usr\/local/.test(text);
}

function brewMissingDiagnosticCommandBlock() {
  return [
    '```zsh',
    'echo "SHELL=$SHELL"',
    'uname -m',
    'command -v brew || echo "brew-not-in-PATH"',
    'brew --version 2>&1',
    'printf "%s\\n" "$PATH"',
    'ls -l /opt/homebrew/bin/brew /usr/local/bin/brew 2>/dev/null',
    '```',
  ].join('\n');
}

function* runBrewMissingTroubleshooting(options: {
  message: string;
  extraContext?: string;
  pastedImageCount?: number;
  signal?: AbortSignal;
}) {
  if (options.signal?.aborted) return;

  const text = [options.message, options.extraContext].filter(Boolean).join('\n\n');
  yield sseEvent({
    type: 'ai_response',
    content: buildBrewMissingReply(text, options.pastedImageCount ?? 0),
  });
}

function limitSessionHistory(historyItems: any[], newItems: any[]) {
  const MAX_HISTORY_ITEMS = 8;
  if (historyItems.length <= MAX_HISTORY_ITEMS) {
    return [...historyItems, ...newItems];
  }
  return [...historyItems.slice(-MAX_HISTORY_ITEMS), ...newItems];
}
