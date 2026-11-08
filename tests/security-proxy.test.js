import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onRequest } from '../functions/api/[[path]].js';

const origin = 'https://petforge-desktop.pages.dev';
const token = 'a'.repeat(64);
const request = (path, options = {}) => new Request(origin + '/api' + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}', ...options });
async function withFetch(callback, testBody) {
  const previous = globalThis.fetch;
  globalThis.fetch = callback;
  try { await testBody(); } finally { globalThis.fetch = previous; }
}

test('the primary site sets an HttpOnly host cookie and never returns the session secret to browser scripts', async () => {
  await withFetch(async () => Response.json({ token, user: { id: 'user' } }), async () => {
    const result = await onRequest({ request: request('/auth/login') });
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { user: { id: 'user' } });
    const cookie = result.headers.get('Set-Cookie');
    assert.match(cookie, /__Host-petforge-session=/);
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(cookie.includes(flag));
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
  });
});

test('cookie authentication ignores attacker-supplied bearer headers and never forwards cookies or arbitrary hosts', async () => {
  await withFetch(async (url, options) => {
    assert.equal(url, 'https://cloud-paw-vip-cn-d0eub7r110788a3-1460995143.ap-shanghai.app.tcloudbase.com/api/me');
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    assert.equal(options.headers.Cookie, undefined);
    assert.equal(options.redirect, 'manual');
    return Response.json({ user: { id: 'user' } });
  }, async () => {
    const result = await onRequest({ request: request('/me', { method: 'GET', body: undefined, headers: { Cookie: `__Host-petforge-session=${token}`, Authorization: 'Bearer attacker' } }) });
    assert.equal(result.status, 200);
  });
});

test('cross-site, originless writes, invalid content types and oversized bodies stop before proxying', async () => {
  await withFetch(() => { throw new Error('Must not contact API'); }, async () => {
    for (const headers of [{ 'Content-Type': 'application/json' }, { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, { Origin: origin, 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site' }]) {
      assert.equal((await onRequest({ request: request('/auth/logout', { headers }) })).status, 403);
    }
    assert.equal((await onRequest({ request: request('/auth/login', { headers: { Origin: origin, 'Content-Type': 'text/plain' } }) })).status, 415);
    assert.equal((await onRequest({ request: request('/workshop', { body: 'x'.repeat(900001) }) })).status, 413);
    assert.equal((await onRequest({ request: request('/https:evil.example') })).status, 400);
  });
});

test('legacy sessions are validated before migration and invalid sessions or logout clear the cookie', async () => {
  await withFetch(async (url, options) => {
    assert.ok(url.endsWith('/api/me'));
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    return Response.json({ user: { id: 'user' } });
  }, async () => {
    const result = await onRequest({ request: request('/auth/session', { headers: { Origin: origin, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }) });
    assert.deepEqual(await result.json(), { signedIn: true });
    assert.match(result.headers.get('Set-Cookie'), /HttpOnly/);
  });
  await withFetch(async () => Response.json({ error: 'unauthorized' }, { status: 401 }), async () => {
    const result = await onRequest({ request: request('/me', { method: 'GET', body: undefined }) });
    assert.match(result.headers.get('Set-Cookie'), /Max-Age=0/);
  });
  await withFetch(async () => { throw new Error('network'); }, async () => {
    const result = await onRequest({ request: request('/auth/logout') });
    assert.equal(result.status, 502);
    assert.match(result.headers.get('Set-Cookie'), /Max-Age=0/);
  });
});
