import assert from 'node:assert/strict';
import {test} from 'node:test';
import {onRequest} from '../functions/api/[[path]].js';

const origin = 'https://petforge-desktop.pages.dev';
const request = (path, options = {}) => new Request(origin + '/api' + path, options);

test('only anonymous public listings share a short edge cache, with no browser caching', async () => {
  const previousFetch = globalThis.fetch, previousCaches = globalThis.caches;
  const entries = new Map();
  let calls = 0;
  globalThis.caches = {default: {
    match: async key => entries.get(key.url)?.clone(),
    put: async (key, response) => { assert.equal(response.headers.get('Cache-Control'), 'public, max-age=15'); entries.set(key.url, response); }
  }};
  globalThis.fetch = async () => { calls++; return Response.json({posts: [], total: 0}); };
  try {
    assert.equal((await onRequest({request: request('/workshop?limit=24')})).headers.get('X-PetForge-Cache'), 'MISS');
    const hit = await onRequest({request: request('/workshop?limit=24')});
    assert.equal(hit.headers.get('X-PetForge-Cache'), 'HIT');
    assert.equal(hit.headers.get('Cache-Control'), 'no-store');
    assert.equal(hit.headers.get('Set-Cookie'), null);
    assert.equal(calls, 1);
    for (const req of [
      request('/workshop?limit=24', {headers: {Cookie: `__Host-petforge-session=${'a'.repeat(64)}`}}),
      request('/me'), request('/workshop/id'),
      request('/workshop', {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json'}, body: '{}'})
    ]) assert.equal((await onRequest({request: req})).headers.get('X-PetForge-Cache'), null);
    assert.equal(calls, 5);
    assert.equal(entries.size, 1);
    await onRequest({request: request('/workshop?limit=1')});
    assert.equal(calls, 6, 'queries have independent cache keys');
  } finally { globalThis.fetch = previousFetch; globalThis.caches = previousCaches; }
});

test('listing errors are never cached and a broken cache does not block upstream requests', async () => {
  const previousFetch = globalThis.fetch, previousCaches = globalThis.caches;
  let stores = 0;
  globalThis.caches = {default: {match: async () => { throw new Error('cache offline'); }, put: async () => { stores++; }}};
  try {
    globalThis.fetch = async () => Response.json({error: 'unavailable'}, {status: 503});
    assert.equal((await onRequest({request: request('/workshop')})).status, 503);
    assert.equal(stores, 0);
    globalThis.fetch = async () => Response.json({posts: []});
    globalThis.caches.default.put = async () => { throw new Error('cache full'); };
    assert.equal((await onRequest({request: request('/workshop')})).status, 200);
  } finally { globalThis.fetch = previousFetch; globalThis.caches = previousCaches; }
});
