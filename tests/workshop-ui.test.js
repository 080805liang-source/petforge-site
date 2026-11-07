import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../scripts/workshop.js", import.meta.url), "utf8");
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.style = {}; this.events = {}; this.attributes = {}; this.classList = { add() {} }; this.value = ""; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(name, listener) { this.events[name] = listener; }
  setAttribute(name, value) { this.attributes[name] = value; }
}
function card(fetchImage = async () => ({ ok: true, json: async () => ({ post: { image: "data:image/png;base64,original" } }) }), options = {}) {
  const elements = new Map();
  const document = {
    createElement: tag => new Element(tag),
    querySelector: selector => { if (!elements.has(selector)) elements.set(selector, new Element("div")); return elements.get(selector); },
  };
  const context = vm.createContext({ document, URLSearchParams, location: { search: "" }, window: { PETFORGE_MEMBERSHIP: { apiUrl: "https://api.example" }, PetForgeMembership: {current:()=>options.user,request:options.request}, confirm:options.confirm || (()=>true), addEventListener() {} },
    fetch: url => url.includes("/workshop?") ? Promise.resolve({ ok: true, json: async () => ({ posts: [], total: 0 }) }) : fetchImage(url) });
  vm.runInContext(source, context);
  const article = vm.runInContext('createCard({id:"sample", authorId:"owner", title:"我的桌宠", author:"创作者", description:"你好", preview:"data:image/png;base64,preview"})', context);
  return { article, media: article.children[0], main: article.children[1] };
}
test("a published card contains its image and keeps both use/configuration links", () => {
  const { media, main } = card();
  assert.equal(media.children[0].tagName, "img");
  assert.equal(media.children[0].src, "data:image/png;base64,preview");
  assert.equal(media.children[0].alt, "我的桌宠");
  assert.match(main.children[3].children[0].href, /template=sample&download=1/);
  assert.match(main.children[3].children[1].href, /template=sample#studio/);
});

test('only the author or admin sees deletion; cancelling keeps the post and confirming sends DELETE', async () => {
  assert.equal(card().main.children.length,4);
  assert.equal(card(undefined,{user:{id:'stranger'}}).main.children.length,4);
  assert.equal(card(undefined,{user:{id:'admin',isAdmin:true}}).main.children[4].textContent,'删除作品');
  const calls=[];
  const cancelled=card(undefined,{user:{id:'owner'},confirm:()=>false,request:(...args)=>calls.push(args)});
  await cancelled.main.children[4].events.click();
  assert.equal(calls.length,0);
  const own=card(undefined,{user:{id:'owner'},request:async (...args)=>calls.push(args)});
  await own.main.children[4].events.click();
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],'/workshop/sample');
  assert.equal(calls[0][1].method,'DELETE');
});
test("successful decoding removes the loading message and busy state", () => {
  const { media } = card();
  assert.equal(media.attributes["aria-busy"], "true");
  media.children[0].events.load();
  assert.equal(media.children[1].hidden, true);
  assert.equal(media.attributes["aria-busy"], "false");
});
test("a broken thumbnail retries the original once, then displays a useful error", async () => {
  let requests = 0;
  const { media, main } = card(async () => { requests++; return { ok: true, json: async () => ({ post: { image: "data:image/png;base64,original" } }) }; });
  const [image, message] = media.children;
  await image.events.error();
  assert.equal(requests, 1);
  assert.equal(image.src, "data:image/png;base64,original");
  await image.events.error();
  assert.equal(requests, 1);
  assert.equal(image.hidden, true);
  assert.equal(media.attributes["aria-busy"], "false");
  assert.match(message.textContent, /查看配置/);
  assert.equal(main.children[3].children.length, 2);
});
