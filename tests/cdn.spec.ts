// The only test that loads the toolchain from the real jsDelivr, as the
// published playground does. The others serve the same files from
// node_modules (see cdn.ts).
import { expect, test } from "@playwright/test";
import { cdn, packages } from "../toolchain.mjs";

test("compiles and runs with the toolchain from jsDelivr", async ({ page }) => {
  const loaded = new Map<string, number>();
  page.context().on("requestfinished", async (request) => {
    if (request.url().startsWith(cdn)) loaded.set(request.url(), (await request.response())?.status() ?? 0);
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Exited with status 0", { timeout: 120000 });
  for (const { base, files } of packages) {
    for (const file of files) expect(loaded.get(base + file), base + file).toBe(200);
  }
});
