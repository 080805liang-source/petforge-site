"use strict";
const grid = document.querySelector("#workshop-grid");
const empty = document.querySelector("#workshop-empty");
const status = document.querySelector("#workshop-status");
const search = document.querySelector("#workshop-search");
const sort = document.querySelector("#workshop-sort");
const more = document.querySelector("#workshop-more");
const category = document.querySelector('#workshop-category');
const api = window.PETFORGE_MEMBERSHIP.apiUrl;
let posts = [], total = 0, requestId = 0;
let stopMotionPreview = () => {};

function addMotionPreview(post, media, image) {
  const key=post.id.replace(/^pf-curated-/, '');
  if (!post.animated || !/^animal-\d{1,12}$/.test(key)) return;
  const button=document.createElement('button');button.type='button';button.className='workshop-play';button.textContent='预览动作';
  button.setAttribute('aria-label',`${post.title}：预览动作`);
  const canvas=document.createElement('canvas');canvas.className='workshop-motion';canvas.hidden=true;media.append(canvas,button);
  let playing=false,token=0,frameId=0,bitmap=null;
  const stop=()=>{playing=false;token++;cancelAnimationFrame(frameId);if(bitmap){bitmap.close();bitmap=null;}canvas.hidden=true;image.hidden=false;button.textContent='预览动作';};
  button.addEventListener('click',async()=>{
    if(playing){stop();return;}
    stopMotionPreview();stopMotionPreview=stop;playing=true;button.textContent='加载动作…';const current=++token;
    try {
      const prefix=`assets/workshop/animals/${key}`;
      const [response,atlasResponse]=await Promise.all([fetch(`${prefix}-animation.json`),fetch(`${prefix}-atlas.webp`)]);
      if(!response.ok || !atlasResponse.ok)throw Error('preview');
      const meta=await response.json(),atlas=await createImageBitmap(await atlasResponse.blob());
      if(current!==token){atlas.close();return;}
      bitmap=atlas;
      canvas.width=meta.width;canvas.height=meta.height;const context=canvas.getContext('2d');const started=performance.now();
      canvas.hidden=false;image.hidden=true;button.textContent='停止预览';
      const idle=meta.clips?.idle || {start:0,count:meta.count,fps:meta.fps};
      const draw=now=>{if(!playing || current!==token)return;const i=idle.start+Math.floor((now-started)*idle.fps/1000)%idle.count;context.clearRect(0,0,meta.width,meta.height);context.drawImage(atlas,i%meta.columns*meta.width,Math.floor(i/meta.columns)*meta.height,meta.width,meta.height,0,0,meta.width,meta.height);frameId=requestAnimationFrame(draw);};
      frameId=requestAnimationFrame(draw);
    } catch {stop();button.textContent='重试预览';}
  });
}

function setStatus(message, error = false) { status.textContent = message; status.style.color = error ? "#f5a29b" : ""; }

function createCard(post) {
  const article = document.createElement("article"); article.className = "workshop-card"; article.id = `creation-${post.id}`;
  const media = document.createElement("div"); media.className = "workshop-card-media";
  const image = document.createElement("img"); image.alt = post.title; image.loading = "lazy"; image.decoding = "async";
  const imageStatus = document.createElement("span"); imageStatus.className = "workshop-image-status"; imageStatus.textContent = "正在加载预览..."; imageStatus.setAttribute("role", "status");
  media.setAttribute("aria-busy", "true");
  image.addEventListener("load", () => { imageStatus.hidden = true; media.setAttribute("aria-busy", "false"); });
  let retried = false;
  image.addEventListener("error", async () => {
    if (!retried) {
      retried = true;
      try {
        const response = await fetch(`${api}/workshop/${encodeURIComponent(post.id)}`);
        const result = await response.json();
        if (!response.ok || !result.post?.image) throw new Error("Missing image");
        image.src = result.post.image;
        return;
      } catch (_) { /* Keep the card usable when both image sources fail. */ }
    }
    image.hidden = true; media.setAttribute("aria-busy", "false"); imageStatus.textContent = "预览暂时无法显示，可点击查看配置";
  });
  media.append(image, imageStatus); image.src = post.preview;
  const main = document.createElement("div"); main.className = "workshop-card-main";
  const meta = document.createElement("div"); meta.className = "card-meta";
  const author = document.createElement("strong"); author.textContent = post.author; author.dataset.userContent = "true";
  const downloads = document.createElement("span"); downloads.textContent = `${post.downloads || 0} 使用`;
  const title = document.createElement("h3"); title.textContent = post.title; title.dataset.userContent = "true";
  const description = document.createElement("p"); description.textContent = post.description; description.dataset.userContent = "true";
  const badge = document.createElement('span'); badge.className='workshop-kind';
  badge.textContent = post.category === 'animal' ? '写实形象 · 可互动' : post.category === 'anime' ? '静态陪伴 · 保留原色' : '社区创作';
  media.append(badge);
  addMotionPreview(post,media,image);
  const actions = document.createElement("div"); actions.className = "card-actions";
  const use = document.createElement("a"); use.className = "card-use"; use.textContent = "直接使用";
  use.href = `creator.html?template=${encodeURIComponent(post.id)}&download=1#studio`;
  const configure = document.createElement("a"); configure.className = "card-use card-configure"; configure.textContent = "查看配置";
  configure.href = `creator.html?template=${encodeURIComponent(post.id)}#studio`;
  meta.append(author, downloads); actions.append(use, configure); main.append(meta, title, description, actions);
  const user = window.PetForgeMembership?.current();
  if (user && (user.id === post.authorId || user.isAdmin)) {
    const remove = document.createElement("button"); remove.className = "membership-text-button"; remove.type = "button"; remove.textContent = "删除作品";
    remove.setAttribute('aria-label', `${post.title}：删除作品`);
    remove.addEventListener("click", async () => {
      if (!window.confirm(`确定删除作品“${post.title}”吗？删除后，其他人将无法再查看或使用；已下载的副本不会被撤回。`)) return;
      remove.disabled = true;
      try { await window.PetForgeMembership.request(`/workshop/${encodeURIComponent(post.id)}`, { method: "DELETE" }); await loadPosts(); setStatus("作品已删除，公开链接已失效。"); }
      catch (error) { setStatus(error.message, true); remove.disabled = false; }
    });
    main.append(remove);
  }
  article.append(media, main);
  if (new URLSearchParams(location.search).get("highlight") === post.id) article.classList.add("workshop-highlight");
  return article;
}

function render() {
  stopMotionPreview();
  const term = search.value.trim().toLowerCase();
  const matches = posts.filter((post) => [post.title, post.description, post.author].join(" ").toLowerCase().includes(term));
  grid.replaceChildren(...matches.map(createCard)); empty.hidden = total > 0; more.hidden = posts.length >= total;
  if (!total) { empty.querySelector?.('h3') && (empty.querySelector('h3').textContent = search.value || category?.value ? '没有找到匹配的作品' : '等待第一位创作者'); }
}

async function loadPosts(append = false) {
  const id = ++requestId; more.disabled = true; setStatus("正在加载创意工坊...");
  try {
    const response = await fetch(`${api}/workshop?sort=${encodeURIComponent(sort.value)}&category=${encodeURIComponent(category?.value || '')}&q=${encodeURIComponent(search.value.trim())}&offset=${append ? posts.length : 0}&limit=24`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "创意工坊暂时无法连接，请稍后重试。");
    if (id !== requestId) return;
    posts = append ? [...posts, ...result.posts] : result.posts; total = result.total; render();
    setStatus(total ? `已发现 ${total} 个公开作品` : "工坊已就绪，等待第一位创作者。");
  } catch (error) { if (id !== requestId) return; empty.hidden = true; setStatus(error.message, true); }
  finally { if (id === requestId) more.disabled = false; }
}
let searchTimer;
search.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer=setTimeout(()=>loadPosts(),250); });
category?.addEventListener('change',()=>loadPosts()); sort.addEventListener("change", () => loadPosts()); more.addEventListener("click", () => loadPosts(true));
window.addEventListener("petforge:membership-change", render); loadPosts();
