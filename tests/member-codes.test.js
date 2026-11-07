import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createAdminTestApi } from './helpers/admin-api-fixture.js';

test('站内创建订单和确认收款均关闭，旧客户端不能继续付款流程', async () => {
  const api = createAdminTestApi();
  for (const path of ['/api/orders', '/api/admin/confirm-order']) {
    assert.equal((await api.call('POST', path, { product: 'credits_3', amount: 9.9 }, 'owner-session')).status, 410);
  }
  assert.equal(api.rows.cp_orders, undefined);
});

test('仅管理员可生成会员码，数据库和列表不保存或公开完整码', async () => {
  const api = createAdminTestApi();
  assert.equal((await api.call('POST', '/api/admin/issue-code', {}, 'user-session')).status, 403);
  assert.equal((await api.call('POST', '/api/admin/issue-code', { quantity: 21 }, 'owner-session')).status, 400);
  assert.equal((await api.call('POST', '/api/admin/issue-code', { kind: 'credits' }, 'owner-session')).status, 400);
  const issued = await api.call('POST', '/api/admin/issue-code', { quantity: 2 }, 'owner-session');
  assert.equal(issued.status, 201);
  assert.equal(new Set(issued.body.codes.map((item) => item.code)).size, 2);
  assert.equal(issued.body.codes[0].durationDays, 30);
  const code = issued.body.codes[0].code;
  assert.match(code, /^PAW-(?:[A-F0-9]{4}-){7}[A-F0-9]{4}$/);
  assert.equal(JSON.stringify(api.rows.cp_codes).includes(code), false);
  assert.equal((await api.call('GET', '/api/admin/codes', undefined, 'user-session')).status, 403);
  const list = await api.call('GET', '/api/admin/codes', undefined, 'owner-session');
  assert.equal(list.body.total, 2);
  assert.equal(JSON.stringify(list.body).includes(code), false);
  assert.equal(JSON.stringify(list.body).includes('codeHash'), false);
});

test('同一码并发兑换只成功一次，30天权益绑定当前账号', async () => {
  const api = createAdminTestApi();
  const issued = await api.call('POST', '/api/admin/issue-code', {}, 'owner-session');
  const code = issued.body.code;
  assert.equal((await api.call('POST', '/api/redeem', { code })).status, 401);
  const results = await Promise.all(Array.from({ length: 2 }, () => api.call('POST', '/api/redeem', { code: ` ${code.toLowerCase()} ` }, 'user-session')));
  assert.deepEqual(results.map((item) => item.status).sort(), [200, 400]);
  const user = api.rows.cp_users.find((item) => item._id === 'user');
  assert.equal(user.credits, 1);
  assert.ok(new Date(user.vipExpiresAt) - new Date() > 29 * 86400000);
  assert.ok(new Date(user.vipExpiresAt) - new Date() <= 30 * 86400000);
  assert.equal(api.rows.cp_codes[0].usedBy, 'user');
  assert.equal((await api.call('POST', '/api/consume', { amount: 1 }, 'user-session')).body.unlimited, true);
});

test('时长会员可无限生成且不消耗原有次数，过期后恢复按次数使用', async () => {
  const api = createAdminTestApi();
  const issued = await api.call('POST', '/api/admin/issue-code', { kind: 'membership', durationDays: 30, quantity: 2 }, 'owner-session');
  const redeemed = await api.call('POST', '/api/redeem', { code: issued.body.codes[0].code }, 'user-session');
  assert.equal(redeemed.body.user.membershipActive, true);
  const initialExpiry = new Date(redeemed.body.vipExpiresAt);
  const renewed = await api.call('POST', '/api/redeem', { code: issued.body.codes[1].code }, 'user-session');
  assert.ok(new Date(renewed.body.vipExpiresAt) - initialExpiry >= 29 * 86400000);
  const result = await api.call('POST', '/api/consume', { amount: 1 }, 'user-session');
  assert.equal(result.body.unlimited, true);
  assert.equal(result.body.credits, 1);
  api.rows.cp_users[1].vipExpiresAt = '2000-01-01T00:00:00.000Z';
  assert.equal((await api.call('POST', '/api/consume', { amount: 1 }, 'user-session')).body.credits, 0);
  assert.equal((await api.call('POST', '/api/consume', { amount: 1 }, 'user-session')).status, 403);
});

test('停用码不能兑换，已兑换码不能撤销，旧版码仍可激活会员', async () => {
  const api = createAdminTestApi();
  const issued = await api.call('POST', '/api/admin/issue-code', { quantity: 2 }, 'owner-session');
  const [revoked, used] = issued.body.codes;
  assert.equal((await api.call('PUT', `/api/admin/codes/${revoked.id}`, { status: 'revoked' }, 'user-session')).status, 403);
  assert.equal((await api.call('PUT', `/api/admin/codes/${revoked.id}`, { status: 'revoked' }, 'owner-session')).status, 200);
  assert.equal((await api.call('POST', '/api/redeem', { code: revoked.code }, 'user-session')).status, 400);
  await api.call('POST', '/api/redeem', { code: used.code }, 'user-session');
  assert.equal((await api.call('PUT', `/api/admin/codes/${used.id}`, { status: 'revoked' }, 'owner-session')).status, 409);
  const legacy = 'PAW-1234-ABCD-5678-EFAB';
  api.rows.cp_codes.push({ _id: 'legacy', codeHash: createHash('sha256').update(legacy).digest('hex'), durationDays: 30 });
  assert.equal((await api.call('POST', '/api/redeem', { code: legacy }, 'user-session')).body.user.membershipActive, true);
});

test('已有次数码仍可兑换，旧余额不受会员制切换影响', async () => {
  const code = 'PAW-ABCD-1234-EFAB-5678';
  const api = createAdminTestApi({ cp_codes: [{ _id: 'legacy-credits', kind: 'credits', credits: 3, codeHash: createHash('sha256').update(code).digest('hex') }] });
  assert.equal((await api.call('POST', '/api/redeem', { code }, 'user-session')).body.user.credits, 4);
});
