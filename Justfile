set positional-arguments

# Build the static playground.
build:
    bun install --frozen-lockfile
    bun build-static.mjs

# Build and serve the playground locally.
dev port="18767": build
    python3 -m http.server "$1" --bind 127.0.0.1 --directory dist/playground

# Rewrite web/jbc-words.json, the words the editor colours, from the pinned jbcc.
words:
    uvx --from "jbcc==$(sed -n 's/^export const version = "\(.*\)";/\1/p' jbcc-wheel.mjs)" python tools/jbc-words.py > web/jbc-words.json

# Build and run the browser suite.
test *args: build
    bunx playwright test "$@"
