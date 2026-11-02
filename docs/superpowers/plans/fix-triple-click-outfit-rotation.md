# Triple-Click Outfit Rotation Preservation Plan (`fix-triple-click-outfit-rotation`)

**Baseline Commit (`BASE_SHA`)**: `ff963a5aec9b63367c29dda78b429cd65546e081`

## 1. Root Cause Analysis (`systematic-debugging`)

- **Symptom**: Triple-clicking Usagi changes the appearance once, then changes the Outfit Rotation setting from `Auto-change (30m)` to `Fixed outfit` (`fixedAppearance: true`). Subsequent triple-clicks no longer change the outfit.
- **Data Flow Trace**:
  1. In `src/renderer/app.ts` (`handlePointerUp` line 387 and `onTriggerInteraction` line 671), when `state.comboClicks >= 3` and `!isFixedAppearance || currentCostumeSelection === 'random'`:
     - When `currentCostumeSelection` is `'classic'` (or any non-`'random'` costume while `isFixedAppearance === false`), renderer picks a new `currentCostumeId` and calls `window.usagiAPI?.setCostume(currentCostumeId)` (e.g., `'vest'`).
  2. `setCostume(selection)` in `src/main/index.ts:738` calls `resolveOutfitSelectionChange(selection, activeCostume)` in `src/core/costumeManager.ts:170`.
  3. `resolveOutfitSelectionChange` treats ANY non-`'random'` `selection` as a manual Dashboard wardrobe lock and returns `fixedAppearance: true`.
  4. `main/index.ts` sets `wardrobeRotation.fixedAppearance = true` and broadcasts `'fixed-appearance-toggle'` (`true`) back to all windows.
  5. On the next triple-click, `isFixedAppearance` is now `true` and `currentCostumeSelection` is `'vest'` (`!== 'random'`), so `!isFixedAppearance || currentCostumeSelection === 'random'` evaluates to `false` and the outfit is permanently locked!

## 2. Design & Contract Changes

1. **`src/core/costumeManager.ts`**:
   - Add a pure helper function `resolveComboOutfitRotation(currentCostume: CostumeId, currentSelection: OutfitSelection, fixedAppearance: boolean, randomFn: () => number = Math.random): { activeCostume: CostumeId; costumeSelection: OutfitSelection; fixedAppearance: boolean; changed: boolean }` (or support an options/preserve flag in `resolveOutfitSelectionChange` / dedicated helper):
     - If `fixedAppearance && currentSelection !== 'random'`, return `{ activeCostume: currentCostume, costumeSelection: currentSelection, fixedAppearance, changed: false }`.
     - Otherwise, pick a new random costume (`pickRandomCostume(currentCostume, randomFn)`), keep `fixedAppearance` unchanged (preserving `false` when in auto-rotation mode), and update `costumeSelection` to `currentSelection === 'random' ? 'random' : nextCostume`.
   - Also allow `resolveOutfitSelectionChange(selection, currentCostume, randomFn, preserveFixedAppearance?: boolean)` so if `preserveFixedAppearance` is passed as a boolean, `fixedAppearance` is preserved instead of forced to `true`.
2. **`src/main/index.ts` & `src/preload/index.ts` & `src/renderer/app.ts`**:
   - Update `setCostume(selection: OutfitSelection, preserveFixedAppearance?: boolean)` in `src/main/index.ts`, `ipcMain.on('set-costume', (_e, selection: OutfitSelection, preserveFixedAppearance?: boolean) => ...)`, and `window.usagiAPI.setCostume(costume: OutfitSelection, preserveFixedAppearance?: boolean)` in `src/preload/index.ts`.
   - When `preserveFixedAppearance` is `true` (used by triple-click combo in `src/renderer/app.ts`), `setCostume` preserves the current `wardrobeRotation.fixedAppearance` state instead of overwriting it to `true`, while still updating `activeCostume = normalizeCostumeId(selection)` (when `selection !== 'random'`) so the exact costume picked by the renderer and main process stay 100% synchronized!
   - Wait: Notice another subtle bug in `src/renderer/app.ts`:
     When `currentCostumeSelection === 'random'`, `app.ts` picks a random costume locally (`currentCostumeId = pickRandomCostume(currentCostumeId)`), and then on combo click calls `setCostume('random')`, which in `main/index.ts` calls `resolveOutfitSelectionChange('random', activeCostume)` and picks a *different* random costume in `main` and broadcasts it back!
     And even better: in `src/renderer/app.ts` lines 387-394 and 671-678, when triple-clicking:
     - If `currentCostumeSelection === 'random'`, lines 382-385 already picked a random costume on EVERY single click, and then lines 387-394 picked ANOTHER random costume and called `window.usagiAPI?.setCostume('random')`.
     - When `currentCostumeSelection !== 'random'` and `!isFixedAppearance`, triple-click picks `currentCostumeId = pickRandomCostume(currentCostumeId)` and calls `window.usagiAPI?.setCostume(currentCostumeId, true)` (with `preserveFixedAppearance = true`).
     - In `src/main/index.ts`, `setCostume(selection, preserveFixedAppearance)`:
       If `preserveFixedAppearance` is `true`, pass `wardrobeRotation.fixedAppearance` to `resolveOutfitSelectionChange(selection, activeCostume, Math.random, wardrobeRotation.fixedAppearance)`.

## 3. Step-by-Step TDD Execution Plan

### Step 1 (RED): Write Failing Tests in `tests/costumeManager.test.ts`
- Add unit tests in `tests/costumeManager.test.ts` under `describe('resolveOutfitSelectionChange', ...)`:
  1. Verify that calling `resolveOutfitSelectionChange('vest', 'classic', Math.random, false)` (when `preserveFixedAppearance` is `false`, i.e., auto-rotation mode is active during a triple-click combo) sets `activeCostume: 'vest'`, `costumeSelection: 'vest'`, and keeps `fixedAppearance: false` so subsequent triple-clicks continue to rotate outfits.
  2. Verify that calling `resolveOutfitSelectionChange('vest', 'classic')` (without `preserveFixedAppearance`, i.e., manual selection in Dashboard) still locks `fixedAppearance: true`.
  3. Verify a multi-step sequence of 3 consecutive triple-click outfit changes (`classic` -> `study` -> `vest` -> `star`) while `fixedAppearance === false`: every triple-click keeps `fixedAppearance === false` and never locks the wardrobe.
- Run `npx --no-install vitest run tests/costumeManager.test.ts` via the silent test wrapper and verify RED failure.

### Step 2 (GREEN): Implement Fix in `src/core/costumeManager.ts`, `src/preload/index.ts`, `src/main/index.ts`, and `src/renderer/app.ts`
- In `src/core/costumeManager.ts`:
  Update `resolveOutfitSelectionChange`:
  ```ts
  export function resolveOutfitSelectionChange(
    selection: OutfitSelection | string,
    currentCostume: CostumeId,
    randomFn: () => number = Math.random,
    preserveFixedAppearance?: boolean
  ): { costumeSelection: OutfitSelection; activeCostume: CostumeId; fixedAppearance: boolean } {
    if (selection === 'random') {
      const activeCostume = pickRandomCostume(currentCostume, randomFn);
      return {
        costumeSelection: 'random',
        activeCostume,
        fixedAppearance: false,
      };
    }

    const activeCostume = normalizeCostumeId(selection);
    return {
      costumeSelection: activeCostume,
      activeCostume,
      fixedAppearance: typeof preserveFixedAppearance === 'boolean' ? preserveFixedAppearance : true,
    };
  }
  ```
- In `src/preload/index.ts`:
  Update `UsagiAPI.setCostume` signature and implementation:
  ```ts
  setCostume: (costume: OutfitSelection, preserveFixedAppearance?: boolean) => void;
  ```
  and
  ```ts
  setCostume: (costume: OutfitSelection, preserveFixedAppearance?: boolean) => {
    ipcRenderer.send('set-costume', costume, preserveFixedAppearance);
  },
  ```
- In `src/main/index.ts`:
  Update `setCostume(selection: OutfitSelection, preserveFixedAppearance?: boolean)`:
  ```ts
  function setCostume(selection: OutfitSelection, preserveFixedAppearance?: boolean): void {
    const result = resolveOutfitSelectionChange(
      selection,
      activeCostume,
      Math.random,
      preserveFixedAppearance ? wardrobeRotation.fixedAppearance : undefined
    );
    costumeSelection = result.costumeSelection;
    activeCostume = result.activeCostume;
    wardrobeRotation = {
      ...wardrobeRotation,
      fixedAppearance: result.fixedAppearance,
      elapsedMs: 0,
    };
    broadcastToAllWindows('costume-changed', activeCostume, costumeSelection);
    broadcastToAllWindows('fixed-appearance-toggle', wardrobeRotation.fixedAppearance);
    updateTrayMenu();
    saveSettingsToDisk();
  }
  ```
  And in `ipcMain.on('set-costume', (_e, selection: OutfitSelection, preserveFixedAppearance?: boolean) => ...)`:
  ```ts
  ipcMain.on(
    'set-costume',
    (_e, selection: OutfitSelection, preserveFixedAppearance?: boolean) => {
      if (isKnownOutfitSelection(selection)) {
        setCostume(selection, Boolean(preserveFixedAppearance));
      }
    }
  );
  ```
- In `src/renderer/app.ts`:
  In both `handlePointerUp` (around line 391) and `window.usagiAPI.onTriggerInteraction` (around line 675), pass `true` for `preserveFixedAppearance`:
  ```ts
  window.usagiAPI?.setCostume(
    currentCostumeSelection === 'random' ? 'random' : currentCostumeId,
    true
  );
  ```

### Step 3: Format, Typecheck, Full Test Suite & Build
- Run typecheck: `npx --no-install -p typescript tsc --noEmit --pretty false`
- Run full test suite: `npx --no-install vitest run`
- Run build: `npm run build`
- Run prettier on modified files: `npx --no-install prettier --write src/core/costumeManager.ts src/preload/index.ts src/main/index.ts src/renderer/app.ts tests/costumeManager.test.ts`

### Step 4: Anti-Cheat QA & Commit
- Perform a quick mutation check to verify the new test fails if `preserveFixedAppearance` is ignored, then revert the mutation immediately.
- Stage and commit with message: `fix(wardrobe): preserve outfit auto-rotation state on triple-click combo`

## 4. Review Focus (Top 5 Edge Cases)
1. **Repeated Triple-Clicks in Auto-Change Mode (`fixedAppearance === false`)**: First, second, third, and Nth triple-click all rotate outfits without flipping `fixedAppearance` to `true`.
2. **Manual Wardrobe Click in Dashboard**: Clicking a specific outfit button in the Dashboard calls `setCostume(target)` without `preserveFixedAppearance`, which still intentionally sets `fixedAppearance = true` (manual lock).
3. **Triple-Click When `Fixed Outfit` Is Explicitly Enabled (`fixedAppearance === true`)**: When the user explicitly toggled `Fixed outfit` (and `costumeSelection !== 'random'`), triple-clicking Usagi does NOT change the outfit.
4. **Triple-Click in `Random` Outfit Selection Mode (`costumeSelection === 'random'`)**: Keeps `costumeSelection === 'random'` and `fixedAppearance === false`.
5. **Cross-Window & Disk Persistence**: `saveSettingsToDisk()` and `fixed-appearance-toggle` broadcasts remain accurate after both triple-click combos and Dashboard manual selections.
