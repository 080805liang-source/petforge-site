import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { createHash } from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import { contentSecurityPolicy, staticHeaders } from './security-policy.mjs';
import {DESKTOP_DOWNLOAD_AVAILABLE} from './scripts/desktop-runtime.js';
import runtimeManifest from './scripts/runtime-manifest.js';

await rm("dist", { recursive: true, force: true });
await rm("dist-site", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await mkdir("dist/client", { recursive: true });
await mkdir("dist-site", { recursive: true });

for (const entry of ["index.html", "creator.html", "admin.html", "workshop.html", "support.html", "reset-password.html", "manifest.json", "sw.js", "assets", "scripts", "styles"]) {
  const options={recursive:true,filter:path=>!/[\\/](PetForge\.exe|PetForge-runtime\.zip|runtime)([\\/]|$)/.test(path)};
  await cp(entry, `dist/${entry}`, options);
  await cp(entry, `dist/client/${entry}`, options);
  await cp(entry, `dist-site/${entry}`, options);
}

const pages = ['index.html', 'creator.html', 'admin.html', 'workshop.html', 'support.html', 'reset-password.html'];
if(DESKTOP_DOWNLOAD_AVAILABLE){
const runtime = gunzipSync(await readFile('assets/PetForge-runtime.gz'));
const runtimeId = createHash('sha256').update(runtime).digest('hex').slice(0,16);
const compressed = await readFile('assets/PetForge-runtime.gz');
const compressedId = createHash('sha256').update(compressed).digest('hex').slice(0,16);
if (runtimeManifest.id !== compressedId || runtimeManifest.size !== compressed.length || runtimeManifest.parts.some((part,index)=>part.sha256 !== createHash('sha256').update(compressed.subarray(index*524288,(index+1)*524288)).digest('hex'))) throw new Error('Runtime manifest does not match the release archive. Regenerate scripts/runtime-manifest.js before publishing.');
for (const directory of ['dist', 'dist/client', 'dist-site']) {
  const compressedParts = `${directory}/assets/runtime-compressed/${compressedId}`;
  await mkdir(compressedParts, {recursive:true});
  for (let offset = 0, index = 0; offset < compressed.length; offset += 524288, index++) {
    await writeFile(`${compressedParts}/${index}.bin`, compressed.subarray(offset, offset + 524288));
  }
  const parts = `${directory}/assets/runtime/${runtimeId}`;
  await mkdir(parts, {recursive:true});
  for (let offset = 0, index = 0; offset < runtime.length; offset += 524288, index++) {
    await writeFile(`${parts}/${index}.bin`, runtime.subarray(offset, offset + 524288));
  }
  // Hosting has a per-file size limit. The verified archive is delivered in parts.
}
}
const html = await Promise.all(pages.map(path => readFile(path, 'utf8')));
const csp = contentSecurityPolicy(html);
for (const directory of ['dist', 'dist/client', 'dist-site']) {
  await writeFile(`${directory}/_headers`, staticHeaders(csp));
  for (let index = 0; index < pages.length; index++) {
    await writeFile(`${directory}/${pages[index]}`, html[index].replace('<meta charset="utf-8">', `<meta charset="utf-8">\n    <meta http-equiv="Content-Security-Policy" content="${csp}">\n    <meta name="referrer" content="no-referrer">`));
  }
}

await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
await writeFile(
  "dist/server/index.js",
  `export default {
  async fetch(request, env) {
    if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Static asset binding is unavailable.", { status: 500 });
  }
};
`,
  "utf8"
);
