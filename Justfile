# Build the static playground.
build:
    bun install --frozen-lockfile
    bun build-static.mjs

# Build and serve the playground locally.
dev port="18767": build
    python3 -m http.server {{port}} --bind 127.0.0.1 --directory dist/playground

# Build and run the browser suite.
test *args: build
    bunx playwright test {{args}}
