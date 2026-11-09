(() => {
  const form = document.querySelector('#recovery-form');
  const email = document.querySelector('#recovery-email');
  const code = document.querySelector('#recovery-code');
  const password = document.querySelector('#recovery-password');
  const confirm = document.querySelector('#recovery-confirm');
  const details = document.querySelector('#recovery-details');
  const submit = document.querySelector('#recovery-submit');
  const resend = document.querySelector('#recovery-resend');
  const edit = document.querySelector('#recovery-edit');
  const note = document.querySelector('#recovery-note');
  let challenge = null, availableAt = 0, timer = null, busy = false;
  const say = (text, error = false) => { note.textContent = text; note.dataset.error = String(error); };
  const step = index => document.querySelectorAll('.recovery-steps li').forEach((item, i) => i === index ? item.setAttribute('aria-current', 'step') : item.removeAttribute('aria-current'));
  async function request(path, body) {
    const response = await window.PetForgeSession.fetch(path, { method: 'POST', body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '请求失败，请稍后重试。');
    return data;
  }
  function countdown() {
    const seconds = Math.max(0, Math.ceil((availableAt - Date.now()) / 1000));
    resend.textContent = seconds ? `${seconds}s` : '重新发送';
    resend.disabled = busy || seconds > 0;
    if (!seconds && timer) { clearInterval(timer); timer = null; }
  }
  async function send() {
    const address = email.value.trim().toLowerCase();
    if (!/^[.0-9a-z_-]{1,40}@[.0-9a-z_-]{1,40}\.[a-z]{1,10}$/i.test(address)) throw new Error('请填写有效邮箱。');
    const data = await request('/auth/send-reset-code', { email: address });
    challenge = { email: address, id: data.challengeId };
    availableAt = Date.now() + data.retryAfter * 1000;
    details.hidden = false; edit.hidden = false; email.readOnly = true;
    code.required = password.required = confirm.required = true;
    submit.textContent = '重置密码'; step(1);
    say('验证码已发送，请检查邮箱（包括垃圾邮件）。');
    if (timer) clearInterval(timer);
    timer = setInterval(countdown, 1000); countdown(); code.focus();
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    busy = true; submit.disabled = true; resend.disabled = true; edit.disabled = true;
    try {
      if (!challenge) { say('正在发送邮箱验证码…'); await send(); }
      else {
        if (email.value.trim().toLowerCase() !== challenge.email) throw new Error('邮箱已更改，请重新获取验证码。');
        if (password.value.length < 8 || password.value !== confirm.value) throw new Error('密码至少 8 位，且两次输入必须一致。');
        say('正在重置密码…');
        await request('/auth/reset-password', { email: challenge.email, challengeId: challenge.id, emailCode: code.value.trim(), password: password.value, confirmPassword: confirm.value });
        password.value = confirm.value = code.value = ''; challenge = null;
        form.hidden = true; document.querySelector('#recovery-success').hidden = false;
        document.querySelector('#recovery-title').textContent = '密码已重置';
        document.querySelector('#recovery-intro').textContent = '请使用新密码重新登录。'; step(2);
        if (timer) clearInterval(timer);
      }
    } catch (error) { say(error.message || '账号服务暂时无法连接，请检查网络后重试。', true); }
    finally { busy = false; submit.disabled = false; edit.disabled = false; countdown(); }
  });
  resend.addEventListener('click', async () => {
    if (busy || Date.now() < availableAt) return;
    busy = true; resend.disabled = submit.disabled = edit.disabled = true;
    try { code.value = ''; await send(); } catch (error) { say(error.message || '账号服务暂时无法连接，请检查网络后重试。', true); }
    finally { busy = false; submit.disabled = edit.disabled = false; countdown(); }
  });
  edit.addEventListener('click', () => {
    challenge = null; code.value = password.value = confirm.value = '';
    email.readOnly = false; details.hidden = true; edit.hidden = true;
    code.required = password.required = confirm.required = false;
    submit.textContent = '发送邮箱验证码'; say(''); step(0); email.focus();
  });
  document.querySelector('#recovery-reveal').addEventListener('click', event => {
    const show = password.type === 'password'; password.type = confirm.type = show ? 'text' : 'password';
    event.currentTarget.textContent = show ? '隐藏' : '显示';
    event.currentTarget.setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
    event.currentTarget.setAttribute('aria-pressed', String(show));
  });
})();
