import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { verifyDesktopRuntime } from '../scripts/desktop-runtime.js';
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
      assert.equal(url, 'https://petforge-desktop.pages.dev/assets/PetForge.exe?v=2026.11.09-recovery-animals-r3');
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
