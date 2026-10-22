import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { expect, it } from "vitest";

it("imports the seeded demo's WhatsApp adapter without SQLite, loading it only when the bridge starts", async () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), "deadlock-no-sqlite-"));
  try {
    const adapter = path.join(temp, "whatsapp.mjs");
    const loader = path.join(temp, "no-sqlite.mjs");
    await build({
      entryPoints: [fileURLToPath(new URL("./whatsapp.ts", import.meta.url))],
      outfile: adapter,
      bundle: true,
      platform: "node",
      format: "esm",
      packages: "external",
      logLevel: "silent",
    });
    // Model Node 20's absent built-in for ESM imports as well as lazy require.
    writeFileSync(loader, `
      export function resolve(specifier, context, nextResolve) {
        if (specifier === "node:sqlite") {
          throw Object.assign(new Error("No such built-in module: node:sqlite"), {
            code: "ERR_UNKNOWN_BUILTIN_MODULE",
          });
        }
        return nextResolve(specifier, context);
      }
    `);
    const result = spawnSync(process.execPath, [
      "--no-warnings", "--experimental-loader", loader, "--input-type=module", "--eval", `
        import assert from "node:assert/strict";
        import Module from "node:module";
        const nativeLoad = Module._load;
        Module._load = function (specifier, ...args) {
          if (specifier === "node:sqlite") {
            throw Object.assign(new Error("No such built-in module: node:sqlite"), {
              code: "ERR_UNKNOWN_BUILTIN_MODULE",
            });
          }
          return nativeLoad.call(this, specifier, ...args);
        };
        const { startWhatsApp } = await import(process.argv[1]);
        assert.equal(typeof startWhatsApp, "function");
        assert.throws(() => startWhatsApp("demo@g.us", () => {}), {
          code: "ERR_UNKNOWN_BUILTIN_MODULE",
        });
        console.log("seed import succeeded; native SQLite deferred until bridge start");
      `,
      pathToFileURL(adapter).href,
    ], { encoding: "utf8", timeout: 10_000 });

    assert.ifError(result.error);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("seed import succeeded; native SQLite deferred until bridge start");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
