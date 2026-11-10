export const RUNTIME_SHA256 = '6982b5f68d136905a18e1b1d35f0a3829b50e8bcd54377206f6e721c2d7778cd';

export async function verifyDesktopRuntime(bytes) {
  if (bytes.byteLength !== 12340125 || bytes[0] !== 0x4d || bytes[1] !== 0x5a) throw new Error('桌宠运行核心文件不完整，请刷新后重试。');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
  if (digest !== RUNTIME_SHA256) throw new Error('桌宠运行核心安全校验失败，已停止生成，请联系管理员。');
  return bytes;
}

export async function fetchDesktopRuntime(url, onProgress = () => {}) {
  try {
    const size = 12340125, chunkSize = 524288, count = Math.ceil(size / chunkSize);
    const parts = new Array(count); let next = 0, completed = 0;
    await Promise.all(Array.from({length:3}, async () => {
      while (next < count) {
        const index = next++, expected = Math.min(chunkSize, size - index * chunkSize);
        const partUrl = new URL(`runtime/${RUNTIME_SHA256.slice(0,16)}/${index}.bin`, url);
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(partUrl, {cache:'no-store', signal:AbortSignal.timeout(30000), redirect:'error'});
            if (!response.ok) throw new Error('运行核心暂时无法下载，请稍后重试。');
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (bytes.length !== expected) throw new Error('桌宠运行核心文件不完整，请刷新后重试。');
            parts[index] = bytes; onProgress(++completed, count); break;
          } catch (error) { if (attempt === 2) throw error; }
        }
      }
    }));
    const bytes = new Uint8Array(size);
    parts.forEach((part,index) => bytes.set(part,index * chunkSize));
    return await verifyDesktopRuntime(bytes);
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new Error('运行核心下载超时，请检查网络后重试。');
    throw error;
  }
}
