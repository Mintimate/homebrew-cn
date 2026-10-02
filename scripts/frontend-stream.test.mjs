import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { getClientScript } from '../cloud-functions/templates/client-script.js';

const script = getClientScript().replace(/^\s*<script>/, '').replace(/<\/script>\s*$/, '');
const sendMessage = script.slice(script.indexOf('async function sendMessage('), script.indexOf('/** 将工具结果格式化'));
const presenter = script.slice(script.indexOf('const createAnswerPresenter ='), script.indexOf('const {host,protocol}'));
const retryHandler = script.slice(script.indexOf('function addRetry('), script.indexOf('function formatBytes('));
const stopHandler = script.slice(script.indexOf('sendBtn.addEventListener("click"'), script.indexOf('window.sendQuickAction ='));
const reasoningHandler = script.slice(script.indexOf('function handleReasoningEvent('), script.indexOf('function formatEventClock('));
const actionHandlers = script.slice(script.indexOf('function normalizeSuggestedActions('), script.indexOf('function startNewConversation('));
const newConversationHandler = script.slice(script.indexOf('function startNewConversation('), script.indexOf('document.querySelectorAll("[data-open-chat]"'));
function element() {
  const classes = new Set();
  return { innerHTML: '', style: {}, dataset: {}, disabled: false, hidden: false, children: [], listeners: {},
    scrollTop: 0, scrollHeight: 100, clientHeight: 100,
    classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
    appendChild(child) { this.children.push(child); },
    setAttribute(name, value) { this[name] = value; },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    querySelectorAll() { return []; },
    querySelector(selector) { return selector === '.typing-indicator' && this.innerHTML.includes('typing-indicator') ? {} : null; },
    set textContent(value) { this.innerHTML = value; }, get textContent() { return this.innerHTML; },
  };
}
async function runStream(events, { close = true, sentinel = true, split = false, stop = false, images = [], httpStatus = 200, viewport = null, following = true } = {}) {
  let cancelled = false;
  let requestPayload;
  const requestPayloads = [], toolCalls = [], toolResults = [], statuses = [];
  const bytes = new TextEncoder().encode(events.map(e => `data: ${JSON.stringify(e)}\n\n`).join('') + (sentinel ? 'data: [DONE]\n\n' : ''));
  const body = new ReadableStream({start(controller) {
    if (split) for(let i=0;i<bytes.length;i+=7) controller.enqueue(bytes.slice(i,i+7));
    else controller.enqueue(bytes);
    if(close)controller.close();
  },cancel(){cancelled=true;}});
  const textContent=element(); textContent.innerHTML='<div class="typing-indicator"><span></span></div>';
  const skeleton={row:element(),bubble:element(),textContent,usageEl:element(),thinkingBody:element(),thinkingWrapper:element(),thinkingContent:element(),reasoningSection:element(),reasoningContent:element(),reasoningText:''};
  const empty = element();
  const messagesContainer=element(), jumpLatest=element();
  if(viewport){
    Object.assign(messagesContainer,{scrollTop:960,scrollHeight:1200,clientHeight:240,clientTop:1,...viewport});
    messagesContainer.getBoundingClientRect=()=>({top:100});
    textContent.getBoundingClientRect=()=>{
      textContent.actionsAtMeasurement=skeleton.bubble.children.filter(child=>child.className==='answer-followups').length;
      return {top:100+1+480-messagesContainer.scrollTop};
    };
  }
  const context=vm.createContext({
    isGenerating:false,pendingImages:images,packageQueryMode:false,activeRequest:null,chatInput:{value:'检测镜像',disabled:false},sendBtn:element(),chatFeedback:element(),
    document:{createElement:element,querySelectorAll:()=>[],getElementById:id=>id==='chat-empty'?empty:null},messagesContainer,followLatest:following,jumpLatest,
    createAgentSkeleton:()=>skeleton,activeToolCards:new Map(),convId:'test-ui-001',currentToolName:'',
    fetch:async(url,options)=>{requestPayload=JSON.parse(options.body);requestPayloads.push(requestPayload);return new Response(requestPayloads.length===1?body:'data: {"type":"ai_response","content":"继续回答"}\n\ndata: [DONE]\n\n',{status:httpStatus});},TextDecoder,AbortController,setInterval,clearInterval,console,
    escapeHtml:s=>s,parseMarkdown:s=>s,formatToolSummary:()=>'',toolLabel:s=>s,
    readImageAsBase64:async image=>({...image,base64:'test-image'}),renderAttachments(){},resetThinking(){},resetGlobalToolPanel(){},setStatus(text){statuses.push(text);},
    collapseThinkingBody(){},handleThinkingEvent(){},handleToolCallEvent(skeleton,name){toolCalls.push(name);},
    handleToolResultEvent(skeleton,name){toolResults.push(name);},renderRichToolContent(){},renderUsage(){},
    updateSendState(){},setPackageQueryMode(){},resizeChatInput(){},scrollToLatest(){},finishProgress(){},
    UI_ICONS:{RotateCcw:''},
  });
  vm.runInContext(presenter+retryHandler+reasoningHandler+actionHandlers+sendMessage+stopHandler,context);
  const stopTimer=stop?setTimeout(()=>context.sendBtn.listeners.click(),5):null;
  await context.sendMessage();
  if(stopTimer)clearTimeout(stopTimer);
  return {skeleton,context,cancelled,requestPayload,requestPayloads,toolCalls,toolResults,statuses,empty};
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

test('stop cancels an open stream and keeps the answer already received',{timeout:2000},async()=>{
  const {cancelled,skeleton,context}=await runStream([{type:'ai_response',content:'保留已经收到的回答'}],{close:false,sentinel:false,stop:true});
  assert.equal(cancelled,true);
  assert.equal(skeleton.textContent.textContent,'保留已经收到的回答');
  assert.match(context.chatFeedback.textContent,/已停止生成/);
  assert.equal(context.activeRequest,null);
  assert.equal(context.isGenerating,false);
  assert.equal(skeleton.bubble.children.length,0,'a user-requested stop does not offer a failure retry');
});

test('server failure cannot be overwritten by a later answer event',async()=>{
  const {skeleton}=await runStream([
    {type:'error_message',content:'Probe failed'},
    {type:'ai_response',content:'错误的成功答案'},
  ]);
  assert.match(skeleton.textContent.textContent,/未能完成/);
  assert.doesNotMatch(skeleton.textContent.textContent,/错误的成功答案/);
  assert.equal(skeleton.bubble.children.length,1);
});

test('retry keeps the original question and screenshot attachments',async()=>{
  const images=[{name:'brew-error.png',type:'image/png',size:12}];
  const {skeleton,context,requestPayload,empty}=await runStream([{type:'error_message',content:'temporary failure'}],{images});
  assert.equal(empty.hidden,true);
  assert.equal(requestPayload.images[0].name,'brew-error.png');
  let retried;
  context.sendMessage=(text,retryImages)=>{retried={text,retryImages};};
  skeleton.bubble.children[0].listeners.click();
  assert.equal(retried.text,'检测镜像');
  assert.equal(retried.retryImages[0],images[0]);
});

test('reasoning remains separate from the streamed final answer',async()=>{
  const {skeleton}=await runStream([
    {type:'reasoning',content:'先检查配置。',response_id:'first'},
    {type:'reasoning',content:'再检查下载。',response_id:'second'},
    {type:'ai_response',content:'最终建议'},
  ],{split:true});
  assert.equal(skeleton.reasoningContent.textContent,'先检查配置。\n\n再检查下载。');
  assert.equal(skeleton.reasoningSection.hidden,false);
  assert.equal(skeleton.textContent.textContent,'最终建议');
});

test('follow-ups wait for successful completion, reuse the conversation, and preserve drafts', async()=>{
  const {skeleton,context,requestPayloads}=await runStream([
    {type:'ai_response',content:'这条提醒只涉及旧的软件包。'},
    {type:'suggest_actions',actions:[{label:'先不处理可以吗？',prompt:'根据刚才的报告，现在不处理会有什么影响？'}]},
  ],{split:true});
  assert.equal(requestPayloads.length,1,'rendering actions must not send a message');
  const action=skeleton.bubble.children[0].children[0];
  assert.equal(action.textContent,'先不处理可以吗？');
  context.chatInput.value='稍后要问的新问题';
  context.pendingImages=[{name:'unsent.png',size:12,type:'image/png'}];
  context.isGenerating=true;
  action.listeners.click();
  assert.equal(requestPayloads.length,1,'a busy conversation cannot send another follow-up');
  context.isGenerating=false;
  await action.listeners.click();
  assert.equal(requestPayloads.length,2);
  assert.equal(requestPayloads[1].conversation_id,requestPayloads[0].conversation_id);
  assert.equal(requestPayloads[1].message,'根据刚才的报告，现在不处理会有什么影响？');
  assert.deepEqual(requestPayloads[1].images,[]);
  assert.equal(context.chatInput.value,'稍后要问的新问题');
  assert.equal(context.pendingImages[0].name,'unsent.png');
});

test('follow-ups validate payloads, bound their size, and use literal button text',async()=>{
  const {skeleton}=await runStream([
    {type:'ai_response',content:'回答'},
    {type:'suggest_actions',actions:[null,{label:1,prompt:'x'},{label:'空',prompt:'  '},{label:'太长',prompt:'x'.repeat(401)},{label:'x'.repeat(33),prompt:'过长标签'},
      {label:'<b>解释</b>',prompt:'继续解释'}, {label:'重复',prompt:'继续解释'}, {label:'第二项',prompt:'第二个问题'}, {label:'第三项',prompt:'第三个问题'}, {label:'第四项',prompt:'第四个问题'}]},
  ]);
  const buttons=skeleton.bubble.children[0].children;
  assert.equal(buttons.length,3);
  assert.equal(buttons[0].textContent,'<b>解释</b>');
  assert.equal(buttons[0].children.length,0);
  for (const actions of [null,{},'invalid']) {
    const result=await runStream([{type:'ai_response',content:'回答'},{type:'suggest_actions',actions}]);
    assert.equal(result.skeleton.bubble.children.length,0);
  }
});

test('failed, stopped, and incomplete streams never offer suggested follow-ups',{timeout:2000},async()=>{
  const events=[{type:'ai_response',content:'收到部分内容'},{type:'suggest_actions',actions:[{label:'继续',prompt:'接着说'}]}];
  for (const [extra,options] of [[[{type:'error_message',content:'failed'}],{}],[[],{stop:true,close:false,sentinel:false}],[[],{sentinel:false}]]) {
    const {skeleton}=await runStream([...events,...extra],options);
    assert.equal(skeleton.bubble.children.some(child=>child.className==='answer-followups'),false);
  }
});

test('internal intent routing is hidden while useful tools remain visible',async()=>{
  const {toolCalls,toolResults,statuses}=await runStream([
    {type:'thinking',content:'已收到问题，正在进行意图识别…'},
    {type:'tool_call',name:'intent_classify',arguments:'{}'},
    {type:'tool_result',name:'intent_classify',content:'{}'},
    {type:'tool_call',name:'analyze',arguments:'{}'},
    {type:'tool_result',name:'analyze',content:'{}'},
    {type:'ai_response',content:'结论'},
  ]);
  assert.deepEqual(toolCalls,['analyze']);
  assert.deepEqual(toolResults,['analyze']);
  assert.equal(statuses.some(status=>/意图|intent_classify/.test(status||'')),false);
  assert.ok(statuses.includes('正在阅读你的问题…'));
});

test('new conversation changes the identifier, preserves drafts, and ignores clicks while busy',()=>{
  let removals=0;
  const button=element(), feedback=element(), empty=element(), footer=element(), resume=element();
  const context=vm.createContext({
    isGenerating:true,convId:'old-id',createConversationId:()=> 'new-id',
    messagesContainer:{querySelectorAll:()=>[{remove(){removals++;}},{remove(){removals++;}}]},
    activeToolCards:new Map([['old',{}]]),activeAssistantMessage:{},activeTextContent:{},activeUsageElement:{},currentToolName:'analyze',diagnosticState:{analysis:{old:true},fix:'old'},
    helpGuide:element(),helpWarning:{value:'未发送的报告'},helpDesktop:{value:''},helpTerminal:{value:''},helpFeedback:element(),chatFeedback:feedback,
    chatInput:{value:'未发送的问题',focus(){}},pendingImages:[{name:'unsent.png'}],
    document:{getElementById:id=>({'chat-new-conversation':button,'chat-footer':footer,'chat-empty':empty,'help-guide-resume':resume}[id])},
    resetThinking(){},resetGlobalToolPanel(){},renderGlobalToolPanel(){},setPackageQueryMode(){},updateHelpButtons(){},scrollToLatest(){},
  });
  vm.runInContext(newConversationHandler,context);
  button.listeners.click();
  assert.equal(context.convId,'old-id');assert.equal(removals,0);
  context.isGenerating=false;
  button.listeners.click();
  assert.equal(context.convId,'new-id');assert.equal(removals,2);
  assert.equal(context.activeToolCards.size,0);assert.equal(context.diagnosticState.analysis,null);
  assert.equal(context.chatInput.value,'未发送的问题');assert.equal(context.pendingImages[0].name,'unsent.png');
  assert.equal(context.helpWarning.value,'未发送的报告');assert.equal(resume.hidden,false);
  assert.equal(context.helpGuide.hidden,true);assert.equal(empty.hidden,false);assert.equal(footer.hidden,false);
  assert.match(feedback.textContent,/新对话.*已保留/);
});

test('follow-up and new-conversation buttons reflect the current request busy state',()=>{
  const update=script.slice(script.indexOf('function updateSendState('),script.indexOf('function resizeChatInput('));
  const buttons=[element(),element()];
  const context=vm.createContext({isGenerating:true,chatInput:{value:'草稿'},pendingImages:[],sendBtn:element(),UI_ICONS:{Square:'stop',ArrowUp:'send'},document:{querySelectorAll:()=>buttons}});
  context.sendBtn.classList.toggle=()=>{};
  vm.runInContext(update,context);context.updateSendState();
  assert.ok(buttons.every(button=>button.disabled));
  context.isGenerating=false;context.updateSendState();
  assert.ok(buttons.every(button=>!button.disabled));
});

test('diagnostic cards present impact and action before technical details and escape report content',()=>{
  const renderer=script.slice(script.indexOf('function renderDiagnosticRichContent('),script.indexOf('function setStatus('));
  const container=element();
  const context=vm.createContext({
    diagnosticState:{fix:'',analysis:{scope:'provided_text',doctor:{assessment:{installation_impact:'仅影响这个软件的安装',action_required:'安装这个软件前处理'}},issues:[{title:'旧软件',severity:'warning',message:'详情说明',impact_scope:'仅 <script>old-tool</script>',installation_impact:'其他软件未见直接影响',action_required:'暂时不用删除',suggestion:'查看详情'}]}},
    escapeHtml:text=>String(text).replaceAll('<','&lt;').replaceAll('>','&gt;'),parseMarkdown:text=>text,renderCollapsibleRawOutput:()=>'',
  });
  vm.runInContext(renderer,context);context.renderDiagnosticRichContent(container);
  assert.ok(container.innerHTML.indexOf('先看对安装软件的影响')<container.innerHTML.indexOf('仅分析已提供'));
  assert.ok(container.innerHTML.indexOf('影响范围')<container.innerHTML.indexOf('查看原始提示'));
  assert.match(container.innerHTML,/能安装软件吗？.*仅影响这个软件的安装/);
  assert.match(container.innerHTML,/现在需要处理吗？.*安装这个软件前处理/);
  assert.match(container.innerHTML,/安装软件.*其他软件未见直接影响/);
  assert.match(container.innerHTML,/是否需要处理.*暂时不用删除/);
  assert.doesNotMatch(container.innerHTML,/<script>/);
});

test('completed diagnosis reveals the conclusion after follow-up buttons are rendered',async()=>{
  const {context,skeleton}=await runStream([
    {type:'tool_result',name:'analyze',content:'{"issues":[]}'},
    {type:'ai_response',content:'能继续安装其他软件。\n\n具体解释和后续步骤。'},
    {type:'suggest_actions',actions:[{label:'先不处理可以吗？',prompt:'不处理会有什么影响？'}]},
  ],{viewport:{}});
  assert.equal(skeleton.textContent.actionsAtMeasurement,1,'measure after rendering follow-ups');
  assert.equal(context.messagesContainer.scrollTop,468,'align the conclusion with 12 px breathing room inside the bordered viewport');
  assert.equal(context.followLatest,false,'hold the conclusion instead of jumping back to the end');
  assert.equal(context.jumpLatest.hidden,false,'the user can still jump to the latest content');
});

test('diagnosis completion preserves a manual scroll position and ordinary conversations keep their scroll behavior',async()=>{
  const events=[{type:'tool_result',name:'analyze',content:'{}'},{type:'ai_response',content:'诊断结论'}];
  const manual=await runStream(events,{viewport:{scrollTop:210},following:false});
  assert.equal(manual.context.messagesContainer.scrollTop,210);
  assert.equal(manual.skeleton.textContent.actionsAtMeasurement,undefined);
  const ordinary=await runStream([{type:'ai_response',content:'Homebrew 是一个软件包管理器。'}],{viewport:{}});
  assert.equal(ordinary.context.messagesContainer.scrollTop,960);
  assert.equal(ordinary.context.followLatest,true);
  const short=await runStream(events,{viewport:{scrollHeight:500,scrollTop:260}});
  assert.equal(short.context.messagesContainer.scrollTop,260,'do not scroll beyond the available content');
  assert.equal(short.context.jumpLatest.hidden,true);
});

test('unfinished, failed, and stopped diagnostics do not trigger conclusion scrolling',{timeout:2000},async()=>{
  const events=[{type:'tool_result',name:'analyze',content:'{}'},{type:'ai_response',content:'部分诊断结论'}];
  for(const [extra,options] of [[[{type:'error_message',content:'failed'}],{}],[[],{sentinel:false}],[[],{sentinel:false,close:false,stop:true}]]){
    const {context,skeleton}=await runStream([...events,...extra],{viewport:{},...options});
    assert.equal(context.messagesContainer.scrollTop,960);
    assert.equal(skeleton.textContent.actionsAtMeasurement,undefined);
  }
  const partial=await runStream([{type:'tool_result',name:'analyze',partial:true,content:'{}'},{type:'ai_response',content:'继续等待'}],{viewport:{}});
  assert.equal(partial.context.messagesContainer.scrollTop,960);
});
