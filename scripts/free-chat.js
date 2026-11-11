// Public AI uses the account session; the studio's provider key stays on the server.
export async function freeChat(history, {signal, session=globalThis.PetForgeSession}={}) {
  if(!session)throw new Error('请先登录网站账号，再使用免费 AI。');
  if(history.at(-1)?.content.length>1000)throw new Error('免费 AI 每条提问最多1000字，请缩短后重试。');
  const messages=history.slice(-6).map(item=>({role:item.role,content:item.content.slice(0,1000)}));
  const response=await session.fetch('/ai/chat',{method:'POST',signal,body:JSON.stringify({messages})});
  const result=await response.json();
  if(!response.ok){if(response.status===401)globalThis.PetForgeMembership?.open();if(result.code==='EMAIL_VERIFICATION_REQUIRED')globalThis.PetForgeMembership?.openVerification();throw new Error(result.error || '免费 AI 暂不可用，请稍后重试。');}
  if(result.quota)globalThis.dispatchEvent?.(new CustomEvent('petforge:ai-quota',{detail:result.quota}));
  const text=result.choices?.[0]?.message?.content;
  if(typeof text!=='string'||!text.trim())throw new Error('免费 AI 未返回文字。');
  return text;
}

export async function freeChatFile({session=globalThis.PetForgeSession}={}) {
  if(!session)throw new Error('请先登录网站账号，再下载免费 AI 桌宠。');
  const response=await session.fetch('/ai/device-token',{method:'POST',body:'{}'});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error || '免费 AI 绑定失败，请先登录。');
  if(!/^[a-f0-9]{64}$/.test(result.token || ''))throw new Error('免费 AI 绑定返回异常。');
  return {name:'assets/shared-chat.json',data:JSON.stringify({token:result.token,expiresAt:result.expiresAt})};
}
