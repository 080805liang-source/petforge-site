const config = window.PETFORGE_MEMBERSHIP;
const dialog = document.querySelector("#membership-dialog");
const authPanel = document.querySelector("#membership-auth");
const vipPanel = document.querySelector("#membership-vip");
const authForm = document.querySelector("#membership-auth-form");
const redeemForm = document.querySelector("#membership-redeem-form");
const authNote = document.querySelector("#membership-auth-note");
const redeemNote = document.querySelector("#membership-redeem-note");
const authSubmit = document.querySelector("#membership-auth-submit");
const vipTitle = document.querySelector("#membership-vip-title");
const vipStatus = document.querySelector("#membership-vip-status");
const adminPanel = document.querySelector("#membership-admin");
const adminIssueButton = document.querySelector("#membership-issue-code");
const adminNote = document.querySelector("#membership-admin-note");
const authTriggers = [...document.querySelectorAll("[data-member-open]")];
const modeButtons = [...document.querySelectorAll("[data-member-mode]")];

let mode = "login";
let memberActive = false;
let sessionToken = config ? localStorage.getItem(config.sessionKey) || "" : "";
let member = null;

function formatDate(value) { return new Intl.DateTimeFormat("zh-CN", { dateStyle: "long" }).format(new Date(value)); }
function openMember() { if (dialog && !dialog.open) dialog.showModal(); }
function setMode(nextMode) {
  mode = nextMode;
  modeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.memberMode === mode));
  authSubmit.innerHTML = `${mode === "login" ? "登录" : "注册"} <span>→</span>`;
  authNote.textContent = "";
}
function setHeaderState(active, signedIn) {
  authTriggers.forEach((button) => { button.textContent = active ? "我的 VIP" : signedIn ? "开通 VIP" : "登录 / 开通 VIP"; });
  document.body.dataset.memberActive = String(active);
}
function saveSession(token) {
  sessionToken = token || "";
  if (sessionToken) localStorage.setItem(config.sessionKey, sessionToken);
  else localStorage.removeItem(config.sessionKey);
}
async function request(path, options = {}) {
  if (!config?.apiUrl) throw new Error("会员服务暂未配置。");
  let response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch (_) {
    throw new Error("会员服务暂时无法连接。请检查网络，或使用公开网址重新打开后再试。");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "会员服务暂时无法连接，请稍后重试。");
  return body;
}
async function currentMember() {
  if (!sessionToken) return null;
  try {
    const data = await request("/me");
    return data.user;
  } catch (_) {
    saveSession("");
    return null;
  }
}
async function refreshMembership() {
  member = await currentMember();
  authPanel.hidden = Boolean(member); vipPanel.hidden = !member;
  if (!member) { memberActive = false; setHeaderState(false, false); return false; }
  memberActive = Boolean(member.isAdmin) || (Boolean(member.vipExpiresAt) && new Date(member.vipExpiresAt) > new Date());
  if (adminPanel) adminPanel.hidden = !member.isAdmin;
  setHeaderState(memberActive, true);
  vipTitle.textContent = member.isAdmin ? "管理员控制台" : memberActive ? "你的 PET FORGE VIP 正在生效" : "开通 PET FORGE VIP";
  vipStatus.textContent = memberActive
    ? member.isAdmin ? "管理员权限已开启：你可以正常创作、生成桌宠，并在下方直接生成销售卡密。" : `VIP 有效至 ${formatDate(member.vipExpiresAt)}，现在可以创作并生成 Windows 桌宠应用。`
    : "输入购买后获得的兑换码，即可开通创作权限。";
  window.dispatchEvent(new CustomEvent("petforge:membership-change", { detail: { active: memberActive } }));
  return memberActive;
}
async function requireActive() { if (memberActive) return true; await refreshMembership(); if (!memberActive) openMember(); return memberActive; }
async function issueDesktopLicense(fingerprint) {
  if (!await requireActive()) throw new Error("Please sign in and activate VIP first.");
  return request("/pet-license", { method: "POST", body: JSON.stringify({ fingerprint }) });
}

window.PetForgeMembership = { requireActive, isActive: () => memberActive, open: openMember, refresh: refreshMembership, issueDesktopLicense };
authTriggers.forEach((button) => button.addEventListener("click", openMember));
document.querySelector("[data-member-close]")?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.memberMode)));
document.addEventListener("click", (event) => {
  const locked = event.target.closest("[data-membership-required]");
  if (!locked || memberActive) return;
  event.preventDefault(); event.stopImmediatePropagation(); openMember();
}, true);
document.addEventListener("change", (event) => {
  if (event.target?.id !== "pet-image" || memberActive) return;
  event.target.value = ""; openMember();
}, true);
authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.querySelector("#membership-email").value.trim();
  const password = document.querySelector("#membership-password").value;
  authSubmit.disabled = true; authNote.textContent = mode === "login" ? "正在登录..." : "正在注册...";
  try {
    const data = await request(mode === "login" ? "/auth/login" : "/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
    saveSession(data.token); member = data.user;
    authNote.textContent = mode === "signup" ? "注册成功，请输入 VIP 兑换码开通会员。" : "登录成功。";
    await refreshMembership();
  } catch (error) { authNote.textContent = error.message; }
  finally { authSubmit.disabled = false; }
});
redeemForm?.addEventListener("submit", async (event) => {
  event.preventDefault(); redeemNote.textContent = "正在兑换...";
  try {
    const data = await request("/redeem", { method: "POST", body: JSON.stringify({ code: document.querySelector("#membership-code").value }) });
    redeemNote.textContent = `兑换成功，VIP 有效至 ${formatDate(data.vipExpiresAt)}。`;
    document.querySelector("#membership-code").value = "";
    await refreshMembership();
  } catch (error) { redeemNote.textContent = error.message; }
});
adminIssueButton?.addEventListener("click", async () => {
  adminIssueButton.disabled = true;
  adminNote.textContent = "正在生成卡密…";
  try {
    const data = await request("/admin/issue-code", { method: "POST", body: JSON.stringify({ durationDays: 30 }) });
    adminNote.textContent = `新卡密：${data.code}（${data.durationDays} 天，复制后发送给买家）`;
  } catch (error) { adminNote.textContent = error.message; }
  finally { adminIssueButton.disabled = false; }
});
document.querySelector("#membership-signout")?.addEventListener("click", async () => {
  try { await request("/auth/logout", { method: "POST" }); } catch (_) {}
  saveSession(""); await refreshMembership();
});
refreshMembership();
