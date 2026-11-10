import {PROVIDERS,sendChat} from './chat-client.js';

const color = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '';
export function appearanceConfig(value={}, themes=[]) {
  const theme=themes.find(item=>item.id===value.theme) || themes[0];
  return {theme:theme?.id || 'glass-1',title:String(value.title || '和桌宠聊聊').slice(0,32),width:Math.max(300,Math.min(560,Number(value.width)||380)),fontSize:Math.max(12,Math.min(20,Number(value.fontSize)||14)),accent:color(value.accent),background:color(value.background)};
}

export function applyChatTheme(element,theme,appearance) {
  if(!theme||!element)return;
  element.dataset.chatKind=theme.kind;
  const accent=appearance.accent||theme.accent;
  const brightness=[1,3,5].map(i=>parseInt(accent.slice(i,i+2),16)/255).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
  element.style.setProperty('--chat-on-accent',brightness>.58?'#152b27':'#ffffff');
  for(const [key,value] of Object.entries({bg:appearance.background||theme.bg,fg:theme.fg,accent:appearance.accent||theme.accent,border:appearance.accent||theme.border,radius:theme.radius+'px',stroke:theme.borderWidth+'px',line:theme.borderStyle,size:appearance.fontSize+'px',width:appearance.width+'px'})) element.style.setProperty('--chat-'+key,String(value));
}

export async function createChatStudio({onChange}) {
  const response=await fetch('assets/chat-themes.json');if(!response.ok)throw new Error('聊天样式未能加载');
  const themes=await response.json(), $=id=>document.querySelector('#'+id);
  const preview=$('preview-chat'),dialog=$('chat-theme-dialog'),grid=$('chat-theme-grid'),filter=$('chat-theme-filter');
  let appearance=appearanceConfig({},themes),privateKey='',generation=0,testing=false;
  const fields={title:$('chat-title'),width:$('chat-width'),fontSize:$('chat-font-size'),accent:$('chat-accent'),background:$('chat-background')};
  const mode=$('chat-mode'),provider=$('chat-provider'),endpoint=$('chat-endpoint'),model=$('chat-model'),key=$('chat-api-key'),prompt=$('chat-prompt');
  const status=$('chat-connection-status');
  const currentTheme=()=>themes.find(item=>item.id===appearance.theme)||themes[0];
  function paint(){
    applyChatTheme(preview,currentTheme(),appearance);
    $('chat-theme-current').textContent=currentTheme().name;
    $('preview-chat-title').textContent=appearance.title;
    $('preview-chat-mode').textContent=mode.value==='byok'?'自带 Key · 消息会发送至你填写的模型服务':'基础陪伴 · 本地回复，不联网';
    $('chat-private-fields').hidden=mode.value!=='byok';
    $('chat-width-output').textContent=appearance.width+' px';$('chat-font-output').textContent=appearance.fontSize+' px';
    onChange?.();
  }
  function render(){
    grid.replaceChildren();
    themes.filter(item=>!filter.value||item.group===filter.value).forEach(theme=>{
      const button=document.createElement('button');button.type='button';button.className='chat-theme-option';button.setAttribute('aria-pressed',String(appearance.theme===theme.id));button.setAttribute('aria-label',theme.name);button.dataset.userContent='true';
      applyChatTheme(button,theme,{width:380,fontSize:14});
      const sample=document.createElement('span');sample.className='chat-theme-sample';sample.textContent='你好，今天也陪着你。';
      const title=document.createElement('strong');title.textContent=theme.name;const label=document.createElement('small');label.textContent=theme.group;button.append(sample,title,label);
      button.addEventListener('click',()=>{appearance={...appearance,theme:theme.id,accent:'',background:''};fields.accent.value=theme.accent;fields.background.value=theme.bg;paint();render();});grid.append(button);
    });
  }
  for(const group of new Set(themes.map(theme=>theme.group))){const option=document.createElement('option');option.value=group;option.textContent=group;option.dataset.userContent='true';filter.append(option);}
  for(const [name,input] of Object.entries(fields)) input.addEventListener('input',()=>{appearance=appearanceConfig({...appearance,[name]:input.value},themes);paint();});
  function changed(){generation++;status.textContent='';paint();}
  for(const input of [mode,endpoint,model,prompt])input.addEventListener('input',changed);
  provider.addEventListener('change',()=>{const preset=PROVIDERS[provider.value];endpoint.value=preset.endpoint;model.value=preset.model;changed();});
  key.addEventListener('input',()=>{privateKey=key.value.trim();changed();});
  $('chat-forget-key').addEventListener('click',()=>{privateKey='';key.value='';generation++;paint();status.textContent='当前页面的 Key 已清除。';});
  $('chat-theme-open').addEventListener('click',()=>{render();dialog.showModal();});
  $('chat-theme-close').addEventListener('click',()=>dialog.close());filter.addEventListener('change',render);
  $('chat-theme-reset').addEventListener('click',()=>{appearance={...appearance,accent:'',background:''};fields.accent.value=currentTheme().accent;fields.background.value=currentTheme().bg;paint();});
  function getConfig(){return {mode:mode.value==='byok'?'byok':'basic',appearance:{...appearance},provider:provider.value,endpoint:endpoint.value.trim(),model:model.value.trim(),prompt:prompt.value.trim().slice(0,1200)};}
  async function reply(history,signal){const g=generation;const result=await sendChat(getConfig(),privateKey,history,{signal});if(g!==generation)throw new Error('聊天配置已改变，请重新发送。');return result;}
  $('chat-test').addEventListener('click',async()=>{if(testing)return;testing=true;$('chat-test').disabled=true;status.textContent='正在发送测试消息…';try{const answer=await reply([{role:'user',content:'请只回复：连接成功'}]);status.textContent='接口已返回：'+answer.slice(0,160);}catch(error){status.textContent=error.message;}finally{testing=false;$('chat-test').disabled=false;}});
  function load(value={}){
    privateKey='';key.value='';
    generation++;appearance=appearanceConfig(value.appearance,themes);
    for(const [name,input]of Object.entries(fields))input.value=appearance[name]||currentTheme()[name==='background'?'bg':'accent'];
    mode.value=value.mode==='byok'?'byok':'basic';provider.value=PROVIDERS[value.provider]?value.provider:'deepseek';endpoint.value=String(value.endpoint||PROVIDERS[provider.value].endpoint).slice(0,500);model.value=String(value.model||PROVIDERS[provider.value].model).slice(0,160);prompt.value=String(value.prompt||'').slice(0,1200);
    // A shared template never supplies or changes a private key.
    paint();
  }
  load();
  return {getConfig,load,reply,clearHistoryToken:()=>generation};
}
