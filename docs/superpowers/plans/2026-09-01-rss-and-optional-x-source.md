# RSS and Optional X Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Google Alerts RSS the default reset-advisory source and add an opt-in, encrypted local X API source.

**Architecture:** The GitHub Action converts the secret RSS feed into the existing public-safe identifier feed. The Electron main process owns optional direct-X fetching and encrypted token storage; the renderer controls it through token-status IPC only.

**Tech Stack:** Electron 37, Node.js built-ins, GitHub Actions, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-01-rss-and-optional-x-source-design.md`

## Global Constraints

- Public feed events contain only `postId` and `detectedAt`.
- Google RSS and X credentials never enter source control, public JSON, renderer state, logs, or release notes.
- VOLCANE commits use `VOLCANE <volcane.gd@gmail.com>`.

---

### Task 1: RSS collector

**Files:** `scripts/update-reset-feed.js`, `.github/workflows/update-reset-feed.yml`, `test/reset-feed-script.test.js`, `test/reset-feed-workflow.test.js`

- [ ] Write failing tests for Atom/RSS link extraction, source-account filtering, and safe feed output.
- [ ] Run the focused tests and confirm they fail because RSS collection is absent.
- [ ] Implement XML entry extraction and safe identifier-only output from `GOOGLE_ALERT_RSS_URL`.
- [ ] Run focused tests and confirm they pass.

### Task 2: Optional local X source

**Files:** `src/reset-feed.js`, `src/x-api-source.js`, `src/secure-token-store.js`, `main.js`, `preload.js`, `test/reset-feed.test.js`, `test/x-api-source.test.js`, `test/secure-token-store.test.js`

- [ ] Write failing tests for encrypted token round-trip, redacted status, direct-source normalization, and RSS fallback.
- [ ] Run the focused tests and confirm they fail because the modules are absent.
- [ ] Implement the secure token store, direct X reader, and status-only IPC.
- [ ] Run focused tests and confirm they pass.

### Task 3: Settings UI and documentation

**Files:** `renderer/index.html`, `renderer/renderer.js`, `renderer/styles.css`, `README.md`, `PRIVACY.md`, `RELEASE_NOTES.md`, `CHANGELOG.md`, `test/renderer-contract.test.js`

- [ ] Write failing renderer-contract tests for opt-in source controls and absence of secret-return IPC.
- [ ] Implement bilingual source controls, status, save, test, and removal actions.
- [ ] Update documentation to state RSS default and optional encrypted local X token.
- [ ] Run all tests and inspect the UI.

### Task 4: Publication

**Files:** `package.json`, `package-lock.json`, portfolio Quota Glance page and What's New

- [ ] Bump patch version, build EXE and checksum, and run all tests.
- [ ] Push source, tag, and create a verified GitHub release.
- [ ] Update the portfolio page and What's New, deploy Cloudflare Pages, and verify live URLs.
