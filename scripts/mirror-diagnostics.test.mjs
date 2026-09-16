import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { diagnoseHomebrewMirrors, probeHomebrewMirrorsDeep } from '../agents/chat/_tools.ts';
const A='a'.repeat(40),B='b'.repeat(40);
const official='Official (官方源)',tuna='TUNA (清华大学)';
const targets={[official]:'https://official.invalid/brew.git',[tuna]:'https://tuna.invalid/brew.git'};
const refs=(hash=A,branch='main')=>`${hash}\trefs/heads/${branch}\n`;

test('reads main early and cancels a refs stream that never closes',async(t)=>{
  let cancellations=0;
  t.mock.method(globalThis,'fetch',async()=>new Response(new ReadableStream({
    start(c){c.enqueue(new TextEncoder().encode(refs(B,'master')+refs(A,'main')));},cancel(){cancellations++;}
  })));
  const result=await diagnoseHomebrewMirrors({env:{},targets});
  assert.equal(cancellations,2);
  assert.equal(result.report[1].commit_hash,A);assert.equal(result.report[1].commit_ref,'refs/heads/main');
  assert.equal(result.report[1].sync_status,'synced');
});
test('does not mistake a split main-other branch for main',async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>new Response(new ReadableStream({start(c){
    for(const text of [`${B} refs/heads/main`,'-other\n',refs(A)])c.enqueue(new TextEncoder().encode(text));c.close();
  }})));
  const result=await diagnoseHomebrewMirrors({env:{},targets});assert.equal(result.report[1].commit_hash,A);
});
test('missing upstream baseline is unverified, never synced',async(t)=>{
  t.mock.method(globalThis,'fetch',async url=>{if(url.includes('official.invalid'))throw new Error('DNS unavailable');return new Response(refs());});
  const result=await diagnoseHomebrewMirrors({env:{},targets});
  assert.equal(result.report[0].sync_status,'network_restricted');assert.equal(result.report[1].sync_status,'unverified');
});
test('hash difference is reported without inferring lag; legacy branch cannot be compared',async(t)=>{
  let legacy=false;
  t.mock.method(globalThis,'fetch',async url=>new Response(url.includes('official.invalid')?refs():refs(B,legacy?'master':'main')));
  assert.equal((await diagnoseHomebrewMirrors({env:{},targets})).report[1].sync_status,'different');
  legacy=true;
  assert.equal((await diagnoseHomebrewMirrors({env:{},targets})).report[1].sync_status,'unverified');
});
test('HTTP success with unreadable refs is not treated as a dead mirror',async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>new Response('<html>proxy page</html>'));
  const result=await diagnoseHomebrewMirrors({env:{},targets});
  assert.equal(result.report[1].http_status,200);assert.equal(result.report[1].sync_status,'unverified');assert.ok(result.report[1].error);
});
test('non-2xx bodies cannot prove sync even if they contain a hash',async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>new Response(refs(),{status:503}));
  const result=await diagnoseHomebrewMirrors({env:{},targets});assert.equal(result.report[1].commit_hash,null);assert.match(result.report[1].error,/503/);
});
test('aborted request never starts a probe',async(t)=>{
  const controller=new AbortController();controller.abort();
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('must not fetch')});
  const result=await diagnoseHomebrewMirrors({env:{},targets,signal:controller.signal});assert.match(result.report[1].error,/aborted/);
});

// Compile and execute just the setup and ref-reader functions of generated
// sandbox programs, with an in-memory response. No network or shell execution.
const pythonHarness=`
import ast, io, json, shlex, sys
parts=shlex.split(sys.argv[1])
assert parts[:2] == ['python3', '-c'] and len(parts) == 3
code=parts[2]
compile(code, '<sandbox>', 'exec')
prefix=code.split('started = time.time()')[0].split('start = time.time()')[0]
namespace={}
exec(prefix,namespace)
result=namespace['result']
assert result['network_note'] is None
hash_value, ref=namespace['read_ref'](io.BytesIO(('${B} refs/heads/master\\n${A} refs/heads/main\\n').encode()))
assert ref == 'refs/heads/main' and hash_value == '${A}'
result.update(commit_hash=hash_value,commit_ref=ref,http_status=200,ssl_ok=True,error=None)
print(json.dumps(result))
`;
test('both sandbox paths use valid shell quoting, Python None, and main refs',async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('force sandbox fallback')});
  let commands=0;
  const sandbox={commands:{run:async(cmd)=>{commands++;return {stdout:execFileSync('python3',['-c',pythonHarness,cmd],{encoding:'utf8'})};}}};
  const shallow=await diagnoseHomebrewMirrors({env:{},targets,sandbox});
  const deep=await probeHomebrewMirrorsDeep({env:{},targets,sandbox});
  assert.equal(commands,4);
  assert.equal(shallow.report[1].method,'sandbox');assert.equal(deep.report[1].method,'sandbox_deep');
  assert.equal(deep.report[1].sync_status,'synced');
});


test('failed sandbox fallback cannot erase HTTP 200 observed at the edge',async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>new Response('<html>no refs</html>'));
  const sandbox={commands:{run:async()=>({stdout:JSON.stringify({name:tuna,http_status:0,error:'sandbox timeout'})})}};
  const result=await diagnoseHomebrewMirrors({env:{},targets:{[tuna]:targets[tuna]},sandbox});
  assert.equal(result.report[0].http_status,200);
  assert.equal(result.report[0].method,'edge_fetch');
  assert.equal(result.report[0].sync_status,'unverified');
});

test('failed deep sandbox probe can fall back to a working edge probe',async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>new Response(refs()));
  const sandbox={commands:{run:async()=>({stdout:JSON.stringify({name:tuna,http_status:0,error:'sandbox blocked'})})}};
  const result=await probeHomebrewMirrorsDeep({env:{},targets:{[tuna]:targets[tuna]},sandbox});
  assert.equal(result.report[0].commit_hash,A);assert.equal(result.report[0].method,'edge_fetch');
});
