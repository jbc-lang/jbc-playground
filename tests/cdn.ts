// Tests use the published build, which loads the toolchain from jsDelivr,
// but answer those requests from node_modules: the same bytes (see
// tools/check-cdn.mjs), without the network. cdn.spec.ts runs against the
// real jsDelivr.
import { test as base } from "@playwright/test";
import { localFile } from "../toolchain.mjs";

export { expect, type Page } from "@playwright/test";

export const test = base.extend<{ servedFromDisk: string[] }>({
  servedFromDisk: async ({}, use) => {
    await use([]);
  },
  context: async ({ context, servedFromDisk }, use) => {
    await context.route("https://cdn.jsdelivr.net/npm/**", async (route) => {
      const path = localFile(route.request().url());
      if (!path) return route.abort();
      servedFromDisk.push(route.request().url());
      await route.fulfill({
        path,
        headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
      });
    });
    await use(context);
  },
});
