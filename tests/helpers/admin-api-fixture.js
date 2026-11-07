import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../../云爪纪念馆/cloud-paw-api/tencent-cloudbase/index.js', import.meta.url), 'utf8');

export function createAdminTestApi(seed = {}) {
  let sequence = 0;
  const now = new Date().toISOString();
  const rows = {
    cp_users: [{ _id: 'owner', email: '3903345807@qq.com', credits: 0, createdAt: now }, { _id: 'user', email: 'test@example.com', credits: 1, createdAt: now }],
    cp_sessions: [{ _id: 'owner-token', userId: 'owner', token: 'owner-session', expiresAt: '2099-01-01T00:00:00.000Z' }, { _id: 'user-token', userId: 'user', token: 'user-session', expiresAt: '2099-01-01T00:00:00.000Z' }],
    ...seed
  };
  const matches = (row, conditions) => Object.entries(conditions).every(([key, value]) => {
    if (key === '$and') return value.every(item => matches(row,item));
    if (key === '$or') return value.some(item => matches(row,item));
    if (value && typeof value === 'object') {
      if (value.$gte !== undefined) return row[key] >= value.$gte;
      if (value.$gt !== undefined) return row[key] > value.$gt;
      if (value.$neq !== undefined) return row[key] !== value.$neq;
      if (value.$regexp !== undefined) return new RegExp(value.$regexp,value.options).test(String(row[key] || ''));
    }
    return row[key] === value;
  });
  class Query {
    constructor(name) { this.name = name; this.conditions = {}; this.offset = 0; this.size = Infinity; this.order = null; }
    where(conditions) { this.conditions = conditions; return this; }
    limit(size) { this.size = size; return this; }
    field() { return this; }
    skip(offset) { this.offset = offset; return this; }
    orderBy(key, direction) { this.order = [key, direction]; return this; }
    values() {
      let list = (rows[this.name] || []).filter((item) => matches(item, this.conditions));
      if (this.order) { const [key, direction] = this.order; list = [...list].sort((a, b) => String(a[key]).localeCompare(String(b[key])) * (direction === 'desc' ? -1 : 1)); }
      return list;
    }
    async count() { return { total: this.values().length }; }
    aggregate() { return { match: (conditions) => { this.conditions = conditions; return { group: () => ({ end: async () => { const groups = new Map(); for (const row of this.values()) { const key = `${row.day}:${row.type}`; const item = groups.get(key) || { _id: { day: row.day, type: row.type }, total: 0 }; item.total += 1; groups.set(key, item); } return { data: [...groups.values()] }; } }) }; } }; }
    async get() { return { data: this.values().slice(this.offset, this.offset + this.size) }; }
    async add(value) { const id = `${this.name}-${++sequence}`; (rows[this.name] ||= []).push({ _id: id, ...value }); return { id }; }
    doc(id) {
      return {
        get: async () => ({ data: (rows[this.name] || []).filter((row) => row._id === id) }),
        update: async (value) => { const row = (rows[this.name] || []).find((item) => item._id === id); if (!row) throw new Error('Document missing'); for (const [key, field] of Object.entries(value)) row[key] = field && typeof field === 'object' && field.$inc !== undefined ? Number(row[key] || 0) + field.$inc : field; return { updated: 1 }; },
        remove: async () => { rows[this.name] = (rows[this.name] || []).filter((item) => item._id !== id); }
      };
    }
  }
  let transactions = Promise.resolve();
  const db = { RegExp: ({regexp,options}) => ({$regexp:regexp,options}), collection: (name) => new Query(name), command: { and:value=>({$and:value}),or:value=>({$or:value}),neq:value=>({$neq:value}),gt: (value) => ({ $gt: value }), gte: (value) => ({ $gte: value }), inc: (value) => ({ $inc: value }), aggregate: { sum: (value) => value } }, createCollection: async (name) => { if (rows[name]) throw new Error('Collection already exists'); rows[name] = []; }, runTransaction: (callback) => {
    const operation = transactions.then(async () => {
      const snapshot = JSON.parse(JSON.stringify(rows));
      try { return await callback(db); }
      catch (error) { for (const name of Object.keys(rows)) delete rows[name]; Object.assign(rows, snapshot); throw error; }
    });
    transactions = operation.catch(() => {});
    return operation;
  } };
  const exports = {};
  runInNewContext(source, { exports, require: (name) => name === '@cloudbase/node-sdk' ? { init: () => ({ database: () => db }) } : require(name), process: { env: {} }, console, Buffer, URL, Intl, Date, Set });
  return {
    rows,
    main: exports.main,
    async call(method, path, body, token) {
      const response = await exports.main({ httpMethod: method, path, headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body || {}) });
      return { status: response.statusCode, body: JSON.parse(response.body || '{}') };
    }
  };
}
