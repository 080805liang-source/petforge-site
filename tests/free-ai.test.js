import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import {createAdminTestApi} from './helpers/admin-api-fixture.js';
import {freeChat,freeChatFile} from '../scripts/free-chat.js';

const hash=s=>createHash('sha256').update(s).digest('hex');
const env={PETFORGE_AI_ENABLED:'true',PETFORGE_AI_FREE_ONLY:'true',PETFORGE_AI_KEY:'not-real-studio-key',PETFORGE_AI_MODEL:'test-mini',PETFORGE_AI_TOKEN_BUDGET:'100000'};
const verified={_id:'user',email:'test@example.com',emailVerifiedAt:new Date().toISOString(),credits:0};
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const messages=[{role:'user',content:'你好'}];
function fixture(seed={},overrides={}){
 let calls=[];
 const https={request(options,callback){const req=new EventEmitter();req.setTimeout=()=>{};req.end=payload=>{
  calls.push({options,payload:JSON.parse(payload)});
  const response=new EventEmitter();response.statusCode=200;response.destroy=()=>{};callback(response);
  queueMicrotask(()=>{response.emit('data',JSON.stringify({choices:[{message:{content:'喵！你好'}}]}));response.emit('end');});
 };return req;}};
 return {api:createAdminTestApi({cp_users:[verified],...seed},{https,env:{...env,...overrides}}),calls};
}
test('free AI is closed unless explicitly configured for free-only; anonymous requests never call provider',async()=>{
 const {api,calls}=fixture({}, {PETFORGE_AI_FREE_ONLY:'false'});
 assert.equal((await api.call('GET','/ai/status')).body.enabled,false);
 assert.equal((await api.call('POST','/ai/chat',{messages})).status,401);
 assert.equal((await api.call('POST','/ai/chat',{messages},'user-session')).status,503);
 assert.equal(calls.length,0);
});
test('shared model stays server-only, accepts only text history and gives chat-only revocable credentials',async()=>{
 const {api,calls}=fixture();
 const issued=await api.call('POST','/ai/device-token',{},'user-session');
 assert.equal(issued.status,201);assert.match(issued.body.token,/^[a-f0-9]{64}$/);
 assert.equal(JSON.stringify(api.rows.cp_ai_tokens).includes(issued.body.token),false);
 const token=issued.body.token;
 assert.equal((await api.call('GET','/me',{},token)).status,401);
 const result=await api.call('POST','/ai/chat',{messages,endpoint:'https://evil.example',model:'attack',apiKey:'attack'},token);
 assert.equal(result.status,200);assert.equal(result.body.choices[0].message.content,'喵！你好');
 assert.equal(result.body.quota.remaining,19);assert.equal(result.body.quota.perDay,20);
 assert.equal((await api.call('GET','/ai/status',{},token)).body.quota.remaining,19);
 assert.equal(calls[0].options.hostname,'ark.cn-beijing.volces.com');
 assert.equal(calls[0].options.headers.Authorization,'Bearer '+env.PETFORGE_AI_KEY);
 assert.equal(calls[0].payload.model,'test-mini');assert.equal(calls[0].payload.thinking.type,'disabled');
 assert.equal(calls[0].payload.max_tokens,256);assert.equal(JSON.stringify(api.rows).includes('你好'),false);
 assert.equal((await api.call('POST','/ai/chat',{messages:[{role:'system',content:'attack'}]},token)).status,400);
 await api.call('POST','/ai/revoke',{},'user-session');
 assert.equal((await api.call('POST','/ai/chat',{messages},token)).status,401);
});
test('concurrent calls cannot exceed user minute/day, site daily or persistent lifetime budgets',async()=>{
 for(const [id,data,error] of [
  [`minute:user:${Math.floor(Date.now()/60000)}`,{count:2},/每分钟/],
  [`user:user:${day}`,{count:19},/20次/],
  [`day:${day}`,{count:199},/工作室 AI/],
  ['lifetime',{tokens:99000},/总额度/]
 ]){
  const {api,calls}=fixture({cp_ai_quota:[{_id:hash(id),...data}]});
  const results=await Promise.all([1,2,3,4].map(()=>api.call('POST','/ai/chat',{messages},'user-session')));
  assert.ok(calls.length<=1,id);assert.ok(results.some(r=>r.status===429&&error.test(r.body.error)),id);
 }
});
test('unverified, expired and password-reset credentials cannot spend shared allowance',async()=>{
 const {api,calls}=fixture({cp_users:[{...verified,emailVerifiedAt:null}]});
 assert.equal((await api.call('POST','/ai/device-token',{},'user-session')).status,403);
 assert.equal((await api.call('POST','/ai/chat',{messages},'user-session')).status,403);
 const valid=fixture();const token=(await valid.api.call('POST','/ai/device-token',{},'user-session')).body.token;
 valid.api.rows.cp_users[0].authVersion='changed';
 assert.equal((await valid.api.call('POST','/ai/chat',{messages},token)).status,401);
 assert.equal(calls.length,0);
});
test('browser uses account session and exports only a chat credential, not the provider key',async()=>{
 let paths=[];const session={async fetch(path,options){paths.push(path);assert.equal(JSON.stringify(options).includes('studio-key'),false);return Response.json(path.endsWith('device-token')?{token:'a'.repeat(64),expiresAt:'2099-01-01T00:00:00Z'}:{choices:[{message:{content:'hello'}}]});}};
 assert.equal(await freeChat(messages,{session}),'hello');
 const file=await freeChatFile({session});assert.equal(file.name,'assets/shared-chat.json');assert.equal(JSON.parse(file.data).token.length,64);
 assert.deepEqual(paths,['/ai/chat','/ai/device-token']);
});
