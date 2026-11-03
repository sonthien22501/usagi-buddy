# Locale Persistence Hardening & Auto-Save UX

**Author model:** `opencode/deepseek-v4.1-flash-free` (OpenCode standalone — no Antigravity lead)
**Date:** 2026-11-03
**Base commit:** `25a69a8` (revert of #30)
**Status:** Diagnosis complete → implementation pending

> Kept deliberately as a record of what a free-tier lead can and cannot do, for later
> comparison against Argon / Opus 5.5 runs on the same task. See `## Self-Assessment` at the end.

---

## 1. Reported Symptoms

1. Changing language in the Dashboard does not survive closing `npm start`; it reverts to the
   system locale on the next launch. Other settings "mostly" persist.
2. The `💾 Save All Settings` button at the bottom of the Dashboard is poor UX. Settings already
   auto-apply on change, so the button is redundant. Owner wants either a saved-state indicator
   or removal.

Context: PR #30 (`f12e2ab`) attempted both problems, was auto-merged without review, then
reverted wholesale in #31 (`25a69a8`) with **no recorded reason**.

---

## 2. Evidence Gathered (nothing assumed)

Method: real app driven over the Chrome DevTools Protocol at
`--remote-debugging-port=9222`, real renderer, real IPC, real disk.

| Test | Result |
| --- | --- |
| `detectSystemLocale()` on this machine | `vi` — identical to the on-disk value, so a stale `vi` is indistinguishable from a default |
| `app.getPath('userData')` via `electron <script>` **with** `app.setName` | `~/Library/Application Support/usagi-buddy` |
| Same **without** `app.setName` | `~/Library/Application Support/Electron` ← **default is `Electron`** |
| Settings files present on disk | **Two**: `usagi-buddy/usagi-settings.json` **and** `Electron/usagi-settings.json` |
| Do the two files agree? | **No.** `costumeSelection` classic vs study, `fixedAppearance` false vs true |
| Renderer → `usagiAPI.setLocale('ko')` | `getLocale()` → `ko`, disk → `"locale": "ko"` ✅ |
| Dashboard `<select id="buddy-language-select">` change event | disk → `"locale": "ko"` ✅ |
| Full restart after saving `ja` | `getLocale()` → `ja` ✅ |

### Verdict

**The locale bug does not reproduce on current HEAD.** Both persistence paths — main-process IPC
and the Dashboard DOM handler — write and rehydrate correctly.

Two real defects nevertheless exist and explain the symptom historically:

- **D1 — Split userData roots.** `electron <dist/main/index.js>` defaults the app name to
  `Electron`. Only `app.setName('usagi-buddy')` moves `userData` to the `usagi-buddy` root. Any
  run where that call did not take effect (older build, or `dist/` built before the fix) wrote a
  **second, independent** settings file. Two files with divergent content exist on disk right now,
  which is exactly what "my settings randomly revert" looks like.
- **D2 — #30's good half was thrown away with its bad half.** `f12e2ab` added
  `app.setPath('userData', canonicalUserData)` — the correct fix for D1 — bundled with a Save-button
  redesign and a `triggerSaveAllSettings()` rewrite. The revert removed all of it, so D1 is
  unprotected again and the locale-loss can return the moment a run resolves to the
  `Electron` root.

---

## 3. Scope

Two surgical fixes. No refactors, no speculative abstractions.

### Fix A — Pin the userData root (anti-D1)

Re-apply **only** the canonical-path half of #30, as a pure, testable helper.

1. `src/core/settingsStore.ts` — add:
   ```ts
   export function resolveCanonicalUserDataPath(appDataDir: string): string;
   ```
   Returns `path.join(appDataDir, 'usagi-buddy')`. Pure: no `electron` import, no `app` access.
   Normalises trailing separators so `/a/b/` and `/a/b` yield the same result.
2. `src/main/index.ts` — inside the existing `try { app.setName(...) }` block:
   ```ts
   app.setName('usagi-buddy');
   app.setPath('userData', resolveCanonicalUserDataPath(app.getPath('appData')));
   ```
   Do **not** touch `migrateLegacyUserData()`'s file list; `Electron` and `Usagi-Float` are already
   migrated from and must stay migrated from.

### Fix B — Delete the Save button, add a passive auto-save indicator (anti-symptom-2)

Settings already persist on change; the button only duplicates that. Subtraction by default.

1. `src/dashboard/index.html`
   - Delete the whole `<!-- 4. Save All Settings Action Bar -->` block, including
     `#save-all-settings-btn`.
   - Add a status pill in the Dashboard **header**, near the title:
     `<span id="autosave-status" class="autosave-pill" aria-live="polite"></span>`
   - Add CSS for `.autosave-pill`: inline-flex, `gap: 6px`, `font-size: 11px`, `font-weight: 700`,
     `border-radius: 999px`, `padding: 3px 10px`, `opacity: 0`, `transition: opacity 180ms ease`.
     Use theme CSS vars already in the file — do not hardcode new colours. Add an
     `.autosave-pill[data-visible='true'] { opacity: 1 }` rule. Respect
     `@media (prefers-reduced-motion: reduce)` if such a block already exists.
   - Minimum contrast 4.5:1 in **both** Custard (day) and Caramel (night) themes.
2. `src/dashboard/dashboard.ts`
   - Remove the `saveAllSettingsBtn` click listener and the `saveAllSettingsBtn` /
     `saveBtnIcon` / `saveBtnText` element lookups and the `dataset.saving` dance.
   - Add `function flashSavedToast(): void` — sets the pill's text to
     `t(currentLocale, 'dash.config.autosaved')`, sets `data-visible='true'`, and clears it after
     1200 ms via a stored timer id so rapid changes do not stack.
   - Call `flashSavedToast()` after **every** successful persist: language change, nickname,
     birthday day/month, country, and each mode toggle that already sends IPC.
   - `renderLocaleUI()` — replace the `saveAllSettingsBtn.textContent` line with a no-op removal;
     the pill text is set at flash time, not at render time.
   - Keep `window.usagiAPI.saveAllSettings` in the preload: it is a public IPC surface and other
     windows may use it. Do not delete it.
3. `src/core/i18n.ts` — add one new key to **all 8 locales**:
   `'dash.config.autosaved'` → e.g. `'✓ Saved'` / `'✓ Đã lưu'` / `'✓ Gespeichert'` /
   `'✓ Enregistré'` / `'✓ Guardado'` / `'✓ 保存済み'` / `'✓ 저장됨'` / `'✓ 已保存'`.
   Keep the existing `dash.config.saveBtn` / `savedToast` keys in place — removing them would
   churn 16 dictionary entries for no gain.

---

## 4. TDD Steps (strict RED → GREEN)

1. **RED** — `tests/settingsStore.test.ts`: assert `resolveCanonicalUserDataPath('/tmp/appData')`
   === `/tmp/appData/usagi-buddy`, and that a trailing-slash input gives the same result.
   Run it, confirm it fails because the export does not exist.
2. **GREEN** — implement the helper; re-run.
3. **RED** — `tests/i18n.test.ts`: extend the existing all-8-locales label test to also require a
   non-empty `dash.config.autosaved` for every locale. Confirm failure.
4. **GREEN** — add the key to all 8 dictionaries; re-run.
5. **UI** — apply Fix B in `index.html` + `dashboard.ts`.
6. **Verify** — `npx --no-install vitest run`, `npx --no-install -p typescript tsc --noEmit --pretty false`, `npx --no-install prettier --write "src/**/*.ts" "tests/**/*.ts"`.

---

## 5. Definition of Done

- [x] `resolveCanonicalUserDataPath` exported, pure, covered by tests.
- [x] `app.setPath('userData', ...)` wired in `main/index.ts` at module load, before `whenReady`.
- [x] No `save-all-settings-btn` reference remains anywhere in `src/`.
- [x] `#autosave-status` pill appears in the Dashboard header, visible for ~1200 ms after a change.
- [x] New i18n key present in all 8 locales; all-locale test enforces it.
- [x] Full suite green (**17 files / 209 tests**, was 205 at `25a69a8`); typecheck clean; prettier applied.
- [x] Zero edits to unrelated code. No new dependencies.

## 5a. Lead Sign-Off Evidence (independently verified)

| Gate | Command | Result |
| --- | --- | --- |
| Bundle (authoritative) | `CI=true npm run build` | ✅ passed (failed in worker round 1 — see 6a) |
| Tests | `CI=true npx --no-install vitest run` | ✅ 17 files / **209 passed** |
| Types | `tsc --noEmit --pretty false` | ✅ clean |
| Contrast of pill | `--badge-bg #ffe699` on `--badge-text #5c3a21` | ✅ **8.18:1** (computed, not asserted) |
| Write root at runtime | app writes Chromium/state files | ✅ `~/Library/Application Support/usagi-buddy` only; `Electron` root untouched |
| Save round-trip | seed disk `ja` → boot app → inspect disk | ✅ stayed `ja`; file rewritten by the app during boot, so hydrate → persist both hit the canonical root |

Note: the app has a **single theme** (`data-theme="custard"`). The Caramel/night theme referenced in
`ARCHITECTURE.md` no longer exists in `src/` — see the pre-existing
`docs/superpowers/plans/2026-11-02-remove-dark-mode.md`. The original "verify both themes"
requirement was therefore vacuous; the worker reported this instead of inventing a second theme.

Residual: `~/Library/Application Support/Electron/usagi-settings.json` still exists with divergent
content (classic vs study costume). It is **not** fully dead data — correction to an earlier
imprecise claim:

- `getSettingsFilePath()` reads `app.getPath('userData')`, which the canonical pin now forces to
  `<appData>/usagi-buddy`. So the `Electron` copy is never read during normal operation. ✅
- **But** `migrateLegacyUserData()` still lists `appData/Electron` as a migration source and copies
  any file whose destination is missing. If `usagi-buddy/usagi-settings.json` is ever deleted or
  corrupted, the next launch silently resurrects the November-2 state
  (`costumeSelection: study`, `fixedAppearance: true`).

Decision needed from the owner: either delete the `Electron` folder (deterministic), or keep it
deliberately as a rollback snapshot and document that intent. Leaving it undocumented is the one
bad option.

## 6. Anti-Cheat Notes for the Worker

- Do **not** weaken or delete the existing 8-locale assertions; extend them.
- Do **not** mock the system under test. The helper must be tested directly.
- Do **not** add `try/catch` that swallows failures to make a test pass.
- Report the exact RED output and the exact GREEN output. If a test cannot be made to fail first,
  say so instead of pretending it went RED.
- If you hit the same error twice, stop and report — do not guess.

## 6a. Root-Cause Fix (Lead diagnosis after worker round 1)

**Failure:** `npm run build` fails with
`ERROR: Could not resolve "node:path"` at `src/core/settingsStore.ts:1:22`.

**Cause:** `scripts/build.mjs` bundles six entry points; `src/main/index.ts` and
`src/preload/index.ts` use `platform: 'node'`, while `src/renderer/app.ts`,
`src/dashboard/dashboard.ts`, `src/sticky/sticky.ts` and `src/tray/tray.ts` use
`platform: 'browser'`. All four browser bundles reach `src/core/settingsStore.ts`
transitively, so any `node:` import in a `src/core/` module breaks the browser build.
`tsc --noEmit` and `vitest` both pass, which is why the worker's self-check missed it —
**`npm run build` is the authoritative gate for this repo and must be in every DoD run.**

**Fix (required, no deviation):** drop the `node:path` import entirely and make the helper
dependency-free string handling that works for both POSIX and Windows separators:

```ts
export function resolveCanonicalUserDataPath(appDataDir: string): string {
  const trimmed = appDataDir.replace(/[\\/]+$/, '');
  return `${trimmed}/usagi-buddy`;
}
```

Keep the existing tests; they must still pass unchanged
(`/tmp/appData`, `/tmp/appData/`, `/tmp/appData///` → `/tmp/appData/usagi-buddy`).
Do not relax the trailing-separator assertions. Add one Windows case:
`resolveCanonicalUserDataPath('C:\\Users\\me\\AppData\\Roaming')` →
`C:\\Users\\me\\AppData\\Roaming/usagi-buddy`.

**Gate for this and every future round:** `CI=true npm run build` must succeed, not just
`tsc` + `vitest`.

## 7. Self-Assessment (for later Argon/Opus comparison)

What this run did well: refused to fix an unreproduced bug; built a real CDP harness; found the
split userData roots from artefacts on disk; isolated #30's good half from its bad half.

Where a stronger lead would likely differ: deciding whether D1 is *the* user's bug or merely a
neighbouring one; judging whether removing the button is right versus adding an explicit
"unsaved changes" affordance; and noticing the `Electron`-root residue sooner without a probe.
