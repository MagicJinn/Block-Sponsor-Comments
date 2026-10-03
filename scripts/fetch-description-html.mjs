import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const videos = [
  "https://www.youtube.com/watch?v=8jPQjjsBbIc", // TechLinked LTT style
  "https://www.youtube.com/watch?v=aircAruvnKk", // 3blue1brown
  "https://www.youtube.com/watch?v=L8tWmd48yH4", // Veritasium
];

const outDir = join(process.cwd(), "test/fixtures/raw");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

for (const url of videos) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);
    const expand = page.locator("#expand, tp-yt-paper-button#expand").first();
    if (await expand.count()) {
      await expand.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
    const html = await page.evaluate(() => {
      const spans = document.querySelectorAll(
        'span.yt-core-attributed-string.yt-core-attributed-string--white-space-pre-wrap[role]:not([role="text"]), span.yt-core-attributed-string.yt-core-attributed-string--white-space-pre-wrap:not([role])'
      );
      const parts = [];
      spans.forEach((el) => {
        const ct = el.querySelector("#content-text");
        if (ct) parts.push(ct.innerHTML);
        else parts.push(el.innerHTML);
      });
      return { title: document.title, parts, combined: parts.join("") };
    });
    const id = url.split("v=")[1];
    if (!html.combined || html.combined.length < 20) {
      console.warn("skip", id, "no description html");
      continue;
    }
    writeFileSync(join(outDir, `${id}.html`), html.combined, "utf8");
    console.log("saved", id, html.combined.length, "chars", html.title?.slice(0, 60));
  } catch (e) {
    console.error("fail", url, e.message);
  }
}

await browser.close();
