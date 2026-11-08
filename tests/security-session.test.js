import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { contentSecurityPolicy, staticHeaders } from '../security-policy.mjs';

test('primary-site sessions migrate legacy storage once and never save new credentials in browser storage', async () => {
  const requests = [], removed = [];
  const window = { PETFORGE_MEMBERSHIP: { cookieSession: true, apiUrl: '/api', sessionKey: 'session' } };
  runInNewContext(readFileSync(new URL('../scripts/session.js', import.meta.url), 'utf8'), {
    window,
    localStorage: { getItem: () => 'old-token', removeItem: key => removed.push(key), setItem() { throw new Error('No browser credential storage'); } },
    fetch: async (url, options) => { requests.push({ url, options }); return Response.json(url.endsWith('/auth/session') ? { signedIn: true } : { user: { id: 'user' } }); }
  });
  await window.PetForgeSession.fetch('/me');
  await window.PetForgeSession.fetch('/auth/login', { method: 'POST', body: '{}' });
  assert.equal(requests.filter(item => item.url.endsWith('/auth/session')).length, 1);
  assert.deepEqual(removed, ['session']);
  assert.equal(requests[0].options.headers.Authorization, 'Bearer old-token');
  for (const item of requests.slice(1)) {
    assert.equal(item.options.headers.Authorization, undefined);
    assert.equal(item.options.credentials, 'same-origin');
    assert.equal(item.options.cache, 'no-store');
  }
});

test('static security policy authorizes only actual inline script hashes and local script files', () => {
  const csp = contentSecurityPolicy(['<script>allowed()</script><script src="scripts/main.js"></script>']);
  assert.match(csp, /script-src 'self' 'wasm-unsafe-eval' 'sha256-/);
  assert.equal(/script-src [^;]*'unsafe-inline'/.test(csp), false);
  assert.equal(/script-src [^;]*'unsafe-eval'/.test(csp), false);
  for (const directive of ["object-src 'none'", "base-uri 'none'", "script-src-attr 'none'", "form-action 'self'"]) assert.ok(csp.includes(directive));
  assert.notEqual(contentSecurityPolicy(['<script>attacker()</script>']), csp);
  const headers = staticHeaders(csp);
  for (const header of ['frame-ancestors', 'X-Frame-Options: DENY', 'X-Content-Type-Options: nosniff', 'Strict-Transport-Security', 'Permissions-Policy']) assert.ok(headers.includes(header));
});
