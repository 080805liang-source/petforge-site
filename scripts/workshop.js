"use strict";
const grid = document.querySelector("#workshop-grid");
const empty = document.querySelector("#workshop-empty");
const status = document.querySelector("#workshop-status");
const search = document.querySelector("#workshop-search");
const sort = document.querySelector("#workshop-sort");
const more = document.querySelector("#workshop-more");
const api = window.PETFORGE_MEMBERSHIP.apiUrl;
let posts = [], total = 0, requestId = 0;

function setStatus(message, error = false) { status.textContent = message; status.style.color = error ? "#f5a29b" : ""; }

function createCard(post) {
  const article = document.createElement("article"); article.className = "workshop-card"; article.id = `creation-${post.id}`;
  const media = document.createElement("div"); media.className = "workshop-card-media";
  const image = document.createElement("img"); image.src = post.preview; image.alt = post.title; image.loading = "lazy";
  const main = document.createElement("div"); main.className = "workshop-card-main";
  const meta = document.createElement("div"); meta.className = "card-meta";
  const author = document.createElement("strong"); author.textContent = post.author; author.dataset.userContent = "true";
  const downloads = document.createElement("span"); downloads.textContent = `${post.downloads || 0} 使用`;
  const title = document.createElement("h3"); title.textContent = post.title; title.dataset.userContent = "true";
  const description = document.createElement("p"); description.textContent = post.description; description.dataset.userContent = "true";
  const actions = document.createElement("div"); actions.className = "card-actions";
  const use = document.createElement("a"); use.className = "card-use"; use.textContent = "直接使用";
  use.href = `creator.html?template=${encodeURIComponent(post.id)}&download=1#studio`;
  const configure = document.createElement("a"); configure.className = "card-use card-configure"; configure.textContent = "查看配置";
  configure.href = `creator.html?template=${encodeURIComponent(post.id)}#studio`;
  meta.append(author, downloads); actions.append(use, configure); main.append(meta, title, description, actions);
  const user = window.PetForgeMembership?.current();
  if (user && (user.id === post.authorId || user.isAdmin)) {
    const remove = document.createElement("button"); remove.className = "membership-text-button"; remove.type = "button"; remove.textContent = "取消分享";
    remove.addEventListener("click", async () => {
      remove.disabled = true;
      try { await window.PetForgeMembership.request(`/workshop/${encodeURIComponent(post.id)}`, { method: "PUT", body: JSON.stringify({ isPublic: false }) }); await loadPosts(); setStatus("已取消作品分享。"); }
      catch (error) { setStatus(error.message, true); remove.disabled = false; }
    });
    main.append(remove);
  }
  article.append(media, main);
  if (new URLSearchParams(location.search).get("highlight") === post.id) article.classList.add("workshop-highlight");
  return article;
}

function render() {
  const term = search.value.trim().toLowerCase();
  const matches = posts.filter((post) => [post.title, post.description, post.author].join(" ").toLowerCase().includes(term));
  grid.replaceChildren(...matches.map(createCard)); empty.hidden = total > 0; more.hidden = posts.length >= total;
}

async function loadPosts(append = false) {
  const id = ++requestId; more.disabled = true; setStatus("正在加载创意工坊...");
  try {
    const response = await fetch(`${api}/workshop?sort=${encodeURIComponent(sort.value)}&offset=${append ? posts.length : 0}&limit=12`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "创意工坊暂时无法连接，请稍后重试。");
    if (id !== requestId) return;
    posts = append ? [...posts, ...result.posts] : result.posts; total = result.total; render();
    setStatus(total ? `已发现 ${total} 个公开作品` : "工坊已就绪，等待第一位创作者。");
  } catch (error) { if (id !== requestId) return; empty.hidden = true; setStatus(error.message, true); }
  finally { if (id === requestId) more.disabled = false; }
}
search.addEventListener("input", render); sort.addEventListener("change", () => loadPosts()); more.addEventListener("click", () => loadPosts(true));
window.addEventListener("petforge:membership-change", render); loadPosts();
