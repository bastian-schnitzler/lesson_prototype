# Lesson prototype

React prototype for vocabulary and grammar lessons generated offline from the course outlines in `content/outlines/`. The specification is [docs/SPEC.md](docs/SPEC.md); the backlog is [docs/ISSUES.md](docs/ISSUES.md).

All workflow tasks run through `make`:

```sh
make install                      # once: npm dependencies and the Playwright browser
make run                          # serve the app and open it (override BROWSER_CMD / PORT)
make run BROWSER_CMD=wslview      # e.g. on WSL
make test-all                     # mockup parity, type checks, unit/component and e2e tests
make build                        # dist/ for GitHub Pages (validated outlines, assets, content, manifest)
make preview                      # serve dist/ under /lesson_prototype/ like Pages
make smoke                        # HTTP check of the published site
make help                         # every target with its arguments
```

Requires Node.js 24 or newer. Pushes to `main` deploy to https://bastian-schnitzler.github.io/lesson_prototype/ through `.github/workflows/pages.yml`.

Offline brief generation is available for grammar and vocabulary. Copy `.env.example` to `.env`, set `GEMINI_API_KEY` and `GEMINI_MODEL` (models with structured JSON output support, best first, comma-separated), optionally further keys `GEMINI_API_KEY2`, `GEMINI_API_KEY3`, … that take over when a key hits its quota (HTTP 429), then use:

```sh
make brief ID=fr-classroom-objects  # generate missing or reuse valid brief
make brief ID=fr-classroom-objects REGENERATE=1  # explicitly replace an existing brief
make briefs-missing                # serial catalog order; skip functions/reading
make sample-briefs                 # the first-ten fr/A1 grammar and vocabulary review batch
```

Generation makes at most three generation calls per brief, including repairs; each call tries every key three times per model before falling back to the next model. Batch targets run `GEMINI_CONCURRENCY` workers (default 1), started `GEMINI_WORKER_STAGGER_S` seconds apart (default 30). Full schema and cross-reference validation precede atomic saving to `content/briefs/<id>.json`. Stale, invalid or malformed files require explicit regeneration; failed replacement keeps the prior file. Batch mode reports outcomes, continues after individual failures, and exits nonzero if any supported lesson fails. It does not overwrite stale/invalid files automatically. Keep the phase 1 first-ten sample review gate before expanding the course.

Requests use the [Gemini generateContent structured-output API](https://ai.google.dev/api/generate-content). All en/fr/de support copy and allowed mother-tongue translations are generated together. The model name appears in artifact provenance; the API key stays local. No paid calls run in tests, and the browser has no generator endpoint. After generating, rebuild/redeploy to refresh the static catalog.

Parallel calls for one ID share work within a process. A per-ID filesystem lock rejects a second process. If a process crashes, remove its `content/briefs/<id>.json.lock/` only after confirming no generator is running, then retry. Temporary files and locks are ignored by Git and never referenced by the build.
