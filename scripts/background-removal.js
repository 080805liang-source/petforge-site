let activeWorker, cancelActive;

export function cancelCutout() {
  activeWorker?.terminate();
  activeWorker = null;
  cancelActive?.(new DOMException("Image changed", "AbortError"));
  cancelActive = null;
}

export function cutoutImage(blob, mode, onProgress) {
  cancelCutout();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./background-worker.js", import.meta.url), { type: "module" });
    activeWorker = worker;
    const finish = () => {
      clearTimeout(timeout);
      worker.terminate();
      if (activeWorker === worker) { activeWorker = null; cancelActive = null; }
    };
    const timeout = setTimeout(() => { finish(); reject(new Error("cutout-timeout")); }, 150000);
    cancelActive = (error) => { finish(); reject(error); };
    worker.onmessage = ({ data }) => {
      if (data.status) { onProgress(data.status); return; }
      finish();
      if (data.error) reject(new Error(data.error));
      else resolve(data);
    };
    worker.onerror = () => { finish(); reject(new Error("cutout-unavailable")); };
    worker.postMessage({ blob, mode });
  });
}
