# System Status and Window State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live system metrics, window transparency, persistent app state, a smaller Compact View, and correct GitHub commit attribution.

**Architecture:** `src/system-metrics.js` owns PowerShell and `nvidia-smi` sampling plus threshold normalization. `src/window-state.js` owns a local JSON state file and visible-display bounds correction. Main-process IPC exposes both services; the renderer only renders snapshots and settings controls.

**Tech Stack:** Electron 37, Node.js built-ins, PowerShell, NVIDIA `nvidia-smi`, Node test runner.

## Global Constraints

- CPU/MEM use Windows PowerShell; GPU/TEMP use `nvidia-smi`; unavailable values render `--`.
- Metric update cadence follows the existing 1–60 second refresh interval.
- Transparency range is 40–100%, default 100%.
- Persist bounds, language, refresh interval, opacity, and minimum mode locally.
- New Japanese text is edited with `apply_patch` and verified for mojibake.
- Future Quota Glance commits use `volcane.gd@gmail.com`; existing public history is rewritten only after app verification.

---

### Task 1: System metric service

**Files:**
- Create: `src/system-metrics.js`
- Test: `test/system-metrics.test.js`

**Interfaces:**
- Produces `collectSystemMetrics(): Promise<{gpu:number|null,cpu:number|null,mem:number|null,temp:number|null}>` and `metricTone(kind,value): 'good'|'warning'|'critical'|'unknown'`.

- [ ] Write failing tests for unavailable values and CPU/GPU/temperature thresholds.
- [ ] Run `node --test test/system-metrics.test.js` and confirm failure because the module is absent.
- [ ] Implement PowerShell metric parsing, optional `nvidia-smi` parsing, and threshold normalization.
- [ ] Re-run `node --test test/system-metrics.test.js` and confirm pass.

### Task 2: Persistent window state

**Files:**
- Create: `src/window-state.js`
- Modify: `main.js`
- Test: `test/window-state.test.js`

**Interfaces:**
- Produces `loadWindowState(filePath)` and `saveWindowState(filePath,state)`.
- Main IPC exposes `app:get-preferences`, `app:set-preferences`, and `system:get-metrics`.

- [ ] Write failing tests for default state, valid saved state, and invalid bounds normalization.
- [ ] Run `node --test test/window-state.test.js` and confirm failure because the module is absent.
- [ ] Implement JSON persistence and main-process bounds/opacity restoration and save events.
- [ ] Re-run `node --test test/window-state.test.js` and confirm pass.

### Task 3: Renderer status and settings

**Files:**
- Modify: `preload.js`, `renderer/index.html`, `renderer/renderer.js`, `renderer/styles.css`, `scripts/screenshot-preload.js`
- Test: `test/renderer-contract.test.js`

- [ ] Add failing renderer contract assertions for Status Strip, opacity slider, and Compact View selectors.
- [ ] Run `node --test test/renderer-contract.test.js` and confirm failure.
- [ ] Implement status rendering, metric tone colors, opacity slider, localized labels, and smaller Compact View spacing/type.
- [ ] Re-run `node --test test/renderer-contract.test.js` and confirm pass.

### Task 4: Validation, release, and attribution

**Files:**
- Modify: `package.json`, `package-lock.json`, `README.md`, `CHANGELOG.md`, `RELEASE_NOTES.md`

- [ ] Run syntax checks, all tests, mojibake scan, rendered Electron screenshots, and portable build.
- [ ] Set the repository-local author and committer email to `volcane.gd@gmail.com`.
- [ ] Rewrite the four existing Quota Glance commits with that email, verify log output, and force-push `main`.
- [ ] Publish the validated portable build as the next GitHub release and update the product site.
