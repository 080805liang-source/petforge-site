import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

for (const entry of ["index.html", "assets", "scripts", "styles"]) {
  await cp(entry, `dist/${entry}`, { recursive: true });
}
