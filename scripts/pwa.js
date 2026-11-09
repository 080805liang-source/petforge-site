// Keep offline caching without offering to install an app.
window.addEventListener('beforeinstallprompt', event => event.preventDefault());
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {}));
}
