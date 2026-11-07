import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createAdminTestApi } from './helpers/admin-api-fixture.js';

const png = `data:image/png;base64,${readFileSync(new URL('../assets/pwa-icon-192.png', import.meta.url)).toString('base64')}`;
const config = { name: '像素小猫', size: 100, opacity: 100, clickLine: '你好', motionEnabled: false, shadow: false, visualStyle: 'chrome', keyboardSync: false, alwaysOnTop: true, customShortcuts: [{ label: '微信', type: 'app', target: 'weixin://', appPaths: ['%ProgramFiles%\\WeChat\\WeChat.exe'] }], safeRendering: true };
const payload = () => ({ config: structuredClone(config), image: png, preview: png, description: '测试配置' });

test('publishing requires login; public readers receive the same PNG and complete safe configuration', async () => {
  const api = createAdminTestApi();
  assert.equal((await api.call('POST', '/workshop', payload())).status, 401);
  const created = await api.call('POST', '/workshop', payload(), 'user-session');
  assert.equal(created.status, 201);
  const result = await api.call('GET', `/workshop/${created.body.id}`);
  assert.equal(result.body.post.image, png);
  assert.equal(result.body.post.imageSha256, createHash('sha256').update(Buffer.from(png.slice(22), 'base64')).digest('hex'));
  assert.equal(result.body.post.config.visualStyle, 'chrome');
  assert.equal(result.body.post.config.shadow, false);
  assert.equal(result.body.post.config.motionEnabled, false);
  assert.equal(result.body.post.config.keyboardSync, false);
  assert.equal(result.body.post.config.safeRendering, false);
  assert.deepEqual(result.body.post.config.customShortcuts, config.customShortcuts);
  assert.equal(JSON.stringify(result.body).includes('test@example.com'), false);
  const list = await api.call('GET', '/workshop');
  assert.equal(list.body.total, 1);
  assert.equal(list.body.posts[0].image, undefined, 'feed uses a thumbnail rather than every full PNG');
});

test('identical shares reuse a record and only owner or admin may unshare', async () => {
  const api = createAdminTestApi();
  const created = await api.call('POST', '/workshop', payload(), 'owner-session');
  const duplicate = await api.call('POST', '/workshop', payload(), 'owner-session');
  assert.equal(duplicate.body.id, created.body.id);
  assert.equal(api.rows.pf_workshop.length, 1);
  const path = `/workshop/${created.body.id}`;
  assert.equal((await api.call('PUT', path, { isPublic: false }, 'user-session')).status, 403);
  assert.equal((await api.call('PUT', path, { isPublic: false }, 'owner-session')).status, 200);
  assert.equal((await api.call('GET', path)).status, 404);
  assert.equal((await api.call('GET', '/workshop')).body.total, 0);
});

test('workshop usage counts only successful generation and obeys credit limits atomically', async () => {
  const api = createAdminTestApi();
  const created = await api.call('POST', '/workshop', payload(), 'owner-session');
  const id = created.body.id;
  assert.equal((await api.call('POST', '/consume', { amount: 1, workshopId: id }, 'user-session')).status, 200);
  assert.equal(api.rows.pf_workshop[0].downloads, 1);
  assert.equal((await api.call('POST', '/consume', { amount: 1, workshopId: id }, 'user-session')).status, 403);
  assert.equal(api.rows.pf_workshop[0].downloads, 1);
  assert.equal((await api.call('POST', '/consume', { amount: 1, workshopId: 'missing' }, 'owner-session')).status, 404);
  assert.equal(api.rows.cp_admin_events.length, 1);
});

test('invalid images, executable schemes and private account fields are rejected or excluded', async () => {
  const api = createAdminTestApi();
  const bad = payload(); bad.image = 'data:image/svg+xml;base64,PHN2Zz4=';
  assert.equal((await api.call('POST', '/workshop', bad, 'owner-session')).status, 400);
  const unsafe = payload(); unsafe.config.customShortcuts[0].target = 'javascript:alert(1)';
  assert.equal((await api.call('POST', '/workshop', unsafe, 'owner-session')).status, 400);
  const safe = payload(); safe.config.password = 'never-publish'; safe.config.license = 'private-license';
  const created = await api.call('POST', '/workshop', safe, 'owner-session');
  const result = await api.call('GET', `/workshop/${created.body.id}`);
  assert.equal(JSON.stringify(result.body).includes('never-publish'), false);
  assert.equal(JSON.stringify(result.body).includes('private-license'), false);
});

test('chunk uploads remain bound to their owner and publish only after every chunk arrives', async () => {
  const api = createAdminTestApi();
  const uploadId = '0123456789abcdef0123456789abcdef';
  const data = JSON.stringify(payload()), total = Math.ceil(data.length / 24000);
  const part = (index) => ({ uploadId, index, total, data: data.slice(index * 24000, (index + 1) * 24000) });
  assert.equal((await api.call('POST', '/workshop/upload', part(0))).status, 401);
  assert.equal((await api.call('POST', '/workshop/upload', part(0), 'owner-session')).status, 200);
  assert.equal((await api.call('POST', '/workshop', { uploadId }, 'owner-session')).status, 400);
  assert.equal((await api.call('POST', '/workshop', { uploadId }, 'user-session')).status, 400);
  for (let index = 1; index < total; index++) assert.equal((await api.call('POST', '/workshop/upload', part(index), 'owner-session')).status, 200);
  const created = await api.call('POST', '/workshop', { uploadId }, 'owner-session');
  assert.equal(created.status, 201);
  assert.equal((await api.call('GET', `/workshop/${created.body.id}`)).body.post.image, png);
  assert.equal(api.rows.pf_workshop_uploads.length, 0, 'successful publishing clears upload chunks');
});
