import {chatRequest} from './chat-client.js';

// This payload is used only for the owner's download, never for workshop publication.
export function personalChatFile(settings, key) {
  if(settings.mode!=='byok')return null;
  if(typeof key!=='string'||!key.trim()||key.length>4096||/[\r\n]/.test(key))throw new Error('请先填写自己的 API Key，再生成可直接聊天的桌宠。');
  const {endpoint}=chatRequest(settings,[{role:'user',content:'配置校验'}]);
  return {name:'assets/private-chat.json',data:JSON.stringify({version:1,settings:{mode:'byok',endpoint,model:settings.model,prompt:settings.prompt},key:key.trim()})};
}
