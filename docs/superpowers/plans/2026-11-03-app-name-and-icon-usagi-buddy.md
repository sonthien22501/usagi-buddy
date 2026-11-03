# Plan: Rename App to 'Usagi Buddy' and Apply Usagi Logo Icon

## Objective
1. Change the application product name from `Usagi-Float` to `Usagi Buddy` in `package.json` and build configs.
2. Generate native macOS `.icns` (and Windows/Linux compatible `.png`/`.ico`) using `assets/Usagi_logo.png` via macOS `sips` and `iconutil`, saving to `build/icon.icns` and `build/icon.png`.
3. Configure `package.json` with the new icon paths and product name.
4. Verify tests pass (`vitest`, `tsc`).
5. Build the local macOS ARM64 `.dmg` installer using `npx electron-builder --mac --arm64 -c.mac.identity=null --publish never`.
6. Verify code signature using `codesign --verify --deep --strict`.

---

## Steps

### 1. Generate macOS Iconset & `.icns`
From `assets/Usagi_logo.png`:
- Create `build/icon.iconset/`.
- Use `sips -z <h> <w>` to generate:
  - `icon_16x16.png` (16x16)
  - `icon_16x16@2x.png` (32x32)
  - `icon_32x32.png` (32x32)
  - `icon_32x32@2x.png` (64x64)
  - `icon_128x128.png` (128x128)
  - `icon_128x128@2x.png` (256x256)
  - `icon_256x256.png` (256x256)
  - `icon_256x256@2x.png` (512x512)
  - `icon_512x512.png` (512x512)
  - `icon_512x512@2x.png` (1024x1024)
- Run `iconutil -c icns build/icon.iconset -o build/icon.icns`.
- Also generate `build/icon.png` (512x512) for universal fallback.
- Remove `build/icon.iconset/`.

### 2. Update `package.json`
- Update `"productName"`: `"Usagi Buddy"`.
- Ensure `build` specifies:
  - `"icon": "build/icon.png"`
  - `"mac": { "icon": "build/icon.icns", ... }`
- Keep `"afterPack": "scripts/afterPack.js"` intact.
- Keep `"version": "0.6.2"`.

### 3. Verify Tests & Build
- `CI=true GIT_TERMINAL_PROMPT=0 npm run build`
- `CI=true GIT_TERMINAL_PROMPT=0 npx --no-install vitest run`
- `CI=true GIT_TERMINAL_PROMPT=0 ./node_modules/.bin/tsc --noEmit`

### 4. Package Local DMG
- Run:
  `CI=true GIT_TERMINAL_PROMPT=0 npx electron-builder --mac --arm64 -c.mac.identity=null --publish never`
- Verify signature:
  `codesign --verify --deep --strict "release/mac-arm64/Usagi Buddy.app"`

---

## DoD (Definition of Done)
1. `build/icon.icns` exists and is valid.
2. `package.json` has `"productName": "Usagi Buddy"` and `"icon"` pointing to `build/icon.icns`.
3. Vitest (209 tests) and `tsc` pass cleanly.
4. Packaging succeeds without error, triggering `scripts/afterPack.js` ad-hoc signing.
5. Strict codesign verification passes on the built `.app`.
6. Output `.dmg` exists in `release/`.
