import test from "node:test";
import assert from "node:assert/strict";
import { createLureMotion } from "../scripts/teaser-cursor.js";

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

test("the spring settles at 60fps and 120fps, including dropped frames", () => {
  for (const fps of [60, 120]) {
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
