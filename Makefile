# Lesson prototype workflow. Every task runs through make (SPEC "Makefile workflow").

# ---- user configuration -----------------------------------------------------
# Command that opens a URL: a command on PATH (xdg-open, firefox, wslview) or a
# full path, which may contain spaces. Windows programs are not on the WSL PATH
# unless their folder is, so use the full /mnt/c/... path for Windows Firefox.
BROWSER_CMD ?= /mnt/c/Program Files/Mozilla Firefox/firefox.exe
PORT ?= 5173
# Published GitHub Pages site, checked by 'make smoke'.
SITE_URL ?= https://bastian-schnitzler.github.io/lesson_prototype/
# ------------------------------------------------------------------------------

NODE ?= node
NPM ?= npm

.DEFAULT_GOAL := help
.PHONY: help install run catalog typecheck test test-e2e test-all mockups-sync mockups-check screens issues-sync \
	build preview check-dist smoke brief briefs-missing sample-briefs generate generate-missing sample-lessons

help: ## Show available targets, arguments and configuration
	@echo "Lesson prototype — make targets"
	@echo
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo
	@echo "Configuration (edit the top of the Makefile or override on the command line):"
	@echo "  BROWSER_CMD=$(BROWSER_CMD)   command used by 'make run' to open the app"
	@echo "  PORT=$(PORT)                 local HTTP port for 'make run' and 'make preview'"
	@echo "  SITE_URL=$(SITE_URL)"
	@echo "                               published site checked by 'make smoke'"
	@echo
	@echo "Prerequisites: Node.js 24+ and npm. Run 'make install' once after cloning."

node_modules/.package-lock.json: package.json package-lock.json
	$(NPM) ci
	@touch $@

install: ## Install locked dependencies and the Playwright test browser
	$(NPM) ci
	$(NPM) exec -- playwright install chromium

run: node_modules/.package-lock.json ## Refresh the course catalog, serve the app and open it (BROWSER_CMD, PORT)
	$(NODE) scripts/run.ts --port $(PORT) --browser "$(BROWSER_CMD)"

catalog: node_modules/.package-lock.json ## Validate all content/outlines/*.json and print the course catalog
	$(NODE) scripts/catalog.ts

typecheck: node_modules/.package-lock.json ## Type-check the app, scripts and tests
	$(NPM) exec -- tsc --noEmit -p .

test: node_modules/.package-lock.json typecheck catalog ## Run type checks, catalog validation, unit and component tests
	$(NPM) exec -- vitest run

test-e2e: node_modules/.package-lock.json ## Run browser tests against fixture content and the real course (project course; optional E2E_WORKERS)
	$(NPM) exec -- playwright test $(if $(E2E_WORKERS),--workers $(E2E_WORKERS),)

test-all: mockups-check test test-e2e ## Run mockup parity, unit/component and end-to-end tests

mockups-sync: node_modules/.package-lock.json ## Copy every docs/mockups .puml source into its SPEC.md code fence and refresh the rendered-screen blocks
	$(NODE) scripts/mockups.ts sync

mockups-check: node_modules/.package-lock.json ## Fail on stale, missing or orphaned SPEC mockup fences or screen blocks, missing screens or other files
	$(NODE) scripts/mockups.ts check

screens: node_modules/.package-lock.json ## Capture lesson screens from the running prototype as PNG + HTML under docs/mockups (ONLY=<path-prefix>)
	$(NODE) scripts/screens.ts $(if $(ONLY),--only "$(ONLY)",)

build: node_modules/.package-lock.json ## Validate outlines and build dist/ (index.html, assets, content, manifest) for Pages
	$(NODE) scripts/build.ts

preview: build ## Build, then serve dist/ under /lesson_prototype/ like GitHub Pages (PORT)
	$(NODE) scripts/serve-dist.ts --port $(PORT)

check-dist: build ## Build, then smoke-check dist/ under the Pages path with HTTP and a headless browser
	$(NODE) scripts/serve-dist.ts --port 4173 --check

smoke: node_modules/.package-lock.json ## HTTP smoke check of the published site (SITE_URL)
	$(NODE) scripts/smoke.ts $(SITE_URL)

issues-sync: node_modules/.package-lock.json ## Refresh GitHub milestones/issues from SPEC/ISSUES (DRY_RUN=1 to preview; needs gh)
	$(NODE) scripts/issues-sync.ts $(if $(DRY_RUN),--dry-run,)

# ---- targets introduced by later issues: fail clearly until implemented ------

define not_yet
	@echo "error: 'make $@' is not implemented yet; it arrives with $(1)." >&2
	@exit 1
endef


brief: node_modules/.package-lock.json ## Generate/reuse a brief: ID=<lesson-id> [REGENERATE=1 to replace]
	$(NODE) generator/cli.ts brief --id "$$ID" $(if $(filter 1,$(REGENERATE)),--regenerate,)
brief: export ID := $(ID)

briefs-missing: node_modules/.package-lock.json ## Generate missing supported briefs (GEMINI_CONCURRENCY workers); report skips and failures
	$(NODE) generator/cli.ts briefs-missing

sample-briefs: node_modules/.package-lock.json ## Generate/reuse the first-ten fr/A1 grammar and vocabulary briefs for review
	$(NODE) generator/cli.ts sample-briefs

generate: node_modules/.package-lock.json ## Generate/reuse brief, then lesson content: ID=<lesson-id> [REGENERATE=1 replaces the content]
	$(NODE) generator/cli.ts generate --id "$$ID" $(if $(filter 1,$(REGENERATE)),--regenerate,)
generate: export ID := $(ID)

generate-missing: node_modules/.package-lock.json ## Generate missing supported briefs and lesson content in catalog order
	$(NODE) generator/cli.ts generate-missing

sample-lessons: node_modules/.package-lock.json ## Validate the twenty sample lessons and the three function test lessons (no model calls)
	$(NODE) scripts/sample-lessons.ts
