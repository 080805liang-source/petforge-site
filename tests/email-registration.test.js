import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { pbkdf2Sync } from 'node:crypto';
import { createAdminTestApi } from './helpers/admin-api-fixture.js';

function setup(respond) {
  const calls = [];
  const https = { request(options, callback) {
    const request = new EventEmitter();
    request.setTimeout = (ms, handler) => { assert.equal(ms, 8000); request.timeout = handler; };
    request.destroy = (error) => request.emit('error', error);
    request.end = (payload) => queueMicrotask(() => {
      const body = JSON.parse(payload);
      calls.push({ options, body });
      const answer = respond?.(options.path, body) || (options.path.endsWith('/verify')
        ? body.verification_code === '123456' ? { verification_token: 'provider-proof' } : { status: 400, error: 'invalid_verification_code' }
        : { verification_id: 'provider-id', expires_in: 600 });
      if (answer.timeout) { request.timeout(); return; }
      const response = new EventEmitter();
      response.statusCode = answer.status || 200;
      callback(response);
      response.emit('data', JSON.stringify(answer));
      response.emit('end');
    });
    return request;
  } };
  const api = createAdminTestApi({}, { https });
  return { ...api, calls };
}
const email = 'newuser@example.com';
const signup = (challengeId, extra = {}) => ({ email, password: 'test-password', confirmPassword: 'test-password', emailCode: '123456', challengeId, ...extra });

test('native mail verification creates a verified local account, preserves memberships, and signs in', async () => {
  const api = setup();
  const previous = JSON.stringify(api.rows.cp_users);
  const sent = await api.call('POST', '/auth/send-email-code', { email });
  assert.equal(sent.status, 200);
  assert.equal(sent.body.retryAfter, 60);
  assert.equal(JSON.stringify(sent).includes('provider-id'), false);
  assert.equal(api.calls[0].options.hostname, 'cloud-paw-vip-cn-d0eub7r110788a3.api.tcloudbasegateway.com');
  assert.deepEqual(api.calls[0].body, { email, target: 'ANY' });
  const created = await api.call('POST', '/auth/signup', signup(sent.body.challengeId, { phone: '13900000000' }));
  assert.equal(created.status, 201);
  assert.equal(created.body.user.email, email);
  assert.equal(created.body.user.phone, null);
  assert.equal(created.body.user.isAdmin, false);
  assert.equal(created.body.user.membershipActive, false);
  assert.ok(created.body.token);
  assert.ok(api.rows.cp_users.at(-1).emailVerifiedAt);
  assert.equal(JSON.stringify(api.rows.cp_users.slice(0, 2)), previous);
  assert.ok(api.rows.cp_email_codes[0].usedAt);
  const login = await api.call('POST', '/auth/login', { email, password: 'test-password' });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.id, created.body.user.id);
  assert.equal((await api.call('POST', '/auth/signup', signup(sent.body.challengeId))).status, 409);
  assert.equal((await api.call('POST', '/auth/send-email-code', { email })).status, 409);
});

test('challenges are bound to their mailbox; missing, foreign and expired challenges never reach the provider', async () => {
  const api = setup();
  const sent = await api.call('POST', '/auth/send-email-code', { email });
  for (const body of [signup(''), signup('a'.repeat(64)), signup(sent.body.challengeId, { email: 'other@example.com' }), signup(sent.body.challengeId, { emailCode: 'abc123' })]) {
    assert.equal((await api.call('POST', '/auth/signup', body)).status, 400);
  }
  api.rows.cp_email_codes[0].expiresAt = '2000-01-01T00:00:00.000Z';
  assert.equal((await api.call('POST', '/auth/signup', signup(sent.body.challengeId))).status, 400);
  assert.equal(api.calls.length, 1);
  assert.equal(api.rows.cp_users.length, 2);
});

test('mail sends have a server cooldown and incorrect codes stop after five attempts', async () => {
  const api = setup();
  const sent = await api.call('POST', '/auth/send-email-code', { email });
  const results = await Promise.all(Array.from({ length: 3 }, () => api.call('POST', '/auth/send-email-code', { email })));
  assert.ok(results.every(result => result.status === 429));
  assert.equal(api.calls.length, 1);
  for (let i = 0; i < 5; i++) assert.equal((await api.call('POST', '/auth/signup', signup(sent.body.challengeId, { emailCode: '000000' }))).status, 400);
  assert.equal((await api.call('POST', '/auth/signup', signup(sent.body.challengeId))).status, 429);
  assert.equal(api.calls.length, 6);
  assert.equal(api.rows.cp_users.length, 2);
});

test('resending invalidates previous challenges and concurrent signup creates only one local account', async () => {
  const api = setup();
  const first = await api.call('POST', '/auth/send-email-code', { email });
  api.rows.cp_email_codes[0].sentAt = '2000-01-01T00:00:00.000Z';
  const second = await api.call('POST', '/auth/send-email-code', { email });
  assert.notEqual(first.body.challengeId, second.body.challengeId);
  assert.equal((await api.call('POST', '/auth/signup', signup(first.body.challengeId))).status, 400);
  const results = await Promise.all([1, 2].map(() => api.call('POST', '/auth/signup', signup(second.body.challengeId))));
  assert.equal(results.filter(result => result.status === 201).length, 1);
  assert.equal(api.rows.cp_users.filter(user => user.email === email).length, 1);
});

test('provider rejection, incomplete responses and timeout cannot claim delivery or verify an account', async () => {
  for (const answer of [{ status: 503, error: 'unavailable' }, { timeout: true }, {}, { status: 403, error: 'captcha_required' }]) {
    const api = setup(() => answer);
    const sent = await api.call('POST', '/auth/send-email-code', { email });
    assert.ok(sent.status >= 500);
    assert.equal(sent.body.ok, undefined);
    assert.equal(api.rows.cp_email_codes[0].verificationId, '');
  }
  const api = setup((path) => path.endsWith('/verify') ? {} : undefined);
  const sent = await api.call('POST', '/auth/send-email-code', { email });
  assert.equal((await api.call('POST', '/auth/signup', signup(sent.body.challengeId))).status, 502);
  assert.equal(api.rows.cp_users.length, 2);
});

test('phone registration and SMS sending are paused while existing phone password login keeps its membership', async () => {
  const api = setup();
  const salt = 'test-salt';
  api.rows.cp_users.push({ _id: 'legacy-phone', phone: '13900000000', passwordSalt: salt, passwordHash: pbkdf2Sync('old-password', salt, 100000, 32, 'sha256').toString('hex'), vipExpiresAt: '2099-01-01T00:00:00.000Z' });
  assert.equal((await api.call('POST', '/auth/send-code', { phone: '13900000000' })).status, 503);
  assert.equal((await api.call('POST', '/auth/signup', { identity: 'phone', phone: '13900000001', password: 'test-password', confirmPassword: 'test-password' })).status, 503);
  const login = await api.call('POST', '/auth/login', { identity: 'phone', phone: '13900000000', password: 'old-password' });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.membershipActive, true);
  assert.equal(api.calls.length, 0);
});
