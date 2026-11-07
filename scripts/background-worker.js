import { removeEdgeBackground, applySubjectMask, subjectBounds } from "./background-matte.js";

const MODEL = new URL("../assets/models/u2netp.onnx", import.meta.url).href;
const RUNTIME = new URL("./vendor/onnx/", import.meta.url).href;

async function cachedAsset(url) {
  const cache = await caches.open("petforge-cutout-assets-v1").catch(() => null);
  const cached = await cache?.match(url);
  if (cached) return cached.arrayBuffer();
  const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error("model-download");
  if (cache) await cache.put(url, response.clone()).catch(() => {});
  return response.arrayBuffer();
}

async function smartMask(canvas) {
  self.postMessage({ status: "model" });
  const ort = await import("./vendor/onnx/ort.wasm.min.mjs");
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = RUNTIME;
  ort.env.wasm.wasmBinary = await cachedAsset(`${RUNTIME}ort-wasm-simd-threaded.wasm`);
  const session = await ort.InferenceSession.create(await cachedAsset(MODEL), { executionProviders: ["wasm"] });
  self.postMessage({ status: "segment" });
  const size = 320, plane = size * size;
  const input = new OffscreenCanvas(size, size);
  const context = input.getContext("2d", { willReadFrequently: true });
  context.fillStyle = "white";
  context.fillRect(0, 0, size, size);
  context.drawImage(canvas, 0, 0, size, size);
  const rgba = context.getImageData(0, 0, size, size).data;
  const tensor = new Float32Array(plane * 3);
  const mean = [.485, .456, .406], std = [.229, .224, .225];
  for (let c = 0; c < 3; c++) for (let p = 0; p < plane; p++) tensor[c * plane + p] = (rgba[p * 4 + c] / 255 - mean[c]) / std[c];
  const feed = new ort.Tensor("float32", tensor, [1, 3, size, size]);
  try {
    const outputs = await session.run({ [session.inputNames[0]]: feed });
    const values = outputs[session.outputNames[0]].data;
    let min = Infinity, max = -Infinity;
    for (const value of values) { min = Math.min(min, value); max = Math.max(max, value); }
    if (max - min < .00001) throw new Error("no-subject");
    const pixels = new Uint8ClampedArray(plane * 4);
    for (let p = 0; p < plane; p++) {
      pixels[p * 4] = Math.round((values[p] - min) / (max - min) * 255);
      pixels[p * 4 + 3] = 255;
    }
    context.putImageData(new ImageData(pixels, size, size), 0, 0);
    const full = new OffscreenCanvas(canvas.width, canvas.height);
    const fullContext = full.getContext("2d", { willReadFrequently: true });
    fullContext.drawImage(input, 0, 0, full.width, full.height);
    const fullPixels = fullContext.getImageData(0, 0, full.width, full.height).data;
    const mask = new Float32Array(full.width * full.height);
    for (let p = 0; p < mask.length; p++) mask[p] = fullPixels[p * 4] / 255;
    for (const output of Object.values(outputs)) output.dispose();
    return mask;
  } finally {
    feed.dispose();
    await session.release();
  }
}

self.onmessage = async ({ data: { blob, mode } }) => {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const fast = removeEdgeBackground(pixels);
    if (fast?.kind === "transparent") {
      subjectBounds(pixels.data, canvas.width, canvas.height);
      self.postMessage({ blob, kind: "transparent" });
      return;
    }
    const result = mode === "auto" && fast ? fast.data : applySubjectMask(pixels.data, await smartMask(canvas));
    const bounds = subjectBounds(result, canvas.width, canvas.height);
    context.putImageData(new ImageData(result, canvas.width, canvas.height), 0, 0);
    const cropped = new OffscreenCanvas(bounds.width, bounds.height);
    cropped.getContext("2d").drawImage(canvas, bounds.left, bounds.top, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
    self.postMessage({ blob: await cropped.convertToBlob({ type: "image/png" }), kind: "cutout" });
  } catch (error) {
    self.postMessage({ error: error.message || "cutout-failed" });
  }
};
