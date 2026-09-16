import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { getClientScript } from '../cloud-functions/templates/client-script.js';

const script = getClientScript().replace(/^\s*<script>/, '').replace(/<\/script>\s*$/, '');
const sendMessage = script.slice(script.indexOf('async function sendMessage('), script.indexOf('/** 将工具结果格式化'));
function element() {
  return { innerHTML: '', style: {}, disabled: false, appendChild() {},
    querySelector(selector) { return selector === '.typing-indicator' && this.innerHTML.includes('typing-indicator') ? {} : null; },
    set textContent(value) { this.innerHTML = value; }, get textContent() { return this.innerHTML; },
  };
}
async function runStream(events, { close = true, sentinel = true, split = false } = {}) {
  let cancelled = false;
  const bytes = new TextEncoder().encode(events.map(e => `data: ${JSON.stringify(e)}\n\n`).join('') + (sentinel ? 'data: [DONE]\n\n' : ''));
  const body = new ReadableStream({start(controller) {
    if (split) for(let i=0;i<bytes.length;i+=7) controller.enqueue(bytes.slice(i,i+7));
    else controller.enqueue(bytes);
    if(close)controller.close();
  },cancel(){cancelled=true;}});
  const textContent=element(); textContent.innerHTML='<div class="typing-indicator"><span></span></div>';
  const skeleton={row:element(),textContent,usageEl:element(),thinkingBody:element()};
  const context=vm.createContext({
    isGenerating:false,pendingImages:[],chatInput:{value:'检测镜像',disabled:false},sendBtn:element(),
    document:{createElement:element,querySelectorAll:()=>[]},messagesContainer:element(),
    createAgentSkeleton:()=>skeleton,activeToolCards:new Map(),convId:'test-ui-001',currentToolName:'',
    fetch:async()=>new Response(body),TextDecoder,setInterval,clearInterval,console,
    escapeHtml:s=>s,parseMarkdown:s=>s,formatToolSummary:()=>'',toolLabel:s=>s,
    readImageAsBase64:async()=>'',renderAttachments(){},resetThinking(){},resetGlobalToolPanel(){},setStatus(){},
    collapseThinkingBody(){},handleThinkingEvent(){},handleToolCallEvent(){},
    handleToolResultEvent(){},renderRichToolContent(){},renderUsage(){},
    updateSendState(){},
  });
  vm.runInContext(sendMessage,context);
  await context.sendMessage();
  return {skeleton,context,cancelled};
}

test('generated inline client JavaScript parses',()=>{new vm.Script(script);});
test('mirror summary containing 检测 is rendered across chunk boundaries',async()=>{
  const {skeleton,context}=await runStream([
    {type:'tool_result',name:'mirror_probe_deep',content:'{}'},
    {type:'ai_response',content:'在线镜像源诊断完成。官方源检测受限。'},
    {type:'usage',total_tokens:621},
  ],{split:true});
  assert.match(skeleton.textContent.innerHTML,/官方源检测受限/);
  assert.doesNotMatch(skeleton.textContent.innerHTML,/typing-indicator/);
  assert.equal(context.isGenerating,false);assert.equal(context.chatInput.disabled,false);
});
test('[DONE] completes and cancels even if server keeps HTTP stream open',{timeout:2000},async()=>{
  const {cancelled,skeleton}=await runStream([{type:'ai_response',content:'完成'}],{close:false});
  assert.equal(cancelled,true);assert.equal(skeleton.textContent.innerHTML,'完成');
});
test('tool-only completion removes the loading placeholder',async()=>{
  const {skeleton}=await runStream([{type:'tool_result',name:'mirror_probe_deep',content:'{}'}]);
  assert.match(skeleton.textContent.innerHTML,/已完成/);assert.doesNotMatch(skeleton.textContent.innerHTML,/typing-indicator/);
});
test('server error removes placeholder without claiming success',async()=>{
  const {skeleton}=await runStream([{type:'error_message',content:'Probe failed'}]);
  assert.match(skeleton.textContent.innerHTML,/未能完成/);
});
test('EOF without final text or substantive results does not leave a spinner',async()=>{
  const {skeleton}=await runStream([{type:'tool_result',name:'intent_classify',content:'{}'}],{sentinel:false});
  assert.match(skeleton.textContent.innerHTML,/未返回回复/);
});
