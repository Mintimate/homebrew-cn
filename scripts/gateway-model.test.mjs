import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Agent, Runner, tool } from '@openai/agents';
import { z } from 'zod';
import {
  getAgentEnv, resolveGatewayModelName, gatewayThinkingSettings,
  prepareGatewayParams, createGatewayClient, createGatewayModel,
} from '../agents/_model.ts';

const env = getAgentEnv({
  AI_GATEWAY_API_KEY: ' test-only-key ',
  AI_GATEWAY_BASE_URL: 'https://gateway.invalid/v1/chat/completions/',
});

test('Makers default and environment normalization', () => {
  assert.equal(resolveGatewayModelName(env), '@makers/deepseek-v4-flash');
  assert.equal(env.AI_GATEWAY_BASE_URL, 'https://gateway.invalid/v1');
  assert.equal(env.AI_GATEWAY_API_KEY, 'test-only-key');
  assert.equal(resolveGatewayModelName({ ...env, AI_GATEWAY_MODEL: '  ' }), '@makers/deepseek-v4-flash');
  assert.throws(() => getAgentEnv({}), /Missing environment variables/);
});

test('provider-specific thinking settings do not leak across models', () => {
  assert.deepEqual(gatewayThinkingSettings(env, false), { thinking: { type: 'disabled' } });
  assert.deepEqual(gatewayThinkingSettings({ ...env, AI_GATEWAY_MODEL: 'qwen3.6-35b-a3b' }, true), {
    chat_template_kwargs: { enable_thinking: true },
  });
  assert.deepEqual(gatewayThinkingSettings({ ...env, AI_GATEWAY_MODEL: 'other-model' }, true), {});
});

test('classifier disables thinking and streaming preserves usage options', () => {
  const params = prepareGatewayParams({ ...gatewayThinkingSettings(env, false), stream: true }, env);
  assert.deepEqual(params.thinking, { type: 'disabled' });
  assert.equal(params.stream_options.include_usage, true);
  assert.equal(prepareGatewayParams({ stream: true, stream_options: { include_usage: false } }, env).stream_options.include_usage, false);
  assert.equal(prepareGatewayParams({}, { ...env, AI_GATEWAY_ENABLE_THINKING: 'false' }).thinking.type, 'disabled');
});

test('DeepSeek tool continuation converts reasoning without mutating input', () => {
  const input = { messages: [{ role: 'assistant', reasoning: 'check tool', tool_calls: [] }],
    chat_template_kwargs: { enable_thinking: true }, thinking_token_budget: 512 };
  const params = prepareGatewayParams(input, env);
  assert.equal(params.messages[0].reasoning_content, 'check tool');
  assert.equal(params.messages[0].reasoning, undefined);
  assert.equal(input.messages[0].reasoning, 'check tool');
  assert.equal(params.chat_template_kwargs, undefined);
  assert.equal(params.thinking_token_budget, undefined);
});

function chunk(delta, finish_reason = null) {
  return { id: 'test-completion', object: 'chat.completion.chunk', created: 1,
    model: '@makers/deepseek-v4-flash', choices: [{ index: 0, delta, finish_reason }] };
}
function sse(chunks) {
  return new Response(chunks.map(c => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n', {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

test('non-streaming reasoning is exposed to the SDK', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ message: {
    role: 'assistant', content: 'ok', reasoning_content: 'thought',
  } }] }));
  const result = await createGatewayClient(env).chat.completions.create({ model: resolveGatewayModelName(env), messages: [] });
  assert.equal(result.choices[0].message.reasoning, 'thought');
});

test('SDK streaming tool loop returns DeepSeek reasoning on the next request', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    requests.push(JSON.parse(init.body));
    if (requests.length === 1) return sse([
      chunk({ role: 'assistant', reasoning_content: 'Need to check.' }),
      chunk({ tool_calls: [{ index: 0, id: 'call-1', type: 'function', function: { name: 'check', arguments: '{}' } }] }),
      chunk({}, 'tool_calls'),
    ]);
    assert.equal(requests.length, 2);
    return sse([chunk({ role: 'assistant', content: 'Checked.' }), chunk({}, 'stop')]);
  });
  const agent = new Agent({ name: 'test', model: createGatewayModel(env), tools: [tool({
    name: 'check', description: 'Check fixture', parameters: z.object({}), execute: async () => 'OK',
  })] });
  const runner = new Runner({ tracingDisabled: true });
  const result = await runner.run(agent, 'Check it.', { stream: true, maxTurns: 3 });
  for await (const _event of result) { /* consume the complete tool loop */ }
  await result.completed;
  assert.equal(result.finalOutput, 'Checked.');
  const assistant = requests[1].messages.find(m => m.role === 'assistant' && m.tool_calls?.length);
  assert.equal(assistant.reasoning_content, 'Need to check.');
  assert.equal(assistant.reasoning, undefined);
  assert.equal(requests[1].chat_template_kwargs, undefined);
});

test('early stream termination cancels the underlying HTTP stream', async (t) => {
  let cancelled = false;
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk({ content: 'hello' }))}\n\n`)); },
    cancel() { cancelled = true; },
  }), { headers: { 'Content-Type': 'text/event-stream' } }));
  const stream = await createGatewayClient(env).chat.completions.create({
    model: resolveGatewayModelName(env), messages: [], stream: true,
  });
  for await (const _chunk of stream) break;
  assert.equal(cancelled, true);
});
