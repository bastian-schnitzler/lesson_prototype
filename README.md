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
