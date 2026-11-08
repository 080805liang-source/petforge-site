const UPSTREAM = 'https://cloud-paw-vip-cn-d0eub7r110788a3-1460995143.ap-shanghai.app.tcloudbase.com';
const COOKIE = '__Host-petforge-session';
const MAX_BODY = 900000;
const responseHeaders = {
  'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer'
};
const sessionCookie = (token = '') => `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${token ? 604800 : 0}`;
const json = (body, status, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...responseHeaders, ...extra } });

export async function onRequest({ request }) {
  const url = new URL(request.url);
  const method = request.method;
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) return json({ error: '请求方法不受支持。' }, 405);
  if (!/^\/api\/[a-zA-Z0-9/_-]+$/.test(url.pathname)) return json({ error: '接口路径无效。' }, 400);
  if (method !== 'GET' && (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site')) return json({ error: '来源不被允许。' }, 403);
  if (method !== 'GET' && !/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) return json({ error: '请使用 JSON 请求。' }, 415);
  let body;
  if (request.body) {
    const reader = request.body.getReader();
    const chunks = [];
    let length = 0;
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > MAX_BODY) { await reader.cancel(); return json({ error: '请求内容过大。' }, 413); }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    body = bytes;
  }
  const migration = url.pathname === '/api/auth/session' && method === 'POST';
  const rawCookie = (request.headers.get('Cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || '';
  const rawToken = migration ? /^Bearer ([a-zA-Z0-9_-]{1,256})$/.exec(request.headers.get('Authorization') || '')?.[1] : rawCookie;
  const token = /^[a-zA-Z0-9_-]{1,256}$/.test(rawToken || '') ? rawToken : '';
  if (migration && !token) return json({ error: '请重新登录。' }, 401);
  const logout = url.pathname === '/api/auth/logout' && method === 'POST';
  try {
    const upstream = await fetch(`${UPSTREAM}${migration ? '/api/me' : url.pathname + url.search}`, {
      method: migration ? 'GET' : method,
      headers: { 'Content-Type': 'application/json', Origin: 'https://petforge-desktop.pages.dev', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: migration || method === 'GET' ? undefined : body,
      redirect: 'manual', signal: AbortSignal.timeout(20000)
    });
    if (upstream.status >= 300 && upstream.status < 400) throw new Error('Upstream redirect rejected');
    const data = await upstream.json();
    const extra = {};
    if (upstream.headers.has('Retry-After')) extra['Retry-After'] = upstream.headers.get('Retry-After');
    if (logout || upstream.status === 401) extra['Set-Cookie'] = sessionCookie();
    if (upstream.ok && migration) { extra['Set-Cookie'] = sessionCookie(token); return json({ signedIn: true }, 200, extra); }
    if (upstream.ok && ['/api/auth/login', '/api/auth/signup'].includes(url.pathname)) {
      if (!/^[a-f0-9]{64}$/.test(data.token || '')) return json({ error: '登录服务返回异常。' }, 502);
      extra['Set-Cookie'] = sessionCookie(data.token);
      delete data.token;
    }
    return json(data, upstream.status, extra);
  } catch (error) {
    console.warn('Account upstream failed', { name: error?.name, message: String(error?.message || '').slice(0, 160) });
    return json({ error: '账号服务暂时无法连接，请稍后重试。' }, 502, logout ? { 'Set-Cookie': sessionCookie() } : {});
  }
}
