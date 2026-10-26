# macOS Sticky Interactivity Fix & Comfy Strikethrough Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the macOS desktop sticky note interactivity bug (removing `type: 'desktop'` and adding `acceptFirstMouse: true` so clicks interact with the Sticky Note in 1 click without triggering macOS "Click wallpaper to reveal desktop") and replace utilitarian checkboxes with a cute, clickable row featuring a smooth animated comfy strikethrough line (`comfy-line`).

**Architecture:**
1. In `src/main/index.ts`, remove `type: process.platform === 'darwin' ? 'desktop' : undefined` from `createStickyWindow()` and add `acceptFirstMouse: true` and `focusable: true` while keeping `alwaysOnTop: false` and `skipTaskbar: true`.
2. In `src/sticky/index.html`, `src/sticky/sticky.ts`, `src/dashboard/index.html`, and `src/dashboard/dashboard.ts`, remove `<input type="checkbox">` from quest items. Instead, render each quest item with a cute bullet (`<span class="quest-bullet">✦</span>`), a text container `<span class="quest-text">...<span class="comfy-line"></span></span>`, and attach the click listener to the `.quest-item` row (ignoring clicks on `.quest-delete`).
3. Update `tests/assetsIntegration.test.ts` to verify that `createStickyWindow` does NOT use `type: 'desktop'`, uses `acceptFirstMouse: true`, and that `src/sticky/index.html` and `src/dashboard/index.html` include `.comfy-line` styling.

**Tech Stack:** Electron, TypeScript, HTML/CSS, Vitest, Prettier.

---

### Task 1: Fix macOS Sticky Window Layering & Add Comfy Strikethrough Line

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/sticky/index.html`
- Modify: `src/sticky/sticky.ts`
- Modify: `src/dashboard/index.html`
- Modify: `src/dashboard/dashboard.ts`
- Modify: `tests/assetsIntegration.test.ts`

- [ ] **Step 1: Add failing assertions in `tests/assetsIntegration.test.ts`**

Add a test in `tests/assetsIntegration.test.ts` verifying:
- `src/main/index.ts` contains `acceptFirstMouse: true` and does NOT contain `'desktop'` window type in `createStickyWindow`.
- `src/sticky/index.html` and `src/dashboard/index.html` contain `.comfy-line` CSS class for the animated strikethrough bar.
- `src/sticky/sticky.ts` and `src/dashboard/dashboard.ts` render `comfy-line` instead of `input[type="checkbox"]`.

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run tests/assetsIntegration.test.ts < /dev/null`
Expected: FAIL

- [ ] **Step 3: Update `src/main/index.ts`, `src/sticky/*`, and `src/dashboard/*`**

1. In `src/main/index.ts` (`createStickyWindow`):
   - Remove `type: process.platform === 'darwin' ? 'desktop' : undefined`.
   - Set `acceptFirstMouse: true`, `focusable: true`, `alwaysOnTop: false`, `skipTaskbar: true`, `fullscreenable: false`.
2. In `src/sticky/index.html` & `src/sticky/sticky.ts`:
   - Make `.quest-item` have `cursor: pointer; position: relative;` and click handler on `row` (when `!(e.target as HTMLElement).closest('.quest-delete')`) that calls `window.usagiAPI?.toggleReminder(item.id)`.
   - Replace checkbox with `<span class="quest-bullet">${item.completed ? '🍮' : '✦'}</span>`.
   - Inside `.quest-text`, append `<span class="comfy-line"></span>` styled as a rounded 3px horizontal pill bar (`height: 3px; border-radius: 999px; background: var(--accent-color); position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 0%; transition: width 0.28s cubic-bezier(0.34, 1.56, 0.64, 1); pointer-events: none;`) and `.quest-item.completed .comfy-line { width: 100%; }`.
3. In `src/dashboard/index.html` & `src/dashboard/dashboard.ts`:
   - Apply the same clickable `.quest-item` row, `<span class="quest-bullet">`, and `.comfy-line` animated strikethrough instead of `<input type="checkbox">`.

- [ ] **Step 4: Run tests, typecheck, format, and build**

Run:
```bash
CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run < /dev/null
CI=true GIT_TERMINAL_PROMPT=0 npx --no-install -p typescript tsc --noEmit --pretty false < /dev/null
CI=true GIT_TERMINAL_PROMPT=0 npm run build < /dev/null
npx --no-install prettier --write src/main/index.ts src/sticky/sticky.ts src/dashboard/dashboard.ts tests/assetsIntegration.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/main/index.ts src/sticky/index.html src/sticky/sticky.ts src/dashboard/index.html src/dashboard/dashboard.ts tests/assetsIntegration.test.ts docs/superpowers/plans/2026-10-26-macos-sticky-interactivity-and-comfy-line.md
git commit -m "fix(sticky): enable macOS click interaction and replace checkboxes with comfy strikethrough line"
```
