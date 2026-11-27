import { expect, test, type Page } from "./cdn";

const link = (source: string) => "./#name=colours&code=" + Buffer.from(source, "utf8").toString("base64url");
const colors = (page: Page) => page.locator("#source-colors");
const source = (page: Page) => page.getByLabel("jBC source");
const hint = (page: Page) => page.locator("#source-hint");
const texts = (page: Page, kind: string) => colors(page).locator(`.${kind}`).allTextContents();

const sample = [
  "* every kind of token",
  "$INSERT I_COMMON",
  "V.LIST = 'B' : @FM : \"A\" ; V.N = 1.5   ;* trailing",
  "LOCATE 'A' IN V.LIST BY 'AL' SETTING V.P ELSE NULL",
  "CRT LEN(V.LIST), \\back\\",
  "GOSUB DONE",
  "DONE:",
  "   RETURN",
].join("\n") + "\n";

test("colours statements, functions, strings, numbers, comments and labels", async ({ page }) => {
  await page.goto(link(sample));
  await expect(source(page)).toHaveValue(sample);
  await expect(page.locator(".source-wrap")).toHaveClass(/colored/);
  expect(await texts(page, "c-5com")).toEqual(["* every kind of token", "* trailing"]);
  expect(await texts(page, "c-3typ")).toEqual(["$INSERT", "@FM"]);
  expect(await texts(page, "c-4str")).toEqual(["'B'", '"A"', "'A'", "'AL'", "\\back\\"]);
  expect(await texts(page, "c-2num")).toEqual(["1.5"]);
  expect(await texts(page, "c-0fun")).toEqual(["LEN"]);
  expect(await texts(page, "c-1com")).toEqual(
    ["LOCATE", "IN", "BY", "SETTING", "ELSE", "NULL", "CRT", "GOSUB", "RETURN"],
  );
  expect(await texts(page, "c-label")).toEqual(["DONE:"]);
  await expect(hint(page)).toBeHidden();
});

test("keeps the coloured copy equal to the source while typing", async ({ page }) => {
  await page.goto(link("CRT 1\n"));
  await source(page).press("End");
  await source(page).pressSequentially(" ; CRT 'x' <tag> & more");
  const value = await source(page).inputValue();
  await expect(colors(page)).toHaveText(value + "\n", { useInnerText: false });
});

test("underlines browser-only statements and names them under the editor", async ({ page }) => {
  await page.goto(link("CRT 'EXECUTE is fine in a string'\nEXECUTE 'ls' CAPTURING X\n* OPENSEQ in a comment\n"));
  expect(await texts(page, "c-unavailable")).toEqual(["EXECUTE"]);
  await expect(hint(page)).toHaveText("Not available in the browser: EXECUTE. The build will stop there.");
  await source(page).fill("CRT 1\n");
  await expect(hint(page)).toBeHidden();
});

test("scrolls the colours with the source", async ({ page }) => {
  const long = Array.from({ length: 200 }, (_, i) => `CRT ${i} : '${"x".repeat(i % 7 ? 10 : 300)}'`).join("\n");
  await page.goto(link(long));
  await source(page).evaluate((element: HTMLTextAreaElement) => {
    element.scrollTop = 1234;
    element.scrollLeft = 200;
  });
  await expect.poll(() => colors(page).evaluate((element) => element.style.getPropertyValue("--scroll-top"))).toBe(
    await source(page).evaluate((element: HTMLTextAreaElement) => `${element.scrollTop}px`),
  );
  const offset = await page.evaluate(() => {
    const editor = document.getElementById("source") as HTMLTextAreaElement;
    const code = document.querySelector("#source-colors > code")!;
    // The textarea's text starts after its padding, minus what it has scrolled.
    const textLeft = editor.getBoundingClientRect().left + parseFloat(getComputedStyle(editor).paddingLeft) - editor.scrollLeft;
    return code.getBoundingClientRect().left - textLeft;
  });
  expect(Math.abs(offset)).toBeLessThan(1);
});

test("colours a 64 KiB source quickly", async ({ page }) => {
  await page.goto(link("CRT 1\n"));
  const elapsed = await page.evaluate(() => {
    const editor = document.getElementById("source") as HTMLTextAreaElement;
    const line = "   V.X<1,2> = OCONV(DATE(), 'D') : @VM : \"text\" ;* comment\n";
    editor.value = line.repeat(Math.floor(64 * 1024 / line.length));
    const start = performance.now();
    editor.dispatchEvent(new Event("input"));
    editor.value += "CRT 2\n";
    editor.dispatchEvent(new Event("input"));
    return performance.now() - start;
  });
  expect(elapsed).toBeLessThan(250);
});
