// The compiler toolchain loads from jsDelivr, pinned to the versions in
// package.json. jsDelivr serves npm packages by exact version, which npm
// never republishes; tools/check-cdn.mjs checks that its copies match the
// locked packages in node_modules, and the tests serve them from there.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));
const { devDependencies } = JSON.parse(readFileSync(`${root}package.json`, "utf8"));

export const cdn = "https://cdn.jsdelivr.net/npm/";

// Each package: its jsDelivr base URL, its directory in node_modules and the
// files the playground loads from it.
export const packages = [
  {
    base: `${cdn}pyodide@${devDependencies.pyodide}/`,
    local: `${root}node_modules/pyodide/`,
    files: ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "pyodide-lock.json", "python_stdlib.zip"],
  },
  {
    base: `${cdn}@yowasp/clang@${devDependencies["@yowasp/clang"]}/gen/`,
    local: `${root}node_modules/@yowasp/clang/gen/`,
    files: ["bundle.js", "llvm.core.wasm", "llvm.core2.wasm", "llvm.core3.wasm", "llvm.core4.wasm", "llvm-resources.tar"],
  },
];

export const pyodideURL = `${packages[0].base}pyodide.mjs`;
export const clangURL = `${packages[1].base}bundle.js`;

// The node_modules file for a jsDelivr URL, or undefined for any other URL.
export function localFile(url) {
  const { origin, pathname } = new URL(url);
  const href = origin + pathname;
  for (const { base, local, files } of packages) {
    if (href.startsWith(base) && files.includes(href.slice(base.length))) {
      return local + href.slice(base.length);
    }
  }
  return undefined;
}
