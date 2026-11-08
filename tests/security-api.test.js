import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash, pbkdf2Sync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createAdminTestApi } from './helpers/admin-api-fixture.js';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const oldUser = () => ({ _id: 'old-user', email: 'legacy@example.com', passwordSalt: 'salt', passwordHash: pbkdf2Sync('long-password', 'salt', 100000, 32, 'sha256').toString('hex'), vipExpiresAt: '2099-01-01T00:00:00.000Z' });

test('legacy passwords upgrade on verified login; new session secrets are hashed and logout revokes them', async () => {
  const api = createAdminTestApi({ cp_users: [oldUser()] });
  const result = await api.call('POST', '/auth/login', { email: 'legacy@example.com', password: 'long-password' });
  assert.equal(result.status, 200);
  const user = api.rows.cp_users[0];
  assert.equal(user.passwordIterations, 600000);
  assert.notEqual(user.passwordSalt, 'salt');
  assert.equal(user.passwordHash, pbkdf2Sync('long-password', user.passwordSalt, 600000, 32, 'sha256').toString('hex'));
  const session = api.rows.cp_sessions.at(-1);
  assert.equal(session.token, undefined);
  assert.equal(session.tokenHash, sha256(result.body.token));
  assert.ok(Date.parse(session.expiresAt) - Date.now() <= 7 * 86400000);
  assert.equal((await api.call('GET', '/me', null, result.body.token)).body.user.membershipActive, true);
  assert.equal((await api.call('GET', '/me', null, session.tokenHash)).status, 401, 'stored digest cannot be used as a bearer');
  await api.call('POST', '/auth/logout', {}, result.body.token);
  assert.equal((await api.call('GET', '/me', null, result.body.token)).status, 401);
});

test('legacy sessions migrate without breaking accounts; malformed or expired sessions are denied', async () => {
  const api = createAdminTestApi();
  assert.equal((await api.call('GET', '/me', null, 'user-session')).status, 200);
  assert.equal(api.rows.cp_sessions[1].token, '');
  assert.equal(api.rows.cp_sessions[1].tokenHash, sha256('user-session'));
  for (const expiresAt of ['invalid', null, '2000-01-01T00:00:00.000Z']) {
    api.rows.cp_sessions[1].expiresAt = expiresAt;
    assert.equal((await api.call('GET', '/me', null, 'user-session')).status, 401);
  }
});

test('concurrent password guesses obey a persistent account limit and do not expose stored secrets', async () => {
  const api = createAdminTestApi({ cp_users: [oldUser()] });
  const results = await Promise.all(Array.from({ length: 12 }, () => api.call('POST', '/auth/login', { email: 'legacy@example.com', password: 'incorrect' })));
  assert.equal(results.filter(result => result.status === 401).length, 8);
  assert.equal(results.filter(result => result.status === 429).length, 4);
  assert.equal(api.rows.cp_users[0].passwordSalt, 'salt');
  assert.equal((await api.call('POST', '/auth/login', { email: 'legacy@example.com', password: 'long-password' })).status, 429);
  const limits = api.rows.cp_rate_limits;
  assert.equal(JSON.stringify(limits).includes('legacy@example.com'), false);
  const record = limits.find(row => row._id === sha256('login-account:legacy@example.com'));
  record.expiresAt = '2000-01-01T00:00:00.000Z';
  assert.equal((await api.call('POST', '/auth/login', { email: 'legacy@example.com', password: 'long-password' })).status, 200);
});

test('invalid JSON, non-object bodies, prototype payloads and excessive input are rejected before authentication work', async () => {
  const api = createAdminTestApi();
  for (const body of ['{', 'null', '[]', '{"__proto__":{"isAdmin":true}}', '{"email":{"$ne":null}}', JSON.stringify({ password: 'a'.repeat(257) })]) {
    const result = await api.main({ httpMethod: 'POST', path: '/auth/login', body });
    assert.equal(result.statusCode, 400);
  }
  const oversized = await api.main({ httpMethod: 'POST', path: '/workshop', body: ' '.repeat(900001) });
  assert.equal(oversized.statusCode, 413);
  assert.equal(api.rows.cp_rate_limits, undefined);
});

test('CORS rejects null, lookalike and unrelated origins, including preflight; protected responses cannot be cached', async () => {
  const api = createAdminTestApi();
  for (const origin of ['null', 'https://petforge-desktop.pages.dev.evil.example', 'https://unrelated.pages.dev']) {
    for (const method of ['OPTIONS', 'POST']) {
      const result = await api.main({ httpMethod: method, path: '/auth/login', headers: { Origin: origin }, body: '{}' });
      assert.equal(result.statusCode, 403);
      assert.notEqual(result.headers['access-control-allow-origin'], origin);
    }
  }
  const response = await api.main({ httpMethod: 'GET', path: '/me', headers: { Authorization: 'Bearer user-session', Origin: 'https://petforge-desktop.pages.dev' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers.vary, 'Origin');
});

test('feedback spam and membership code guessing are limited independently of browser controls', async () => {
  const api = createAdminTestApi();
  for (let index = 0; index < 5; index++) assert.equal((await api.call('POST', '/feedback', { category: 'bug', message: '需要核对的问题描述' }, 'user-session')).status, 201);
  assert.equal((await api.call('POST', '/feedback', { category: 'bug', message: '需要核对的问题描述' }, 'user-session')).status, 429);
  for (let index = 0; index < 10; index++) assert.equal((await api.call('POST', '/redeem', { code: 'PAW-1234-1234-1234-1234' }, 'user-session')).status, 400);
  assert.equal((await api.call('POST', '/redeem', { code: 'PAW-1234-1234-1234-1234' }, 'user-session')).status, 429);
  assert.equal(api.rows.cp_users[1].credits, 1);
});

test('mail sending stops at server address/hour and global quotas before contacting the provider', async () => {
  for (const [scope, actor, count] of [['email-address','new@example.com',5], ['email-global','all',200]]) {
    const api = createAdminTestApi({ cp_rate_limits: [{ _id: sha256(`${scope}:${actor}`), count, expiresAt: '2099-01-01T00:00:00.000Z' }] }, { https: { request() { throw new Error('Must not send'); } } });
    assert.equal((await api.call('POST', '/auth/send-email-code', { email: 'new@example.com' })).status, 429);
  }
});

test('public creations reject executable paths and arbitrary protocols; known apps discard attacker paths and fallbacks', async () => {
  const api = createAdminTestApi();
  const png = 'data:image/png;base64,' + readFileSync(new URL('../assets/pwa-icon-192.png', import.meta.url)).toString('base64');
  const payload = shortcut => ({ image: png, preview: png, config: { name: '测试', size: 100, opacity: 100, customShortcuts: [shortcut] } });
  for (const shortcut of [
    { type: 'file', target: 'C:\\Windows\\System32\\cmd.exe' },
    { type: 'app', target: 'ms-msdt:/id PCWDiagnostic' },
    { type: 'app', target: 'steam://run/anything' },
    { type: 'url', target: 'file:///C:/test.cmd' },
    { type: 'url', target: 'https://trusted.example@evil.example/' }
  ]) assert.equal((await api.call('POST', '/workshop', payload(shortcut), 'user-session')).status, 400);
  const created = await api.call('POST', '/workshop', payload({ label: '微信', type: 'app', target: 'weixin://', fallback: 'javascript:alert(1)', appPaths: ['C:\\malware.exe'] }), 'user-session');
  assert.equal(created.status, 201);
  const detail = await api.call('GET', '/workshop/' + created.body.id);
  assert.equal(JSON.stringify(detail).includes('malware.exe'), false);
  assert.equal(JSON.stringify(detail).includes('javascript:'), false);
  assert.equal(detail.body.post.config.customShortcuts[0].fallback, 'https://weixin.qq.com/');
});
