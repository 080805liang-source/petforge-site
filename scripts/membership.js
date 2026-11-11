const config = window.PETFORGE_MEMBERSHIP;
const dialog = document.querySelector("#membership-dialog");
const feedbackDialog = document.querySelector("#feedback-dialog");
const feedbackForm = document.querySelector("#feedback-form");
const feedbackNote = document.querySelector("#feedback-note");
const feedbackSubmit = document.querySelector("#feedback-submit");
const authPanel = document.querySelector("#membership-auth");
const balancePanel = document.querySelector("#membership-vip");
const authForm = document.querySelector("#membership-auth-form");
const authNote = document.querySelector("#membership-auth-note");
const authSubmit = document.querySelector("#membership-auth-submit");
const balanceTitle = document.querySelector("#membership-vip-title");
const balanceStatus = document.querySelector("#membership-vip-status");
const redeemForm = document.querySelector("#membership-redeem-form");
const redeemInput = document.querySelector("#membership-code");
const redeemNote = document.querySelector("#membership-redeem-note");
const redeemSubmit = document.querySelector("#membership-redeem-submit");
const sendEmailCodeButton = document.querySelector("#membership-send-email-code");
const authTriggers = [...document.querySelectorAll("[data-member-open]")];
const adminDashboardTemplate = document.querySelector("[data-admin-dashboard-template]");
let adminDashboardLink = null;
const modeButtons = [...document.querySelectorAll("[data-member-mode]")];
const identityButtons = [...document.querySelectorAll("[data-identity-mode]")];
const emailField = document.querySelector("#membership-email-field");
const phoneField = document.querySelector("#membership-phone-field");
const emailCodeField = document.querySelector("#membership-email-code-field");
const confirmPasswordField = document.querySelector("#membership-confirm-password-field");
const emailInput = document.querySelector("#membership-email");
const phoneInput = document.querySelector("#membership-phone");
const emailCodeInput = document.querySelector("#membership-email-code");
const passwordInput = document.querySelector("#membership-password");
const confirmPasswordInput = document.querySelector("#membership-confirm-password");

let mode = "login";
let identityMode = "email";
let credits = 0;
let member = null;

let pendingFeedback = false;
let emailChallenge = null;
let verificationChallenge = null;
let verificationCountdown;
const verificationPanel = document.createElement('section');
verificationPanel.hidden = true;
verificationPanel.innerHTML = `<h3>验证邮箱，继续使用免费 AI</h3><p class="membership-intro">旧账号只需补验证一次；新注册账号已自动完成。验证后自动继续下载，无需填写模型 Key。</p><form id="account-verification-form"><label>验证邮箱<input id="account-verification-email" type="email" autocomplete="email" required></label><div class="sms-field"><label>邮箱验证码<input id="account-verification-code" pattern="[0-9]{6}" maxlength="6" inputmode="numeric" autocomplete="one-time-code" required></label><button id="account-verification-send" class="button secondary" type="button">发送验证码</button></div><button id="account-verification-submit" class="button primary wide" type="submit">验证并继续</button></form><p id="account-verification-note" class="membership-note" role="status"></p>`;
balancePanel?.prepend(verificationPanel);
const verificationEmail = verificationPanel.querySelector('#account-verification-email');
const verificationCode = verificationPanel.querySelector('#account-verification-code');
const verificationNote = verificationPanel.querySelector('#account-verification-note');
const verificationSend = verificationPanel.querySelector('#account-verification-send');
const membershipOptions = document.createElement('details');
const membershipSummary = document.createElement('summary');
membershipSummary.textContent = '会员码（其他模式可选）';
const redeemIntro = redeemForm?.nextElementSibling;
redeemForm?.before(membershipOptions);
membershipOptions.append(membershipSummary);
if (redeemForm) membershipOptions.append(redeemForm);
if (redeemIntro) membershipOptions.append(redeemIntro);
if (redeemNote) membershipOptions.append(redeemNote);
function renderVerification() {
  verificationPanel.hidden = !member || member.identityVerified;
  const email = member?.email || '';
  if (verificationEmail.dataset.account !== member?.id) {
    verificationEmail.value = email; verificationEmail.dataset.account = member?.id || '';
    verificationChallenge = null; verificationCode.value = ''; verificationNote.textContent = '';
    clearInterval(verificationCountdown); verificationSend.disabled = false; verificationSend.textContent = '发送验证码';
  }
  verificationEmail.readOnly = Boolean(email);
}
function openVerification() { renderVerification(); openMember(); if (member && !member.identityVerified) verificationEmail.focus(); }
const freeSelected = () => document.querySelector('#chat-mode')?.value === 'free';
const canDownload = () => freeSelected() ? Boolean(member?.identityVerified) : isActive();
const canUpload = () => isActive() || Boolean(freeSelected() && member);

function openMember() { if (document.querySelector('#chat-mode') && freeSelected()) document.querySelector('#membership-title').textContent = '登录后，使用网站免费 AI'; if (dialog && !dialog.open) dialog.showModal(); }

const isUnlimited = () => Boolean(member?.isAdmin || (member?.vipExpiresAt && new Date(member.vipExpiresAt) > new Date()));
const isActive = () => isUnlimited() || credits > 0;
function setHeaderState(signedIn) {
  authTriggers.forEach((button) => { button.textContent = signedIn ? (member?.isAdmin ? "管理员 · 无限使用" : freeSelected() ? '我的账号 · 免费 AI' : isUnlimited() ? "会员已激活 · 我的账户" : credits > 0 ? `${credits} 次可用 · 兑换` : "激活会员") : document.querySelector('#chat-mode') ? '注册 / 登录' : "登录 / 兑换会员码"; });
  if (signedIn && member?.isAdmin === true && adminDashboardTemplate) {
    if (!adminDashboardLink) { adminDashboardLink = adminDashboardTemplate.content.firstElementChild.cloneNode(true); adminDashboardTemplate.after(adminDashboardLink); }
  } else { adminDashboardLink?.remove(); adminDashboardLink = null; }
  document.body.dataset.memberActive = String(Boolean(signedIn && isActive()));
}
function renderBalance() {
  renderVerification();
  balanceTitle.textContent = isUnlimited() ? "无限次可用" : credits > 0 ? `${credits} 次可用` : "会员未激活";
  balanceStatus.textContent = member?.isAdmin ? "管理员账号已恢复，可无限生成桌宠并查看运营后台。" : isUnlimited() ? `会员有效至 ${new Intl.DateTimeFormat(document.documentElement.lang || "zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(member.vipExpiresAt))}` : "兑换后激活会员，有效期内不限生成次数。";
  setHeaderState(true);
  if (freeSelected() && !isActive()) { balanceTitle.textContent = member.identityVerified ? '账号已就绪' : '完成验证即可使用'; balanceStatus.textContent = '选择网站免费 AI，可直接生成桌宠，无需会员码或自己的 Key。'; }
  const codeLabel = redeemForm?.querySelector('label');
  if (codeLabel) codeLabel.firstChild.textContent = freeSelected() ? '会员码（可选，免费 AI 无需兑换）' : '会员码';
  membershipOptions.open = !freeSelected();
  membershipSummary.hidden = !freeSelected();
  window.dispatchEvent(new CustomEvent("petforge:membership-change", { detail: { active: isActive(), credits, isAdmin: Boolean(member?.isAdmin) } }));
}
function updateVerificationFields() {
  const signup = mode === "signup";
  emailCodeField.hidden = !signup;
  emailCodeInput.required = signup;
  passwordInput.autocomplete = signup ? "new-password" : "current-password";
}
function setMode(nextMode) {
  mode = nextMode;
  const forgot = document.querySelector('.membership-forgot');
  if (forgot) forgot.hidden = mode !== 'login';
  modeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.memberMode === mode));
  identityButtons.forEach((button) => { button.hidden = mode === "signup" && button.dataset.identityMode === "phone"; });
  if (mode === "signup") setIdentityMode("email");
  authSubmit.innerHTML = `${mode === "login" ? "登录" : "注册"} <span>→</span>`;
  confirmPasswordField.hidden = mode !== "signup";
  confirmPasswordInput.required = mode === "signup";
  updateVerificationFields();
  authNote.textContent = mode === "signup" ? "注册使用邮箱验证码；已有手机号账号可切换手机号登录。" : "";
}
function setIdentityMode(nextMode) {
  identityMode = mode === "signup" ? "email" : nextMode;
  identityButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.identityMode === identityMode));
  emailField.hidden = identityMode !== "email";
  phoneField.hidden = identityMode !== "phone";
  emailInput.required = identityMode === "email";
  phoneInput.required = identityMode === "phone";
  updateVerificationFields();
}
async function request(path, options = {}) {
  if (!config?.apiUrl) throw new Error("账号服务暂未配置。");
  let response;
  try { response = await window.PetForgeSession.fetch(path, options); }
  catch (_) { throw new Error("账号服务暂时无法连接，请检查网络后重试。"); }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || "请求失败，请稍后重试。"), { status: response.status });
  return body;
}
async function refreshBalance() {
  try { const data = await request("/me"); member = data.user; credits = Number(member.credits || 0); }
  catch (error) { member = null; credits = 0; renderVerification(); authPanel.hidden = false; balancePanel.hidden = true; if (error.status !== 401) authNote.textContent = error.message; setHeaderState(false); return false; }
  authPanel.hidden = true; balancePanel.hidden = false; renderBalance(); return true;
}
async function requireActive() { await refreshBalance(); if (!member) { openMember(); return false; } if (!isActive()) { openMember(); redeemNote.textContent = "请先兑换会员码，再继续使用。"; return false; } return true; }
async function consumeUse(workshopId = "", chatMode = "") { const data = await request("/consume", { method: "POST", body: JSON.stringify({ amount: 1, chatMode, ...(workshopId ? { workshopId } : {}) }) }); credits = Number(data.credits || 0); renderBalance(); return data; }

window.PetForgeMembership = { requireActive, consumeUse, isActive, isUnlimited, canDownload, isAdmin: () => Boolean(member?.isAdmin), current: () => member, request, open: openMember, openVerification, close: () => dialog?.close(), refresh: refreshBalance };
authTriggers.forEach((button) => button.addEventListener("click", openMember));
document.querySelector("[data-member-close]")?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
document.querySelectorAll("[data-feedback-open]").forEach((button) => button.addEventListener("click", () => {
  if (!member) { pendingFeedback = true; openMember(); authNote.textContent = "请先登录后提交问题反馈。"; return; }
  feedbackNote.textContent = "";
  feedbackDialog?.showModal();
}));
document.querySelector("[data-feedback-close]")?.addEventListener("click", () => feedbackDialog?.close());
feedbackDialog?.addEventListener("click", (event) => { if (event.target === feedbackDialog) feedbackDialog.close(); });
feedbackForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!member) { pendingFeedback = true; openMember(); return; }
  feedbackSubmit.disabled = true;
  feedbackNote.textContent = "正在提交反馈…";
  try {
    await request("/feedback", { method: "POST", body: JSON.stringify({ category: document.querySelector("#feedback-category").value, message: document.querySelector("#feedback-message").value, details: document.querySelector("#feedback-details").value }) });
    feedbackForm.reset();
    feedbackNote.textContent = "反馈已提交，管理员会在后台查看。";
  } catch (error) { feedbackNote.textContent = error.message; }
  finally { feedbackSubmit.disabled = false; }
});
modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.memberMode)));
identityButtons.forEach((button) => button.addEventListener("click", () => setIdentityMode(button.dataset.identityMode)));
document.addEventListener("click", (event) => { const locked = event.target.closest("[data-membership-required]"); if (!locked || canUpload()) return; event.preventDefault(); event.stopImmediatePropagation(); openMember(); }, true);
document.addEventListener("change", (event) => { if (event.target?.id !== "pet-image" || canUpload()) return; event.target.value = ""; openMember(); }, true);
emailInput?.addEventListener("input", () => { emailChallenge = null; emailCodeInput.value = ""; });
verificationEmail.addEventListener('input', () => { verificationChallenge = null; verificationCode.value = ''; });
verificationSend.addEventListener('click', async () => {
  if (!verificationEmail.reportValidity()) return;
  const email = verificationEmail.value.trim().toLowerCase(), accountId = member?.id;
  verificationChallenge = null; verificationSend.disabled = true; verificationNote.textContent = '正在发送邮箱验证码…';
  try {
    const data = await request('/auth/send-verification-code', { method: 'POST', body: JSON.stringify({ email }) });
    if (member?.id !== accountId || verificationEmail.value.trim().toLowerCase() !== email) { verificationSend.disabled = false; return; }
    verificationChallenge = { id: data.challengeId, email, accountId };
    verificationNote.textContent = '验证码已发送，请检查邮箱（包括垃圾邮件）。';
    const availableAt = Date.now() + data.retryAfter * 1000;
    clearInterval(verificationCountdown);
    const tick = () => { const seconds = Math.max(0, Math.ceil((availableAt - Date.now()) / 1000)); verificationSend.textContent = seconds ? `${seconds}s` : '发送验证码'; if (!seconds) { clearInterval(verificationCountdown); verificationSend.disabled = false; } };
    tick(); verificationCountdown = setInterval(tick, 1000);
  } catch (error) { verificationNote.textContent = error.message; verificationSend.disabled = false; }
});
verificationPanel.querySelector('form').addEventListener('submit', async event => {
  event.preventDefault();
  const email = verificationEmail.value.trim().toLowerCase();
  if (!verificationChallenge || verificationChallenge.email !== email || verificationChallenge.accountId !== member?.id) { verificationNote.textContent = '请先获取当前邮箱的验证码。'; return; }
  const submit = verificationPanel.querySelector('#account-verification-submit'); submit.disabled = true;
  verificationNote.textContent = '正在验证…';
  try {
    await request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email, emailCode: verificationCode.value.trim(), challengeId: verificationChallenge.id }) });
    await refreshBalance();
    if (member?.identityVerified) { verificationChallenge = null; verificationCode.value = ''; dialog?.close(); }
  } catch (error) { verificationNote.textContent = error.message; }
  finally { submit.disabled = false; }
});
sendEmailCodeButton?.addEventListener("click", async () => {
  const email = emailInput.value.trim().toLowerCase();
  if (!/^[.0-9a-z_-]{1,40}@[.0-9a-z_-]{1,40}\.[a-z]{1,10}$/i.test(email)) { authNote.textContent = "请输入有效邮箱后再发送验证码。"; return; }
  emailChallenge = null;
  sendEmailCodeButton.disabled = true;
  authNote.textContent = "正在发送邮箱验证码…";
  try {
    const data = await request("/auth/send-email-code", { method: "POST", body: JSON.stringify({ email }) });
    if (emailInput.value.trim().toLowerCase() === email) emailChallenge = { email, id: data.challengeId };
    authNote.textContent = "验证码已发送，请检查邮箱（包括垃圾邮件）。";
    const availableAt = Date.now() + data.retryAfter * 1000;
    const countdown = setInterval(() => {
      const seconds = Math.ceil((availableAt - Date.now()) / 1000);
      sendEmailCodeButton.textContent = seconds > 0 ? `${seconds}s` : "发送验证码";
      if (seconds <= 0) { clearInterval(countdown); sendEmailCodeButton.disabled = false; }
    }, 1000);
    sendEmailCodeButton.textContent = `${data.retryAfter}s`;
  } catch (error) { authNote.textContent = error.message; sendEmailCodeButton.disabled = false; }
});

authForm?.addEventListener("submit", async (event) => { event.preventDefault(); if (mode === "signup" && passwordInput.value !== confirmPasswordInput.value) { authNote.textContent = "两次输入的密码不一致。"; return; } if (mode === "signup" && (!emailChallenge || emailChallenge.email !== emailInput.value.trim().toLowerCase())) { authNote.textContent = "请先获取当前邮箱的验证码。"; return; } authSubmit.disabled = true; authNote.textContent = mode === "login" ? "正在登录…" : "正在注册…"; const body = { identity: identityMode, email: emailInput.value.trim().toLowerCase(), phone: phoneInput.value.trim(), password: passwordInput.value, confirmPassword: confirmPasswordInput.value, challengeId: emailChallenge?.id, emailCode: emailCodeInput.value.trim() }; try { await request(mode === "login" ? "/auth/login" : "/auth/signup", { method: "POST", body: JSON.stringify(body) }); passwordInput.value = ''; confirmPasswordInput.value = ''; emailCodeInput.value = ''; emailChallenge = null; authNote.textContent = "操作成功。"; await refreshBalance(); if (pendingFeedback && member) { pendingFeedback = false; dialog?.close(); feedbackDialog?.showModal(); } else if (freeSelected() && member?.identityVerified) dialog?.close(); } catch (error) { authNote.textContent = error.message; } finally { authSubmit.disabled = false; } });
redeemForm?.addEventListener("submit", async (event) => {
  event.preventDefault(); redeemSubmit.disabled = true; redeemNote.textContent = "正在验证会员码…";
  try {
    const data = await request("/redeem", { method: "POST", body: JSON.stringify({ code: redeemInput.value.trim().toUpperCase() }) });
    member = data.user; credits = Number(member.credits || 0); renderBalance(); redeemForm.reset();
    redeemNote.textContent = "兑换成功，权益已加入当前账号。";
  } catch (error) { redeemNote.textContent = error.message; }
  finally { redeemSubmit.disabled = false; }
});
document.querySelector("#membership-signout")?.addEventListener("click", async () => { setHeaderState(false); try { await request("/auth/logout", { method: "POST" }); } catch (_) {} await refreshBalance(); window.dispatchEvent(new CustomEvent('petforge:membership-change', {detail:{active:false}})); });
setMode("login"); setIdentityMode("email"); refreshBalance();
document.querySelector('#chat-mode')?.addEventListener('change', () => { if (member) renderBalance(); });
if (window.location?.search && new URLSearchParams(window.location.search).get('login') === '1') openMember();
