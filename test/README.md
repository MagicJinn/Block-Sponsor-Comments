# Description filter tests

Fixtures are real YouTube description markup (`#content-text` inner HTML, span structure included). See `fixtures/sources.json` for video URLs.

Run from the repo root:

```bash
npm test
```

The suite loads `blocker.js` and `strings.json` from the repo (with a minimal `chrome.*` stub) and runs `SearchAndDestroySponsors` on each fixture.
