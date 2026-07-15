import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.PETFORGE_SUPABASE;
const supabase = createClient(config.url, config.publishableKey);
const bucket = config.bucket;
const grid = document.querySelector("#workshop-grid");
const empty = document.querySelector("#workshop-empty");
const status = document.querySelector("#workshop-status");
const search = document.querySelector("#workshop-search");
const sort = document.querySelector("#workshop-sort");
const authDialog = document.querySelector("#auth-dialog");
const publishDialog = document.querySelector("#publish-dialog");
const authTrigger = document.querySelector("#auth-trigger");
const publishTriggers = [document.querySelector("#publish-trigger"), document.querySelector("#hero-publish"), document.querySelector("#empty-publish")];
const authTitle = document.querySelector("#auth-title");
const authNameField = document.querySelector("#auth-name-field");
const authMode = document.querySelector("#auth-mode");
const authSubmit = document.querySelector("#auth-submit");
const authStatus = document.querySelector("#auth-status");
const publishForm = document.querySelector("#publish-form");
const publishSubmit = document.querySelector("#publish-submit");
const publishStatus = document.querySelector("#publish-status");
let session = null;
let isRegistering = false;
let posts = [];

function setStatus(message, type = "") { status.textContent = message; status.style.color = type === "error" ? "#f5a29b" : ""; }
function publicUrl(path) { return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl; }
function formatStyle(style) { return { original: "ORIGINAL", pixel: "PIXEL", toon: "TOON", comic: "COMIC", chrome: "Y2K", neon: "NEON" }[style] || "CUSTOM"; }

function render() {
  const term = search.value.trim().toLowerCase();
  const matches = posts.filter((post) => [post.title, post.description, post.profiles?.username, post.profiles?.display_name].join(" ").toLowerCase().includes(term));
  grid.replaceChildren(...matches.map((post) => createCard(post)));
  empty.hidden = Boolean(matches.length);
  if (!posts.length) setStatus("工坊已就绪，等待第一位创作者。");
}

function createCard(post) {
  const article = document.createElement("article");
  article.className = "workshop-card";
  const media = document.createElement("div");
  media.className = "workshop-card-media";
  const image = document.createElement("img");
  image.src = publicUrl(post.image_path); image.alt = post.title; image.loading = "lazy";
  const style = document.createElement("span"); style.className = "style-label"; style.textContent = formatStyle(post.style);
  media.append(image, style);
  const main = document.createElement("div"); main.className = "workshop-card-main";
  const meta = document.createElement("div"); meta.className = "card-meta";
  const author = document.createElement("strong"); author.textContent = `@${post.profiles?.username || "creator"}`;
  const downloads = document.createElement("span"); downloads.textContent = `${post.downloads || 0} 使用`;
  const title = document.createElement("h3"); title.textContent = post.title;
  const description = document.createElement("p"); description.textContent = post.description || "由创作者分享的桌面陪伴。";
  const actions = document.createElement("div"); actions.className = "card-actions";
  const use = document.createElement("button"); use.className = "card-use"; use.type = "button"; use.textContent = "使用这个桌宠";
  use.addEventListener("click", () => { window.location.href = `index.html?template=${encodeURIComponent(post.id)}#studio`; });
  const follow = document.createElement("button"); follow.className = "card-follow"; follow.type = "button"; follow.title = "关注创作者"; follow.textContent = "♡";
  follow.addEventListener("click", () => followCreator(post.author_id, follow));
  meta.append(author, downloads); actions.append(use, follow); main.append(meta, title, description, actions); article.append(media, main);
  return article;
}

async function loadPosts() {
  setStatus("正在加载创意工坊...");
  const order = sort.value === "popular" ? { column: "downloads", ascending: false } : { column: "created_at", ascending: false };
  const { data, error } = await supabase.from("workshop_pets").select("id,author_id,title,description,image_path,style,downloads,created_at,profiles!workshop_pets_author_id_fkey(username,display_name)").eq("is_public", true).order(order.column, { ascending: order.ascending }).limit(60);
  if (error) { posts = []; render(); setStatus("创意工坊正在初始化，请稍后刷新。", "error"); return; }
  posts = data || []; render(); if (posts.length) setStatus(`已发现 ${posts.length} 个公开作品`);
}

async function refreshSession() { const { data } = await supabase.auth.getSession(); session = data.session; authTrigger.textContent = session ? "我的账号" : "登录"; }
function openAuth() { authStatus.textContent = ""; authDialog.showModal(); }
function openPublish() { if (!session) return openAuth(); publishStatus.textContent = ""; publishDialog.showModal(); }

async function submitAuth() {
  const email = document.querySelector("#auth-email").value.trim(); const password = document.querySelector("#auth-password").value; const displayName = document.querySelector("#auth-name").value.trim();
  if (!email || password.length < 6) { authStatus.textContent = "请输入邮箱和至少 6 位密码。"; return; }
  authSubmit.disabled = true; authStatus.textContent = isRegistering ? "正在创建账号..." : "正在登录...";
  const result = isRegistering ? await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName || "PET FORGE Creator" } } }) : await supabase.auth.signInWithPassword({ email, password });
  authSubmit.disabled = false;
  if (result.error) { authStatus.textContent = result.error.message; return; }
  await refreshSession();
  if (!session) { authStatus.textContent = "账号已创建，请完成邮箱验证后再登录。"; return; }
  authDialog.close(); openPublish();
}

async function ensureProfile() {
  const prefix = (session.user.email?.split("@")[0] || "creator").replace(/[^a-zA-Z0-9_-]/g, "-");
  await supabase.from("profiles").upsert({ id: session.user.id, username: `${prefix}-${session.user.id.slice(0, 6)}`.slice(0, 32), display_name: session.user.user_metadata?.display_name || "PET FORGE Creator" }, { onConflict: "id", ignoreDuplicates: true });
}

async function publishPet() {
  if (!session) return openAuth();
  const title = document.querySelector("#publish-title").value.trim(); const description = document.querySelector("#publish-description").value.trim(); const image = document.querySelector("#publish-image").files?.[0]; const configFile = document.querySelector("#publish-config").files?.[0];
  if (!title || !image) { publishStatus.textContent = "请填写作品名称并选择桌宠图片。"; return; }
  if (image.size > 10 * 1024 * 1024) { publishStatus.textContent = "图片请控制在 10MB 以内。"; return; }
  let petConfig = { name: title, visualStyle: "original" };
  try { if (configFile) petConfig = JSON.parse(await configFile.text()); } catch { publishStatus.textContent = "制作配置不是有效的 JSON 文件。"; return; }
  publishSubmit.disabled = true; publishStatus.textContent = "正在上传作品..."; await ensureProfile();
  const extension = image.name.split(".").pop()?.toLowerCase() || "png"; const imagePath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
  const uploaded = await supabase.storage.from(bucket).upload(imagePath, image, { contentType: image.type || "image/png" });
  if (uploaded.error) { publishSubmit.disabled = false; publishStatus.textContent = uploaded.error.message; return; }
  petConfig.image = image.name;
  const saved = await supabase.from("workshop_pets").insert({ author_id: session.user.id, title, description, image_path: imagePath, config: petConfig, style: petConfig.visualStyle || "original" });
  publishSubmit.disabled = false;
  if (saved.error) { await supabase.storage.from(bucket).remove([imagePath]); publishStatus.textContent = saved.error.message; return; }
  publishForm.reset(); publishDialog.close(); await loadPosts();
}

async function followCreator(creatorId, button) {
  if (!session) return openAuth(); if (creatorId === session.user.id) return;
  const { error } = await supabase.from("creator_follows").upsert({ follower_id: session.user.id, creator_id: creatorId }, { onConflict: "follower_id,creator_id", ignoreDuplicates: true });
  if (error) return setStatus(error.message, "error");
  button.textContent = "♥";
}

authTrigger.addEventListener("click", openAuth);
publishTriggers.filter(Boolean).forEach((button) => button.addEventListener("click", openPublish));
authMode.addEventListener("click", () => { isRegistering = !isRegistering; authTitle.textContent = isRegistering ? "创建创意工坊账号" : "登录创意工坊"; authSubmit.textContent = isRegistering ? "创建账号" : "登录"; authMode.textContent = isRegistering ? "已有账号，去登录" : "创建账号"; authNameField.hidden = !isRegistering; });
authSubmit.addEventListener("click", submitAuth); publishSubmit.addEventListener("click", publishPet); search.addEventListener("input", render); sort.addEventListener("change", loadPosts);
supabase.auth.onAuthStateChange((_event, nextSession) => { session = nextSession; authTrigger.textContent = session ? "我的账号" : "登录"; });
await refreshSession(); await loadPosts();
