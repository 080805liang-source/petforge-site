import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { contentSecurityPolicy, staticHeaders } from './security-policy.mjs';

await rm("dist", { recursive: true, force: true });
await rm("dist-site", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await mkdir("dist/client", { recursive: true });
await mkdir("dist-site", { recursive: true });

for (const entry of ["index.html", "creator.html", "admin.html", "workshop.html", "support.html", "reset-password.html", "manifest.json", "sw.js", "assets", "scripts", "styles"]) {
  await cp(entry, `dist/${entry}`, { recursive: true });
  await cp(entry, `dist/client/${entry}`, { recursive: true });
  await cp(entry, `dist-site/${entry}`, { recursive: true });
}

const pages = ['index.html', 'creator.html', 'admin.html', 'workshop.html', 'support.html', 'reset-password.html'];
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
