import test from 'node:test';
import assert from 'node:assert/strict';
import {constrainPosition,stepPosition,pickReply} from '../scripts/interactive-preview.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const bounds = {width:480,height:480,petWidth:180,petHeight:180};
const start = {x:30,y:70}, pointer = {x:420,y:400};
const config = {motionEnabled:true,cursorFollowMode:'follow'};

test('following moves toward the pointer without crossing the preview frame', () => {
  let position = {...start};
  for (let i=0;i<120;i++) position = stepPosition(position,pointer,bounds,config,1/60);
  assert.ok(position.x>start.x && position.y>start.y);
  assert.deepEqual(constrainPosition(position,bounds),position);
  for (const edge of [{x:-500,y:-500},{x:5000,y:5000}]) {
    for (let i=0;i<120;i++) position = stepPosition(position,edge,bounds,config,1/60);
    assert.ok(position.x>=12 && position.x+180<=468 && position.y>=52 && position.y+180<=442);
  }
});

test('disabled follow and realistic animals stay put; static mouse tracking matches the desktop runtime', () => {
  for (const setting of [{cursorFollowMode:'none'},{animationPreset:'animal-900000001'}]) {
    assert.deepEqual(stepPosition(start,pointer,bounds,{...config,...setting},1),start);
  }
  assert.ok(stepPosition(start,pointer,bounds,{...config,motionEnabled:false},1/60).x>start.x);
});

test('following has consistent speed across refresh rates and a background pause is bounded', () => {
  function run(fps) { let p={...start}; for(let i=0;i<fps;i++) p=stepPosition(p,pointer,bounds,config,1/fps); return p; }
  const slow=run(30),fast=run(120);
  assert.ok(Math.hypot(slow.x-fast.x,slow.y-fast.y)<1);
  const paused=stepPosition(start,pointer,bounds,config,60);
  assert.ok(Math.hypot(paused.x-start.x,paused.y-start.y)<65);
});

test('playful mode moves away only while the pointer is near', () => {
  const near={x:140,y:170}, c={...config,cursorFollowMode:'playful'};
  const position=stepPosition(start,near,bounds,c,1/60);
  assert.ok(position.x<start.x);
  assert.deepEqual(stepPosition(start,{x:900,y:900},bounds,c,1/60),start);
});

test('local chat matches topics, falls back for unknown questions and keeps replies as plain text', () => {
  const topics={default:{keywords:[],replies:['default reply']},work:{keywords:['工作'],replies:['先完成一件小事。']},study:{keywords:['学习'],replies:['<b>学习回复</b>']}};
  assert.equal(pickReply(topics,'今天工作很多'), '先完成一件小事。');
  assert.equal(pickReply(topics,'学习'),'<b>学习回复</b>');
  assert.equal(pickReply(topics,'unknown'), 'default reply');
  assert.equal(pickReply({},'hello'),'我在这里，安静陪着你。');
});

function previewFixture() {
  class Element {
    constructor() { this.hidden=false;this.disabled=false;this.style={setProperty(){}};this.dataset={};this.events={};this.children=[];this.attributes={};this.src='blob:pet';this.naturalWidth=200;this.naturalHeight=200;this.clientWidth=480;this.clientHeight=480;this.offsetHeight=40;this.value='';this.classList={toggle(){}}; }
    addEventListener(name, fn) { (this.events[name] ||= []).push(fn); }
    emit(name,event={}) { return Promise.all((this.events[name]||[]).map(fn=>fn({target:this,preventDefault(){},...event}))); }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children=nodes; }
    setAttribute(key,value) { this.attributes[key]=value; }
    querySelector() { return this.child ||= new Element(); }
    getBoundingClientRect() { return {left:0,top:0}; }
    closest() { return null; }
    contains(target) { return target===this; }
    focus() {}
    scrollIntoView() {}
    remove() {}
    setPointerCapture() {}
    hasPointerCapture() { return false; }
    get firstElementChild() { return this.children[0]; }
    get textContent() { return this.text || ''; }
    set textContent(value) { this.text=value; }
  }
  const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  const controls=['click','double','typing','chat','reset','motion'].map(kind=>{const e=new Element();e.dataset.previewAction=kind;return e;});
  const setting=new Element();setting.id='click-particles';
  const config={name:'测试桌宠',size:100,position:'bottom-right',motionEnabled:true,cursorFollowMode:'none',idleBehavior:'still',clickAnimation:'jump',clickParticles:true,doubleClickEffect:'cuddle',keyboardSync:true,keyboardReaction:'bongo',customShortcuts:[],proactiveFrequency:'quiet'};
  let now=1000,nextFrame;const timeouts=[];
  const document={hidden:false,querySelector:get,querySelectorAll:selector=>selector==='[data-preview-action]'?controls:[setting],addEventListener(){},createElement:()=>new Element(),createTextNode:text=>({textContent:text})};
  const context=vm.createContext({document,window:{},performance:{now:()=>now},matchMedia:()=>({matches:false,addEventListener(){}}),ResizeObserver:class{observe(){}},setTimeout:fn=>timeouts.push(fn),clearTimeout(){},requestAnimationFrame:fn=>{nextFrame=fn;return 1;},cancelAnimationFrame(){},Math,Event,AbortSignal,fetch:async()=>({ok:true,json:async()=>({topics:{default:{replies:['<script>plain text reply</script>']}}})})});
  vm.runInContext(readFileSync(new URL('../scripts/interactive-preview.js',import.meta.url),'utf8').replaceAll('export ',''),context);
  context.getConfig=()=>config;context.hasImage=()=>true;context.renderAnimalFrame=()=>{};
  vm.runInContext('var preview=createInteractivePreview({getConfig,hasImage,renderAnimalFrame})',context);
  return {get,controls,config,setting,sync:()=>vm.runInContext('preview.sync()',context),frame:()=>{now+=20;nextFrame(now);}};
}

test('controller applies settings to click particles, static mode and keyboard display', async () => {
  const p=previewFixture(),click=p.controls.find(b=>b.dataset.previewAction==='click');
  await click.emit('click');
  assert.equal(p.get('#preview-particles').children.length,3);
  p.config.clickParticles=false;p.sync();await click.emit('click');
  assert.equal(p.get('#preview-particles').children.length,3);
  p.config.motionEnabled=false;p.sync();await click.emit('click');
  assert.equal(p.get('#preview-particles').children.length,0);
  assert.equal(p.controls.find(b=>b.dataset.previewAction==='typing').disabled,true);
  p.config.motionEnabled=true;p.sync();await p.controls.find(b=>b.dataset.previewAction==='typing').emit('click');p.frame();
  assert.equal(p.get('#preview-actor').querySelector().hidden,false);
});

test('controller previews desktop-only and topmost, and keeps chat messages as text nodes', async () => {
  const p=previewFixture();
  await p.get('#preview-window-toggle').emit('click');p.config.desktopOnly=true;p.sync();
  assert.equal(p.get('#preview-actor').hidden,true);
  await p.get('#preview-window-close').emit('click');assert.equal(p.get('#preview-actor').hidden,false);
  await p.controls.find(b=>b.dataset.previewAction==='chat').emit('click');
  assert.equal(p.get('#preview-chat').hidden,false);
  p.get('#preview-chat-input').value='<img src=x onerror=alert(1)>';
  await p.get('#preview-chat-form').emit('submit');
  const messages=p.get('#preview-chat-log').children;
  assert.equal(messages.length,2);
  assert.equal(messages[0].children[1].textContent,'<img src=x onerror=alert(1)>');
  assert.equal(messages[1].children[1].textContent,'<script>plain text reply</script>');
});
