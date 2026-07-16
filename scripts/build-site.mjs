import { copyFileSync, mkdirSync, rmSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

export const files = [
  ["index.html", "index.html"],
  ["install.sh", "install.sh"],
  ["CNAME", "CNAME"],
  ["bin/latexdo", "bin/latexdo"],
];

export function buildSite() {
  rmSync(dist, { recursive: true, force: true });

  for (const [source, target] of files) {
    const output = join(dist, target);
    mkdirSync(dirname(output), { recursive: true });
    copyFileSync(join(root, source), output);
  }

  chmodSync(join(dist, "install.sh"), 0o755);
  chmodSync(join(dist, "bin/latexdo"), 0o755);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildSite();
}
