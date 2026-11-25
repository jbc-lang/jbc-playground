import { createHash } from "node:crypto";
import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { downloadWheel, wheelName } from "./jbcc-wheel.mjs";

process.chdir(import.meta.dir);
const output = "dist/playground";
const wheelAsset = `python/${wheelName}`;
const { devDependencies } = await Bun.file("package.json").json();
const pyodide = `toolchain/pyodide-${devDependencies.pyodide}`;
const clang = `toolchain/clang-${devDependencies["@yowasp/clang"]}`;
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
await Promise.all(["examples", "python", pyodide].map((path) =>
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
      PYODIDE_ASSET: JSON.stringify(`./${pyodide}/pyodide.mjs`),
      CLANG_ASSET: JSON.stringify(`./${clang}/bundle.js`),
    },
  }),
  ...["favicon-32.png", "style.css"].map((file) => copy(`web/${file}`, file)),
  cp("examples", join(output, "examples"), { recursive: true }),
  copy("browser.py", "python/browser.py"),
  writeFile(join(output, wheelAsset), wheel),
  ...["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "pyodide-lock.json", "python_stdlib.zip"]
    .map((file) => copy(`node_modules/pyodide/${file}`, `${pyodide}/${file}`)),
  cp("node_modules/@yowasp/clang/gen", join(output, clang), { recursive: true }),
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
  .replace("__BUILD_TIME_LABEL__", stamp.replaceAll("-", ".").replace("T", " ")));

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
