import OpenAI from 'openai';
import { OpenAIChatCompletionsModel } from '@openai/agents';

const DEFAULT_MODEL = '@makers/deepseek-v4-flash';

export interface AgentEnv {
  AI_GATEWAY_API_KEY: string;
  AI_GATEWAY_BASE_URL: string;
  AI_GATEWAY_MODEL?: string;
}

export function getAgentEnv(contextEnv: Record<string, string | undefined> | undefined): AgentEnv {
  const source = contextEnv ?? {};
  const missing = ['AI_GATEWAY_API_KEY', 'AI_GATEWAY_BASE_URL'].filter((key) => !source[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  return {
    AI_GATEWAY_API_KEY: source.AI_GATEWAY_API_KEY!,
    AI_GATEWAY_BASE_URL: normalizeOpenAIBaseUrl(source.AI_GATEWAY_BASE_URL!),
    AI_GATEWAY_MODEL: source.AI_GATEWAY_MODEL,
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
  });
  wrapOpenAIClient(client);
  return client;
}

function wrapOpenAIClient(client: OpenAI) {
  const originalCreate = client.chat.completions.create.bind(client.chat.completions);
  
  client.chat.completions.create = async function (params: any, options: any): Promise<any> {
    const response = await originalCreate(params, options);
    
    if (params.stream) {
      return {
        [Symbol.asyncIterator]() {
          const iterator = (response as any)[Symbol.asyncIterator]();
          const toolCallNames: Record<number, string> = {};
          const toolCallSent: Record<number, string> = {};
          
          return {
            async next() {
              const result = await iterator.next();
              if (result.done) return result;
              
              const chunk = result.value;
              const choice = chunk.choices?.[0];
              const delta = choice?.delta;
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const index = tc.index;
                  if (tc.function?.name) {
                    if (toolCallNames[index] === undefined) {
                      toolCallNames[index] = '';
                      toolCallSent[index] = '';
                    }
                    toolCallNames[index] += tc.function.name;
                    
                    const rawName = toolCallNames[index];
                    const cleanName = cleanRepeatedToolName(rawName);
                    const sent = toolCallSent[index];
                    
                    const fragment = cleanName.slice(sent.length);
                    tc.function.name = fragment;
                    
                    toolCallSent[index] = cleanName;
                  }
                }
              }
              return result;
            }
          };
        }
      };
    } else {
      const choice = response.choices?.[0];
      const message = choice?.message;
      if (message?.tool_calls) {
        for (const tc of message.tool_calls) {
          const tcAny = tc as any;
          if (tcAny.function?.name) {
            tcAny.function.name = cleanRepeatedToolName(tcAny.function.name);
          }
        }
      }
      return response;
    }
  } as any;
}

function cleanRepeatedToolName(name: string): string {
  const mappings: Record<string, string> = {
    'diagnose_upstream_mirrors': 'diagnose',
    'diagnose_mirrors': 'diagnose',
    'diagnose': 'diagnose',
    'analyze_local_env_diagnostic': 'analyze',
    'analyze_env': 'analyze',
    'analyze': 'analyze',
    'generate_fix_script': 'fix',
    'fix_script': 'fix',
    'fix': 'fix',
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
  return env.AI_GATEWAY_MODEL || DEFAULT_MODEL;
}

function normalizeOpenAIBaseUrl(value: string): string {
  return value.trim().replace(/\/chat\/completions\/?$/, '');
}
