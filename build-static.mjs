import { cp, mkdir, rm, writeFile } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await rm("dist-site", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await mkdir("dist/client", { recursive: true });
await mkdir("dist-site", { recursive: true });

for (const entry of ["index.html", "assets", "scripts", "styles"]) {
  await cp(entry, `dist/${entry}`, { recursive: true });
  await cp(entry, `dist/client/${entry}`, { recursive: true });
  await cp(entry, `dist-site/${entry}`, { recursive: true });
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
