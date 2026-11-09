(() => {
  const config = window.PETFORGE_MEMBERSHIP;
  if (!config) return;
  let token = '';
  let oldToken = '';
  try { oldToken = localStorage.getItem(config.sessionKey) || ''; } catch (_) {}
  const clearLegacy = () => { try { localStorage.removeItem(config.sessionKey); } catch (_) {} };
  const ready = config.cookieSession && oldToken
    ? fetch(`${config.apiUrl}/auth/session`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${oldToken}` }, body: '{}' }).then(response => { if (response.ok || response.status === 401) { clearLegacy(); oldToken = ""; } }).catch(() => {})
    : Promise.resolve();
  if (!config.cookieSession) { token = oldToken; clearLegacy(); }
  window.PetForgeSession = {
    async fetch(path, options = {}) {
      await ready;
      const response = await fetch(`${config.apiUrl}${path}`, {
        ...options, credentials: config.cookieSession ? 'same-origin' : 'omit', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', ...(!config.cookieSession && token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
      });
      if (['/auth/login', '/auth/signup'].includes(path) && response.ok && !config.cookieSession) {
        const data = await response.clone().json();
        token = data.token || '';
      }
      if (response.status === 401 || path === '/auth/logout' || (path === '/auth/reset-password' && response.ok)) token = '';
      return response;
    }
  };
})();
