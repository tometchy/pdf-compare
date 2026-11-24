import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { IDBFactory } from "fake-indexeddb";

test("both book namespaces preserve their old storage keys and isolate IndexedDB", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pdf-compare-test-"));
  try {
    const db = new IDBFactory();
    const values = new Map([
      ["pdf-comparison:english:110:unused", "ignored"],
      ["pdf-comparison:english:highlights:110", JSON.stringify([{ tool: "light", points: [[0.1, 0.2]] }])],
      ["simeon-pdf-comparison:polish:highlights:117", JSON.stringify([{ tool: "dark", points: [[0.3, 0.4]] }])]
    ]);
    const storage = { get length() { return values.size; }, key: i => [...values.keys()][i],
      getItem: k => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
    for (const name of ["pickering", "simeon"]) {
      const out = join(dir, name);
      execFileSync(process.execPath, ["scripts/build.mjs", "tests/" + name + ".json", out, "--no-vendor"]);
      const html = readFileSync(join(out, "compare.html"), "utf8");
      const config = JSON.parse(readFileSync("tests/" + name + ".json", "utf8"));
      assert.ok(html.includes(JSON.stringify(config.englishUrl)));
      assert.ok(html.includes(JSON.stringify(config.polishUrl)));
      assert.ok(html.includes('const storagePrefix = "' + config.storageNamespace + ':"'));
      assert.ok(!html.includes("__NAMESPACE__"));
      const { createHighlightStore } = await import(pathToFileURL(join(out, "highlight-store.mjs")));
      const store = await createHighlightStore({ storage, databaseFactory: db });
      assert.equal(store.get("english", 110).length, name === "pickering" ? 1 : 0);
      assert.equal(store.get("polish", 117).length, name === "simeon" ? 1 : 0);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
