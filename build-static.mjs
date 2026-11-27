import { createHash } from "node:crypto";
import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { downloadWheel, version as jbccVersion, wheelName } from "./jbcc-wheel.mjs";
import { clangURL, pyodideURL } from "./toolchain.mjs";

process.chdir(import.meta.dir);
const output = "dist/playground";
const wheelAsset = `python/${wheelName}`;
const analytics = process.env.JBCC_ENABLE_ANALYTICS === "1";

async function bundle(options) {
  const result = await Bun.build({ target: "browser", ...options });
  if (!result.success) {
    throw new Error(result.logs.map((log) => log.message).join("\n"));
  }
  return result.outputs;
}

async function copy(source, destination) {
  await copyFile(source, join(output, destination));
}

function scriptHash(source) {
  return createHash("sha256").update(source).digest("base64");
}

const wheel = await downloadWheel();
await rm(output, { recursive: true, force: true });
await Promise.all(["examples", "python"].map((path) =>
  mkdir(join(output, path), { recursive: true })));
await Promise.all([
  bundle({
    entrypoints: ["web/editor.ts"],
    outdir: output,
    splitting: true,
  }),
  bundle({
    entrypoints: ["web/compile-worker.ts"],
    outdir: output,
    define: {
      JBCC_WHEEL_ASSET: JSON.stringify(`./${wheelAsset}`),
      PYODIDE_ASSET: JSON.stringify(pyodideURL),
      CLANG_ASSET: JSON.stringify(clangURL),
    },
  }),
  ...["favicon-32.png", "style.css"].map((file) => copy(`web/${file}`, file)),
  cp("examples", join(output, "examples"), { recursive: true }),
  copy("browser.py", "python/browser.py"),
  writeFile(join(output, wheelAsset), wheel),
  copy("LICENSE", "LICENSE"),
  copy("THIRD-PARTY-NOTICES.md", "THIRD-PARTY-NOTICES.md"),
  copy("TOOLCHAIN-NOTICES.md", "TOOLCHAIN-NOTICES.md"),
  copy("node_modules/@bjorn3/browser_wasi_shim/LICENSE-MIT", "WASI-SHIM-LICENSE"),
]);

const html = await readFile("web/index.html", "utf8");
const stamp = new Date().toISOString().slice(0, 16);
const googleTag = analytics ? (await readFile("web/google-tag.html", "utf8")).trimEnd() : "";
const page = html.replace("    <!-- google-tag -->", googleTag);
await writeFile(join(output, "index.html"), page
  .replace("__BUILD_TIME_ISO__", `${stamp}:00Z`)
  .replace("__BUILD_TIME_LABEL__", stamp.replaceAll("-", ".").replace("T", " "))
  .replaceAll("__JBCC_VERSION__", jbccVersion));

const [[frame], [program]] = await Promise.all([
  bundle({ entrypoints: ["web/runner.ts"], format: "iife" }),
  bundle({ entrypoints: ["web/wasi-program.ts"], format: "iife" }),
]);
const script = (`const wasiWorkerSource = ${JSON.stringify(await program.text())};\n` +
  await frame.text()).replace(/<\/script/gi, "<\\/script");
const runner = await readFile("web/runner.html", "utf8");
const policy = `default-src 'none'; script-src 'sha256-${scriptHash(script)}' 'wasm-unsafe-eval'; worker-src blob:; base-uri 'none'; form-action 'none'`;
await writeFile(join(output, "runner.html"), runner.replace(
  '  <script src="./runner.js"></script>',
  `  <meta http-equiv="Content-Security-Policy" content="${policy}">\n  <script>${script}</script>`,
));
console.log(`Built ${output}`);
