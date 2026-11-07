// Pure pixel operations shared by the cutout worker and regression tests.
export function removeEdgeBackground({ data, width, height }) {
  const border = [];
  for (let x = 0; x < width; x++) border.push(x, (height - 1) * width + x);
  for (let y = 1; y < height - 1; y++) border.push(y * width, y * width + width - 1);
  const opaque = border.filter((p) => data[p * 4 + 3] > 250);
  // Existing transparent artwork needs no segmentation.
  if (opaque.length < border.length * .85) return { kind: "transparent", data };
  const bins = new Map();
  for (const p of opaque) {
    const i = p * 4;
    const key = `${data[i] >> 5},${data[i + 1] >> 5},${data[i + 2] >> 5}`;
    const group = bins.get(key) || [];
    group.push(p);
    bins.set(key, group);
  }
  const dominant = [...bins.values()].sort((a, b) => b.length - a.length)[0];
  const color = [0, 1, 2].map((channel) => dominant.reduce((sum, p) => sum + data[p * 4 + channel], 0) / dominant.length);
  const distance = (p) => Math.max(Math.abs(data[p * 4] - color[0]), Math.abs(data[p * 4 + 1] - color[1]), Math.abs(data[p * 4 + 2] - color[2]));
  if (opaque.filter((p) => distance(p) <= 32).length < opaque.length * .85) return null;

  const count = width * height;
  const visited = new Uint8Array(count);
  const queue = new Uint32Array(count);
  let tail = 0;
  const visit = (p) => {
    if (!visited[p] && (data[p * 4 + 3] < 8 || distance(p) <= 40)) {
      visited[p] = 1;
      queue[tail++] = p;
    }
  };
  for (const p of border) visit(p);
  for (let head = 0; head < tail; head++) {
    const p = queue[head];
    if (p % width) visit(p - 1);
    if (p % width < width - 1) visit(p + 1);
    if (p >= width) visit(p - width);
    if (p < count - width) visit(p + width);
  }
  if (tail < count * .02 || tail > count * .98) return null;
  const result = new Uint8ClampedArray(data);
  for (let p = 0; p < count; p++) if (visited[p]) result[p * 4 + 3] = 0;
  return { kind: "solid", data: result };
}

export function applySubjectMask(data, mask) {
  let visible = 0;
  const result = new Uint8ClampedArray(data);
  for (let p = 0; p < mask.length; p++) {
    // Remove low confidence background while keeping soft edge transitions.
    const alpha = Math.max(0, Math.min(1, (mask[p] - .08) / .84));
    result[p * 4 + 3] = Math.round(data[p * 4 + 3] * alpha);
    if (result[p * 4 + 3] > 32) visible++;
  }
  if (visible < mask.length * .002 || visible > mask.length * .995) throw new Error("no-subject");
  return result;
}

export function subjectBounds(data, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] <= 8) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error("no-subject");
  const padding = Math.max(2, Math.round(Math.max(right - left, bottom - top) * .025));
  left = Math.max(0, left - padding); top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding); bottom = Math.min(height - 1, bottom + padding);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}
