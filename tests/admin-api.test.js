import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAdminTestApi } from './helpers/admin-api-fixture.js';

test('管理员邮箱由服务端识别，零余额仍可无限生成并记录使用', async () => {
  const api = createAdminTestApi();
  const me = await api.call('GET', '/api/me', undefined, 'owner-session');
  assert.equal(me.body.user.isAdmin, true);
  const result = await api.call('POST', '/api/consume', { amount: 1 }, 'owner-session');
  assert.equal(result.status, 200);
  assert.equal(result.body.unlimited, true);
  assert.equal(api.rows.cp_users[0].credits, 0);
  assert.equal(api.rows.cp_users[0].usageCount, 1);
  assert.equal(api.rows.cp_admin_events.filter((item) => item.type === 'generation').length, 1);
});

test('普通用户仍按次数扣减，余额不足不会产生记录', async () => {
  const api = createAdminTestApi();
  const first = await api.call('POST', '/api/consume', { amount: 1 }, 'user-session');
  assert.equal(first.status, 200);
  assert.equal(first.body.credits, 0);
  const second = await api.call('POST', '/api/consume', { amount: 1 }, 'user-session');
  assert.equal(second.status, 403);
  assert.equal(api.rows.cp_admin_events.length, 1);
});

test('匿名和普通用户不能读取运营数据、用户列表或反馈', async () => {
  const api = createAdminTestApi();
  for (const path of ['/api/admin/overview', '/api/admin/users?offset=0&limit=20', '/api/admin/feedback?status=all']) {
    assert.equal((await api.call('GET', path)).status, 401);
    assert.equal((await api.call('GET', path, undefined, 'user-session')).status, 403);
  }
});

test('反馈可以提交、在后台读取和解决，普通用户不能改状态', async () => {
  const api = createAdminTestApi();
  assert.equal((await api.call('POST', '/api/feedback', { category: 'bug', message: '短' }, 'user-session')).status, 400);
  const created = await api.call('POST', '/api/feedback', { category: 'bug', message: '点击生成桌宠后页面没有反应', details: 'Edge 浏览器，上传图片后点击生成。' }, 'user-session');
  assert.equal(created.status, 201);
  const list = await api.call('GET', '/api/admin/feedback?status=open', undefined, 'owner-session');
  assert.equal(list.body.total, 1);
  assert.equal(list.body.feedback[0].contact, 'test@example.com');
  const path = `/api/admin/feedback/${created.body.id}`;
  assert.equal((await api.call('PUT', path, { status: 'resolved' }, 'user-session')).status, 403);
  assert.equal((await api.call('PUT', path, { status: 'resolved' }, 'owner-session')).status, 200);
  assert.equal((await api.call('GET', '/api/admin/feedback?status=open', undefined, 'owner-session')).body.total, 0);
});

test('浏览和生成统计是真实事件，用户列表脱敏且分页有效', async () => {
  const api = createAdminTestApi();
  assert.equal((await api.call('POST', '/api/analytics/pageview', { page: 'untrusted-url' })).status, 400);
  await api.call('POST', '/api/analytics/pageview', { page: 'creator' });
  await api.call('POST', '/api/consume', { amount: 1 }, 'owner-session');
  const overview = await api.call('GET', '/api/admin/overview', undefined, 'owner-session');
  assert.equal(overview.status, 200);
  assert.equal(overview.body.metrics.users, 2);
  assert.equal(overview.body.metrics.pageViews, 1);
  assert.equal(overview.body.metrics.generations, 1);
  assert.equal(overview.body.activity.length, 14);
  assert.equal(overview.body.activity.reduce((sum, day) => sum + day.views, 0), 1);
  const users = await api.call('GET', '/api/admin/users?offset=1&limit=1', undefined, 'owner-session');
  assert.equal(users.body.users.length, 1);
  assert.equal(users.body.offset, 1);
  assert.match(users.body.users[0].identity, /\*\*\*/);
  assert.equal(JSON.stringify(users.body).includes('password'), false);
});
