(() => {
  const actions = document.querySelector('.header-actions');
  if (!actions) return;
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'nav-cta'; button.textContent = '加入售后群';
  const dialog = document.createElement('dialog');
  dialog.className = 'support-group-dialog'; dialog.setAttribute('aria-label', '加入售后群');
  dialog.innerHTML = `<button type="button" class="support-group-close" aria-label="关闭售后群二维码">×</button><h2>加入售后群</h2><p>使用 QQ 扫码加入 · 群号 1135586609</p><img src="assets/support-qq-qr.png" alt="PET FORGE 售后QQ群二维码，群号1135586609" width="855" height="855"><a href="assets/support-qq-group.png" download="PETFORGE-售后群二维码.png">保存二维码</a>`;
  document.body.append(dialog); actions.prepend(button);
  button.addEventListener('click', () => dialog.showModal());
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
})();
