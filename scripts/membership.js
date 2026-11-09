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
const adminDashboardLink = document.querySelector("[data-admin-dashboard]");
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

function openMember() { if (dialog && !dialog.open) dialog.showModal(); }

const isUnlimited = () => Boolean(member?.isAdmin || (member?.vipExpiresAt && new Date(member.vipExpiresAt) > new Date()));
const isActive = () => isUnlimited() || credits > 0;
function setHeaderState(signedIn) { authTriggers.forEach((button) => { button.textContent = signedIn ? (member?.isAdmin ? "管理员 · 无限使用" : isUnlimited() ? "会员已激活 · 我的账户" : credits > 0 ? `${credits} 次可用 · 兑换` : "激活会员") : "登录 / 兑换会员码"; }); if (adminDashboardLink) adminDashboardLink.hidden = !Boolean(signedIn && member?.isAdmin); document.body.dataset.memberActive = String(Boolean(signedIn && isActive())); }
function renderBalance() {
  balanceTitle.textContent = isUnlimited() ? "无限次可用" : credits > 0 ? `${credits} 次可用` : "会员未激活";
  balanceStatus.textContent = member?.isAdmin ? "管理员账号已恢复，可无限生成桌宠并查看运营后台。" : isUnlimited() ? `会员有效至 ${new Intl.DateTimeFormat(document.documentElement.lang || "zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(member.vipExpiresAt))}` : "兑换后激活会员，有效期内不限生成次数。";
  setHeaderState(true);
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
  catch (error) { member = null; credits = 0; authPanel.hidden = false; balancePanel.hidden = true; if (error.status !== 401) authNote.textContent = error.message; setHeaderState(false); return false; }
  authPanel.hidden = true; balancePanel.hidden = false; renderBalance(); return true;
}
async function requireActive() { await refreshBalance(); if (!member) { openMember(); return false; } if (!isActive()) { openMember(); redeemNote.textContent = "请先兑换会员码，再继续使用。"; return false; } return true; }
async function consumeUse(workshopId = "") { const data = await request("/consume", { method: "POST", body: JSON.stringify({ amount: 1, ...(workshopId ? { workshopId } : {}) }) }); credits = Number(data.credits || 0); renderBalance(); return true; }

window.PetForgeMembership = { requireActive, consumeUse, isActive, isUnlimited, isAdmin: () => Boolean(member?.isAdmin), current: () => member, request, open: openMember, refresh: refreshBalance };
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
document.addEventListener("click", (event) => { const locked = event.target.closest("[data-membership-required]"); if (!locked || isActive()) return; event.preventDefault(); event.stopImmediatePropagation(); openMember(); }, true);
document.addEventListener("change", (event) => { if (event.target?.id !== "pet-image" || isActive()) return; event.target.value = ""; openMember(); }, true);
emailInput?.addEventListener("input", () => { emailChallenge = null; emailCodeInput.value = ""; });
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

authForm?.addEventListener("submit", async (event) => { event.preventDefault(); if (mode === "signup" && passwordInput.value !== confirmPasswordInput.value) { authNote.textContent = "两次输入的密码不一致。"; return; } if (mode === "signup" && (!emailChallenge || emailChallenge.email !== emailInput.value.trim().toLowerCase())) { authNote.textContent = "请先获取当前邮箱的验证码。"; return; } authSubmit.disabled = true; authNote.textContent = mode === "login" ? "正在登录…" : "正在注册…"; const body = { identity: identityMode, email: emailInput.value.trim().toLowerCase(), phone: phoneInput.value.trim(), password: passwordInput.value, confirmPassword: confirmPasswordInput.value, challengeId: emailChallenge?.id, emailCode: emailCodeInput.value.trim() }; try { const data = await request(mode === "login" ? "/auth/login" : "/auth/signup", { method: "POST", body: JSON.stringify(body) }); authNote.textContent = "操作成功。"; await refreshBalance(); if (pendingFeedback && member) { pendingFeedback = false; dialog?.close(); feedbackDialog?.showModal(); } } catch (error) { authNote.textContent = error.message; } finally { authSubmit.disabled = false; } });
redeemForm?.addEventListener("submit", async (event) => {
  event.preventDefault(); redeemSubmit.disabled = true; redeemNote.textContent = "正在验证会员码…";
  try {
    const data = await request("/redeem", { method: "POST", body: JSON.stringify({ code: redeemInput.value.trim().toUpperCase() }) });
    member = data.user; credits = Number(member.credits || 0); renderBalance(); redeemForm.reset();
    redeemNote.textContent = "兑换成功，权益已加入当前账号。";
  } catch (error) { redeemNote.textContent = error.message; }
  finally { redeemSubmit.disabled = false; }
});
document.querySelector("#membership-signout")?.addEventListener("click", async () => { try { await request("/auth/logout", { method: "POST" }); } catch (_) {} await refreshBalance(); });
setMode("login"); setIdentityMode("email"); refreshBalance();
if (window.location?.search && new URLSearchParams(window.location.search).get('login') === '1') openMember();
