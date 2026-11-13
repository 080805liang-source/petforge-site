import manifest from './runtime-manifest.js?v=689cfddb3836fefd';
export const RUNTIME_SHA256 = 'ca0aea51e40b7c8d3243536571ad209f9e6964e884c724184a6471db1d3ef44c';
export const DESKTOP_DOWNLOAD_AVAILABLE = true;
export const DESKTOP_DOWNLOAD_NOTICE = '';

export async function verifyDesktopRuntime(bytes) {
  if (bytes.byteLength !== 46839340 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('桌宠运行核心文件不完整，请刷新后重试。');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
  if (digest !== RUNTIME_SHA256) throw new Error('桌宠运行核心安全校验失败，已停止生成，请联系管理员。');
  return bytes;
}

const DOMESTIC_API = 'https://cloud-paw-vip-cn-d0eub7r110788a3-1460995143.ap-shanghai.app.tcloudbase.com/api';
const digest = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');

export async function fetchDesktopRuntime(url, onProgress = () => {}, {cacheStorage = globalThis.caches, fetcher = fetch} = {}) {
  const cache = await cacheStorage?.open('petforge-runtime-v1').catch(() => null);
  const parts = new Array(manifest.parts.length);
  let next = 0, completed = 0, failed = false;
  const valid = async (bytes, part) => bytes.length === part.size && await digest(bytes) === part.sha256;
  await Promise.all(Array.from({length:4}, async () => {
    while (!failed && next < parts.length) {
      const index = next++, part = manifest.parts[index];
      const path = `runtime-compressed/${manifest.id}/${index}.bin`;
      const local = new URL(path, url), key = local.href;
      let bytes;
      try {
        const saved = await cache?.match(key);
        if (saved) {
          const candidate = new Uint8Array(await saved.arrayBuffer());
          if (await valid(candidate, part)) bytes = candidate;
          else await cache.delete(key);
        }
        for (let attempt = 0; !bytes && attempt < 3; attempt++) {
          const domestic = attempt !== 1;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 20000);
          try {
            const endpoint = domestic ? `${DOMESTIC_API}/downloads/runtime/${manifest.id}/${index}` : local;
            const response = await fetcher(endpoint, {signal:controller.signal, credentials:'omit', redirect:'error', cache:'no-store'});
            if (!response.ok) throw new Error('Download unavailable');
            let candidate;
            if (domestic) {
              const packet = await response.json();
              if (typeof packet.data !== 'string' || packet.data.length > 700000) throw new Error('Invalid download');
              candidate = Uint8Array.from(atob(packet.data), ch => ch.charCodeAt(0));
            } else candidate = new Uint8Array(await response.arrayBuffer());
            if (!await valid(candidate, part)) throw new Error('Download checksum mismatch');
            bytes = candidate;
          } catch (error) { if (attempt === 2) throw error; }
          finally { clearTimeout(timer); }
        }
        if (failed) return;
        parts[index] = bytes;
        completed += bytes.length;
        onProgress(completed, manifest.size);
        try { await cache?.put(key, new Response(bytes)); } catch { /* Storage restrictions do not block downloads. */ }
      } catch {
        failed = true;
        throw new Error('下载线路暂时中断，已保留完成的部分。请点击重试，会继续下载。');
      }
    }
  }));
  const compressed = new Uint8Array(manifest.size);
  let offset = 0; for (const part of parts) { compressed.set(part, offset); offset += part.length; }
  const reader = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const output = new Uint8Array(46839340); offset = 0;
  for (;;) {
    const {done,value} = await reader.read(); if (done) break;
    if (offset + value.length > output.length) { await reader.cancel(); throw new Error('桌宠运行核心大小异常。'); }
    output.set(value, offset); offset += value.length;
  }
  return verifyDesktopRuntime(output.subarray(0, offset));
}

// The release contains normal, uncompressed runtime files; no self-extraction.
export function desktopRuntimeFiles(bytes) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),files=[],seen=new Set(),decoder=new TextDecoder('utf-8',{fatal:true});
  let offset=0;
  while(offset+30<=bytes.length && view.getUint32(offset,true)===0x04034b50){
    const flags=view.getUint16(offset+6,true),method=view.getUint16(offset+8,true),size=view.getUint32(offset+18,true),length=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true);
    const start=offset+30+length+extra,end=start+size;
    if((flags&9)||method!==0||end>bytes.length)throw new Error('桌宠运行文件格式无效。');
    const name=decoder.decode(bytes.subarray(offset+30,offset+30+length));
    if(!name||name.startsWith('/')||/[\\:\x00]/.test(name)||name.split('/').some(part=>!part||part==='.'||part==='..')||seen.has(name))throw new Error('桌宠运行文件路径无效。');
    seen.add(name);files.push({name,data:bytes.subarray(start,end)});offset=end;
  }
  if(!seen.has('PetForge.exe')||!files.some(file=>file.name.startsWith('_internal/'))||offset+4>bytes.length||view.getUint32(offset,true)!==0x02014b50)throw new Error('桌宠运行文件不完整。');
  return files;
}
