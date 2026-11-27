import { expect, test } from "./cdn";

const link = (source: string) => "./#name=report&code=" + Buffer.from(source, "utf8").toString("base64url");

async function issueAddress(page: import("@playwright/test").Page) {
  const issues = page.locator(".issues-link");
  await issues.dispatchEvent("pointerdown");
  return new URL((await issues.getAttribute("href"))!);
}

test("the bug button opens the problem report with the source, browser and build", async ({ page }) => {
  await page.goto(link("CRT \"Grüße\"\n"));
  const address = await issueAddress(page);
  expect(address.origin + address.pathname).toBe("https://github.com/jbc-lang/jbc-playground/issues/new");
  expect(address.searchParams.get("template")).toBe("bug.yml");
  expect(address.searchParams.get("source")).toBe("CRT \"Grüße\"\n");
  expect(address.searchParams.get("browser")).not.toBe("");
  expect(address.searchParams.get("build")).toBe(await page.locator("#build-info").textContent());
  expect(address.searchParams.get("build")).toMatch(/ \/ jbcc \d+\.\d+\.\d+$/);
  await expect(page.locator(".issues-link")).toHaveAttribute("target", "_blank");
});

test("the bug button cuts a long source short to keep the address usable", async ({ page }) => {
  await page.goto(link("CRT 'x'\n".repeat(5000)));
  const address = await issueAddress(page);
  expect(address.href.length).toBeLessThanOrEqual(7200);
  expect(address.searchParams.get("source")).toMatch(/\(cut short; attach the Export file for the whole project\)$/);
});

test("the bug button follows edits made after the page opened", async ({ page }) => {
  await page.goto(link("CRT 1\n"));
  await page.getByLabel("jBC source").fill("CRT 2\n");
  expect((await issueAddress(page)).searchParams.get("source")).toBe("CRT 2\n");
});
