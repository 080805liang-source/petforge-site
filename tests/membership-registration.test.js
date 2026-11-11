import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function setup(sendFailure = false) {
  const elements = new Map();
  const make = (key, dataset = {}) => {
    const element = { dataset, value: '', hidden: false, disabled: false, firstChild:{textContent:''}, before() {}, append() {}, prepend() {}, querySelector: key => elements.get(key) || make(key), classList: { toggle() {} }, listeners: {}, addEventListener(type, listener) { this.listeners[type] = listener; }, click() { return this.listeners.click?.(); } };
    elements.set(key, element);
    return element;
  };
  const modes = ['login', 'signup'].map(memberMode => make(memberMode, { memberMode }));
  const identities = ['email', 'phone'].map(identityMode => make(identityMode, { identityMode }));
  const requests = [], timers = [];
  const document = {
    body: { dataset: {} }, documentElement: { lang: 'zh-CN' },
    querySelector: key => elements.get(key) || make(key),
    querySelectorAll: key => key === '[data-member-mode]' ? modes : key === '[data-identity-mode]' ? identities : [],
    addEventListener() {}
    ,createElement: tag => make(tag)
  };
  const mockedFetch = async (url, options = {}) => {
      requests.push({ url, body: options.body ? JSON.parse(options.body) : undefined });
      return url.endsWith('/auth/send-email-code') && !sendFailure
        ? { ok: true, json: async () => ({ challengeId: 'challenge', retryAfter: 60 }) }
        : { ok: false, status: 503, json: async () => ({ error: '服务暂时不可用' }) };
    };
  runInNewContext(readFileSync(new URL('../scripts/membership.js', import.meta.url), 'utf8'), {
    document, window: { PETFORGE_MEMBERSHIP: { apiUrl: 'https://api.example', sessionKey: 'session' }, PetForgeSession: { fetch: async (path, options = {}) => mockedFetch('https://api.example' + path, options) } },
    localStorage: { getItem: () => '', setItem() {}, removeItem() {} },
    setInterval: callback => { timers.push(callback); return timers.length; }, clearInterval() {},

  });
  const get = key => elements.get(key);
  return { get, requests, timers, submit: () => get('#membership-auth-form').listeners.submit({ preventDefault() {} }) };
}

test('signup hides phone registration and SMS, while returning to login restores phone password login', async () => {
  const app = setup();
  await app.get('phone').click();
  assert.equal(app.get('#membership-phone-field').hidden, false);
  await app.get('signup').click();
  assert.equal(app.get('phone').hidden, true);
  assert.equal(app.get('#membership-phone-field').hidden, true);
  assert.equal(app.get('#membership-email-field').hidden, false);
  assert.equal(app.get('#membership-email-code').required, true);
  assert.equal(app.get('#membership-password').autocomplete, 'new-password');
  await app.get('login').click();
  await app.get('phone').click();
  assert.equal(app.get('phone').hidden, false);
  assert.equal(app.get('#membership-email-code').required, false);
  assert.equal(app.get('#membership-password').autocomplete, 'current-password');
  app.get('#membership-phone').value = '13900000000';
  await app.submit();
  assert.equal(app.requests.at(-1).body.identity, 'phone');
  assert.equal(app.requests.at(-1).body.phone, '13900000000');
});

test('failed sends enable retry immediately; editing the address invalidates an issued challenge', async () => {
  const failure = setup(true);
  failure.get('#membership-email').value = 'new@example.com';
  await failure.get('#membership-send-email-code').click();
  assert.equal(failure.get('#membership-send-email-code').disabled, false);
  assert.equal(failure.timers.length, 0);
  const app = setup();
  await app.get('signup').click();
  app.get('#membership-email').value = 'new@example.com';
  await app.get('#membership-send-email-code').click();
  assert.equal(app.get('#membership-send-email-code').disabled, true);
  assert.equal(app.get('#membership-send-email-code').textContent, '60s');
  app.get('#membership-email-code').value = '123456';
  await app.submit();
  assert.equal(app.requests.at(-1).body.challengeId, 'challenge');
  assert.equal(app.requests.at(-1).body.emailCode, '123456');
  app.get('#membership-email').value = 'other@example.com';
  app.get('#membership-email').listeners.input();
  const count = app.requests.length;
  await app.submit();
  assert.equal(app.requests.length, count);
  assert.equal(app.get('#membership-email-code').value, '');
  assert.equal(app.get('#membership-auth-note').textContent, '请先获取当前邮箱的验证码。');
});
