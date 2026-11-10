import test from 'node:test';
import assert from 'node:assert/strict';
import {personalChatFile} from '../scripts/chat-package.js';
import {readFileSync} from 'node:fs';
import {normalizeEndpoint,chatRequest,sendChat} from '../scripts/chat-client.js';
import {appearanceConfig} from '../scripts/chat-studio.js';
import {onRequest,publicAddress,publicEndpoint} from '../functions/chat.js';

const request = (body,origin='https://petforge-desktop.pages.dev') => ({request:new Request('https://petforge-desktop.pages.dev/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})});
const body=()=>({endpoint:'https://api.deepseek.com/chat/completions',apiKey:'test-key-not-real',model:'example-model',messages:[{role:'user',content:'你好'}]});
test('200 chat themes have unique IDs, 25 groups and 150 distinct illustrated frames',()=>{
 const themes=JSON.parse(readFileSync(new URL('../assets/chat-themes.json',import.meta.url)));
 assert.equal(themes.length,200);assert.equal(new Set(themes.map(t=>t.id)).size,200);assert.equal(new Set(themes.map(t=>t.group)).size,25);
 const illustrated=themes.filter(t=>t.art);assert.equal(illustrated.length,150);
 assert.equal(new Set(illustrated.map(t=>readFileSync(new URL('../'+t.art,import.meta.url)).toString('base64'))).size,150);
 for(const t of themes)for(const k of ['bg','fg','accent','border'])assert.match(t[k],/^#[a-f0-9]{6}$/i);
 const a=appearanceConfig({width:9000,fontSize:2,accent:'url(evil)',title:'猫'.repeat(70),theme:'invalid'},themes);
 assert.equal(a.width,560);assert.equal(a.fontSize,12);assert.equal(a.accent,'');assert.equal(a.title.length,32);assert.equal(a.theme,'glass-1');
});

test('personal downloads include caller credentials only through a separate private file',()=>{
 const settings={mode:'byok',endpoint:'https://api.deepseek.com',model:'test',prompt:'pet'};
 const file=personalChatFile(settings,'owner-key-not-real');
 assert.equal(file.name,'assets/private-chat.json');assert.equal(JSON.parse(file.data).key,'owner-key-not-real');
 assert.equal(JSON.parse(file.data).settings.endpoint,'https://api.deepseek.com/chat/completions');
 assert.equal(personalChatFile({...settings,mode:'basic'},'owner-key-not-real'),null);
 assert.throws(()=>personalChatFile(settings,''),/API Key/);
 assert.equal(JSON.stringify(settings).includes('owner-key-not-real'),false);
});
test('compatible chat protocol accepts a base URL and bounds history without exporting a key',()=>{
 assert.equal(normalizeEndpoint('https://api.deepseek.com/v1/'),'https://api.deepseek.com/v1/chat/completions');
 for(const url of ['http://example.com','https://user:pass@example.com','https://example.com/?key=secret','https://example.com:9000'])assert.throws(()=>normalizeEndpoint(url));
 const packet=chatRequest({endpoint:'https://api.deepseek.com',model:'test',prompt:'pet'},Array.from({length:20},()=>({role:'user',content:'hello'})));
 assert.equal(packet.body.messages.length,13);assert.equal(packet.body.max_tokens,800);assert.equal(JSON.stringify(packet).includes('apiKey'),false);
});
test('relay transfers the caller key only as authorization and returns plain text only',async()=>{
 let calls=0;
 const result=await onRequest(request(body()),async(url,options)=>{calls++;assert.equal(url,body().endpoint);assert.equal(options.redirect,'manual');assert.equal(options.headers.Authorization,'Bearer '+body().apiKey);const payload=JSON.parse(options.body);assert.equal(payload.apiKey,undefined);assert.equal(payload.stream,false);return Response.json({choices:[{message:{content:'<b>你好</b>',tool_calls:[{name:'never-execute'}]}}],secret:'do not expose'});});
 assert.equal(result.status,200);assert.equal(calls,1);assert.equal(result.headers.get('Cache-Control'),'no-store');
 assert.deepEqual(await result.json(),{choices:[{message:{role:'assistant',content:'<b>你好</b>'}}]});
});
test('relay blocks cross-origin requests, private hosts, bad input and redirects without leaking errors',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw new Error('secret-test-key-not-real');};
 assert.equal((await onRequest(request(body(),'https://evil.example'),fetcher)).status,403);
 for(const endpoint of ['https://127.0.0.1','https://localhost','https://169.254.169.254','https://foo.internal'])assert.notEqual((await onRequest(request({...body(),endpoint}),fetcher)).status,200);
 assert.equal(calls,0);
 for(const ip of ['127.0.0.1','10.1.1.1','172.16.0.1','192.168.0.1','100.64.0.1','::1','fe80::1','fc00::1','2001:db8::1'])assert.equal(publicAddress(ip),false,ip);
 assert.equal(publicAddress('8.8.8.8'),true);
 await assert.rejects(publicEndpoint('https://custom.example/v1',async()=>Response.json({Answer:[{type:1,data:'127.0.0.1'}]})));
 const redirect=await onRequest(request(body()),async()=>new Response('',{status:307,headers:{Location:'https://evil.example'}}));assert.equal(redirect.status,502);
 const failure=await onRequest(request(body()),fetcher);assert.equal((await failure.text()).includes(body().apiKey),false);
 const denied=await onRequest(request(body()),async()=>new Response('raw secret provider message',{status:401}));assert.equal(denied.status,401);assert.equal((await denied.text()).includes('raw secret'),false);
});
test('browser client supports successful replies, invalid keys and cancellation without persistence',async()=>{
 const settings={endpoint:'https://api.deepseek.com',model:'test'};
 let requestBody;
 const answer=await sendChat(settings,'caller-key',[{role:'user',content:'hello'}],{fetcher:async(url,options)=>{assert.equal(url,'/chat');assert.equal(options.credentials,'omit');requestBody=JSON.parse(options.body);return Response.json({choices:[{message:{content:'reply'}}]});}});
 assert.equal(answer,'reply');assert.equal(requestBody.apiKey,'caller-key');
 await assert.rejects(sendChat(settings,'',[]),/API Key/);
 await assert.rejects(sendChat(settings,'key',[{role:'user',content:'hi'}],{fetcher:async()=>new Response('not json')}),/托管地址/);
});
