# jBC Playground

The jBC playground compiles and runs multi-file jBC projects in your
browser at [online.jbc-lang.org](https://online.jbc-lang.org/).
The [jbcc repository](https://github.com/jbc-lang/jbcc) maintains the
compiler, runtime, and native CLI.

## Local development

With Bun, Python 3, and Just installed, run `just dev` and open
<http://127.0.0.1:18767/>. This builds `dist/playground` and serves it with
Python's static HTTP server. The build downloads the pinned
[jbcc 0.2.0 wheel](https://pypi.org/project/jbcc/0.2.0/), verifies its
SHA-256, and serves it with the rest of the site. **Run** loads the
compiler on demand.
The worker uses Pyodide for jbcc and Clang/LLD for the generated C, and a
separate sandboxed worker runs the Wasm. The browser saves the working
draft in localStorage. Use **Project name** and **Save** to keep a named
project in IndexedDB. **Projects** lists the names, and **Load** opens the
chosen save after confirmation. Edits to a saved or loaded project
autosave after a short pause. If another tab updates the same name, the
editor keeps its working draft and reports a conflict. Save under a
different name to keep both versions.

Use **Export** to download the open project as a versioned JSON file.
**Import** can open it in another browser profile. Exports contain the project name, files, **Main**,
linked routines, selected tab, and prefilled stdin.
Browser session values use a virtual working directory of `/`, zero for
the process and port numbers, and an empty OS login.

The lockfile records the npm integrity hashes for Pyodide 314.0.8,
YoWASP Clang 21.1.4-3 (including the WASI sysroot), and browser_wasi_shim
0.4.2. The build copies the package toolchain assets into versioned
paths. See the [Pyodide license](https://github.com/pyodide/pyodide/blob/main/LICENSE),
[YoWASP package license and upstream sources](https://codeberg.org/YoWASP/clang),
[LLVM license](https://llvm.org/LICENSE.txt),
[wasi-libc license](https://github.com/WebAssembly/wasi-libc/blob/main/LICENSE),
and the [WASI shim license](https://github.com/bjorn3/browser_wasi_shim/blob/main/LICENSE-MIT).

## Browser tests

The native comparisons use `uvx` and a C99 compiler. Install the test
dependencies and Chromium, then run the suite.

```sh
bun install --frozen-lockfile
bunx playwright install chromium
just test
```

Set `JBCC_PLAYWRIGHT_CHANNEL=chrome` to use a local Google Chrome
installation. For Playwright Firefox or WebKit, install the engines with
`bunx playwright install firefox webkit` and set
`JBCC_PLAYWRIGHT_BROWSER` to `firefox` or `webkit`.

To test a deployed build, set `JBCC_PLAYGROUND_URL` to the site URL
including its trailing slash. The build from `just build` supplies the
matching wheel for the native comparisons.

## Publishing

GitHub Actions builds and tests pull requests and publishes the static
artifact to GitHub Pages when changes land on `main`. GitHub Pages serves
the custom domain `online.jbc-lang.org`. Local builds omit Analytics, and
the tag skips execution on nonproduction origins.

The production page embeds the Google tag for GA4 stream `G-NCPVZT08XG`.
The repository's Actions variable `JBCC_ENABLE_ANALYTICS=1` enables it
for production deployments. The tag runs only on
`https://online.jbc-lang.org` and sends a cookieless page view. URLs
with query strings skip measurement because GA4 can read search terms
from them. The tag runs in the editor page's origin. The Wasm runner
stays sandboxed.

To render the production HTML locally, run
`JBCC_ENABLE_ANALYTICS=1 bun build-static.mjs`. Serve it at localhost
to inspect the generated page without sending Analytics.

## Writing and running programs

The editor starts with `hello.b`. Choose **Status lookup (3 files)** to
try a program and a subroutine that share an include. Pick the main file
with **Main**. For each separately compiled subroutine or function,
select its tab and check **Link as routine**. Include files are expanded
by `$INSERT` or `$INCLUDE` and can stay unchecked. An include searches
relative to its source file, then relative to the project root. Paths
are case-sensitive. Drafts and the theme are saved in the browser.

**Run** compiles the project and executes the Wasm in an isolated browser
worker if compilation succeeds. Fill **Standard input**
before running a program that reads with `INPUT`. **Stop** cancels a
build or terminates a running program. The runner allows five seconds,
64 MiB of Wasm memory, and 64 KiB of combined console output.
The **?** button opens help for files, routines, limits, and browser projects.

This version targets console programs. The compiler reports source
locations for unsupported operations such as shell commands, sequential
files and devices, terminal cursor and keyboard controls, timed input,
native C calls, and printer output. Live keystrokes, jBASE file
backends, and T24 services are unavailable. Standard input is a
prefilled byte stream that ends when consumed.
