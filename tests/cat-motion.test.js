import test from "node:test";
import assert from "node:assert/strict";
import { createCatMotion } from "../scripts/cat-motion.js";

test("a pounce anticipates, leaves the floor and lands before pursuing again", () => {
  const cat = createCatMotion();
  cat.aim(3, .7);
  assert.equal(cat.state.phase, "idle");
  cat.pounce();
  assert.equal(cat.state.phase, "crouch");
  const phases = new Set();
  let peak = 0;
  for (let frame = 0; frame < 100; frame++) {
    const pose = cat.update(1 / 60);
    phases.add(pose.phase);
    peak = Math.max(peak, pose.y);
    assert.ok(pose.x >= -.25 && pose.x <= 3.2);
    assert.ok(pose.z >= -1.2 && pose.z <= 1.1);
  }
  assert.ok(phases.has("pounce") && phases.has("land"));
  assert.ok(peak > .5);
  assert.equal(cat.state.y, 0);
});

test("pause freezes movement and ignores new pointer targets", () => {
  const cat = createCatMotion();
  cat.aim(3, 0);
  cat.pounce();
  cat.pause(true);
  const before = structuredClone(cat.state);
  cat.aim(-10, 100, true);
  for (let i = 0; i < 120; i++) cat.update(1 / 60);
  assert.deepEqual(cat.state, before);
});

test("fast or repeated pointer movement never triggers a jump", () => {
  const cat = createCatMotion({ bounds: [-5, 5, -3, 3] });
  for (let frame = 0; frame < 600; frame++) {
    if (frame % 6 === 0) cat.aim(frame % 12 ? -4 : 4, frame % 12 ? -2 : 2);
    const pose = cat.update(1 / 60);
    assert.equal(pose.y, 0);
    assert.ok(["walk", "watch", "idle"].includes(pose.phase));
    assert.ok(pose.speed <= 1.05);
  }
});

test("the cat keeps approaching a stationary cursor across the full cover", () => {
  const cat = createCatMotion({ x: 3, z: -2, bounds: [-5, 5, -3, 3] });
  cat.aim(-3, 1.5);
  for (let i = 0; i < 180; i++) cat.update(1 / 60);
  assert.equal(cat.state.phase, "walk");
  assert.ok(cat.state.x < 1);
  for (let i = 0; i < 600; i++) cat.update(1 / 60);
  assert.ok(Math.hypot(cat.state.x + 3, cat.state.z - 1.5) < .13);
  assert.equal(cat.state.y, 0);
});

test("moving at 60fps and 120fps has the same speed", () => {
  function simulate(fps) {
    const cat = createCatMotion();
    cat.aim(1.95, .1);
    for (let i = 0; i < fps; i++) cat.update(1 / fps);
    return cat.state.x;
  }
  assert.ok(Math.abs(simulate(60) - simulate(120)) < .015);
});

test("reset returns to the configured mobile home within its bounds", () => {
  const cat = createCatMotion({ x: -.5, z: .2, bounds: [-.75, .75, -.25, .5] });
  cat.setHome(0, 0);
  cat.reset();
  for (let i = 0; i < 300; i++) cat.update(1 / 60);
  assert.ok(Math.hypot(cat.state.x, cat.state.z) < .28);
  assert.equal(cat.state.y, 0);
});
