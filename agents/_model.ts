import OpenAI from 'openai';
import { OpenAIChatCompletionsModel } from '@openai/agents';

const DEFAULT_MODEL = '@makers/deepseek-v4-flash';

export interface AgentEnv {
  AI_GATEWAY_API_KEY: string;
  AI_GATEWAY_BASE_URL: string;
  AI_GATEWAY_MODEL?: string;
  AI_GATEWAY_ENABLE_THINKING?: string;
  AI_GATEWAY_HTTP_REFERER?: string;
  AI_GATEWAY_TITLE?: string;
}

export function getAgentEnv(contextEnv: Record<string, string | undefined> | undefined): AgentEnv {
  const source = contextEnv ?? {};
  const missing = ['AI_GATEWAY_API_KEY', 'AI_GATEWAY_BASE_URL'].filter((key) => !source[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  return {
    AI_GATEWAY_API_KEY: source.AI_GATEWAY_API_KEY!.trim(),
    AI_GATEWAY_BASE_URL: normalizeOpenAIBaseUrl(source.AI_GATEWAY_BASE_URL!),
    AI_GATEWAY_MODEL: source.AI_GATEWAY_MODEL?.trim() || undefined,
    AI_GATEWAY_ENABLE_THINKING: source.AI_GATEWAY_ENABLE_THINKING,
    AI_GATEWAY_HTTP_REFERER: source.AI_GATEWAY_HTTP_REFERER,
    AI_GATEWAY_TITLE: source.AI_GATEWAY_TITLE,
  };
}

export function createGatewayModel(env: AgentEnv) {
  const client = createGatewayClient(env);
  return new OpenAIChatCompletionsModel(client, resolveGatewayModelName(env));
}

export function createGatewayClient(env: AgentEnv) {
  const client = new OpenAI({
    apiKey: env.AI_GATEWAY_API_KEY,
    baseURL: env.AI_GATEWAY_BASE_URL,
    defaultHeaders: {
      'http-referer': env.AI_GATEWAY_HTTP_REFERER || 'https://brew-cn.mintimate.cn',
      'x-title': env.AI_GATEWAY_TITLE || 'Homebrew CN Agent',
    },
  });
  wrapOpenAIClient(client, env);
  return client;
}

// Keep provider-specific fields out of requests to unrelated models.
export function gatewayThinkingSettings(env: AgentEnv, enabled: boolean): Record<string, unknown> {
  const model = resolveGatewayModelName(env).toLowerCase();
  if (model.includes('deepseek')) {
    return { thinking: { type: enabled ? 'enabled' : 'disabled' } };
  }
  if (model.includes('qwen')) {
    return { chat_template_kwargs: { enable_thinking: enabled } };
  }
  return {};
}

export function prepareGatewayParams(params: any, env: AgentEnv) {
  if (!params || typeof params !== 'object') return params;
  const nextParams = {
    ...gatewayThinkingSettings(env, env.AI_GATEWAY_ENABLE_THINKING !== 'false'),
    ...params,
  };

  // Agents SDK serializes reasoning items as `reasoning`. DeepSeek expects
  // `reasoning_content` on assistant messages when continuing tool calls.
  if (resolveGatewayModelName(env).toLowerCase().includes('deepseek')) {
    delete nextParams.chat_template_kwargs;
    delete nextParams.thinking_token_budget;
    nextParams.messages = params.messages?.map((message: any) => {
      if (message.role !== 'assistant' || typeof message.reasoning !== 'string') return message;
      const { reasoning, ...rest } = message;
      return { ...rest, reasoning_content: rest.reasoning_content ?? reasoning };
    });
  }

  if (params.stream) {
    nextParams.stream_options = {
      ...(params.stream_options ?? {}),
      include_usage: params.stream_options?.include_usage ?? true,
    };
  }
  return nextParams;
}

function wrapOpenAIClient(client: OpenAI, env: AgentEnv) {
  const originalCreate = client.chat.completions.create.bind(client.chat.completions);
  const isQwen = resolveGatewayModelName(env).toLowerCase().includes('qwen');

  client.chat.completions.create = async function (params: any, options: any): Promise<any> {
    params = prepareGatewayParams(params, env);
    const response = await originalCreate(params, options);

    if (params.stream) {
      return {
        // for-await propagates iterator.return() to the upstream stream on
        // cancellation; a next()-only adapter leaves the HTTP request running.
        async *[Symbol.asyncIterator]() {
          const toolCallNames: Record<number, string> = {};
          const toolCallSent: Record<number, string> = {};
          for await (const chunk of response as any) {
            const delta = chunk.choices?.[0]?.delta;
            if (delta) {
              if (delta.reasoning_content && !delta.reasoning) {
                delta.reasoning = delta.reasoning_content;
              }
              if (isQwen && delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const index = tc.index;
                  if (tc.function?.name) {
                    toolCallNames[index] = (toolCallNames[index] ?? '') + tc.function.name;
                    const cleanName = cleanRepeatedToolName(toolCallNames[index]);
                    tc.function.name = cleanName.slice((toolCallSent[index] ?? '').length);
                    toolCallSent[index] = cleanName;
                  }
                }
              }
            }
            yield chunk;
          }
        },
      };
    }

    const message = response.choices?.[0]?.message as any;
    if (message?.reasoning_content && !message.reasoning) {
      message.reasoning = message.reasoning_content;
    }
    if (isQwen && message?.tool_calls) {
      for (const tc of message.tool_calls) {
        if (tc.function?.name) tc.function.name = cleanRepeatedToolName(tc.function.name);
      }
    }
    return response;
  } as any;
}

function cleanRepeatedToolName(name: string): string {
  const mappings: Record<string, string> = {
    'diagnose_upstream_mirrors': 'diagnose',
    'diagnose_mirrors': 'diagnose',
    'diagnose': 'diagnose',
    'mirror_probe_deep': 'mirror_probe_deep',
    'mirror_probe': 'mirror_probe_deep',
    'probe_deep': 'mirror_probe_deep',
    'analyze_local_env_diagnostic': 'analyze',
    'analyze_env': 'analyze',
    'analyze': 'analyze',
    'generate_fix_script': 'fix',
    'fix_script': 'fix',
    'fix': 'fix',
    'formula_check': 'formula_check',
    'check_formula': 'formula_check',
    'formula': 'formula_check',
  };

  for (const [pattern, target] of Object.entries(mappings)) {
    if (name.startsWith(pattern)) {
      const repeatedPattern = pattern.repeat(10);
      if (repeatedPattern.startsWith(name)) {
        return target;
      }
    }
  }
  return name;
}

export function resolveGatewayModelName(env: AgentEnv): string {
  return env.AI_GATEWAY_MODEL?.trim() || DEFAULT_MODEL;
}

function normalizeOpenAIBaseUrl(value: string): string {
  return value.trim().replace(/\/chat\/completions\/?$/, '');
}
