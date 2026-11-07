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
const sendCodeButton = document.querySelector("#membership-send-code");
const sendEmailCodeButton = document.querySelector("#membership-send-email-code");
const authTriggers = [...document.querySelectorAll("[data-member-open]")];
const adminDashboardLink = document.querySelector("[data-admin-dashboard]");
const modeButtons = [...document.querySelectorAll("[data-member-mode]")];
const identityButtons = [...document.querySelectorAll("[data-identity-mode]")];
const emailField = document.querySelector("#membership-email-field");
const phoneField = document.querySelector("#membership-phone-field");
const smsField = document.querySelector("#membership-sms-field");
const emailCodeField = document.querySelector("#membership-email-code-field");
const confirmPasswordField = document.querySelector("#membership-confirm-password-field");
const emailInput = document.querySelector("#membership-email");
const phoneInput = document.querySelector("#membership-phone");
const smsInput = document.querySelector("#membership-sms-code");
const emailCodeInput = document.querySelector("#membership-email-code");
const passwordInput = document.querySelector("#membership-password");
const confirmPasswordInput = document.querySelector("#membership-confirm-password");

let mode = "login";
let identityMode = "email";
let credits = 0;
let member = null;
let sessionToken = config ? localStorage.getItem(config.sessionKey) || "" : "";
let pendingFeedback = false;

function openMember() { if (dialog && !dialog.open) dialog.showModal(); }
function saveSession(token) { sessionToken = token || ""; if (sessionToken) localStorage.setItem(config.sessionKey, sessionToken); else localStorage.removeItem(config.sessionKey); }
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
  const email = identityMode === "email";
  emailCodeField.hidden = !signup || !email;
  smsField.hidden = !signup || email;
  emailCodeInput.required = signup && email;
  smsInput.required = signup && !email;
}
function setMode(nextMode) { mode = nextMode; modeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.memberMode === mode)); authSubmit.innerHTML = `${mode === "login" ? "登录" : "注册"} <span>→</span>`; confirmPasswordField.hidden = mode !== "signup"; confirmPasswordInput.required = mode === "signup"; updateVerificationFields(); authNote.textContent = ""; }
function setIdentityMode(nextMode) { identityMode = nextMode; identityButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.identityMode === identityMode)); emailField.hidden = identityMode !== "email"; phoneField.hidden = identityMode !== "phone"; emailInput.required = identityMode === "email"; phoneInput.required = identityMode === "phone"; updateVerificationFields(); }
async function request(path, options = {}) {
  if (!config?.apiUrl) throw new Error("账号服务暂未配置。");
  let response;
  try { response = await fetch(`${config.apiUrl}${path}`, { ...options, headers: { "content-type": "application/json", ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}), ...(options.headers || {}) } }); }
  catch (_) { throw new Error("账号服务暂时无法连接，请检查网络后重试。"); }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || "请求失败，请稍后重试。"), { status: response.status });
  return body;
}
async function refreshBalance() {
  if (!sessionToken) { member = null; credits = 0; authPanel.hidden = false; balancePanel.hidden = true; setHeaderState(false); return false; }
  try { const data = await request("/me"); member = data.user; credits = Number(member.credits || 0); }
  catch (error) { if (error.status === 401) saveSession(""); member = null; credits = 0; authPanel.hidden = false; balancePanel.hidden = true; authNote.textContent = error.message; setHeaderState(false); return false; }
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
sendCodeButton?.addEventListener("click", async () => { const phone = phoneInput.value.trim(); if (!/^1\d{10}$/.test(phone)) { authNote.textContent = "请输入有效的 11 位手机号。"; return; } sendCodeButton.disabled = true; authNote.textContent = "正在发送验证码…"; try { await request("/auth/send-code", { method: "POST", body: JSON.stringify({ phone }) }); authNote.textContent = "验证码已发送，请在 10 分钟内输入。"; } catch (error) { authNote.textContent = error.message; } finally { setTimeout(() => { sendCodeButton.disabled = false; }, 60000); } });
sendEmailCodeButton?.addEventListener("click", async () => { const email = emailInput.value.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(email)) { authNote.textContent = "请输入有效邮箱后再发送验证码。"; return; } sendEmailCodeButton.disabled = true; authNote.textContent = "正在发送邮箱验证码…"; try { await request("/auth/send-email-code", { method: "POST", body: JSON.stringify({ email }) }); authNote.textContent = "验证码已发送，请检查邮箱（包括垃圾邮件）。"; } catch (error) { authNote.textContent = error.message; } finally { setTimeout(() => { sendEmailCodeButton.disabled = false; }, 60000); } });
authForm?.addEventListener("submit", async (event) => { event.preventDefault(); if (mode === "signup" && passwordInput.value !== confirmPasswordInput.value) { authNote.textContent = "两次输入的密码不一致。"; return; } authSubmit.disabled = true; authNote.textContent = mode === "login" ? "正在登录…" : "正在注册…"; const body = { identity: identityMode, email: emailInput.value.trim().toLowerCase(), phone: phoneInput.value.trim(), password: passwordInput.value, confirmPassword: confirmPasswordInput.value, smsCode: smsInput.value.trim(), emailCode: emailCodeInput.value.trim() }; try { const data = await request(mode === "login" ? "/auth/login" : "/auth/signup", { method: "POST", body: JSON.stringify(body) }); saveSession(data.token); authNote.textContent = "操作成功。"; await refreshBalance(); if (pendingFeedback && member) { pendingFeedback = false; dialog?.close(); feedbackDialog?.showModal(); } } catch (error) { authNote.textContent = error.message; } finally { authSubmit.disabled = false; } });
redeemForm?.addEventListener("submit", async (event) => {
  event.preventDefault(); redeemSubmit.disabled = true; redeemNote.textContent = "正在验证会员码…";
  try {
    const data = await request("/redeem", { method: "POST", body: JSON.stringify({ code: redeemInput.value.trim().toUpperCase() }) });
    member = data.user; credits = Number(member.credits || 0); renderBalance(); redeemForm.reset();
    redeemNote.textContent = "兑换成功，权益已加入当前账号。";
  } catch (error) { redeemNote.textContent = error.message; }
  finally { redeemSubmit.disabled = false; }
});
document.querySelector("#membership-signout")?.addEventListener("click", async () => { try { await request("/auth/logout", { method: "POST" }); } catch (_) {} saveSession(""); await refreshBalance(); });
setMode("login"); setIdentityMode("email"); refreshBalance();
