import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Run before deploying either API function; output belongs inside its code directory.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=process.argv[2];
if(!output)throw new Error('Usage: node tools/prepare-runtime-download.mjs <function-code-directory>');
const data=await readFile(resolve(root,'assets/PetForge-runtime.gz')),size=524288;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const parts=Array.from({length:Math.ceil(data.length/size)},(_,i)=>data.subarray(i*size,(i+1)*size));
const manifest={id:hash(data).slice(0,16),size:data.length,parts:parts.map(bytes=>({size:bytes.length,sha256:hash(bytes)}))};
const directory=resolve(output,'runtime');await mkdir(directory,{recursive:true});
await writeFile(resolve(directory,'manifest.json'),JSON.stringify(manifest));
for(const [i,bytes]of parts.entries())await writeFile(resolve(directory,`${i}.bin`),bytes);
console.log(`Prepared ${parts.length} public runtime parts in ${directory}`);
