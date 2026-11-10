import {normalizeEndpoint,apiError,responseText} from '../scripts/chat-client.js';

const OFFICIAL = new Set(['api.deepseek.com','ark.cn-beijing.volces.com']);
const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply = (body,status=200) => new Response(JSON.stringify(body),{status,headers});

export function publicAddress(ip) {
  if (ip.includes(':')) return /^[23][0-9a-f]{3}:/i.test(ip) && !/^2001:(?:0*:|0?db8:)/i.test(ip);
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return false;
  const a=ip.split('.').map(Number);
  return a.every(n=>n>=0&&n<=255) && ![0,10,127].includes(a[0]) && a[0]<224 && !(a[0]===169&&a[1]===254) && !(a[0]===172&&a[1]>=16&&a[1]<=31) && !(a[0]===192&&(a[1]===168||a[1]===0)) && !(a[0]===100&&a[1]>=64&&a[1]<=127) && !(a[0]===198&&(a[1]===18||a[1]===19));
}

export async function publicEndpoint(endpoint,fetcher=fetch) {
  const url = new URL(normalizeEndpoint(endpoint));
  const host=url.hostname;
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host) || /\.(?:localhost|local|internal|test|invalid|onion)$/i.test(host)) throw new Error('仅支持公开的 HTTPS 模型服务地址。');
  if (!OFFICIAL.has(host)) {
    const answers = await Promise.all(['A','AAAA'].map(async type => {
      const response=await fetcher('https://dns.google/resolve?name='+encodeURIComponent(host)+'&type='+type,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:'application/dns-json'}});
      if (!response.ok) throw new Error('接口域名解析失败。');
      const result=await response.json();
      return (result.Answer || []).filter(item=>item.type===1||item.type===28).map(item=>item.data);
    }));
    const ips=answers.flat();
    if (!ips.length || ips.some(ip=>!publicAddress(ip))) throw new Error('接口域名必须指向公开互联网地址。');
  }
  return url.href;
}

export async function onRequest({request},fetcher=fetch) {
  if (request.method!=='POST') return reply({error:'仅支持 POST 请求。'},405);
  const origin=new URL(request.url).origin;
  if (request.headers.get('Origin')!==origin || request.headers.get('Sec-Fetch-Site')==='cross-site' || !/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||'')) return reply({error:'请求来源无效。'},403);
  const size=Number(request.headers.get('Content-Length')||0);
  if (size>64000) return reply({error:'聊天内容过长。'},413);
  try {
    // Never persist, log or cache keys, messages, provider responses or errors.
    const stream=request.body?.getReader();if(!stream)return reply({error:'聊天内容为空。'},400);
    let size=0;const parts=[];
    while(true){const part=await stream.read();if(part.done)break;size+=part.value.length;if(size>64000){await stream.cancel();return reply({error:'聊天内容过长。'},413);}parts.push(part.value);}
    const joined=new Uint8Array(size);let position=0;for(const part of parts){joined.set(part,position);position+=part.length;}
    const raw=new TextDecoder().decode(joined);
    const input=JSON.parse(raw);
    if (!input || typeof input.apiKey!=='string' || !input.apiKey.trim() || input.apiKey.length>4096 || /[\r\n]/.test(input.apiKey)) return reply({error:'请填写有效的 API Key。'},400);
    if (typeof input.model!=='string'||!input.model.trim()||input.model.length>160 || /[\r\n]/.test(input.model)) return reply({error:'模型名称无效。'},400);
    if (!Array.isArray(input.messages)||input.messages.length<1||input.messages.length>13||input.messages.some(item=>!item||!['system','user','assistant'].includes(item.role)||typeof item.content!=='string'||item.content.length>4000)||input.messages.at(-1).role!=='user') return reply({error:'聊天内容格式无效。'},400);
    const endpoint=await publicEndpoint(input.endpoint,fetcher);
    const upstream=await fetcher(endpoint,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(55000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+input.apiKey},body:JSON.stringify({model:input.model,messages:input.messages,stream:false,max_tokens:800})});
    if (!upstream.ok) return reply({error:apiError(upstream.status)},upstream.status>=300&&upstream.status<400?502:upstream.status);
    if (Number(upstream.headers.get('Content-Length')||0)>200000) return reply({error:'模型回复过长，请重试。'},502);
    const reader=upstream.body.getReader();let length=0, chunks=[];
    while (true) { const {done,value}=await reader.read(); if(done)break; length+=value.length; if(length>200000){await reader.cancel();return reply({error:'模型回复过长，请重试。'},502);} chunks.push(value); }
    const bytes=new Uint8Array(length);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
    const text=responseText(JSON.parse(new TextDecoder().decode(bytes)));
    // Only plain reply text reaches the UI. Tool calls and provider metadata are discarded.
    return reply({choices:[{message:{role:'assistant',content:text}}]});
  } catch (error) {
    if (error instanceof SyntaxError) return reply({error:'聊天数据格式无效。'},400);
    const safe=['仅支持公开的 HTTPS 模型服务地址。','接口域名必须指向公开互联网地址。','接口域名解析失败。','接口仅支持不含账号、参数和片段的 HTTPS 地址。','请填写完整的 HTTPS 接口地址。'];
    return reply({error:safe.includes(error.message)?error.message:'聊天连接失败或超时，请检查接口配置后重试。'},502);
  }
}
