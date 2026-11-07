import assert from "node:assert/strict";
import test from "node:test";
import { removeEdgeBackground, extractOutlinedSubject, applySubjectMask, subjectBounds } from "../scripts/background-matte.js";

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

test("subject mask preserves original colors and alpha rather than fading interior paint", () => {
  const source = image(10, 10);
  const mask = new Float32Array(100);
  mask[55] = 1;
  mask[56] = .5;
  source.data[55 * 4 + 3] = 128;
  const result = applySubjectMask(source.data, mask, 10, 10);
  assert.equal(result[55 * 4 + 3], 128);
  assert.equal(result[56 * 4 + 3], 255, "model confidence must not dim the original white paint");
  assert.equal(result[3], 0);
  assert.throws(() => applySubjectMask(source.data, new Float32Array(100), 10, 10), /no-subject/);
  assert.throws(() => applySubjectMask(source.data, new Float32Array(100).fill(1), 10, 10), /no-subject/);
  assert.throws(() => subjectBounds(new Uint8ClampedArray(16), 2, 2), /no-subject/);
});

test("outlined characters keep every interior RGBA pixel and exclude detached background decorations", () => {
  const source = image(40, 40, [255, 238, 244, 255]);
  for (let y = 6; y <= 33; y++) for (let x = 7; x <= 32; x++) {
    const edge = x === 7 || x === 32 || y === 6 || y === 33;
    pixel(source, x, y, edge ? [10, 10, 10, 255] : y < 13 ? [255, 255, 255, 255] : x < 20 ? [230, 150, 180, 255] : [250, 220, 200, 255]);
  }
  pixel(source, 2, 2, [20, 20, 20, 255]);
  const result = extractOutlinedSubject(source);
  assert.equal(result.kind, "outline");
  assert.equal(alpha(result.data, 40, 2, 2), 0, "detached background sparkle is excluded");
  for (let y = 6; y <= 33; y++) for (let x = 7; x <= 32; x++) {
    const i = (y * 40 + x) * 4;
    assert.deepEqual(result.data.slice(i, i + 4), source.data.slice(i, i + 4), `original pixel at ${x},${y}`);
  }
});

test("smart silhouette fills erroneous holes in white clothing and removes disconnected sparkles", () => {
  const source = image(20, 20);
  const mask = new Float32Array(400);
  for (let y = 4; y <= 15; y++) for (let x = 4; x <= 15; x++) mask[y * 20 + x] = .7;
  mask[10 * 20 + 10] = 0;
  mask[1 * 20 + 1] = 1;
  const result = applySubjectMask(source.data, mask, 20, 20);
  assert.deepEqual(result.slice((10 * 20 + 10) * 4, (10 * 20 + 10) * 4 + 4), new Uint8ClampedArray([255,255,255,255]));
  assert.equal(alpha(result, 20, 5, 5), 255, "interior stays fully opaque");
  assert.equal(alpha(result, 20, 1, 1), 0, "background decoration stays outside silhouette");
});

test("gray antialiased outline gaps do not expose or erase the inner paint", () => {
  const source = image(40, 40);
  for (let y = 6; y <= 33; y++) for (let x = 7; x <= 32; x++) {
    if (x === 7 || x === 32 || y === 6 || y === 33) pixel(source, x, y, [10, 10, 10, 255]);
    else pixel(source, x, y, [248, 220, 230, 255]);
  }
  pixel(source, 20, 6, [130, 130, 130, 255]);
  const result = extractOutlinedSubject(source);
  assert.ok(result, "lighter outline closes without falling back to an interior-fading mask");
  const center = (20 * 40 + 20) * 4;
  assert.deepEqual([...result.data.slice(center, center + 4)], [248, 220, 230, 255]);
});

test("non outlined photographs fall back to general subject detection", () => {
  assert.equal(extractOutlinedSubject(image(40, 40, [60, 60, 60, 255])), null);
  assert.equal(extractOutlinedSubject(image()), null);
});
