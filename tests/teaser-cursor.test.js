import test from "node:test";
import assert from "node:assert/strict";
import { createLureMotion, createTeaser } from "../scripts/teaser-cursor.js";

test("the handle follows a new mouse position immediately, while the feather trails", () => {
  const lure = createLureMotion();
  lure.move(100, 100);
  lure.move(600, 300);
  assert.equal(lure.state.x, 600);
  assert.equal(lure.state.y, 300);
  assert.notEqual(lure.state.toyX, 662);
  const state = lure.update(1 / 60);
  assert.ok(Math.hypot(state.toyX - state.x - 26, state.toyY - state.y + 38) <= 105.001);
});

test("the spring settles at 60/120/144/240fps, including dropped frames", () => {
  for (const fps of [60, 120, 144, 240]) {
    const lure = createLureMotion();
    lure.move(0, 0);
    lure.move(200, 250);
    lure.update(3);
    for (let i = 0; i < fps * 3; i++) lure.update(1 / fps);
    assert.ok(Math.abs(lure.state.toyX - 262) < .1);
    assert.ok(Math.abs(lure.state.toyY - 275) < .1);
    assert.ok(Number.isFinite(lure.state.vx) && Number.isFinite(lure.state.vy));
  }
});

test("the rope stays attached after rapid input before another animation frame", (t) => {
  const node = () => {
    const attributes = new Map();
    return { setAttribute: (key, value) => attributes.set(key, value), getAttribute: key => attributes.get(key), hasAttribute: key => attributes.has(key), removeAttribute: key => attributes.delete(key), classList: { add() {}, remove() {} }, remove() {}, addEventListener() {}, removeEventListener() {} };
  };
  const svg = node();
  const parts = { ".teaser-rig": node(), ".teaser-string": node(), ".teaser-feathers": node() };
  svg.querySelector = selector => parts[selector];
  let queuedFrame;
  const original = new Map();
  const substitutes = {
    document: { createElementNS: () => svg, body: { append() {} }, addEventListener() {}, removeEventListener() {} },
    window: { addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame: callback => { queuedFrame = callback; return 1; },
    cancelAnimationFrame() {}
  };
  for (const [name, value] of Object.entries(substitutes)) {
    original.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
  t.after(() => { for (const [name, descriptor] of original) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } });
  const teaser = createTeaser(node(), node(), { reducedMotion: () => false });
  assert.match(svg.innerHTML, /class="teaser-rig">[\s\S]*class="teaser-handle"[\s\S]*class="teaser-string"[\s\S]*class="teaser-feathers"[\s\S]*<\/g>/);
  function attached(x, y) {
    assert.equal(parts[".teaser-rig"].getAttribute("transform"), `translate(${x} ${y})`);
    const path = parts[".teaser-string"].getAttribute("d");
    assert.ok(path.startsWith("M26 -38Q"));
    const end = path.match(/ ([\d.e+-]+) ([\d.e+-]+)$/);
    const feather = parts[".teaser-feathers"].getAttribute("transform");
    const featherPosition = feather.match(/^translate\(([\d.e+-]+) ([\d.e+-]+)\)/);
    assert.deepEqual(end.slice(1).map(Number), featherPosition.slice(1).map(Number));
    assert.ok(Math.hypot(Number(end[1]) - 26, Number(end[2]) + 38) <= 105.001);
  }
  teaser.move(100, 100);
  attached(100, 100);
  // No frame callback runs between these large direction changes.
  teaser.move(1300, 800);
  attached(1300, 800);
  teaser.move(40, 60);
  attached(40, 60);
  queuedFrame(100);
  attached(40, 60);
  queuedFrame(1000);
  attached(40, 60);
  teaser.hide();
  teaser.move(750, 300);
  attached(750, 300);
  teaser.dispose();
});
