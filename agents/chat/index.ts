import { Agent, run, type Session } from '@openai/agents';
import {
  createGatewayClient,
  createGatewayModel,
  getAgentEnv,
  gatewayThinkingSettings,
  resolveGatewayModelName,
  type AgentEnv,
} from '../_model';
import { createLogger, createSSEResponse, jsonResponse, sseEvent, truncateText } from '../_shared';
import { buildSystemPrompt, buildUserInput, shouldCheckDesktopConfigurationFirst, diagnosticRequestText, hasExplicitMirrorProbeRequest } from './_prompt';
import { HOMEBREW_CN_INSTALL_COMMAND, HOMEBREW_CN_CONFIGURE_COMMAND, HOMEBREW_CN_RESTORE_OFFICIAL_REPLY, HOMEBREW_CN_DIAGNOSTIC_RULES, HOMEBREW_CN_CONVERSATION_COPY, buildIntentClassificationPrompt } from './_skill';
import {
  analyzeHomebrewText,
  checkHomebrewFormulaIndex,
  createHomebrewTools,
  diagnoseHomebrewMirrors,
  generateFixScript,
  inferFixOptions,
  hasHomebrewDiagnosticReport,
  hasLocalEnvironmentEvidence,
  combineConfigurationReports,
  redactDiagnosticText,
  probeHomebrewMirrorsDeep,
} from './_tools';

const logger = createLogger('chat');
const AGENT_NAME = 'homebrew-cn Agent';
const AGENT_ROUTE_PATH = '/chat';

export async function onRequestPost(context: any) {
  const body = context.request?.body ?? {};
  const message = typeof body.message === 'string' ? redactDiagnosticText(body.message.trim()) : '';
  const extraContext = typeof body.context === 'string' ? redactDiagnosticText(body.context) : undefined;
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

  const observability = createObservabilityContext(context, conversationId, {
    hasContext: Boolean(extraContext?.trim()),
    imageCount: pastedImages.length,
    messageLength: message.length,
  });

  const env = getAgentEnv(context.env);
  const usageTotals = createUsageAccumulator();
  const sessionPromise: Promise<Session | undefined> = (
    context.store && conversationId
      ? Promise.resolve(context.store.openaiSession(conversationId))
      : Promise.resolve(undefined)
  );

  return createSSEResponse(
    async function* () {
      try {
        const combinedContext = extraContext ?? '';
        yield sseEvent({ type: 'thinking', content: '正在阅读你的问题…' });

        const session = await sessionPromise;
        const history = session ? await sessionItemsToMessages(session) : [];
        const intent = await withTrace(observability, 'classify_intent', {
          'agent.step': 'intent',
          'input.length': message.length,
          'input.has_context': Boolean(combinedContext.trim()),
        }, async (span) => {
          const result = applyConversationIntentGuard(applyDesktopIntentGuard(await classifyIntent(message, combinedContext, session, env, observability, signal, history), message, combinedContext), message, combinedContext, history);
          usageTotals.add(result.usage);
          setTraceAttributes(span, {
            'intent.route': result.route,
            'intent.homebrew_related': result.is_homebrew_related,
            'intent.needs_sandbox': result.needs_sandbox,
          });
          return result;
        });

        setTraceAttributes(observability.tracer, {
          'agent.intent_route': intent.route,
          'agent.homebrew_related': intent.is_homebrew_related,
          'agent.needs_sandbox': intent.needs_sandbox,
        });

        yield sseEvent({ type: 'tool_call', name: 'intent_classify', arguments: JSON.stringify({ message }) });
        yield sseEvent({ type: 'tool_result', name: 'intent_classify', content: JSON.stringify(publicIntent(intent)) });

        const direct = (events: AsyncIterable<string> | Iterable<string>) => withUsageFooter(persistDirectExchange(events, {
          session, signal, userInput: buildUserInput(message, combinedContext),
        }), usageTotals);

        const casualReply = getCasualReplyKind(message, combinedContext);
        if (intent.route === 'conversation' && casualReply) {
          yield* direct([sseEvent({ type: 'ai_response', content: HOMEBREW_CN_CONVERSATION_COPY.replies[casualReply] })]);
          return;
        }

        if (!intent.is_homebrew_related) {
          yield* withTraceStream(observability, 'direct_reject', {
            'agent.step': 'reject',
            'intent.route': intent.route,
          }, async function* () {
            yield* direct([sseEvent({
              type: 'ai_response',
              content: '我是 homebrew-cn Agent，主要处理 Homebrew 安装、镜像源、软件包安装查询和本地环境排查。这个问题不属于 Homebrew 或本助手能力范围，因此我不能继续回答。你可以把 Homebrew 安装日志、终端报错、镜像源问题或软件包安装问题发给我。',
            })]);
          });
          return;
        }

        if (intent.route === 'model_identity') {
          yield* withTraceStream(observability, 'direct_model_identity', {
            'agent.step': 'model_identity',
            'intent.route': intent.route,
          }, () => direct(runDirectModelIdentity()));
          return;
        }

        if (intent.route === 'restore_official') {
          yield* withTraceStream(observability, 'direct_restore_official', {
            'agent.step': 'restore_official',
            'intent.route': intent.route,
          }, () => direct(runDirectRestoreOfficial()));
          return;
        }

        if (intent.route === 'mirror_probe_deep') {
          yield* withTraceStream(observability, 'direct_mirror_probe_deep', {
            'agent.step': 'mirror_probe_deep',
            'intent.route': intent.route,
            'openinference.span.kind': 'TOOL',
            'tool.name': 'mirror_probe_deep',
            'tool.sandbox_available': Boolean(context.sandbox),
            'input.value': '{}',
            'input.mime_type': 'application/json',
          }, (span) => direct(runDirectDiagnostics({ sandbox: context.sandbox, signal, traceSpan: span })));
          return;
        }

        if (intent.route === 'formula_check') {
          yield* withTraceStream(observability, 'direct_formula_check', {
            'agent.step': 'formula_check',
            'intent.route': intent.route,
            'openinference.span.kind': 'TOOL',
            'tool.name': 'formula_check',
          }, (span) => direct(runDirectFormulaCheck({ message, extraContext: combinedContext, signal, traceSpan: span })));
          return;
        }

        if (intent.route === 'brew_missing') {
          yield* withTraceStream(observability, 'direct_brew_missing', {
            'agent.step': 'brew_missing',
            'intent.route': intent.route,
            'input.image_count': pastedImages.length,
          }, () => direct(runBrewMissingTroubleshooting({
            message,
            extraContext: combinedContext,
            pastedImageCount: pastedImages.length,
            signal,
          })));
          return;
        }

        if (intent.route === 'analysis_fix') {
          yield* withTraceStream(observability, 'direct_analysis_fix', {
            'agent.step': 'analysis_fix',
            'intent.route': intent.route,
            'openinference.span.kind': 'TOOL',
            'tool.name': 'analyze',
          }, (span) => withUsageFooter(runDirectAnalysisAndFix({ message, extraContext: combinedContext, signal, traceSpan: span, session,
            previousReport: isNewTopic(message) ? undefined : findPreviousReport(history),
          }), usageTotals));
          return;
        }

        const systemPrompt = buildSystemPrompt(message);
        const userInput = buildUserInput(message, combinedContext);

        const allowedTools = intent.route === 'conversation' ? [] : getAllowedTools(message, combinedContext);

        const enableThinking =
          context.env?.AI_GATEWAY_ENABLE_THINKING !== 'false' &&
          intent.route !== 'conversation' && needsThinking(message, combinedContext);

        yield sseEvent({ type: 'thinking', content: '正在分析你的问题…' });

        const tools = createHomebrewTools({
          env: context.env ?? {},
          signal,
          allowedTools,
          sandbox: intent.needs_sandbox ? context.sandbox : undefined,
        });

        const agent = new Agent({
          name: AGENT_NAME,
          instructions: systemPrompt,
          model: createGatewayModel(env),
          modelSettings: {
            ...(tools.length ? { parallelToolCalls: true } : {}),
            providerData: gatewayThinkingSettings(env, enableThinking),
          },
          tools,
        });

        const runSpan = startTraceSpan(observability, 'openai_agents_run', {
          'agent.step': 'agent_run',
          'intent.route': intent.route,
          'agent.max_turns': 5,
          'agent.tools.allowed': allowedTools.join(','),
          'llm.model_name': resolveGatewayModelName(env),
        });

        let usage: any = null;
        let streamEventCount = 0;
        try {
          const result = await run(agent, userInput, {
            stream: true,
            signal,
            session,
            maxTurns: 5,
            sessionInputCallback: limitSessionHistory,
          });

          for await (const event of result.toStream()) {
            if (signal?.aborted) break;
            streamEventCount += 1;
            const mapped = toSseEvent(event);
            if (mapped) {
              yield sseEvent(mapped);
            }
            usage = extractUsage(event) ?? usage;
          }

          usage = extractUsage(result) ?? usage;
        } catch (error) {
          recordTraceError(runSpan, error);
          throw error;
        } finally {
          setTraceAttributes(runSpan, {
            'agent.stream_event_count': streamEventCount,
            'agent.aborted': Boolean(signal?.aborted),
            ...usageAttributes(usage),
          });
          endTraceSpan(runSpan);
        }

        usageTotals.add(usage);
        yield* usageEventStream(usageTotals.snapshot());

      } catch (error) {
        const err = error as Error;
        if (err.name === 'AbortError' || signal?.aborted || err.message?.includes('terminated')) {
          setTraceAttributes(observability.tracer, { 'agent.aborted': true });
          return;
        }
        recordTraceError(observability.tracer, error);
        logger.error(err);
        yield sseEvent({ type: 'error_message', content: err.message });
      } finally {
        setTraceAttributes(observability.tracer, {
          'agent.duration_ms': Date.now() - observability.startedAt,
          'agent.aborted': Boolean(signal?.aborted),
        });
      }
    },
    signal,
  );
}

type TraceAttributeValue = string | number | boolean;
type TraceAttributes = Record<string, TraceAttributeValue>;
type UsagePayload = Record<string, number>;

interface TraceSpan {
  setAttributes?: (attributes: TraceAttributes) => void;
  end?: () => void;
}

interface AgentTracer extends TraceSpan {
  span?: <T>(
    name: string,
    fn: (span?: TraceSpan) => T | Promise<T>,
    attributes?: TraceAttributes,
  ) => Promise<T>;
  startSpan?: (name: string, attributes?: TraceAttributes) => TraceSpan;
}

interface ObservabilityContext {
  tracer?: AgentTracer;
  baseAttributes: TraceAttributes;
  startedAt: number;
}

function createObservabilityContext(
  context: any,
  conversationId: string,
  request: { hasContext: boolean; imageCount: number; messageLength: number },
): ObservabilityContext {
  const tracer = context.tracer as AgentTracer | undefined;
  const baseAttributes: TraceAttributes = {
    'agent.name': AGENT_NAME,
    'agent.framework': 'openai-agents-sdk',
    'agent.conversation_id': conversationId,
    'agent.route_path': AGENT_ROUTE_PATH,
  };

  setTraceAttributes(tracer, {
    ...baseAttributes,
    'agent.request.message_length': request.messageLength,
    'agent.request.has_context': request.hasContext,
    'agent.request.image_count': request.imageCount,
  });

  return {
    tracer,
    baseAttributes,
    startedAt: Date.now(),
  };
}

function traceAttributes(
  observability: ObservabilityContext,
  attributes?: TraceAttributes,
): TraceAttributes {
  return {
    ...observability.baseAttributes,
    ...(attributes ?? {}),
  };
}

async function withTrace<T>(
  observability: ObservabilityContext,
  name: string,
  attributes: TraceAttributes,
  fn: (span?: TraceSpan) => Promise<T>,
): Promise<T> {
  if (!observability.tracer?.span) {
    return fn(undefined);
  }

  return observability.tracer.span(name, fn, traceAttributes(observability, attributes));
}

function startTraceSpan(
  observability: ObservabilityContext,
  name: string,
  attributes: TraceAttributes,
): TraceSpan | undefined {
  try {
    return observability.tracer?.startSpan?.(name, traceAttributes(observability, attributes));
  } catch {
    return undefined;
  }
}

async function* withTraceStream(
  observability: ObservabilityContext,
  name: string,
  attributes: TraceAttributes,
  producer: (span?: TraceSpan) => AsyncIterable<string> | Iterable<string>,
): AsyncGenerator<string> {
  const span = startTraceSpan(observability, name, attributes);
  const startedAt = Date.now();
  let eventCount = 0;

  try {
    for await (const event of producer(span)) {
      eventCount += 1;
      yield event;
    }
    setTraceAttributes(span, {
      'agent.stream_event_count': eventCount,
      'agent.duration_ms': Date.now() - startedAt,
    });
  } catch (error) {
    recordTraceError(span, error);
    throw error;
  } finally {
    endTraceSpan(span);
  }
}

function setTraceAttributes(target: TraceSpan | undefined, attributes: TraceAttributes): void {
  try {
    target?.setAttributes?.(attributes);
  } catch {
    // Observability must never break the agent response path.
  }
}

function endTraceSpan(span: TraceSpan | undefined): void {
  try {
    span?.end?.();
  } catch {
    // Observability must never break the agent response path.
  }
}

function recordTraceError(target: TraceSpan | undefined, error: unknown): void {
  const err = error as Error;
  setTraceAttributes(target, {
    'error': true,
    'error.name': err.name || 'Error',
    'error.message': truncateText(err.message || String(error), 500),
  });
}

function usageAttributes(usage: any): TraceAttributes {
  if (!usage) return {};
  return {
    'llm.usage.input_tokens': usage.input_tokens ?? usage.prompt_tokens ?? 0,
    'llm.usage.output_tokens': usage.output_tokens ?? usage.completion_tokens ?? 0,
    'llm.usage.total_tokens': usage.total_tokens ?? 0,
  };
}

function llmTraceUsageAttributes(usage: UsagePayload | null): TraceAttributes {
  if (!usage) return {};

  const attributes: TraceAttributes = {
    'llm.token_count.prompt': usage.input_tokens ?? 0,
    'llm.token_count.completion': usage.output_tokens ?? 0,
    'llm.token_count.total': usage.total_tokens ?? 0,
    'gen_ai.usage.input_tokens': usage.input_tokens ?? 0,
    'gen_ai.usage.output_tokens': usage.output_tokens ?? 0,
    'gen_ai.usage.total_tokens': usage.total_tokens ?? 0,
  };

  if (typeof usage.reasoning_tokens === 'number') {
    attributes['llm.token_count.completion_details.reasoning'] = usage.reasoning_tokens;
  }
  if (typeof usage.cached_tokens === 'number') {
    attributes['llm.token_count.prompt_details.cache_read'] = usage.cached_tokens;
  }

  return attributes;
}

function createUsageAccumulator() {
  const totals: UsagePayload = {
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
  };
  let hasUsage = false;

  return {
    add(usage: UsagePayload | null | undefined) {
      if (!usage) return;
      hasUsage = true;
      totals.input_tokens += usage.input_tokens ?? 0;
      totals.output_tokens += usage.output_tokens ?? 0;
      totals.total_tokens += usage.total_tokens ?? ((usage.input_tokens ?? 0) + (usage.output_tokens ?? 0));
      if (typeof usage.reasoning_tokens === 'number') {
        totals.reasoning_tokens = (totals.reasoning_tokens ?? 0) + usage.reasoning_tokens;
      }
      if (typeof usage.cached_tokens === 'number') {
        totals.cached_tokens = (totals.cached_tokens ?? 0) + usage.cached_tokens;
      }
    },
    snapshot(): UsagePayload | null {
      return hasUsage ? { ...totals } : null;
    },
  };
}

async function* withUsageFooter(
  events: AsyncIterable<string> | Iterable<string>,
  usageTotals: ReturnType<typeof createUsageAccumulator>,
): AsyncGenerator<string> {
  for await (const event of events) {
    yield event;
  }
  yield* usageEventStream(usageTotals.snapshot());
}

function* usageEventStream(usage: UsagePayload | null): Generator<string> {
  if (usage) {
    yield sseEvent({ type: 'usage', ...usage });
  }
}

type IntentRoute =
  | 'model_identity'
  | 'conversation'
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
  usage?: Record<string, number> | null;
}

type ConversationMessage = { role: 'user' | 'assistant' | 'system'; content: string };
type CasualReplyKind = keyof typeof HOMEBREW_CN_CONVERSATION_COPY.replies;

function getCasualReplyKind(message: string, extraContext?: string): CasualReplyKind | null {
  if (extraContext?.trim()) return null;
  const compact = message.trim().toLowerCase().replace(/[\s，。！？!?.,~～]/g, '');
  if (/^(你好(?:呀|啊)?|您好|嗨|哈喽|hello|hi|hey)$/.test(compact)) return 'greeting';
  if (/^(谢谢(?:你|啦|了)?|感谢|多谢|thanks|thankyou|thx)$/.test(compact)) return 'thanks';
  if (/^(好了|解决了|可以了|搞定了|修好了|fixed|done)(?:谢谢|thanks)?$/.test(compact)) return 'resolved';
  if (/^(明白了|懂了|好的|好|ok|okay|understood)(?:谢谢|thanks)?$/.test(compact)) return 'acknowledgement';
  if (/^(你能做什么|你能帮我什么|你有什么功能|怎么使用这个助手|whatcanyoudo)$/.test(compact)) return 'capabilities';
  return null;
}

function isNewTopic(message: string): boolean {
  return /换个问题|换一个问题|新问题|换个话题|另外(?:一个|问)|不(?:诊断|排查)了|另一台|新电脑|别的机器|different (?:topic|question)|new question/i.test(diagnosticRequestText(message));
}

function isContextualFollowup(message: string): boolean {
  return /^(?:那|所以|然后)|刚才|上面|这个|这些|那个|它|第[一二三四五六七八九十\d]+(?:条|个)|下一步|没看懂|简单(?:点|一点)|解释简单|临时验证成功|改好了|处理好了|还是(?:失败|不行|很慢)|可以先不|还能.{0,8}(?:装|安装)|(?:先不处理|需要处理|影响安装|带我做)/i.test(message);
}

function applyConversationIntentGuard(intent: IntentClassification, message: string, extraContext: string | undefined, history: ConversationMessage[]): IntentClassification {
  const evidence = hasLocalEnvironmentEvidence([message, extraContext].filter(Boolean).join('\n'));
  const casual = getCasualReplyKind(message, extraContext);
  const explicitProbe = hasExplicitMirrorProbeRequest(diagnosticRequestText(message));
  const packageRequest = diagnosticRequestText(message);
  const packageTarget = extractKnownPackageAlias(packageRequest) || extractFormulaQueryCandidate(packageRequest)
    || packageRequest.match(/\bbrew\s+(?:install|info|search)\s+(?:--cask\s+)?([a-z0-9@+._-]+)/i)?.[1]
    || packageRequest.match(/(?:安装|查询|搜索|查一下|装)\s*([a-z0-9@+._-]+)/i)?.[1] || '';
  const explicitPackage = intent.route === 'formula_check' && Boolean(packageTarget) && !/^(?:it|that|this|them)$/i.test(packageTarget);
  const contextFollowup = !evidence && !isNewTopic(message) && history.some(item => item.role === 'assistant') && isContextualFollowup(message);
  if (casual || (!evidence && intent.route === 'analysis_fix')
    || (contextFollowup && !explicitProbe && !explicitPackage && !['restore_official', 'model_identity'].includes(intent.route))) {
    return { ...intent, route: 'conversation', is_homebrew_related: true, needs_sandbox: false,
      reason: casual ? '简短日常回应，无需检测。' : '沿用对话中的信息回答追问，不把追问当作新日志。' };
  }
  // A fresh report always gets its evidence route, even if the classifier
  // carries forward an earlier conversational acknowledgement.
  if (intent.route === 'conversation' && hasHomebrewDiagnosticReport([message, extraContext].filter(Boolean).join('\n'))) {
    return applyDesktopIntentGuard({ ...intent, route: 'analysis_fix' }, message, extraContext);
  }
  return intent;
}

function findPreviousReport(history: ConversationMessage[]): string | undefined {
  for (const item of [...history].reverse()) {
    if (item.role !== 'user') continue;
    if (hasHomebrewDiagnosticReport(item.content)) return item.content;
    if (isNewTopic(item.content)) return undefined;
    if (getCasualReplyKind(item.content) === 'resolved') return undefined;
    if (!getCasualReplyKind(item.content) && !isContextualFollowup(item.content)) return undefined;
  }
  return undefined;
}

async function* persistDirectExchange(events: AsyncIterable<string> | Iterable<string>, options: { session?: Session; signal?: AbortSignal; userInput: string }) {
  let reply = '';
  let failed = false;
  for await (const chunk of events) {
    if (options.signal?.aborted) return;
    const event = safeParseJson(chunk.replace(/^data:\s*/, '').trim());
    if (event?.type === 'ai_response' && typeof event.content === 'string') reply += event.content;
    if (event?.type === 'error_message') failed = true;
    yield chunk;
  }
  if (!options.session || !reply.trim() || failed || options.signal?.aborted) return;
  try {
    await options.session.addItems([
      { type: 'message', role: 'user', content: redactDiagnosticText(options.userInput) },
      { role: 'assistant', type: 'message', status: 'completed', content: [{ type: 'output_text', text: redactDiagnosticText(reply) }] },
    ]);
  } catch (error) {
    logger.error('Failed to save completed exchange:', error);
  }
}

function publicIntent(intent: IntentClassification) {
  return {
    ok: intent.ok,
    is_homebrew_related: intent.is_homebrew_related,
    needs_sandbox: intent.needs_sandbox,
    route: intent.route,
    reason: intent.reason,
  };
}

function applyDesktopIntentGuard(intent: IntentClassification, message: string, extraContext?: string): IntentClassification {
  const request = diagnosticRequestText(message);
  const report = hasHomebrewDiagnosticReport([message, extraContext].filter(Boolean).join('\n'));
  if (report) {
    const explicitProbe = hasExplicitMirrorProbeRequest(request);
    const restoreRequest = request
      .replace(/(?:不要|不用|无需|别|不必)[^，。;\n]{0,12}(?:恢复|切回|还原|重置)[^，。;\n]{0,12}官方(?:源)?/g, '')
      .replace(/(?:do not|don't|no need to)\s+restore[^,.;\n]{0,20}(?:official|upstream)/gi, '');
    const explicitRestore = /(?:恢复|切回|还原|重置).{0,12}官方|restore.{0,20}(?:official|upstream)/i.test(restoreRequest);
    const explicitPackage = /\bbrew\s+(?:install|info|search)\s+\S+|(?:安装|查询).{0,20}(?:软件包|应用)|(?:软件包|应用).{0,20}(?:安装|查询)/i.test(request);
    if (explicitProbe || explicitRestore) return {
      ...intent, is_homebrew_related: true, route: explicitRestore ? 'restore_official' : 'mirror_probe_deep',
      needs_sandbox: !explicitRestore, reason: '按用户在报告之外明确提出的操作处理。',
    };
    if (/(?:找不到|不会|不知道).{0,20}(?:报告|页面|信息|终端)|(?:报告|页面|终端).{0,12}(?:在哪|怎么打开)/i.test(request)
      && /一步一步|教我|怎么|如何/i.test(request)) return {
      ...intent, is_homebrew_related: true, route: 'general_homebrew', needs_sandbox: false,
      reason: '用户需要获取信息的操作指引，先解释下一步，并保留已有报告。',
    };
    if (!explicitPackage) return {
      ...intent, is_homebrew_related: true, route: 'analysis_fix', needs_sandbox: false,
      reason: '分析用户提供的 Doctor 或配置报告；报告中的命令不是操作请求。',
    };
  }
  if (!report && /\bdoctor\b|诊断报告|配置对照|对照.{0,15}(?:终端|桌面)/i.test(request)
    && !hasExplicitMirrorProbeRequest(request) && ['mirror_probe_deep', 'analysis_fix'].includes(intent.route)) {
    return { ...intent, route: 'general_homebrew', needs_sandbox: false, reason: '先获取 Doctor 或两端配置报告，不执行云端探测。' };
  }
  if (shouldCheckDesktopConfigurationFirst(message, extraContext)
    && (intent.route === 'mirror_probe_deep' || intent.route === 'analysis_fix')) {
    return {
      ...intent,
      route: 'general_homebrew',
      needs_sandbox: false,
      reason: '桌面端与终端配置可能不同，先检查本机 brew.env 配置；未请求云端镜像探测。',
    };
  }
  return intent;
}

async function classifyIntent(
  message: string,
  extraContext: string | undefined,
  session: Session | undefined,
  env: AgentEnv,
  observability: ObservabilityContext,
  signal?: AbortSignal,
  history?: ConversationMessage[],
): Promise<IntentClassification> {
  if (getCasualReplyKind(message, extraContext)) return {
    ok: true, route: 'conversation', is_homebrew_related: true, needs_sandbox: false,
    reason: '日常短对话，无需调用分类模型或诊断工具。', usage: null,
  };
  try {
    // The runtime auto-instruments @openai/agents, but this classifier calls the
    // OpenAI-compatible client directly, so it needs an explicit LLM span.
    return await withTrace(observability, 'intent_classifier_llm', {
      'agent.step': 'intent_llm',
      'openinference.span.kind': 'LLM',
      'llm.model_name': resolveGatewayModelName(env),
      'llm.provider': 'openai-compatible',
      'llm.system': 'openai',
    }, (span) => classifyIntentWithLLM(message, extraContext, session, env, span, signal, history));
  } catch (error) {
    logger.error('Intent classification failed, falling back to general_homebrew:', error);
    return {
      ok: true,
      is_homebrew_related: true,
      needs_sandbox: false,
      route: 'general_homebrew',
      reason: '意图分类 LLM 调用失败，降级为通用 Homebrew 问答路径。',
      usage: null,
    };
  }
}

const CLASSIFICATION_PROMPT = buildIntentClassificationPrompt();

async function classifyIntentWithLLM(
  message: string,
  extraContext: string | undefined,
  session: Session | undefined,
  env: AgentEnv,
  traceSpan?: TraceSpan,
  signal?: AbortSignal,
  history?: ConversationMessage[],
): Promise<IntentClassification> {
  const client = createGatewayClient(env);
  const historyMessages = history ?? (session ? await sessionItemsToMessages(session) : []);

  const userContent = extraContext?.trim()
    ? `${message}\n\nUser-provided environment context:\n${extraContext.trim()}`
    : message;

  const messages = [
    { role: 'system', content: CLASSIFICATION_PROMPT },
    ...historyMessages,
    { role: 'user', content: userContent },
  ];

  setTraceAttributes(traceSpan, {
    'input.value': truncateText(JSON.stringify(messages), 20_000),
    'input.mime_type': 'application/json',
  });

  const response = await client.chat.completions.create(
    {
      model: resolveGatewayModelName(env),
      messages,
      ...gatewayThinkingSettings(env, false),
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 256,
    } as any,
    { signal } as any,
  );

  const raw = (response as any).choices?.[0]?.message?.content ?? '';
  const usage = extractUsage(response);
  setTraceAttributes(traceSpan, {
    'output.value': truncateText(raw, 4_000),
    'output.mime_type': 'application/json',
    ...llmTraceUsageAttributes(usage),
  });
  const parsed = safeParseJson(raw);

  const rawRoute = parsed?.route;
  const route: IntentRoute =
    typeof rawRoute === 'string' && VALID_ROUTES.includes(rawRoute as IntentRoute)
      ? (rawRoute as IntentRoute)
      : 'general_homebrew';
  const isHomebrewRelated = typeof parsed?.is_homebrew_related === 'boolean' ? parsed.is_homebrew_related : route !== 'reject';
  const needsSandbox = route === 'mirror_probe_deep'
    ? true
    : (typeof parsed?.needs_sandbox === 'boolean' ? parsed.needs_sandbox : false);

  return {
    ok: true,
    is_homebrew_related: isHomebrewRelated,
    needs_sandbox: needsSandbox,
    route,
    reason: typeof parsed?.reason === 'string' ? parsed.reason : '由 LLM 根据上下文判断。',
    usage,
  };
}

const VALID_ROUTES: IntentRoute[] = [
  'model_identity',
  'conversation',
  'restore_official',
  'mirror_probe_deep',
  'formula_check',
  'brew_missing',
  'analysis_fix',
  'general_homebrew',
  'reject',
];

function safeParseJson(value: unknown): Record<string, unknown> | null {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function sessionItemsToMessages(session: Session): Promise<ConversationMessage[]> {
  try {
    const items = await session.getItems(16);
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    for (const item of items) {
      const anyItem = item as any;
      if (anyItem.type !== undefined && anyItem.type !== 'message') continue;
      const role = anyItem.role;
      if (role !== 'user' && role !== 'assistant' && role !== 'system') continue;
      const text = extractMessageText(anyItem.content);
      if (text) messages.push({ role, content: redactDiagnosticText(text) });
    }
    return messages;
  } catch (error) {
    logger.error('Failed to read session history:', error);
    return [];
  }
}

function extractMessageText(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .map((part: any) => {
      if (part.type === 'input_text' || part.type === 'output_text') return part.text ?? '';
      if (part.type === 'text') return part.text ?? '';
      return '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

async function* runDirectRestoreOfficial() {
  yield sseEvent({
    type: 'thinking',
    content: '已识别为恢复官方源请求，正在提供现有安装的配置模式与 brew.env 清理指引。',
  });

  yield sseEvent({
    type: 'ai_response',
    content: HOMEBREW_CN_RESTORE_OFFICIAL_REPLY,
  });
}

async function* runDirectModelIdentity() {
  yield sseEvent({
    type: 'ai_response',
    content: `我是 Homebrew Agent，由 [Mintimate](https://www.mintimate.cn) 开发。我的职责主要是协助处理 Homebrew 安装、镜像源配置、软件包查询以及本地环境诊断排查。`,
  });
}

async function* runDirectDiagnostics(options: { sandbox?: any; signal?: AbortSignal; traceSpan?: TraceSpan }) {
  yield sseEvent({ type: 'tool_call', name: 'mirror_probe_deep', arguments: '{}' });

  const pending: string[] = [];
  let wake: (() => void) | null = null;
  let finished = false;

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
    finished = true;
    notify();
    return result;
  }).catch((error) => {
    pending.push(sseEvent({ type: 'error_message', content: (error as Error).message }));
    finished = true;
    notify();
    return null;
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

  const finalResult = await diagnosticsPromise;

  if (finalResult) {
    setTraceAttributes(options.traceSpan, {
      'tool.result.ok': finalResult.ok,
      'tool.result.duration_ms': finalResult.duration_ms,
      'tool.result.report_count': finalResult.report.length,
      'tool.result.failed_count': finalResult.report.filter((item) => item.error).length,
      'output.value': truncateText(JSON.stringify(finalResult), 20_000),
      'output.mime_type': 'application/json',
    });
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
    .filter((item) => !item.error && item.commit_hash && (item.git_ok || (item.http_status >= 200 && item.http_status < 400)))
    .sort((a, b) => Number(b.sync_status === 'synced') - Number(a.sync_status === 'synced') || a.latency_ms - b.latency_ms);
  const best = usable.find((item) => item.name !== 'Official (官方源)') ?? usable[0];
  const official = result.report.find((item) => item.name === 'Official (官方源)');

  const lines = [
    `在线镜像源诊断完成，用时 ${(result.duration_ms / 1000).toFixed(1)} 秒。本次从云端检测节点探测 Git 仓库，延迟不代表你的本机下载速度。`,
    '',
  ];

  if (best) {
    lines.push(`当前可读取的镜像候选是 **${best.name}**，延迟约 **${best.latency_ms} ms**，分支 **${best.commit_ref?.replace('refs/heads/', '') || '未知'}**，状态为 **${formatSyncStatus(best.sync_status)}**。`);
    const installChoice = mirrorInstallChoice(best.name);
    if (installChoice && best.sync_status === 'synced') {
      lines.push('');
      lines.push(`安装或切换镜像时建议选择 **${installChoice.label}**。运行脚本后在镜像源选择处输入 **${installChoice.choice}**：`);
      lines.push('');
      lines.push('```bash');
      lines.push(HOMEBREW_CN_INSTALL_COMMAND);
      lines.push('```');
      lines.push('已安装 Homebrew 时，使用配置模式切换共享镜像设置，无需重新安装：');
      lines.push('```bash');
      lines.push(HOMEBREW_CN_CONFIGURE_COMMAND);
      lines.push('```');
    }
  } else {
    lines.push('本次没有检测到可直接访问的镜像源，建议检查本地网络、代理或稍后重试。');
  }

  if (!official?.commit_hash || official.error) {
    lines.push('本次未取得官方分支基准，不能确认镜像同步正常；检测节点受限不等同于官方源故障。');
  }
  if (best && best.sync_status !== 'synced') {
    lines.push('该候选仅确认可读取，建议先核对同步状态再切换；哈希不同也不能仅凭本次检测判断谁领先或落后。');
  }

  lines.push('');
  lines.push('完整结果已在当前对话的工具卡片中展开，可直接复制报告用于排查。');
  return lines.join('\n');
}

function mirrorInstallChoice(name: string) {
  if (name.includes('USTC') || name.includes('中科大')) return { choice: '1', label: '中国科学技术大学 USTC 镜像' };
  if (name.includes('Aliyun') || name.includes('阿里云')) return { choice: '2', label: '阿里云 Aliyun 镜像' };
  if (name.includes('TUNA') || name.includes('清华')) return { choice: '3', label: '清华 TUNA 镜像' };
  if (name.includes('Tencent') || name.includes('腾讯云')) return { choice: '5', label: '腾讯云镜像（隐藏选项，完整克隆）' };
  return null;
}

interface DirectAnalysisOptions {
  message: string;
  extraContext?: string;
  signal?: AbortSignal;
  traceSpan?: TraceSpan;
  session?: Session;
  previousReport?: string;
}

async function* runDirectAnalysisAndFix(options: DirectAnalysisOptions) {
  const current = redactDiagnosticText(buildAnalysisInput(options.message, options.extraContext));
  const combined = combineConfigurationReports(current, options.previousReport);
  yield* persistDirectExchange(runAnalysisAndFixEvents({ ...options, message: combined, extraContext: undefined }, combined !== current), {
    session: options.session, signal: options.signal, userInput: combined,
  });
}

async function* runAnalysisAndFixEvents(options: DirectAnalysisOptions, usedPreviousReport: boolean) {
  const sourceText = redactDiagnosticText(buildAnalysisInput(options.message, options.extraContext));
  setTraceAttributes(options.traceSpan, {
    'input.value': truncateText(sourceText, 20_000),
    'input.mime_type': 'text/plain',
  });
  yield sseEvent({ type: 'tool_call', name: 'analyze', arguments: JSON.stringify({ text: summarizeToolInput(sourceText) }) });

  if (options.signal?.aborted) return;

  const analysis = analyzeHomebrewText(sourceText);
  setTraceAttributes(options.traceSpan, {
    'tool.result.issue_count': analysis.issues_found,
    'tool.result.analyzed_lines': analysis.analyzed_lines,
  });
  yield sseEvent({
    type: 'tool_result',
    name: 'analyze',
    content: JSON.stringify(analysis),
  });

  const fixOptions = inferFixOptions(sourceText, analysis.issues);
  let fixScript = '';
  if (fixOptions && !options.signal?.aborted) {
    setTraceAttributes(options.traceSpan, {
      'tool.fix.generated': true,
      'tool.fix.issue_count': fixOptions.issue_ids.length,
    });
    yield sseEvent({ type: 'tool_call', name: 'fix', arguments: JSON.stringify(fixOptions) });
    fixScript = generateFixScript(fixOptions);
    yield sseEvent({
      type: 'tool_result',
      name: 'fix',
      content: fixScript,
    });
  }

  setTraceAttributes(options.traceSpan, {
    'output.value': truncateText(JSON.stringify({ analysis, fix_generated: Boolean(fixScript) }), 20_000),
    'output.mime_type': 'application/json',
  });

  if (options.signal?.aborted) return;
  const reply = summarizeAnalysis(analysis, Boolean(fixScript)) + (usedPreviousReport ? '\n\n本次对照用了你之前发来的另一份报告，反映的是两次提供的信息；我没有重新检查电脑。' : '');
  yield sseEvent({
    type: 'ai_response',
    content: reply,
  });
  if (!options.signal?.aborted && (analysis.configuration || (analysis.doctor && !analysis.doctor.ready))) {
    yield sseEvent({ type: 'suggest_actions', actions: HOMEBREW_CN_CONVERSATION_COPY.followups[analysis.configuration ? 'configuration' : 'doctor'] });
  }
}

function buildAnalysisInput(message: string, extraContext?: string) {
  const text = [message, extraContext].filter(Boolean).join('\n\n');
  if (hasHomebrewDiagnosticReport(text)) return text;
  if (/找不到.*brew|brew.*找不到|没有.*brew|brew.*not found/i.test(text) && !/command not found: brew|brew: command not found/i.test(text)) {
    return `${text}\ncommand not found: brew`;
  }
  return text;
}

function summarizeToolInput(text: string) {
  return text.length <= 240 ? text : `${text.slice(0, 240)}...`;
}

function summarizeAnalysis(analysis: ReturnType<typeof analyzeHomebrewText>, hasFix: boolean) {
  if (analysis.doctor || analysis.configuration) {
    const cell = (value: string | null) => value === null ? '未提供或无法确认' : value === '' ? '空值（报告原值）' : value.replace(/[&|`<>\[\]()*_!\\~#]/g, character => `&#${character.charCodeAt(0)};`).replace(/\r?\n/g, ' ');
    const lines: string[] = [];
    if (analysis.doctor) {
      lines.push(`**是否影响安装软件：** ${analysis.doctor.assessment.installation_impact}`,
        `**现在是否需要处理：** ${analysis.doctor.assessment.action_required}`);
    }
    if (analysis.configuration) {
      const differences = analysis.configuration.rows.filter(row => row.status === 'different');
      const same = analysis.configuration.rows.filter(row => row.status === 'same');
      if (differences.length) lines.push(`两份信息中有 ${differences.length} 项设置不同：${differences.map(row => cell(row.label)).join('、')}。这些差异值得继续检查，但还不能确认就是下载慢的原因。`);
      else if (same.length) lines.push(`两份信息里，能够对照的 ${same.length} 项设置相同。暂时没有看到这些设置的差异，但这还不能保证两边的下载速度一样。`);
      else lines.push('目前的信息还不足以比较桌面版和终端使用的下载设置。');
      if (analysis.configuration.rows.some(row => row.status === 'incomplete')) lines.push('有些项目没有显示，先保留为未知；这不代表你的电脑设置错了。');
    }
    for (const issue of analysis.issues) {
      lines.push('', `**${issue.title}**`);
      if (issue.impact_scope) {
        lines.push(`影响范围：${issue.impact_scope}`);
        if (analysis.doctor?.warning_count !== 1 || issue.id === 'doctor_unknown' || issue.severity === 'error') {
          lines.push(`对安装的影响：${issue.installation_impact}`, `是否需要处理：${issue.action_required}`);
        }
      }
      else lines.push(issue.message);
      const affected = issue.id.startsWith('doctor_') ? issue.evidence?.slice(1).filter(item => !item.startsWith('http')) : [];
      if (affected?.length) lines.push(`涉及：${affected.map(cell).join('、')}。`);
    }
    const nextIssue = analysis.issues.find(issue => issue.severity === 'error') ?? analysis.issues[0];
    if (nextIssue) {
      const optional = analysis.doctor && !analysis.configuration && !analysis.doctor.unrecognized_count && analysis.issues.every(issue => issue.severity !== 'error');
      lines.push(`**${optional ? '如需进一步排查' : '先做这一步'}**\n${nextIssue.suggestion}`);
    }
    else if (analysis.configuration) lines.push(`**先做这一步**\n${HOMEBREW_CN_DIAGNOSTIC_RULES.configuration_same.suggestion}`);
    lines.push('这里只分析你粘贴的信息，尚未检查或修改本机。原始提示、下载地址和后续查询方法可以在上方的详细说明中展开查看。');
    return lines.join('\n\n');
  }
  if (!analysis.issues_found) {
    return HOMEBREW_CN_CONVERSATION_COPY.replies.insufficient_evidence;
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
  traceSpan?: TraceSpan;
}) {
  const query = extractFormulaQuery(options.message, options.extraContext);
  setTraceAttributes(options.traceSpan, {
    'tool.query': query,
    'input.value': JSON.stringify({ query }),
    'input.mime_type': 'application/json',
  });
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

  setTraceAttributes(options.traceSpan, {
    'tool.result.source': result.source,
    'tool.result.exact_match': Boolean(result.exact),
    'tool.result.candidate_count': result.candidates.length,
    'output.value': truncateText(JSON.stringify(result), 20_000),
    'output.mime_type': 'application/json',
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
    const content = (name === 'diagnose' || name === 'mirror_probe_deep') && typeof output === 'string' ? output : truncateText(output, 1000);
    return { type: 'tool_result', name, content };
  }

  return null;
}

function extractUsage(value: unknown): UsagePayload | null {
  const v = value as any;
  const usage =
    v?.usage ??
    v?.data?.usage ??
    v?.data?.event?.usage ??
    v?.item?.rawItem?.usage ??
    v?.response?.usage;
  if (!usage) return null;

  const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? usage.inputTokens;
  const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? usage.outputTokens;
  const totalTokens = usage.total_tokens ?? usage.totalTokens;
  const reasoningTokens =
    usage.reasoning_tokens ??
    usage.reasoningTokens ??
    usage.completion_tokens_details?.reasoning_tokens ??
    usage.output_tokens_details?.reasoning_tokens;
  const cachedTokens =
    usage.cached_tokens ??
    usage.cachedTokens ??
    usage.prompt_tokens_details?.cached_tokens ??
    usage.input_tokens_details?.cached_tokens;

  if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined) {
    return null;
  }

  const normalized: UsagePayload = {
    input_tokens: typeof inputTokens === 'number' ? inputTokens : 0,
    output_tokens: typeof outputTokens === 'number' ? outputTokens : 0,
    total_tokens: typeof totalTokens === 'number' ? totalTokens : 0,
  };

  if (!normalized.total_tokens) {
    normalized.total_tokens = normalized.input_tokens + normalized.output_tokens;
  }
  if (typeof reasoningTokens === 'number') {
    normalized.reasoning_tokens = reasoningTokens;
  }
  if (typeof cachedTokens === 'number') {
    normalized.cached_tokens = cachedTokens;
  }

  return normalized;
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
    different: '与上游不同',
    unverified: '同步未验证',
    failed: '异常',
    network_restricted: '检测节点受限',
  };
  return labels[status] || status;
}

function getAllowedTools(message = '', extraContext?: string): Array<'mirror_probe_deep' | 'formula_check'> {
  if (/\bdoctor\b|诊断报告|配置对照/i.test(message) && !hasExplicitMirrorProbeRequest(diagnosticRequestText(message))) return ['formula_check'];
  if (shouldCheckDesktopConfigurationFirst(message, extraContext)) return ['formula_check'];
  return ['mirror_probe_deep', 'formula_check'];
}

export const __desktopGuidanceTestHooks = { applyDesktopIntentGuard, getAllowedTools, runDirectRestoreOfficial, needsThinking, runDirectAnalysisAndFix,
  applyConversationIntentGuard, persistDirectExchange, sessionItemsToMessages, getCasualReplyKind, findPreviousReport, limitSessionHistory };

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
    /(?:看看|看下|帮我看看|帮我看下|查一下|查下|查询|搜一下|搜索)?\s*(?:有没有|有无|是否有)\s*([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})/i,
    /(?:查一下|查下|查询|搜一下|搜索|看看|看下)\s*([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})\s*(?:有没有|有无|能不能|能否|可以|是否)?\s*(?:安装|装|支持)?/i,
    /(?:brew|homebrew)\s*(?:可以|可不可以|能不能|能否|能|是否|支持|有没有)?\s*(?:用\s*)?(?:brew\s*)?(?:安装|装|install)\s*([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})/i,
    /(?:brew|homebrew)\s*(?:里|上)?\s*(?:有|有没有|支持|查|查询|search|info)\s*([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})/i,
    /(?:^|\s)([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})\s+(?:可以|可不可以|能不能|能否|能|是否)?\s*(?:用\s*)?(?:brew|homebrew)\s*(?:安装|装|install)?/i,
    /(?:怎么|如何)\s*(?:用\s*)?(?:brew|homebrew)\s*(?:安装|装|install)\s*([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})/i,
    /(?:怎么|如何|怎样|怎麼)\s*(?:安装|装|install)\s*([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})/i,
    /(?:可以|可不可以|能不能|能否|能|是否)\s*(?:用来|拿来|通过)?\s*(?:安装|装|install)\s*([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})/i,
    /(?:^|\s)([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})\s*(?:可以|可不可以|能不能|能否|能|是否)\s*(?:安装|装|install)/i,
    /(?:^|\s)([a-z0-9@+._-]+(?:\s+[a-z0-9@+._-]+){0,3})\s*(?:怎么|如何|怎样)\s*(?:安装|装|install)/i,
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
    [/\b(ss|shadowsocks)\b/i, 'shadowsocks'],
    [/\b(nodejs|node\.js)\b/i, 'node'],
    [/\bpython3\b/i, 'python'],
    [/\bdocker\s*desktop\b/i, 'docker-desktop'],
  ];
  return aliases.find(([pattern]) => pattern.test(text))?.[1] ?? '';
}

export const __formulaQueryTestHooks = {
  extractFormulaQuery,
};

function needsThinking(message: string, extraContext?: string): boolean {
  // Desktop configuration guidance is a bounded explanation from the skill,
  // even when the symptom contains "failed" or a long configuration excerpt.
  if (shouldCheckDesktopConfigurationFirst(message, extraContext)) return false;
  if (extraContext && extraContext.trim().length > 50) return true;
  if (/error|failed|fatal|crash|cannot|unable|refused|timeout|ssl_error|Traceback|exit code|segfault/i.test(message)) return true;
  if (/为什么|怎么回事|原因|排查|诊断|失败了|不生效|没有效果|还是不行|依然|一直|总是/i.test(message)) return true;
  if (/^(如何|怎么|怎样|怎麼|如何才能|能不能|可以|可否|是否可以|help me|how (to|do|can)|what is|what are)/i.test(message.trim())) return false;
  return true;
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
  const recent = historyItems.slice(-MAX_HISTORY_ITEMS);
  const question = newItems.map(item => extractMessageText(item.content)).join('\n');
  // Keep the active report and its assessment while discussing it, even when
  // several short follow-ups push it outside the ordinary recent-turn window.
  if (isContextualFollowup(question) && !isNewTopic(question)) {
    const messages = historyItems.filter(item => (!item.type || item.type === 'message') && ['user', 'assistant'].includes(item.role))
      .map(item => ({ role: item.role, content: extractMessageText(item.content) }));
    const report = findPreviousReport(messages);
    if (report) {
      let index = -1;
      for (let i = historyItems.length - 1; i >= 0; i--) {
        if (historyItems[i].role === 'user' && extractMessageText(historyItems[i].content) === report) { index = i; break; }
      }
      if (index >= 0 && index < historyItems.length - MAX_HISTORY_ITEMS) {
        const anchor = historyItems.slice(index, index + 2).filter(item => !recent.includes(item));
        return [...anchor, ...recent, ...newItems];
      }
    }
  }
  return [...recent, ...newItems];
}
