export const PROVIDERS = {
  deepseek: {label:'DeepSeek',endpoint:'https://api.deepseek.com/chat/completions',model:'deepseek-flash'},
  doubao: {label:'豆包 / 火山方舟',endpoint:'https://ark.cn-beijing.volces.com/api/v3/chat/completions',model:''},
  arkAgent: {label:'火山方舟 Agent',endpoint:'https://ark.cn-beijing.volces.com/api/v3/bots/chat/completions',model:''},
  custom: {label:'自定义兼容接口',endpoint:'',model:''}
};

export function normalizeEndpoint(value) {
  let url;
  try { url = new URL(String(value).trim()); } catch { throw new Error('请填写完整的 HTTPS 接口地址。'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.port && url.port !== '443')) throw new Error('接口仅支持不含账号、参数和片段的 HTTPS 地址。');
  if (!url.pathname.endsWith('/chat/completions')) url.pathname = url.pathname.replace(/\/+$/,'') + '/chat/completions';
  return url.href;
}

export function chatRequest(settings, history) {
  const endpoint = normalizeEndpoint(settings.endpoint);
  const model = String(settings.model || '').trim();
  if (!model || model.length > 160 || /[\r\n]/.test(model)) throw new Error('请填写服务商提供的模型名称或 Agent ID。');
  const messages = history.filter(item => ['user','assistant'].includes(item.role) && typeof item.content === 'string').slice(-12).map(item => ({role:item.role,content:item.content.slice(0,4000)}));
  if (!messages.length || messages.at(-1).role !== 'user') throw new Error('请先输入要发送的内容。');
  const prompt = String(settings.prompt || '你是一只友善的桌面宠物。用简洁自然的中文回答，帮助用户处理日常问题。').slice(0,1200);
  return {endpoint,body:{model,messages:[{role:'system',content:prompt},...messages],stream:false,max_tokens:800}};
}

export function apiError(status) {
  return ({400:'模型名称或请求格式不被服务商接受，请检查配置。',401:'API Key 无效或已过期，请重新填写。',402:'服务商账户额度不足，请检查余额。',403:'此 Key 没有该模型的调用权限。',404:'接口或模型不存在，请核对地址与模型名称。',429:'服务商限流或额度已用尽，请稍后再试。'})[status] || '模型服务暂时不可用，请稍后重试。';
}

export function responseText(data) {
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('接口没有返回可显示的文字，请确认支持 Chat Completions。');
  return text.slice(0,12000);
}

export async function sendChat(settings, key, history, {signal, fetcher=fetch} = {}) {
  if (!key || key.length > 4096 || /[\r\n]/.test(key)) throw new Error('请先填写自己的 API Key。');
  const {endpoint,body} = chatRequest(settings,history);
  let response;
  try {
    response = await fetcher('/chat',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',redirect:'error',signal:signal || AbortSignal.timeout(60000),body:JSON.stringify({endpoint,apiKey:key,...body})});
  } catch (error) {
    throw new Error(error.name === 'AbortError' || error.name === 'TimeoutError' ? '请求已取消或超时，可以重试。' : '无法连接聊天接口，请检查网络后重试。');
  }
  let data; try { data = await response.json(); } catch { throw new Error('当前托管地址不支持在线模型预览，请使用主站或导出的桌宠。'); }
  if (!response.ok) throw new Error(data.error || apiError(response.status));
  return responseText(data);
}
