import { expect, test } from "./cdn";
import { readFileSync } from "node:fs";
import { wheelName } from "../jbcc-wheel.mjs";
import { cdn, clangURL, pyodideURL } from "../toolchain.mjs";


test("runs another program offline after loading the toolchain", async ({ context, page }) => {
  const requests: string[] = [];
  context.on("request", (request) => requests.push(new URL(request.url()).pathname));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.locator("#filename")).toHaveValue("hello.b");
  await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeHidden();
  expect(requests.filter((path) => path.endsWith(".wasm") || path.endsWith(".whl"))).toEqual([]);
  const run = page.getByRole("button", { name: "Run", exact: true });
  const status = page.locator("#status");
  await run.click();
  await expect(status).toHaveText("Exited with status 0", { timeout: 45_000 });
  await expect(page.locator("#stdout")).toHaveText("Hello, jBC!");

  const prefix = new URL("./", page.url());
  expect(requests).toContain(new URL(`python/${wheelName}`, prefix).pathname);
  // The toolchain comes from jsDelivr (answered from node_modules in tests).
  expect(requests.some((path) => path.startsWith(new URL(cdn).pathname) && path.endsWith(".wasm"))).toBe(true);
  const factorial = readFileSync(new URL("../examples/factorial.b", import.meta.url), "utf8");
  await context.setOffline(true);
  await page.getByLabel("jBC source").fill(factorial);
  await run.click();
  await expect(status).toHaveText("Exited with status 0", { timeout: 20_000 });
  await expect(page.locator("#stdout")).toHaveText("2432902008176640000");
  expect(requests.filter((path) => path.includes("/api/"))).toEqual([]);
});

for (const [statusText, asset, body] of [
  ["Loading Python…", pyodideURL, "await new Promise(() => {});"],
  ["Compiling C…", clangURL, "export const commands = { clang: () => new Promise(() => {}) };"],
]) {
  test(`stops during ${statusText} and can start a fresh compiler`, async ({ page }) => {
    await page.route(asset, (route) => route.fulfill({
      contentType: "application/javascript",
      headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
      body,
    }), { times: 1 });
    await page.goto("./");
    await expect(page.locator("#filename")).toHaveValue("hello.b");
    const run = page.getByRole("button", { name: "Run", exact: true });
    const status = page.locator("#status");
    await run.click();
    await expect(status).toHaveText(statusText);
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await expect(status).toHaveText("Stopped");
    await run.click();
    await expect(status).toHaveText("Exited with status 0", { timeout: 45_000 });
  });
}

test("a runner opened without an opaque sandbox refuses to execute", async ({ page }) => {
  await page.goto("./");
  const reply = await page.evaluate(async () => {
    const frame = document.createElement("iframe");
    frame.src = "./runner.html";
    const loaded = new Promise<void>((resolve) => frame.addEventListener("load", () => resolve(), { once: true }));
    document.body.append(frame);
    await loaded;
    const channel = new MessageChannel();
    try {
      return await new Promise<unknown>((resolve) => {
        const timer = setTimeout(() => resolve(null), 500);
        channel.port1.onmessage = ({ data }) => {
          clearTimeout(timer);
          resolve(data);
        };
        frame.contentWindow!.postMessage({
          wasm: new Uint8Array(),
          stdin: "",
        }, "*", [channel.port2]);
      });
    } finally {
      channel.port1.close();
      frame.remove();
    }
  });
  expect(reply).toBeNull();
});

test("WASI supplies randomness and browser session values", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#filename")).toHaveValue("hello.b");
  const editor = page.getByLabel("jBC source");
  const run = page.getByRole("button", { name: "Run", exact: true });
  const status = page.locator("#status");
  const stdout = page.locator("#stdout");

  for (const [path, expected] of [
    ["rnd.b", /^0\n0\nin range\n$/],
    ["unique-key.b", /^(?:[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\n){5}$/],
    ["pid-uses-native-process-id-with-port-override.b", /^0\n0\n$/],
    ["account-path-uses-working-directory.b", /^\/\n$/],
  ] as const) {
    await editor.fill(readFileSync(new URL(`fixtures/${path}`, import.meta.url), "utf8"));
    await run.click();
    await expect(status).toHaveText("Exited with status 0", { timeout: 20_000 });
    expect(await stdout.textContent()).toMatch(expected);
  }
});
