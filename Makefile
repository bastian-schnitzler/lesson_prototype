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
.PHONY: help install run catalog typecheck test test-e2e test-all mockups-sync mockups-check issues-sync \
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

test-e2e: node_modules/.package-lock.json ## Run browser end-to-end tests against fixture content
	$(NPM) exec -- playwright test

test-all: mockups-check test test-e2e ## Run mockup parity, unit/component and end-to-end tests

mockups-sync: node_modules/.package-lock.json ## Copy every docs/mockups .puml source into its SPEC.md code fence
	$(NODE) scripts/mockups.ts sync

mockups-check: node_modules/.package-lock.json ## Fail on stale, missing or orphaned SPEC mockup fences or non-source files
	$(NODE) scripts/mockups.ts check

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

briefs-missing: node_modules/.package-lock.json ## Generate missing supported briefs serially; report skips and failures
	$(NODE) generator/cli.ts briefs-missing

sample-briefs: ## (P1-06) Prepare the first-ten fr/A1 grammar and vocabulary briefs
	$(call not_yet,P1-06)

generate: ## (P1-07) Generate missing brief and content: make generate ID=<lesson-id>
	$(call not_yet,P1-07)

generate-missing: ## (P1-07) Generate all missing supported briefs and content
	$(call not_yet,P1-07)

sample-lessons: ## (P1-08) Generate the twenty approved sample lessons
	$(call not_yet,P1-08)
