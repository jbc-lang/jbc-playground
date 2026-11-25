import { defineConfig } from "@playwright/test";

const port = process.env.JBCC_PLAYGROUND_PORT ?? "18767";
const localURL = `http://127.0.0.1:${port}/`;
const deployedURL = process.env.JBCC_PLAYGROUND_URL;

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  webServer: deployedURL ? undefined : {
    command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory dist/playground`,
    url: localURL,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: deployedURL ?? localURL,
    browserName: (process.env.JBCC_PLAYWRIGHT_BROWSER ?? "chromium") as "chromium" | "firefox" | "webkit",
    channel: process.env.JBCC_PLAYWRIGHT_CHANNEL,
  },
});
