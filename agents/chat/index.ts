import { Agent, run, type Session } from '@openai/agents';
import { createGatewayModel, getAgentEnv } from '../_model';
import { createLogger, createSSEResponse, jsonResponse, sseEvent, truncateText } from '../_shared';
import { buildSystemPrompt, buildUserInput } from './_prompt';
import {
  analyzeHomebrewText,
  createHomebrewTools,
  diagnoseHomebrewMirrors,
  generateFixScript,
  inferFixOptions,
} from './_tools';

const logger = createLogger('chat');

export async function onRequest(context: any) {
  const body = context.request?.body ?? {};
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const extraContext = typeof body.context === 'string' ? body.context : undefined;
  const signal = context.request?.signal as AbortSignal | undefined;
  const conversationId = context.conversation_id as string | undefined;

  if (!message) {
    return jsonResponse({ error: "'message' is required" }, 400);
  }

  if (!conversationId) {
    return jsonResponse({ error: "Missing required 'makers-conversation-id' header" }, 400);
  }

  return createSSEResponse(
    async function* () {
      try {
        if (isDiagnosticIntent(message)) {
          yield* runDirectDiagnostics({ sandbox: context.sandbox, signal });
          return;
        }

        if (isAnalysisIntent(message, extraContext)) {
          yield* runDirectAnalysisAndFix({ message, extraContext, signal });
          return;
        }

        if (isOffTopic(message)) {
          yield sseEvent({
            type: 'thinking',
            content: '已识别为非 Homebrew 相关问题。',
          });
          yield sseEvent({
            type: 'ai_response',
            content: '我是 homebrew-cn Agent，主要处理 Homebrew 安装、镜像源、PATH、Git 配置和安装报错排查。这个问题超出了我的专业范围，因此不能继续展开。你可以把 Homebrew 安装日志、终端报错或 shell 配置贴给我，我会直接帮你定位问题。',
          });
          return;
        }

        yield sseEvent({
          type: 'thinking',
          content: '正在分析 Homebrew 场景并准备可用工具。',
        });

        const env = getAgentEnv(context.env);
        const systemPrompt = buildSystemPrompt(message);
        const userInput = buildUserInput(message, extraContext);
        
        const tools = createHomebrewTools({
          env: context.env ?? {},
          signal,
          sandbox: context.sandbox,
        });

        const agent = new Agent({
          name: 'homebrew-cn Agent',
          instructions: systemPrompt,
          model: createGatewayModel(env),
          modelSettings: {
            parallelToolCalls: true,
            providerData: {
              chat_template_kwargs: { enable_thinking: false },
            },
          },
          tools,
        });

        // 3. Retrieve or create conversation session
        const session: Session | undefined =
          context.store && conversationId ? context.store.openaiSession(conversationId) : undefined;

        // 4. Run Agent Loop and stream events
        const result = await run(agent, userInput, {
          stream: true,
          signal,
          session,
          maxTurns: 5,
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

async function* runDirectDiagnostics(options: { sandbox?: any; signal?: AbortSignal }) {
  yield sseEvent({ type: 'tool_call', name: 'diagnose', arguments: '{}' });

  const pending: string[] = [];
  let wake: (() => void) | null = null;
  let finished = false;
  let finalResult: Awaited<ReturnType<typeof diagnoseHomebrewMirrors>> | null = null;

  const notify = () => {
    wake?.();
    wake = null;
  };

  const diagnosticsPromise = diagnoseHomebrewMirrors({
    env: {},
    sandbox: options.sandbox,
    signal: options.signal,
    async onProgress(_, report) {
      pending.push(sseEvent({
        type: 'tool_result',
        name: 'diagnose',
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
      name: 'diagnose',
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

  const lines = [
    `在线镜像源诊断完成，用时 ${(result.duration_ms / 1000).toFixed(1)} 秒。`,
    '',
  ];

  if (best) {
    lines.push(`当前建议优先选择 **${best.name}**，延迟约 **${best.latency_ms} ms**，同步状态为 **${formatSyncStatus(best.sync_status)}**。`);
  } else {
    lines.push('本次没有检测到可直接访问的镜像源，建议检查本地网络、代理或稍后重试。');
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

function formatSyncStatus(status: string) {
  const labels: Record<string, string> = {
    upstream: '官方源',
    synced: '同步正常',
    lagging: '延迟同步',
    failed: '异常',
  };
  return labels[status] ?? status;
}

// Translate SDK events to SSE stream payloads
function toSseEvent(event: unknown): Record<string, unknown> | null {
  const e = event as any;

  if (e.type === 'raw_model_stream_event' && e.data?.type === 'output_text_delta') {
    return { type: 'ai_response', content: e.data.delta as string };
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
