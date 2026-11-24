import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const [configPath, outputPath, flag] = process.argv.slice(2);
if (!configPath || !outputPath || (flag && flag !== "--no-vendor")) {
  throw new Error("Usage: node scripts/build.mjs CONFIG.json OUTPUT_DIR [--no-vendor]");
}
const config = JSON.parse(readFileSync(resolve(configPath), "utf8"));
for (const key of ["title", "englishUrl", "polishUrl", "storageNamespace", "syncOwner", "syncRepository"]) {
  if (typeof config[key] !== "string" || !config[key].trim()) throw new Error("Missing config: " + key);
}
if (!/^[a-z0-9-]+$/.test(config.storageNamespace)) throw new Error("Invalid storageNamespace");
if (!/^[A-Za-z0-9_.-]+$/.test(config.syncOwner) || !/^[A-Za-z0-9_.-]+$/.test(config.syncRepository)) throw new Error("Invalid sync repository");
const escapeHTML = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const json = (s) => JSON.stringify(s).replaceAll("<", "\\u003c");
const values = {
  TITLE_HTML: escapeHTML(config.title),
  OWNER_HTML: escapeHTML(config.syncOwner),
  REPO_HTML: escapeHTML(config.syncRepository),
  ENGLISH_JSON: json(config.englishUrl),
  POLISH_JSON: json(config.polishUrl),
  NAMESPACE: config.storageNamespace,
  OWNER_JSON: json(config.syncOwner),
  REPO_JSON: json(config.syncRepository)
};
const output = resolve(outputPath);
mkdirSync(output, { recursive: true });
for (const name of ["compare.html", "highlight-store.mjs"]) {
  const template = readFileSync(join(root, "src", name), "utf8");
  const result = template.replace(/__([A-Z_]+)__/g, (match, key) => {
    if (!(key in values)) throw new Error("Unknown template token: " + match);
    return values[key];
  });
  writeFileSync(join(output, name), result);
}
if (flag !== "--no-vendor") {
  // Keep the exact PDF.js version formerly vendored in both book repositories.
  const tmp = mkdtempSync(join(tmpdir(), "pdf-compare-"));
  try {
    execFileSync("npm", ["pack", "pdfjs-dist@4.10.38", "--ignore-scripts", "--pack-destination", tmp], { stdio: "inherit" });
    execFileSync("tar", ["-xzf", join(tmp, "pdfjs-dist-4.10.38.tgz"), "-C", tmp,
      "package/build/pdf.min.mjs", "package/build/pdf.worker.min.mjs", "package/LICENSE"]);
    const vendor = join(output, "vendor", "pdfjs");
    mkdirSync(vendor, { recursive: true });
    for (const name of ["pdf.min.mjs", "pdf.worker.min.mjs"]) copyFileSync(join(tmp, "package", "build", name), join(vendor, name));
    copyFileSync(join(tmp, "package", "LICENSE"), join(vendor, "LICENSE"));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}
