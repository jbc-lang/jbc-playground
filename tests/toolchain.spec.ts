import { expect, test } from "./cdn";
import { packages } from "../toolchain.mjs";

// The page loads the toolchain from jsDelivr; the tests' routing must answer
// every one of those requests from node_modules, including the compile
// worker's.
test("serves every toolchain file from node_modules in tests", async ({ page, servedFromDisk }) => {
  const network: string[] = [];
  page.context().on("requestfinished", (request) => {
    if (request.url().startsWith("https://cdn.jsdelivr.net/") && !servedFromDisk.includes(request.url())) {
      network.push(request.url());
    }
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Exited with status 0", { timeout: 60000 });
  const expected = packages.flatMap(({ base, files }) => files.map((file) => base + file));
  expect(new Set(servedFromDisk)).toEqual(new Set(expected));
  expect(network).toEqual([]);
});
