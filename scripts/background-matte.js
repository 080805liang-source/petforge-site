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

function largestComponent(mask, width, height) {
  const seen = new Uint8Array(mask.length);
  const queue = new Uint32Array(mask.length);
  let largest = new Uint32Array(0);
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    let tail = 1;
    queue[0] = start;
    seen[start] = 1;
    for (let head = 0; head < tail; head++) {
      const p = queue[head], x = p % width, y = Math.floor(p / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
        const next = p + dy * width + dx;
        if (!seen[next] && mask[next]) { seen[next] = 1; queue[tail++] = next; }
      }
    }
    if (tail > largest.length) largest = queue.slice(0, tail);
  }
  const result = new Uint8Array(mask.length);
  for (const p of largest) result[p] = 1;
  return { mask: result, count: largest.length };
}

function fillContour(mask, width, height) {
  const exterior = new Uint8Array(mask.length);
  const queue = new Uint32Array(mask.length);
  let tail = 0;
  const visit = (p) => {
    if (!mask[p] && !exterior[p]) { exterior[p] = 1; queue[tail++] = p; }
  };
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  for (let head = 0; head < tail; head++) {
    const p = queue[head];
    if (p % width) visit(p - 1);
    if (p % width < width - 1) visit(p + 1);
    if (p >= width) visit(p - width);
    if (p < mask.length - width) visit(p + width);
  }
  return exterior.map((outside) => outside ? 0 : 1);
}

function keepOriginalPixels(data, mask) {
  const result = new Uint8ClampedArray(data);
  for (let p = 0; p < mask.length; p++) if (!mask[p]) result[p * 4 + 3] = 0;
  return result;
}

export function extractOutlinedSubject({ data, width, height }) {
  // Try progressively lighter strokes: antialiased / colored outlines may have
  // gaps when only near-black pixels are considered. Keep the first closed one.
  for (const threshold of [96, 144, 176]) {
    const dark = new Uint8Array(width * height);
    for (let p = 0; p < dark.length; p++) {
      const i = p * 4, max = Math.max(data[i], data[i + 1], data[i + 2]);
      dark[p] = data[i + 3] > 128 && max < threshold ? 1 : 0;
    }
    const component = largestComponent(dark, width, height);
    if (component.count < dark.length * .008 || component.count > dark.length * .35) continue;
    const filled = fillContour(component.mask, width, height);
    const area = filled.reduce((sum, value) => sum + value, 0);
    // Closed illustration outlines enclose substantial painted areas. Solid dark
    // photographic regions do not meet this condition and use segmentation.
    if (area < component.count * 1.6 || area < dark.length * .05 || area > dark.length * .98) continue;
    const result = keepOriginalPixels(data, filled);
    const bounds = subjectBounds(result, width, height);
    if (bounds.width < width * .3 || bounds.height < height * .3) continue;
    return { kind: "outline", data: result };
  }
  return null;
}

export function applySubjectMask(data, mask, width, height) {
  const binary = Uint8Array.from(mask, (value) => value >= .5 ? 1 : 0);
  const main = largestComponent(binary, width, height);
  const filled = fillContour(main.mask, width, height);
  const visible = filled.reduce((sum, value, p) => sum + (value && data[p * 4 + 3] > 32 ? 1 : 0), 0);
  if (visible < mask.length * .002 || visible > mask.length * .995) throw new Error("no-subject");
  // A model selects the outer silhouette only. Original RGB and alpha inside
  // that silhouette are copied unchanged, including white clothes and eyes.
  return keepOriginalPixels(data, filled);
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
