import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
const authTriggers = [...document.querySelectorAll("[data-member-open]")];
const modeButtons = [...document.querySelectorAll("[data-member-mode]")];
const supabase = config ? createClient(config.url, config.publishableKey) : null;
let mode = "login";
let memberActive = false;

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
async function refreshMembership() {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  authPanel.hidden = Boolean(user); vipPanel.hidden = !user;
  if (!user) { memberActive = false; setHeaderState(false, false); return false; }
  const { data, error } = await supabase.from("profiles").select("vip_expires_at").eq("id", user.id).maybeSingle();
  memberActive = !error && Boolean(data?.vip_expires_at) && new Date(data.vip_expires_at) > new Date();
  setHeaderState(memberActive, true);
  vipTitle.textContent = memberActive ? "你的 PET FORGE VIP 正在生效" : "开通 PET FORGE VIP";
  vipStatus.textContent = memberActive ? `VIP 有效至 ${formatDate(data.vip_expires_at)}，现在可以创作并生成 Windows 桌宠应用。` : "输入购买后获得的兑换码，即可开通创作权限。";
  window.dispatchEvent(new CustomEvent("petforge:membership-change", { detail: { active: memberActive } }));
  return memberActive;
}
async function requireActive() { if (memberActive) return true; await refreshMembership(); if (!memberActive) openMember(); return memberActive; }

window.PetForgeMembership = { requireActive, isActive: () => memberActive, open: openMember, refresh: refreshMembership };
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
  event.preventDefault(); if (!supabase) return;
  const email = document.querySelector("#membership-email").value.trim();
  const password = document.querySelector("#membership-password").value;
  authSubmit.disabled = true; authNote.textContent = mode === "login" ? "正在登录..." : "正在注册...";
  const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
  authSubmit.disabled = false;
  if (result.error) { authNote.textContent = result.error.message; return; }
  if (mode === "signup" && !result.data.session) { authNote.textContent = "注册成功，请完成邮箱验证后再登录。"; return; }
  await refreshMembership();
});
redeemForm?.addEventListener("submit", async (event) => {
  event.preventDefault(); if (!supabase) return;
  redeemNote.textContent = "正在兑换...";
  const { data, error } = await supabase.rpc("redeem_code", { voucher_code: document.querySelector("#membership-code").value });
  redeemNote.textContent = error ? error.message : `兑换成功，VIP 有效至 ${formatDate(data)}。`;
  if (!error) { document.querySelector("#membership-code").value = ""; await refreshMembership(); }
});
document.querySelector("#membership-signout")?.addEventListener("click", async () => { await supabase?.auth.signOut(); await refreshMembership(); });
refreshMembership();
