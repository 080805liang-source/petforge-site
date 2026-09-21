const config = window.PETFORGE_MEMBERSHIP;
const dialog = document.querySelector("#membership-dialog");
const paymentDialog = document.querySelector("#payment-dialog");
const authPanel = document.querySelector("#membership-auth");
const balancePanel = document.querySelector("#membership-vip");
const authForm = document.querySelector("#membership-auth-form");
const authNote = document.querySelector("#membership-auth-note");
const authSubmit = document.querySelector("#membership-auth-submit");
const balanceTitle = document.querySelector("#membership-vip-title");
const balanceStatus = document.querySelector("#membership-vip-status");
const orderNote = document.querySelector("#membership-order-note");
const adminPanel = document.querySelector("#membership-admin");
const adminConfirmButton = document.querySelector("#membership-confirm-order");
const adminOrderId = document.querySelector("#membership-confirm-order-id");
const adminNote = document.querySelector("#membership-admin-note");
const buyButton = document.querySelector("#membership-buy-credits");
const sendCodeButton = document.querySelector("#membership-send-code");
const sendEmailCodeButton = document.querySelector("#membership-send-email-code");
const authTriggers = [...document.querySelectorAll("[data-member-open]")];
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
const paymentOrderId = document.querySelector("#payment-order-id");
const paymentQr = document.querySelector("#payment-qr");
const paymentQrMissing = document.querySelector("#payment-qr-missing");

let mode = "login";
let identityMode = "email";
let credits = 0;
let member = null;
let sessionToken = config ? localStorage.getItem(config.sessionKey) || "" : "";

function openMember() { if (dialog && !dialog.open) dialog.showModal(); }
function saveSession(token) { sessionToken = token || ""; if (sessionToken) localStorage.setItem(config.sessionKey, sessionToken); else localStorage.removeItem(config.sessionKey); }
function setHeaderState(signedIn) { authTriggers.forEach((button) => { button.textContent = signedIn ? `${credits} 次可用 · 购买` : "登录 / 购买次数"; }); document.body.dataset.memberActive = String(Boolean(signedIn && (credits > 0 || member?.isAdmin))); }
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
  if (!response.ok) throw new Error(body.error || "请求失败，请稍后重试。");
  return body;
}
async function refreshBalance() {
  if (!sessionToken) { member = null; credits = 0; authPanel.hidden = false; balancePanel.hidden = true; setHeaderState(false); return false; }
  try { const data = await request("/me"); member = data.user; credits = Number(member.credits || 0); }
  catch (_) { saveSession(""); member = null; credits = 0; authPanel.hidden = false; balancePanel.hidden = true; setHeaderState(false); return false; }
  authPanel.hidden = true; balancePanel.hidden = false; balanceTitle.textContent = `${credits} 次可用`; balanceStatus.textContent = member.isAdmin ? "管理员账号可直接测试；普通用户每生成一次桌宠包消耗 1 次。" : "每生成一次桌宠包消耗 1 次。购买 3 次只需 ¥9.90。"; if (adminPanel) adminPanel.hidden = !member.isAdmin; setHeaderState(true); window.dispatchEvent(new CustomEvent("petforge:membership-change", { detail: { active: member.isAdmin || credits > 0, credits } })); return true;
}
async function requireActive() { await refreshBalance(); if (!member) { openMember(); return false; } if (!member.isAdmin && credits < 1) { openMember(); orderNote.textContent = "当前没有可用次数，请购买 3 次后继续。"; return false; } return true; }
async function consumeUse() { if (member?.isAdmin) return true; const data = await request("/consume", { method: "POST", body: JSON.stringify({ amount: 1 }) }); credits = Number(data.credits || 0); balanceTitle.textContent = `${credits} 次可用`; setHeaderState(true); window.dispatchEvent(new CustomEvent("petforge:membership-change", { detail: { active: credits > 0, credits } })); return true; }
async function createOrder() { const data = await request("/orders", { method: "POST", body: JSON.stringify({ product: "credits_3", amount: 9.9 }) }); paymentOrderId.textContent = data.order.orderId; paymentDialog?.showModal(); }

window.PetForgeMembership = { requireActive, consumeUse, isActive: () => Boolean(member?.isAdmin || credits > 0), open: openMember, refresh: refreshBalance };
authTriggers.forEach((button) => button.addEventListener("click", openMember));
document.querySelector("[data-member-close]")?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
document.querySelectorAll("[data-payment-close]").forEach((button) => button.addEventListener("click", () => paymentDialog?.close()));
modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.memberMode)));
identityButtons.forEach((button) => button.addEventListener("click", () => setIdentityMode(button.dataset.identityMode)));
document.addEventListener("click", (event) => { const locked = event.target.closest("[data-membership-required]"); if (!locked || member?.isAdmin || credits > 0) return; event.preventDefault(); event.stopImmediatePropagation(); openMember(); }, true);
document.addEventListener("change", (event) => { if (event.target?.id !== "pet-image" || member?.isAdmin || credits > 0) return; event.target.value = ""; openMember(); }, true);
sendCodeButton?.addEventListener("click", async () => { const phone = phoneInput.value.trim(); if (!/^1\d{10}$/.test(phone)) { authNote.textContent = "请输入有效的 11 位手机号。"; return; } sendCodeButton.disabled = true; authNote.textContent = "正在发送验证码…"; try { await request("/auth/send-code", { method: "POST", body: JSON.stringify({ phone }) }); authNote.textContent = "验证码已发送，请在 10 分钟内输入。"; } catch (error) { authNote.textContent = error.message; } finally { setTimeout(() => { sendCodeButton.disabled = false; }, 60000); } });
sendEmailCodeButton?.addEventListener("click", async () => { const email = emailInput.value.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(email)) { authNote.textContent = "请输入有效邮箱后再发送验证码。"; return; } sendEmailCodeButton.disabled = true; authNote.textContent = "正在发送邮箱验证码…"; try { await request("/auth/send-email-code", { method: "POST", body: JSON.stringify({ email }) }); authNote.textContent = "验证码已发送，请检查邮箱（包括垃圾邮件）。"; } catch (error) { authNote.textContent = error.message; } finally { setTimeout(() => { sendEmailCodeButton.disabled = false; }, 60000); } });
authForm?.addEventListener("submit", async (event) => { event.preventDefault(); if (mode === "signup" && passwordInput.value !== confirmPasswordInput.value) { authNote.textContent = "两次输入的密码不一致。"; return; } authSubmit.disabled = true; authNote.textContent = mode === "login" ? "正在登录…" : "正在注册…"; const body = { identity: identityMode, email: emailInput.value.trim().toLowerCase(), phone: phoneInput.value.trim(), password: passwordInput.value, confirmPassword: confirmPasswordInput.value, smsCode: smsInput.value.trim(), emailCode: emailCodeInput.value.trim() }; try { const data = await request(mode === "login" ? "/auth/login" : "/auth/signup", { method: "POST", body: JSON.stringify(body) }); saveSession(data.token); authNote.textContent = "操作成功。"; await refreshBalance(); } catch (error) { authNote.textContent = error.message; } finally { authSubmit.disabled = false; } });
buyButton?.addEventListener("click", async () => { buyButton.disabled = true; orderNote.textContent = "正在创建订单…"; try { await createOrder(); orderNote.textContent = "订单已创建，请扫码付款。"; } catch (error) { orderNote.textContent = error.message; } finally { buyButton.disabled = false; } });
adminConfirmButton?.addEventListener("click", async () => { const orderId = adminOrderId.value.trim(); if (!orderId) { adminNote.textContent = "请先输入订单号。"; return; } adminConfirmButton.disabled = true; adminNote.textContent = "正在确认…"; try { const data = await request("/admin/confirm-order", { method: "POST", body: JSON.stringify({ orderId }) }); adminNote.textContent = `已确认，用户新增 ${data.creditsAdded} 次。`; } catch (error) { adminNote.textContent = error.message; } finally { adminConfirmButton.disabled = false; } });
document.querySelector("#membership-signout")?.addEventListener("click", async () => { try { await request("/auth/logout", { method: "POST" }); } catch (_) {} saveSession(""); await refreshBalance(); });
paymentQr?.addEventListener("error", () => { paymentQr.hidden = true; paymentQrMissing.hidden = false; });
setMode("login"); setIdentityMode("email"); refreshBalance();
