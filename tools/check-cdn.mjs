// Check that jsDelivr serves the toolchain files byte for byte as the
// locked packages in node_modules, which the tests use. Run as
// `just check-cdn`; CI runs it before the browser tests.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { packages } from "../toolchain.mjs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
let failed = false;
for (const { base, local, files } of packages) {
  for (const file of files) {
    const response = await fetch(base + file, { signal: AbortSignal.timeout(120_000) });
    const remote = response.ok ? sha256(new Uint8Array(await response.arrayBuffer())) : `HTTP ${response.status}`;
    const expected = sha256(await readFile(local + file));
    const same = remote === expected;
    failed ||= !same;
    console.log(`${same ? "ok      " : "MISMATCH"} ${base}${file}`);
  }
}
if (failed) {
  console.error("jsDelivr does not serve the locked toolchain; see tools/check-cdn.mjs.");
  process.exit(1);
}
