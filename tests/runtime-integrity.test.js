import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { verifyDesktopRuntime, fetchDesktopRuntime, desktopRuntimeFiles, DESKTOP_DOWNLOAD_AVAILABLE, RUNTIME_SHA256 } from '../scripts/desktop-runtime.js';
import { onRequest } from '../functions/runtime.js';

test('blocked desktop builds stay unavailable and malformed runtimes are rejected', async () => {
  assert.equal(DESKTOP_DOWNLOAD_AVAILABLE,false);
  const main=readFileSync(new URL('../scripts/main.js',import.meta.url),'utf8');
  assert.doesNotThrow(()=>new vm.Script(main));
  assert.match(main,/const DESKTOP_DOWNLOAD_AVAILABLE=false/);
  const bytes=new Uint8Array(44738453);bytes[0]=0x50;bytes[1]=0x4b;
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

test('segmented runtime download retries a failed part and rejects corrupted bytes after assembly', async () => {
  const original = globalThis.fetch;
  const bytes = new Uint8Array(44738453);
  const calls = new Map(); let corrupt = false;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url.origin,'https://petforge-desktop.pages.dev');
      assert.ok(url.pathname.startsWith(`/assets/runtime/${RUNTIME_SHA256.slice(0,16)}/`));
      assert.equal(options.redirect,'error');
      const index = Number(url.pathname.split('/').pop().replace('.bin',''));
      calls.set(index,(calls.get(index)||0)+1);
      if (index === 3 && calls.get(index) === 1) throw new Error('Interrupted transfer');
      const part = bytes.slice(index*524288,(index+1)*524288);
      if (corrupt && index === 5) part[0] ^= 1;
      return new Response(part);
    };
    const progress = [];
    await assert.rejects(fetchDesktopRuntime(new URL('https://petforge-desktop.pages.dev/assets/PetForge.exe'), (done, total) => progress.push([done,total])), /不完整/);
    const count=Math.ceil(bytes.length/524288);
    assert.deepEqual(progress, Array.from({length:count},(_,index)=>[index+1,count]));
    assert.equal(calls.get(3),2);assert.equal(calls.size,count);
    corrupt = true;
    await assert.rejects(fetchDesktopRuntime(new URL('https://petforge-desktop.pages.dev/assets/PetForge.exe')),/不完整/);
  } finally { globalThis.fetch = original; }
});
