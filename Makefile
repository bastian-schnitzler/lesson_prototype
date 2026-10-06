# Lesson prototype workflow. Every task runs through make (SPEC "Makefile workflow").

# ---- user configuration -----------------------------------------------------
# Command that opens a URL: a command on PATH (xdg-open, firefox, wslview) or a
# full path, which may contain spaces. Windows programs are not on the WSL PATH
# unless their folder is, so use the full /mnt/c/... path for Windows Firefox.
BROWSER_CMD ?= /mnt/c/Program Files/Mozilla Firefox/firefox.exe
PORT ?= 5173
# ------------------------------------------------------------------------------

NODE ?= node
NPM ?= npm

.DEFAULT_GOAL := help
.PHONY: help install run catalog typecheck test test-e2e test-all mockups-sync mockups-check issues-sync \
	build brief briefs-missing sample-briefs generate generate-missing sample-lessons

help: ## Show available targets, arguments and configuration
	@echo "Lesson prototype — make targets"
	@echo
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo
	@echo "Configuration (edit the top of the Makefile or override on the command line):"
	@echo "  BROWSER_CMD=$(BROWSER_CMD)   command used by 'make run' to open the app"
	@echo "  PORT=$(PORT)                 local HTTP port for 'make run'"
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

issues-sync: node_modules/.package-lock.json ## Refresh GitHub milestones/issues from SPEC/ISSUES (DRY_RUN=1 to preview; needs gh)
	$(NODE) scripts/issues-sync.ts $(if $(DRY_RUN),--dry-run,)

# ---- targets introduced by later issues: fail clearly until implemented ------

define not_yet
	@echo "error: 'make $@' is not implemented yet; it arrives with $(1)." >&2
	@exit 1
endef

build: ## (P1-02) Build dist/ for GitHub Pages
	$(call not_yet,P1-02)

brief: ## (P1-05) Generate a missing brief: make brief ID=<lesson-id>
	$(call not_yet,P1-05)

briefs-missing: ## (P1-05) Generate all missing supported briefs
	$(call not_yet,P1-05)

sample-briefs: ## (P1-06) Prepare the first-ten fr/A1 grammar and vocabulary briefs
	$(call not_yet,P1-06)

generate: ## (P1-07) Generate missing brief and content: make generate ID=<lesson-id>
	$(call not_yet,P1-07)

generate-missing: ## (P1-07) Generate all missing supported briefs and content
	$(call not_yet,P1-07)

sample-lessons: ## (P1-08) Generate the twenty approved sample lessons
	$(call not_yet,P1-08)
