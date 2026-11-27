# Working on jBC Playground

Read README.md for local commands and how the site is deployed.

- This repo owns the browser editor, project storage, and Wasm integration.
  Compiler and C runtime changes belong in jbc-lang/jbcc.
- The build verifies and serves a pinned PyPI wheel. Use that same wheel
  for native CLI comparisons in the browser tests.
- Keep static jBC test sources in examples or tests/fixtures. Reserve
  generated jBC source for tests that vary the source.
- Use paths relative to the deployed page or worker, except for the
  toolchain's jsDelivr URLs. The GitHub Pages preview is served under
  /jbc-playground/.
- Preserve the existing localStorage keys, IndexedDB schema, and import
  format when moving the same site between deployments. Keep the Wasm
  runner sandbox and test any changes to it.
- Pyodide and Clang load from jsDelivr at the versions in package.json
  (toolchain.mjs). Import `test` from tests/cdn.ts, which answers those
  requests from node_modules, and keep `just check-cdn` in CI.
- Use Conventional Commits with an imperative summary.
