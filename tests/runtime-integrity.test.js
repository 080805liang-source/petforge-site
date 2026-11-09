import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { verifyDesktopRuntime, fetchDesktopRuntime, RUNTIME_SHA256 } from '../scripts/desktop-runtime.js';
import { onRequest } from '../functions/runtime.js';

test('the released executable is accepted; truncation and a single changed byte stop package generation', async () => {
  const bytes = new Uint8Array(readFileSync(new URL('../assets/PetForge.exe', import.meta.url)));
  assert.equal(await verifyDesktopRuntime(bytes), bytes);
  await assert.rejects(verifyDesktopRuntime(bytes.slice(0, -1)), /不完整/);
  const changed = bytes.slice();
  changed[changed.length - 1] ^= 1;
  await assert.rejects(verifyDesktopRuntime(changed), /安全校验失败/);
});

test('runtime relay uses only the pinned release host and refuses upstream redirects', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://petforge-desktop.pages.dev/assets/PetForge.exe?v=2026.11.09-interactive-r3');
      assert.equal(options.redirect, 'manual');
      return new Response('MZ');
    };
    const result = await onRequest({ request: new Request('https://petforge-desktop.pages.dev/runtime?url=https://evil.example/') });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(await result.text(), 'MZ');
    globalThis.fetch = async () => new Response(null, { status: 302, headers: { Location: 'https://evil.example/' } });
    assert.equal((await onRequest({ request: new Request('https://petforge-desktop.pages.dev/runtime') })).status, 502);
    assert.equal((await onRequest({ request: new Request('https://petforge-desktop.pages.dev/runtime', { method: 'POST' }) })).status, 405);
  } finally { globalThis.fetch = previous; }
});

test('segmented runtime download retries a failed part and rejects corrupted bytes after assembly', async () => {
  const original = globalThis.fetch;
  const bytes = new Uint8Array(readFileSync(new URL('../assets/PetForge.exe', import.meta.url)));
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
    assert.deepEqual(await fetchDesktopRuntime(new URL('https://petforge-desktop.pages.dev/assets/PetForge.exe'), (done, total) => progress.push([done,total])),bytes);
    assert.deepEqual(progress, Array.from({length:23},(_,index)=>[index+1,23]));
    assert.equal(calls.get(3),2);assert.equal(calls.size,23);
    corrupt = true;
    await assert.rejects(fetchDesktopRuntime(new URL('https://petforge-desktop.pages.dev/assets/PetForge.exe')),/安全校验失败/);
  } finally { globalThis.fetch = original; }
});
