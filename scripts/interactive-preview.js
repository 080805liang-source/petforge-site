const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function constrainPosition(position, bounds) {
  return {x: clamp(position.x, 12, Math.max(12, bounds.width - bounds.petWidth - 12)),
    y: clamp(position.y, 52, Math.max(52, bounds.height - bounds.petHeight - 38))};
}

export function stepPosition(position, pointer, bounds, config, delta) {
  if (config.animationPreset || !pointer || !['follow', 'playful'].includes(config.cursorFollowMode)) return constrainPosition(position, bounds);
  const dx = pointer.x - position.x - bounds.petWidth / 2, dy = pointer.y - position.y - bounds.petHeight / 2;
  const distance = Math.max(1, Math.hypot(dx, dy)), stop = Math.max(55, Math.min(110, bounds.petWidth * .4));
  let target = position;
  if (config.cursorFollowMode === 'follow' && distance > stop + 6) {
    target = {x: pointer.x - bounds.petWidth / 2 - dx / distance * stop, y: pointer.y - bounds.petHeight / 2 - dy / distance * stop};
  } else if (config.cursorFollowMode === 'playful' && distance < 160) {
    target = {x: position.x - dx * .44, y: position.y - dy * .44};
  }
  target = constrainPosition(target, bounds);
  const blend = 1 - Math.exp(-Math.min(delta, .05) / .22);
  return constrainPosition({x: position.x + (target.x - position.x) * blend, y: position.y + (target.y - position.y) * blend}, bounds);
}

export function pickReply(topics, text, topic = 'default', random = Math.random) {
  if (text) {
    const input = text.toLowerCase().slice(0,1000);
    let best = 0;
    for (const [key, item] of Object.entries(topics)) {
      const score = (item.keywords || []).reduce((sum, word) => sum + (input.includes(word.toLowerCase()) ? word.length : 0), 0);
      if (score > best) { best = score; topic = key; }
    }
  }
  const replies = topics[topic]?.replies || topics.default?.replies || ['我在这里，安静陪着你。'];
  return replies[Math.min(replies.length - 1, Math.floor(random() * replies.length))];
}

export function createInteractivePreview({getConfig, hasImage, renderAnimalFrame, playPetAction = () => false, hasPetActions = () => false, getPetPlayer = () => null, replyWithModel, chatGeneration = () => 0}) {
  const shell = document.querySelector('[data-preview-shell]'), actor = document.querySelector('#preview-actor');
  const image = document.querySelector('#preview-pet'), canvas = document.querySelector('#preview-animal');
  const bubble = document.querySelector('#preview-bubble'), particles = document.querySelector('#preview-particles');
  const feedback = document.querySelector('#preview-feedback'), note = document.querySelector('#preview-live-note');
  const keyboard = actor.querySelector('.preview-keyboard'), buttons = [...document.querySelectorAll('[data-preview-action]')];
  const chat = document.querySelector('#preview-chat'), chatInput = document.querySelector('#preview-chat-input');
  const chatLog = document.querySelector('#preview-chat-log'), chatForm = document.querySelector('#preview-chat-form');
  const menu = document.querySelector('#preview-menu'), mockWindow = document.querySelector('#preview-window'), windowToggle = document.querySelector('#preview-window-toggle');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let config, bounds, position, pointer = null, drag = null, action = null;
  let frame = 0, lastFrame = 0, hiddenUntil = 0, typingUntil = 0, bubbleTimer, clickTimer, repliesPromise;
  let hovered = false, lastHover = 0, lastGreeting = 0, nextWander = 0, clickCount = 0, lastPositionSetting;
  let lastPreset, lastImage, cancelledClick = false, chatBusy = false, windowOpen = false;
  let chatHistory=[], requestController, lastChatGeneration;

  function say(text, duration = 3500) {
    clearTimeout(bubbleTimer);
    bubble.textContent = text;
    bubble.hidden = false;
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, duration);
  }
  function announce(text) { feedback.textContent = text; }
  function measure() {
    const source = !canvas.hidden ? canvas : image;
    const ratio = (source.naturalHeight || source.height || 1) / (source.naturalWidth || source.width || 1);
    const areaHeight = chat.hidden ? shell.clientHeight : Math.max(120,shell.clientHeight - chat.offsetHeight - 42);
    let width = Math.min(210 * config.size / 100, shell.clientWidth * .56);
    width = Math.min(width, (chat.hidden ? shell.clientHeight * .49 : Math.max(48,areaHeight - 86)) / Math.max(.1, ratio));
    bounds = {width: shell.clientWidth, height: areaHeight, petWidth: width, petHeight: width * ratio};
    actor.style.width = `${width}px`; actor.style.height = `${width * ratio}px`;
  }
  function reset() {
    if (!bounds) return;
    position = constrainPosition({x: config.position === 'bottom-left' ? bounds.width * .1 : config.position === 'center' ? (bounds.width - bounds.petWidth) / 2 : bounds.width * .85 - bounds.petWidth,
      y: config.position === 'center' ? (bounds.height - bounds.petHeight) / 2 : bounds.height - bounds.petHeight - 58}, bounds);
    pointer = null; action = null; hiddenUntil = 0; typingUntil = 0; drag = null;
    particles.replaceChildren(); bubble.hidden = true; nextWander = performance.now() + 22000;
    draw(performance.now(), 0);
  }
  function animate(mode) {
    if (!config.motionEnabled || reducedMotion.matches || mode === 'none') return;
    action = {mode, start: performance.now()};
  }
  function burst(close = false) {
    if (!config.motionEnabled || reducedMotion.matches) return;
    for (let index = 0; index < (close ? 5 : 3); index++) {
      const particle = document.createElement('span');
      particle.textContent = (close ? ['✦','♥','·'] : ['✦','·','+'])[index % 3];
      particle.style.left = `${position.x + bounds.petWidth / 2 + (Math.random() - .5) * 70}px`;
      particle.style.top = `${position.y + bounds.petHeight / 2}px`;
      particle.style.setProperty('--particle-drift', `${(Math.random() - .5) * 70}px`);
      particles.append(particle);
      setTimeout(() => particle.remove(), 500);
    }
  }
  function singleClick() {
    if (!hasImage()) return;
    const player=getPetPlayer();
    if (player?.interactive) {
      player.click(performance.now());
      say({pet:'摸摸头～我先站好。',angry:'汪汪汪(生气，怒吼）',calm:'好啦，冷静一下，等会儿继续跟着你。'}[player.state]);
      announce('大狗互动：'+player.state);return;
    }
    if (!playPetAction('pet')) animate(config.clickAnimation);
    if (config.clickParticles) burst();
    say(clickCount++ === 0 ? config.clickLine : config.status === 'sleeping' ? '困了就歇一会儿，我陪你。' : config.clickLine);
    announce('单击互动已播放');
  }
  function doubleClick() {
    clearTimeout(clickTimer);
    if (!hasImage()) return;
    if (getPetPlayer()?.interactive) return;
    if (playPetAction('play')) { say('再陪我玩一会儿吧。'); announce('逗玩互动已播放'); return; }
    const effect = config.doubleClickEffect;
    if (effect === 'spin') { animate('spin'); burst(true); say('转个圈给你看！'); }
    else if (effect === 'celebrate') { animate('glow'); burst(true); say('今天也值得庆祝。'); }
    else if (effect === 'quiet') say('我在这里，安静陪着你。');
    else { animate('jump'); if (config.clickParticles) burst(true); say('贴贴，今天也一起加油。'); }
    announce('双击互动已播放');
  }
  function enterPet() {
    hovered = true;
    const now = performance.now();
    if (now - lastHover < 900) return;
    lastHover = now;
    if (!config.motionEnabled) { if (config.hoverBubble) say('我在这里，安静陪着你。',1800); return; }
    if (config.hoverEffect === 'greeting' && config.hoverBubble) say('你好呀，我看到你啦。',1800);
    if (config.hoverEffect === 'hop') animate('jump');
    if (config.hoverEffect === 'sparkle') burst();
    if (config.hoverEffect === 'shy') animate('shy');
    if (config.hoverEffect !== 'none') announce('悬停互动已播放');
  }
  function leavePet() {
    hovered = false;
    if (!config.motionEnabled || drag) return;
    if (config.leaveEffect === 'goodbye') say('我在这里等你。',1800);
    if (config.leaveEffect === 'hide') { hiddenUntil = performance.now() + 1100; bubble.hidden = true; announce('暂时藏起来，一会儿就回来'); }
  }
  function typePreview() {
    if (!hasImage() || !config.motionEnabled || !config.keyboardSync) return;
    typingUntil = performance.now() + 675;
    if (config.keyboardReaction === 'cheer') say('打字也要加油！',1800);
    announce('正在演示键盘同步');
  }
  function draw(now, delta) {
    if (!position || !bounds) return;
    const player=getPetPlayer(), dog=player?.interactive;
    const paused=dog && player.paused(now);
    actor.style.cursor=dog && player.state==='angry' ? 'url("assets/play-stick.png") 5 5, pointer' : '';
    // Cursor response is a selected interaction, rather than ambient animation.
    if (!drag && now >= hiddenUntil && chat.hidden && !paused) position = stepPosition(position,pointer,bounds,dog ? {...config,animationPreset:''} : config,delta);
    let x = 0, y = 0;
    const moving = config.motionEnabled && !reducedMotion.matches;
    if (moving && !drag) {
      if (config.idleBehavior === 'float') y += Math.sin(now / 600) * 3;
      if (config.idleBehavior === 'nap') y += Math.sin(now / 1320);
      if (config.idleBehavior === 'look') x += Math.sin(now / 850) * 4;
      if (config.idleBehavior === 'stretch') y -= Math.max(0,Math.sin(now / 950)) ** 8 * 8;
      if (action) {
        const progress = (now - action.start) / 490;
        if (progress >= 1) action = null;
        else {
          const envelope = Math.sin(progress * Math.PI), wave = Math.sin(progress * Math.PI * 6);
          if (action.mode === 'jump') y -= envelope * 26;
          if (action.mode === 'shake') x += wave * 10 * (1 - progress);
          if (action.mode === 'wiggle') { x += wave * 7; y -= envelope * 4; }
          if (action.mode === 'dash') x += envelope * 34;
          if (action.mode === 'spin') { x += Math.sin(progress * Math.PI * 2) * 18; y -= envelope * 14; }
          if (action.mode === 'shy') x -= envelope * 12;
        }
      }
      if (now < typingUntil && config.keyboardReaction !== 'quiet') { x += Math.sin(now / 35) * 4; y += Math.abs(Math.cos(now / 35)) * 4; }
      if (config.wanderEnabled && !pointer && now >= nextWander && !hovered && !paused && chat.hidden) {
        position = constrainPosition({x:12 + Math.random() * (bounds.width - bounds.petWidth - 24),y:52 + Math.random() * (bounds.height - bounds.petHeight - 90)},bounds);
        nextWander = now + 22000 + Math.random() * 20000;
        if (config.hoverBubble) say('换个地方陪你。',1800);
      }
    }
    if (!config.animationPreset && config.cursorFollowMode === 'look' && pointer && chat.hidden && !drag) {
      x += clamp((pointer.x - position.x - bounds.petWidth / 2) / 38,-8,8);
      y += clamp((pointer.y - position.y - bounds.petHeight / 2) / 55,-4,4);
    }
    const visible = constrainPosition({x:position.x + x,y:position.y + y},bounds);
    actor.style.transform = `translate(${visible.x.toFixed(2)}px, ${visible.y.toFixed(2)}px)`;
    actor.style.visibility = now < hiddenUntil ? 'hidden' : 'visible';
    actor.classList.toggle('is-glowing',moving && action?.mode === 'glow');
    keyboard.hidden = !(moving && config.keyboardSync && now < typingUntil);
    bubble.style.left = `${clamp(visible.x - 15,12,Math.max(12,bounds.width - Math.min(240,bounds.width * .8) - 12))}px`;
    bubble.style.top = `${Math.max(45,visible.y - bubble.offsetHeight - 12)}px`;
    if (config.motionEnabled) renderAnimalFrame(now);
  }
  function tick(now) {
    frame = 0;
    if (!hasImage() || document.hidden) return;
    if (now - lastFrame >= 1000 / 60 - .5) { draw(now,(now-lastFrame)/1000); lastFrame = now; }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    config = getConfig();
    const generation=chatGeneration();
    if(generation!==lastChatGeneration){requestController?.abort();chatHistory=[];chatLog.replaceChildren();lastChatGeneration=generation;if(!chat.hidden)announce(config.chat?.mode==='free'?'免费 AI · 豆包 · 每人每天20次':config.chat?.mode==='byok'?'自带 Key 模式 · 使用你填写的模型服务':'基础陪伴 · 本地回复，不联网');}
    const ready = hasImage(); actor.hidden = !ready || (windowOpen && config.desktopOnly);
    actor.classList.toggle('is-topmost',config.alwaysOnTop);
    buttons.forEach(button => { button.disabled = !ready || (button.dataset.previewAction === 'typing' && (!config.motionEnabled || !config.keyboardSync)); });
    buttons.filter(button => ['pet','play','sleep','wake'].includes(button.dataset.previewAction)).forEach(button => { button.hidden = !hasPetActions(); button.disabled = !ready || !config.motionEnabled; });
    const motionButton = buttons.find(button => button.dataset.previewAction === 'motion');
    const motionText = config.motionEnabled ? '暂停动态试用' : '开启动态试用';
    motionButton.textContent = window.PETFORGE_I18N?.translate(motionText) || motionText;
    motionButton.setAttribute('aria-pressed',String(config.motionEnabled));
    note.textContent = !ready ? '上传图片后开始互动' : config.animationPreset ? '单击摸头 · 双击逗玩 · 右键更多互动' : ({look:'在框内移动鼠标，看看它的回应',follow:'在框内移动鼠标，它会慢慢靠近',playful:'把鼠标移近，看看它往哪儿躲',none:'试试点击、双击或拖动它'}[config.cursorFollowMode]);
    if (!ready || document.hidden) {
      cancelAnimationFrame(frame); frame = 0;
      if (!ready) { bubble.hidden = true; particles.replaceChildren(); closeChat(false); }
      return;
    }
    measure();
    const changedImage = image.src !== lastImage || config.animationPreset !== lastPreset;
    if (!position || changedImage || config.position !== lastPositionSetting) reset();
    else position = constrainPosition(position,bounds);
    lastImage = image.src; lastPreset = config.animationPreset; lastPositionSetting = config.position;
    if (!config.motionEnabled) { action = null; typingUntil = 0; hiddenUntil = 0; particles.replaceChildren(); }
    if (changedImage) { clickCount = 0; requestController?.abort(); chatHistory=[]; chatLog.replaceChildren(); say(config.clickLine); }
    if (windowOpen && config.desktopOnly) { bubble.hidden = true; closeChat(false); menu.hidden = true; }
    draw(performance.now(),0);
    if (!frame) { lastFrame = performance.now(); frame = requestAnimationFrame(tick); }
  }
  function closeChat(focus = true) {
    chat.hidden = true;
    buttons.find(button => button.dataset.previewAction === 'chat').setAttribute('aria-expanded','false');
    if (focus) { measure(); reset(); buttons.find(button => button.dataset.previewAction === 'chat').focus(); }
  }
  function toggleChat() {
    chat.hidden = !chat.hidden;
    buttons.find(button => button.dataset.previewAction === 'chat').setAttribute('aria-expanded',String(!chat.hidden));
    pointer = null;
    measure(); reset();
    if (!chat.hidden) {
      position = constrainPosition({x:(bounds.width-bounds.petWidth)/2,y:52},bounds);
      chatInput.focus({preventScroll:true});
      shell.scrollIntoView({block:'start',behavior:reducedMotion.matches ? 'instant' : 'smooth'});
      announce(config.chat?.mode==='free'?'免费 AI · 豆包 · 每人每天20次':config.chat?.mode==='byok'?'自带 Key 模式 · 使用你填写的模型服务':'基础陪伴 · 本地回复，不联网');
    }
  }
  function addMessage(text, user = false) {
    const message = document.createElement('p'); message.className = user ? 'from-user' : 'from-pet';
    const who = document.createElement('b'); who.textContent = user ? '你' : config.name;
    message.append(who,document.createTextNode(text)); chatLog.append(message);
    while (chatLog.children.length > 20) chatLog.firstElementChild.remove();
    chatLog.scrollTop = chatLog.scrollHeight;
    measure(); position = constrainPosition(position,bounds);
  }
  chatForm.addEventListener('submit',async event => {
    event.preventDefault(); const text = chatInput.value.trim().slice(0,4000);
    if (!text || chatBusy || !hasImage()) return;
    chatBusy = true; chatForm.querySelector('button').disabled = true; addMessage(text,true); chatInput.value = '';
    const source = image.src;
    const generation=chatGeneration();
    requestController=new AbortController();
    try {
      let reply;
      if(['byok','free'].includes(config.chat?.mode)) {
        reply=await replyWithModel([...chatHistory,{role:'user',content:text}],requestController.signal);
      } else {
      repliesPromise ||= fetch('assets/responses.json',{signal:AbortSignal.timeout(15000)}).then(response => { if (!response.ok) throw new Error('replies-unavailable'); return response.json(); });
      const bank = await repliesPromise;
      reply=pickReply(bank.topics,text);
      }
      if (image.src !== source || !hasImage() || generation!==chatGeneration()) return;
      chatHistory=[...chatHistory,{role:'user',content:text},{role:'assistant',content:reply}].slice(-12);
      addMessage(reply); say(reply,6500);
    } catch (error) {
      repliesPromise = null;
      if (image.src === source && hasImage() && generation===chatGeneration()) addMessage(['byok','free'].includes(config.chat?.mode)?error.message:'回复库暂时未能加载，请稍后再试。');
    } finally { chatBusy = false; chatForm.querySelector('button').disabled = false; }
  });
  document.querySelector('#preview-chat-close').addEventListener('click',() => closeChat());
  chat.addEventListener('keydown',event => { if (event.key === 'Escape') { event.stopPropagation(); closeChat(); } });
  buttons.forEach(button => button.addEventListener('click',() => {
    const kind = button.dataset.previewAction;
    if (['pet','play','sleep','wake'].includes(kind) && playPetAction(kind)) {
      const line = {pet:'摸摸头，今天也有你陪着。',play:'再陪我玩一会儿吧。',sleep:'我闭眼歇一会儿，醒了再陪你。',wake:'睡醒啦，我在这里。'}[kind];
      say(line); announce(line);
    }
    if (kind === 'motion') {
      const control = document.querySelector('#pet-motion'); control.checked = !control.checked;
      control.dispatchEvent(new Event('change',{bubbles:true}));
    }
    if (kind === 'click') singleClick();
    if (kind === 'double') doubleClick();
    if (kind === 'typing') typePreview();
    if (kind === 'chat') toggleChat();
    if (kind === 'reset') { reset(); announce('桌宠已回到初始位置'); }
  }));
  shell.addEventListener('pointermove',event => {
    if (!hasImage()) return;
    const rect = shell.getBoundingClientRect();
    pointer = event.target.closest('.preview-chat') ? null : {x:event.clientX-rect.left,y:event.clientY-rect.top};
    if (drag && event.pointerId === drag.id && pointer) {
      if (Math.hypot(event.clientX - drag.clientX,event.clientY - drag.clientY) > 4) drag.moved = true;
      if (drag.moved) position = constrainPosition({x:drag.x+event.clientX-drag.clientX,y:drag.y+event.clientY-drag.clientY},bounds);
    }
    const interval = config.proactiveFrequency === 'lively' ? 15000 : 32000;
    if (pointer && config.motionEnabled && config.hoverBubble && config.proactiveFrequency !== 'quiet' && performance.now() - lastGreeting > interval && Math.hypot(pointer.x-position.x-bounds.petWidth/2,pointer.y-position.y-bounds.petHeight/2) < 150) {
      lastGreeting = performance.now(); say('想和我玩一下吗？',1800);
    }
  });
  shell.addEventListener('pointerleave',() => { pointer = null; });
  actor.addEventListener('pointerenter',enterPet); actor.addEventListener('pointerleave',leavePet);
  actor.addEventListener('pointerdown',event => {
    if (event.button !== 0) return;
    drag = {id:event.pointerId,x:position.x,y:position.y,clientX:event.clientX,clientY:event.clientY,moved:false};
    cancelledClick = false; action = null; clearTimeout(clickTimer); actor.setPointerCapture(event.pointerId);
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    cancelledClick = drag.moved || event.type === 'pointercancel'; drag = null;
    if (actor.hasPointerCapture(event.pointerId)) actor.releasePointerCapture(event.pointerId);
    if (cancelledClick) announce('桌宠已移动到这里');
  }
  actor.addEventListener('pointerup',endDrag); actor.addEventListener('pointercancel',endDrag);
  actor.addEventListener('lostpointercapture',() => { drag = null; });
  actor.addEventListener('click',event => {
    if (cancelledClick) { cancelledClick = false; return; }
    clearTimeout(clickTimer);
    if (getPetPlayer()?.interactive) { singleClick();return; }
    if (event.detail < 2) clickTimer = setTimeout(singleClick,210);
  });
  actor.addEventListener('dblclick',doubleClick);
  actor.addEventListener('contextmenu',event => {
    event.preventDefault(); menu.replaceChildren(); pointer = null;
    function item(label, handler) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.addEventListener('click',() => { menu.hidden = true; handler(); }); menu.append(button);
    }
    item('和它聊聊',() => { if (chat.hidden) toggleChat(); });
    if (hasPetActions()) for (const [key,label] of [['pet','摸摸头'],['play','逗它玩'],['sleep','闭眼休息'],['wake','叫醒它']]) item(label,() => {
      if (playPetAction(key)) { say(label); announce(label); }
      else announce('请先开启动态试用');
    });
    item('试试单击',singleClick); item('试试双击',doubleClick);
    for (const shortcut of config.customShortcuts) item(shortcut.label,() => { say(shortcut.label); announce('快捷入口预览：生成后会打开对应应用或网址'); });
    const rect = shell.getBoundingClientRect(); menu.hidden = false;
    menu.style.left = `${clamp(event.clientX-rect.left,12,Math.max(12,bounds.width-190))}px`;
    menu.style.top = `${clamp(event.clientY-rect.top,42,Math.max(42,bounds.height-Math.min(menu.scrollHeight,260)-12))}px`;
    menu.firstElementChild.focus();
  });
  document.addEventListener('pointerdown',event => { if (!menu.contains(event.target)) menu.hidden = true; });
  menu.addEventListener('keydown',event => { if (event.key === 'Escape') { menu.hidden = true; actor.focus(); } });
  function toggleWindow() {
    windowOpen = !windowOpen; mockWindow.hidden = !windowOpen; pointer = null;
    windowToggle.setAttribute('aria-pressed',String(windowOpen)); sync();
    announce(windowOpen ? '模拟窗口已打开，试试切换桌宠显示设置' : '已回到预览桌面');
  }
  windowToggle.addEventListener('click',toggleWindow);
  document.querySelector('#preview-window-close').addEventListener('click',toggleWindow);
  document.addEventListener('keydown',event => {
    if (event.isComposing || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    if (shell.contains(document.activeElement) || pointer) typePreview();
  });
  document.querySelectorAll('.function-panel select, .function-panel input, #pet-animation').forEach(control => control.addEventListener('change',() => {
    sync();
    if (!hasImage()) return;
    if (control.id === 'hover-effect') { lastHover = 0; enterPet(); hovered = false; }
    if (control.id === 'leave-effect') leavePet();
    if (control.id === 'pet-animation') animate(config.clickAnimation);
    if (control.id === 'double-click-effect') doubleClick();
    if (control.id === 'click-particles' && config.clickParticles) burst();
    if (control.id === 'keyboard-sync' || control.id === 'keyboard-reaction') typePreview();
    if (control.id === 'wander-enabled' && config.wanderEnabled) nextWander = performance.now();
    if (control.id === 'sound-hint' && config.soundHint) say('桌宠不会擅自播放声音。');
  }));
  new ResizeObserver(sync).observe(shell);
  reducedMotion.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  image.addEventListener('load',sync);
  sync();
  return {sync};
}
