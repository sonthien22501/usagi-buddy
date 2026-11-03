# Handoff: Review Brief for Argon / Opus 5.5

**Written by:** `opencode/deepseek-v4.1-flash-free` (free tier, zero Google quota)
**Date:** 2026-11-03
**Work under review:** branch `fix/v0.6.1-locale-persistence` off `25a69a8`
**Companion plan:** `docs/superpowers/plans/2026-11-03-locale-persistence-and-autosave-ux-deepseek-v41-flash-free.md`

This is a **review brief**, not a summary. It states what was claimed, what could not be proven,
and where I expect a stronger model to disagree. Please attack the claims rather than restate them.

---

## 1. Context in one paragraph

Owner reported: (a) changing language in the Dashboard does not survive an app restart, (b) the
`💾 Save All Settings` button at the bottom is poor UX and is redundant because settings auto-apply.
PR #30 (`f12e2ab`) had attempted both, was auto-merged unreviewed by Gemini 3.8 Flash, and was
reverted wholesale in `25a69a8` with no recorded reason. This branch re-fixes both.

## 2. Claims made — each is falsifiable

| # | Claim | How it was tested |
| --- | --- | --- |
| C1 | The locale bug **does not reproduce** on `25a69a8` — both the main-process IPC path and the Dashboard `<select>` handler persist correctly. | Real app driven over CDP (`--remote-debugging-port=9222`): `setLocale('ko')` → disk `"locale":"ko"`; restart → `getLocale()` → `ko`. |
| C2 | `electron dist/main/index.js` names the app `Electron` unless `app.setName()` runs, so `userData` defaults to `~/Library/Application Support/Electron`. | Probe script: `app.getPath('userData')` with and without `setName`. |
| C3 | Two divergent settings files existed on the owner's machine, which is what "settings randomly revert" looks like. | Directory listing of `~/Library/Application Support/{usagi-buddy,Electron}`. |
| C4 | PR #30 already contained the correct root-cause fix (`app.setPath('userData', canonical)`), bundled with an unrelated Save-button rewrite. The revert destroyed the good half. | `git show f12e2ab -- src/main/index.ts`. |
| C5 | Pinning the userData root makes reads and writes deterministic regardless of launch method. | Ran the app post-fix; state files written only to `usagi-buddy`; seeded `"locale":"ja"` survived a boot cycle. |

**C1 is the claim to scrutinise hardest.** See §4.

## 3. Deliberate design decisions that are arguable

1. **Deleting the Save button instead of keeping it.** Rationale: every setting already persists on
   change, so the button persisted nothing new. Replaced with a 1.2 s `✓ Saved` pill in the header.
   Counter-argument worth considering: an explicit affordance gives users a sense of control, and a
   passive pill may be missed entirely. The alternative design (an "unsaved changes" state) was
   rejected because nothing is ever unsaved — it would be a lie. Disagree if you think the button
   had residual value for the profile fields as a batch-confirm.
2. **Helper lives in `src/core/settingsStore.ts` as pure string handling**, not in `src/main/`.
   Because `src/core/` is bundled into `platform: 'browser'` renderer bundles, it must not import
   `node:path` — that import was worker round 1's build break. See §5.
3. **`dash.config.saveBtn` / `savedToast` i18n keys retained even though now unused.** Avoids
   churning 16 dictionary entries. Slight dead-key debt.

## 4. Where I am least confident

- **I never reproduced the owner's exact symptom.** On `25a69a8` the language persisted in every
  test I ran. So C1 may be a statement about *my environment*, not theirs. Plausible alternative
  explanations I did **not** rule out:
  - The owner tested while #30 was merged (before the revert), and the symptom is already gone.
  - The owner ran a **packaged** `.app` (`productName: Usagi-Float`) at some point, producing a
    third userData root (`~/Library/Application Support/Usagi-Float`). That directory does not
    exist on this machine now, but I did not audit release history.
  - The owner closed the terminal with Ctrl+C before the renderer's IPC flushed. I consider this
    unlikely because `set-locale` writes synchronously in the main process, but it is untested
    under an actual SIGINT mid-change.
- **I did not test the packaged build.** All runtime verification used `electron dist/main/index.js`.
  `electron-builder` packaging changes `app.getName()`/`appData` behaviour and deserves its own pass.
- **I did not test on Windows**, where `appData` is `%APPDATA%` and separators differ. The helper's
  Windows test case is a string test only, not a runtime test.

## 5. Process failure worth studying

Worker round 1 reported: *"vitest 17 files / 208 tests PASS, tsc clean, prettier applied."* All
literally true. It also added `import * as path from 'node:path'` to a module that also bundles for
the browser, so `npm run build` failed with `Could not resolve "node:path"`.

The worker never ran the build because **the plan's DoD did not name `npm run build` as a gate** —
it named `vitest` + `tsc` + `prettier`, mirroring `ARCHITECTURE.md` §2. For this repo that is an
incomplete gate set: `tsc --noEmit` cannot detect a bundling-platform error. That is a defect in my
plan, not only in the worker. `ARCHITECTURE.md` §2 should be corrected.

## 6. How to reproduce the investigation (no tooling left behind)

The CDP harness was deleted. To rebuild it: raw WebSocket over `net` + `crypto`, handshake to
`http://127.0.0.1:9222/json/list`, then `Runtime.evaluate` with `awaitPromise: true`. Node 20 has no
global `WebSocket` and neither `ws` nor Python `websockets` is installed on this machine.

Useful expressions once connected:
- `window.usagiAPI.getLocale()`
- `window.usagiAPI.setLocale('ja')`
- `window.usagiAPI.openDashboardWindow()` — the Dashboard is lazily created, so it is absent from
  `/json/list` until this is called.
- to drive the real `<select>`:
  `(function(){const e=document.getElementById('buddy-language-select');e.value='ko';e.dispatchEvent(new Event('change',{bubbles:true}));return e.value})()`

## 7. Open questions for the reviewer

1. Given C1 (no repro on HEAD), is pinning the userData root the *right* fix for the reported
   symptom, or a neighbouring fix that leaves the real cause untouched? If the latter, what test
   would force the real cause to show itself?
2. Is deleting the Save button acceptable, or should the batch-confirm affordance return in a
   slimmer form?
3. `migrateLegacyUserData()` still treats `~/Library/Application Support/Electron` as a migration
   source. Deleting the canonical settings file therefore resurrects the November-2 state
   (`costumeSelection: study`, `fixedAppearance: true`). Should that legacy source be removed now
   that the root is pinned, or retained as a rollback path?
4. Should `ARCHITECTURE.md` §2 add `npm run build` to the canonical command list (see §5)?
