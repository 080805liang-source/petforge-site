export const RUNTIME_SHA256 = 'fd0c291650ece2cc38b62631d3f52c00d3f0c1b3bb04b533462d8c2bbfd64ff1';
export const DESKTOP_DOWNLOAD_AVAILABLE = true;
export const DESKTOP_DOWNLOAD_NOTICE = '';

export async function verifyDesktopRuntime(bytes) {
  if (bytes.byteLength !== 46823896 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('桌宠运行核心文件不完整，请刷新后重试。');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
  if (digest !== RUNTIME_SHA256) throw new Error('桌宠运行核心安全校验失败，已停止生成，请联系管理员。');
  return bytes;
}

export async function fetchDesktopRuntime(url, onProgress = () => {}) {
  // One compressed transfer avoids dozens of slow connections on some networks.
  try {
    const response=await fetch(new URL('PetForge-runtime.gz',url),{cache:'no-store',signal:AbortSignal.timeout(120000),redirect:'error'});
    if(!response.ok||!response.body)throw new Error('Compressed runtime unavailable');
    const reader=response.body.pipeThrough(new DecompressionStream('gzip')).getReader(),parts=[];
    let length=0;
    for(;;){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>46823896){await reader.cancel();throw new Error('Runtime too large');}parts.push(part.value);onProgress(Math.min(89,Math.floor(length/46823896*90)),90);}
    const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
    await verifyDesktopRuntime(bytes);onProgress(90,90);return bytes;
  }catch{/* Older browsers and interrupted transfers can use verified parts. */}
  let failed=false;
  try {
    const size = 46823896, chunkSize = 524288, count = Math.ceil(size / chunkSize);
    const parts = new Array(count); let next = 0, completed = 0;
    await Promise.all(Array.from({length:3}, async () => {
      while (!failed && next < count) {
        const index = next++, expected = Math.min(chunkSize, size - index * chunkSize);
        const partUrl = new URL(`runtime/${RUNTIME_SHA256.slice(0,16)}/${index}.bin`, url);
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(partUrl, {cache:'no-store', signal:AbortSignal.timeout(30000), redirect:'error'});
            if (!response.ok) throw new Error('运行核心暂时无法下载，请稍后重试。');
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (bytes.length !== expected) throw new Error('桌宠运行核心文件不完整，请刷新后重试。');
            if(failed)return;parts[index] = bytes; onProgress(++completed, count); break;
          } catch (error) { if (attempt === 2){failed=true;throw error;} }
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
