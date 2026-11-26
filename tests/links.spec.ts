import { expect, test, type Page } from "@playwright/test";

// Links such as #name=locate&code=<base64url>, made by the jBC guide's "Run" buttons.
const link = (source: string, name?: string) =>
  "./#" + (name === undefined ? "" : `name=${encodeURIComponent(name)}&`) +
  "code=" + Buffer.from(source, "utf8").toString("base64url");
const source = (page: Page) => page.getByLabel("jBC source");
const status = (page: Page) => page.locator("#project-status");
const restore = (page: Page) => page.getByRole("button", { name: "Restore previous draft" });

// A fresh page load: going from ./ to ./#... would only change the fragment.
async function openLink(page: Page, address: string) {
  await page.goto("about:blank");
  await page.goto(address);
}

test("opens linked source as a named file and clears the address", async ({ page }) => {
  const code = "CRT \"Grüße\"\n";
  await page.goto(link(code, "locate"));
  await expect(page.locator("#filename")).toHaveValue("locate.b");
  await expect(source(page)).toHaveValue(code);
  await expect(status(page)).toHaveText("Opened locate from a link");
  await expect(restore(page)).toHaveCount(0);
  expect(new URL(page.url()).hash).toBe("");
  await page.reload();
  await expect(source(page)).toHaveValue(code);
});

test("uses main.b for a missing or unsafe name", async ({ page }) => {
  await page.goto(link("CRT 1\n", "../x"));
  await expect(page.locator("#filename")).toHaveValue("main.b");
  await expect(status(page)).toHaveText("Opened from a link");
});

test("keeps an unsaved draft that a link replaces", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#filename")).toHaveValue("hello.b");
  await source(page).fill("CRT \"mine\"\n");
  await openLink(page, link("CRT 2\n", "abs"));
  await expect(source(page)).toHaveValue("CRT 2\n");
  await restore(page).click();
  await expect(source(page)).toHaveValue("CRT \"mine\"\n");
  await expect(page.locator("#filename")).toHaveValue("hello.b");
  await expect(status(page)).toHaveText("Previous draft restored");
});

test("leaves a saved project alone and does not autosave the link into it", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#filename")).toHaveValue("hello.b");
  const hello = await source(page).inputValue();
  await page.getByLabel("Project name").fill("kept");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(status(page)).toHaveText("Autosaving kept");

  await openLink(page, link("CRT 3\n", "abs"));
  await expect(source(page)).toHaveValue("CRT 3\n");
  await expect(page.getByLabel("Project name")).toHaveValue("draft");
  await expect(restore(page)).toHaveCount(0);
  await source(page).fill("CRT 4\n");

  await page.getByLabel("Project name").fill("kept");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(source(page)).toHaveValue(hello);
});

test("reports a link it cannot decode and keeps the draft", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#filename")).toHaveValue("hello.b");
  await source(page).fill("CRT \"mine\"\n");
  await openLink(page, "./#code=%%%");
  await expect(status(page)).toHaveText("Could not open the linked source");
  await expect(source(page)).toHaveValue("CRT \"mine\"\n");
  expect(new URL(page.url()).hash).toBe("");
});

test("asks before a link replaces the draft in an open tab", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#filename")).toHaveValue("hello.b");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.evaluate((hash) => { location.hash = hash; }, link("CRT 5\n", "five").slice(3));
  await expect(page.locator("#filename")).toHaveValue("five.b");
  await expect(source(page)).toHaveValue("CRT 5\n");
});
