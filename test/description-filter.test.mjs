import { readFileSync, readdirSync } from "fs";
import { Window } from "happy-dom";
import vm from "vm";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import assert from "assert";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\u00a0/g, " ");
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function significantTextParts(html) {
  const raw = stripTags(html);
  return raw
    .split(/\n{2,}|(?<=[.!?])\s+/)
    .map((part) => normalizeText(part))
    .filter((part) => part.length >= 40);
}

function loadBlocker(document) {
  globalThis.__BSC_TEST_MODE__ = true;
  globalThis.window = document.defaultView;
  globalThis.document = document;
  globalThis.chrome = {
    runtime: { getURL: (path) => join(repoRoot, path) },
    storage: { local: { get: () => {}, set: () => {} } },
  };
  globalThis.setInterval = () => 0;
  globalThis.clearInterval = () => {};

  const blockerSource = readFileSync(join(repoRoot, "blocker.js"), "utf8");
  vm.runInThisContext(blockerSource, { filename: "blocker.js" });

  const stringsData = JSON.parse(readFileSync(join(repoRoot, "strings.json"), "utf8"));
  const selectorsData = JSON.parse(readFileSync(join(repoRoot, "selectors.json"), "utf8"));
  globalThis.__BSC_BLOCKER__.loadSponsorData(stringsData.Sponsors, selectorsData);

  return globalThis.__BSC_BLOCKER__;
}

function filterDescriptionFixture(inputHtml, blocker, document) {
  document.body.innerHTML = `<span class="yt-core-attributed-string yt-core-attributed-string--white-space-pre-wrap"><span id="content-text">${inputHtml}</span></span>`;
  blocker.SearchAndDestroySponsors();
  return document.querySelector("#content-text").innerHTML;
}

function assertFixture({ id, input, expected, actual }) {
  const expectedText = normalizeText(stripTags(expected));
  const actualText = normalizeText(stripTags(actual));
  const inputText = normalizeText(stripTags(input));

  for (const kept of significantTextParts(expected)) {
    assert(
      actualText.includes(kept),
      `${id}: filter removed text that should stay: ${kept.slice(0, 100)}`
    );
  }

  for (const part of significantTextParts(input)) {
    if (expectedText.includes(part)) continue;
    assert(
      !actualText.includes(part),
      `${id}: sponsor or removed segment still present: ${part.slice(0, 100)}`
    );
  }
}

const fixtureIds = readdirSync(join(repoRoot, "test/fixtures"))
  .filter((name) => name.endsWith(".input.html"))
  .map((name) => name.replace(".input.html", ""));

const window = new Window();
const blocker = loadBlocker(window.document);

let failures = 0;
for (const id of fixtureIds) {
  const input = readFileSync(join(repoRoot, "test/fixtures", `${id}.input.html`), "utf8");
  const expected = readFileSync(join(repoRoot, "test/fixtures", `${id}.expected.html`), "utf8");
  const actual = filterDescriptionFixture(input, blocker, window.document);

  try {
    assertFixture({ id, input, expected, actual });
    console.log(`ok ${id}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${id}:`, error.message);
  }
}

if (failures > 0) {
  process.exit(1);
}
