import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

function worker(fetcher, cached = new Map()) {
  const events = {};
  const puts = [];
  const self = {location:{origin:'https://petforge.example'}, clients:{claim(){}}, skipWaiting:async()=>{}, addEventListener:(type,fn)=>events[type]=fn};
  const cache = {put:async(key,value)=>{puts.push(String(key));cached.set(String(key),value);}};
  runInNewContext(readFileSync(new URL('../sw.js',import.meta.url),'utf8'), {
    self,fetch:fetcher,Response,URL,AbortSignal,
    caches:{open:async()=>cache,match:async key=>cached.get(String(key))?.clone(),keys:async()=>[],delete:async()=>{}}
  });
  return {events,puts,cached};
}
function event(request) {
  const pending=[];
  return {request,pending,waitUntil:promise=>pending.push(promise),respondWith(promise){this.response=promise;}};
}
const navigation = path => ({url:'https://petforge.example/'+path,mode:'navigate',method:'GET'});

test('a slow navigation uses the matching cached page after the network deadline',async()=>{
  const w=worker(async(request,options)=>{assert.ok(options.signal);throw new DOMException('timeout','TimeoutError');},new Map([['./creator.html',new Response('saved studio')]]));
  const e=event(navigation('creator?template=cat'));w.events.fetch(e);
  assert.equal(await (await e.response).text(),'saved studio');
});
test('server errors use cached navigation but a real 404 is preserved',async()=>{
  let status=503;
  const w=worker(async()=>new Response('server',{status}),new Map([['./index.html',new Response('saved home')]]));
  const e=event(navigation(''));w.events.fetch(e);assert.equal(await (await e.response).text(),'saved home');
  status=404;const missing=event(navigation('index'));w.events.fetch(missing);assert.equal((await missing.response).status,404);
});
test('offline first visits get a valid 503 while admin and APIs never use public fallback',async()=>{
  const w=worker(async()=>{throw new Error('offline');});
  const e=event(navigation('creator'));w.events.fetch(e);assert.equal((await e.response).status,503);
  for(const path of ['admin.html','api/me']){const e=event(navigation(path));w.events.fetch(e);assert.equal(e.response,undefined);}
});
test('worker install only fetches small pages, and one failed page cannot prevent activation',async()=>{
  const paths=[];
  const w=worker(async(path,options)=>{paths.push(path);assert.ok(options.signal);if(path==='./workshop.html')throw new Error('offline');return new Response('page');});
  const e=event();w.events.install(e);await Promise.all(e.pending);
  assert.equal(paths.length,5);assert.ok(paths.every(path=>path.endsWith('.html')));
  assert.equal(w.puts.length,4);
});
test('successful online navigation refreshes offline content and never caches an error page',async()=>{
  const w=worker(async()=>new Response('current studio'));
  const e=event(navigation('creator.html'));w.events.fetch(e);assert.equal(await (await e.response).text(),'current studio');await Promise.all(e.pending);
  assert.equal(await w.cached.get('./creator.html').text(),'current studio');
});

test('account requests have a deadline, preserve cancellation and never replay writes',async()=>{
  const window={PETFORGE_MEMBERSHIP:{apiUrl:'/api',cookieSession:true,sessionKey:'session'}};
  let calls=0;
  runInNewContext(readFileSync(new URL('../scripts/session.js',import.meta.url),'utf8'),{
    window,AbortSignal,localStorage:{getItem:()=>'',removeItem(){}},
    fetch:async(url,options)=>{calls++;assert.ok(options.signal);if(options.signal.aborted)throw options.signal.reason;throw new Error('network');}
  });
  await assert.rejects(window.PetForgeSession.fetch('/consume',{method:'POST',body:'{}'}),/network/);
  assert.equal(calls,1);
  const abort=new AbortController();abort.abort(new Error('cancelled'));
  await assert.rejects(window.PetForgeSession.fetch('/me',{signal:abort.signal}),/cancelled/);
});
