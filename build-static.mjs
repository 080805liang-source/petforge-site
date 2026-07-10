import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist-site", { recursive: true, force: true });
await mkdir("dist-site", { recursive: true });

for (const entry of ["index.html", "assets", "scripts", "styles"]) {
  await cp(entry, `dist-site/${entry}`, { recursive: true });
}
