import assert from "node:assert/strict";
import test from "node:test";
import { removeEdgeBackground, applySubjectMask, subjectBounds } from "../scripts/background-matte.js";

function image(width = 30, height = 30, color = [255, 255, 255, 255]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set(color, i);
  return { data, width, height };
}
function pixel(image, x, y, color) { image.data.set(color, (y * image.width + x) * 4); }
const alpha = (data, width, x, y) => data[(y * width + x) * 4 + 3];

test("removes connected white background and preserves the enclosed white character", () => {
  const source = image();
  for (let y = 6; y <= 23; y++) for (let x = 7; x <= 22; x++) {
    if (x === 7 || x === 22 || y === 6 || y === 23) pixel(source, x, y, [0, 0, 0, 255]);
  }
  const result = removeEdgeBackground(source);
  assert.equal(result.kind, "solid");
  assert.equal(alpha(result.data, 30, 0, 0), 0);
  assert.equal(alpha(result.data, 30, 15, 15), 255, "white body remains opaque");
  assert.equal(alpha(result.data, 30, 7, 15), 255, "black outline remains intact");
  assert.equal(alpha(source.data, 30, 0, 0), 255, "original image remains reversible");
  assert.deepEqual(subjectBounds(result.data, 30, 30), { left: 5, top: 4, width: 20, height: 22 });
});

test("handles colored backgrounds without changing foreground colors", () => {
  const source = image(30, 30, [80, 170, 190, 255]);
  for (let y = 8; y < 22; y++) for (let x = 8; x < 22; x++) pixel(source, x, y, [255, 80, 120, 255]);
  const result = removeEdgeBackground(source);
  assert.equal(result.kind, "solid");
  assert.deepEqual([...result.data.slice((15 * 30 + 15) * 4, (15 * 30 + 15) * 4 + 4)], [255, 80, 120, 255]);
  assert.equal(alpha(result.data, 30, 1, 1), 0);
});

test("preserves transparent PNG details and partial alpha", () => {
  const source = image(30, 30, [0, 0, 0, 0]);
  pixel(source, 15, 15, [255, 255, 255, 128]);
  const result = removeEdgeBackground(source);
  assert.equal(result.kind, "transparent");
  assert.equal(result.data, source.data);
  assert.equal(alpha(result.data, 30, 15, 15), 128);
});

test("complex backgrounds and blank images use segmentation instead of an unsafe color cut", () => {
  const source = image();
  for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) pixel(source, x, y, [(x * 37) % 256, (y * 23) % 256, 100, 255]);
  assert.equal(removeEdgeBackground(source), null);
  assert.equal(removeEdgeBackground(image()), null);
});

test("subject mask multiplies existing transparency and rejects empty/full masks", () => {
  const source = image(10, 10);
  const mask = new Float32Array(100);
  mask[55] = 1;
  mask[56] = .5;
  source.data[55 * 4 + 3] = 128;
  const result = applySubjectMask(source.data, mask);
  assert.equal(result[55 * 4 + 3], 128);
  assert.equal(result[56 * 4 + 3], 128);
  assert.equal(result[3], 0);
  assert.throws(() => applySubjectMask(source.data, new Float32Array(100)), /no-subject/);
  assert.throws(() => applySubjectMask(source.data, new Float32Array(100).fill(1)), /no-subject/);
  assert.throws(() => subjectBounds(new Uint8ClampedArray(16), 2, 2), /no-subject/);
});
