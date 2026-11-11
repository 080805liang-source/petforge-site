import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';
import { test } from 'node:test';
import { verifyDesktopRuntime, fetchDesktopRuntime, desktopRuntimeFiles, DESKTOP_DOWNLOAD_AVAILABLE, RUNTIME_SHA256 } from '../scripts/desktop-runtime.js';
import { onRequest } from '../functions/runtime.js';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const {download} = createRequire(import.meta.url)('../云爪纪念馆/cloud-paw-api/tencent-cloudbase/runtime-download.cjs');

test('desktop downloads use the verified official runtime and reject malformed archives', async () => {
  assert.equal(DESKTOP_DOWNLOAD_AVAILABLE,true);
  const main=readFileSync(new URL('../scripts/main.js',import.meta.url),'utf8');
  assert.doesNotThrow(()=>new vm.Script(main));
  assert.match(main,/const DESKTOP_DOWNLOAD_AVAILABLE=true/);
  const released=new Uint8Array(gunzipSync(readFileSync(new URL('../assets/PetForge-runtime.gz',import.meta.url))));
  assert.equal(await verifyDesktopRuntime(released),released);
  assert.ok(desktopRuntimeFiles(released).some(file=>file.name==='_internal/pythonw.exe'));
  assert.ok(desktopRuntimeFiles(released).some(file=>file.name==='free_ai.py'));
  const bytes=new Uint8Array(46828331);bytes[0]=0x50;bytes[1]=0x4b;
  await assert.rejects(verifyDesktopRuntime(bytes), /安全校验失败/);
  await assert.rejects(verifyDesktopRuntime(bytes.slice(0,-1)), /不完整/);
  const archive=(names)=>{
    const records=names.map(name=>{const nameBytes=new TextEncoder().encode(name),row=new Uint8Array(30+nameBytes.length+2),v=new DataView(row.buffer);v.setUint32(0,0x04034b50,true);v.setUint32(18,2,true);v.setUint16(26,nameBytes.length,true);row.set(nameBytes,30);return row;});
    const out=new Uint8Array(records.reduce((sum,r)=>sum+r.length,4));let offset=0;for(const row of records){out.set(row,offset);offset+=row.length;}new DataView(out.buffer).setUint32(offset,0x02014b50,true);return out;
  };
  assert.equal(desktopRuntimeFiles(archive(['PetForge.exe','_internal/python.dll'])).length,2);
  assert.throws(()=>desktopRuntimeFiles(archive(['../PetForge.exe'])),/路径无效/);
  assert.throws(()=>desktopRuntimeFiles(archive(['PetForge.exe','PetForge.exe'])),/路径无效/);
});

test('retired single executable endpoint never serves the quarantined build', async () => {
  const result=await onRequest({request:new Request('https://petforge-desktop.pages.dev/runtime')});
  assert.equal(result.status,410);
  assert.equal(result.headers.get('Cache-Control'),'no-store');
});

test('domestic endpoint serves only pinned public runtime chunks and rejects arbitrary paths', () => {
 const directory=mkdtempSync(join(tmpdir(),'petforge-runtime-'));
 try {
  writeFileSync(join(directory,'manifest.json'),JSON.stringify({id:'a'.repeat(16),parts:[{size:3}]}));
  writeFileSync(join(directory,'0.bin'),Buffer.from([1,2,3]));
  assert.deepEqual(Buffer.from(download('/downloads/runtime/'+'a'.repeat(16)+'/0',directory).data,'base64'),Buffer.from([1,2,3]));
  for(const path of ['/downloads/runtime/'+'b'.repeat(16)+'/0','/downloads/runtime/'+'a'.repeat(16)+'/99','/downloads/runtime/'+'a'.repeat(16)+'/../index.js','/downloads/runtime/'+'a'.repeat(16)+'/01'])assert.equal(download(path,directory),null);
 } finally {rmSync(directory,{recursive:true,force:true});}
});

test('domestic compressed parts retry corruption, resume cached parts and retain pinned runtime integrity', async () => {
  const {default:manifest} = await import('../scripts/runtime-manifest.js');
  const compressed = readFileSync(new URL('../assets/PetForge-runtime.gz',import.meta.url));
  const saved = new Map(), calls = new Map(); let offline = false, corrupt = true;
  const cacheStorage = {open:async()=>({match:async key=>saved.has(key)?new Response(saved.get(key)):undefined,put:async(key,response)=>saved.set(key,new Uint8Array(await response.arrayBuffer())),delete:async key=>saved.delete(key)})};
  const fetcher = async endpoint => {
    const url = new URL(endpoint), index = Number(url.pathname.split('/').pop().replace('.bin',''));
    calls.set(index,(calls.get(index)||0)+1);
    if (offline || index===8 && calls.get(index)<=3) throw new Error('Interrupted');
    const bytes=compressed.slice(index*524288,(index+1)*524288);
    if (corrupt && index===4) {corrupt=false;return Response.json({data:Buffer.alloc(bytes.length).toString('base64')});}
    if (url.pathname.includes('/downloads/')) {assert.match(url.hostname,/ap-shanghai/);return Response.json({data:bytes.toString('base64')});}
    return new Response(bytes);
  };
  const url=new URL('https://petforge-desktop.pages.dev/assets/PetForge-runtime.zip');
  await assert.rejects(fetchDesktopRuntime(url,()=>{},{cacheStorage,fetcher}),/已保留/);
  // Other in-flight workers finish before retry, as in a browser event turn.
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.ok(saved.size>0); const progress=[];
  const bytes=await fetchDesktopRuntime(url,(done,total)=>progress.push(done/total),{cacheStorage,fetcher});
  assert.equal(bytes.length,46828331);assert.equal(saved.size,manifest.parts.length);
  assert.equal(progress.at(-1),1);assert.ok(progress.every((n,i)=>!i||n>=progress[i-1]));
  const before=[...calls.values()].reduce((a,b)=>a+b,0);offline=true;
  assert.equal((await fetchDesktopRuntime(url,()=>{},{cacheStorage,fetcher})).length,46828331);
  assert.equal([...calls.values()].reduce((a,b)=>a+b,0),before);
  const key=saved.keys().next().value;saved.set(key,new Uint8Array(7));
  await assert.rejects(fetchDesktopRuntime(url,()=>{},{cacheStorage,fetcher}),/继续下载/);
});
