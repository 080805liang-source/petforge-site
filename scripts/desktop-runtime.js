export const RUNTIME_SHA256 = '2c1dc8c064344a72f6daf3b6de3382a9b13965b7587db02cc5ccce00e6320087';

export async function verifyDesktopRuntime(bytes) {
  if (bytes.byteLength !== 11586504 || bytes[0] !== 0x4d || bytes[1] !== 0x5a) throw new Error('桌宠运行核心文件不完整，请刷新后重试。');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
  if (digest !== RUNTIME_SHA256) throw new Error('桌宠运行核心安全校验失败，已停止生成，请联系管理员。');
  return bytes;
}

export async function fetchDesktopRuntime(url) {
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(90000), redirect: 'error' });
    if (!response.ok) throw new Error('运行核心暂时无法下载，请稍后重试。');
    return await verifyDesktopRuntime(new Uint8Array(await response.arrayBuffer()));
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new Error('运行核心下载超时，请检查网络后重试。');
    throw error;
  }
}
