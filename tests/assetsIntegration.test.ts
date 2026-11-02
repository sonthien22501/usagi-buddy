import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SOUND_ASSET_FILES } from '../src/core/soundManager';

describe('Usagi PNG and MP3 assets verification', () => {
  it('verifies all 6 Usagi PNG sprites exist in assets/ with valid RGBA PNG headers', () => {
    for (let i = 1; i <= 6; i++) {
      const filePath = path.resolve(__dirname, `../assets/Usagi${i}.png`);
      expect(fs.existsSync(filePath)).toBe(true);
      const buf = fs.readFileSync(filePath);
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf[2]).toBe(0x4e);
      expect(buf[3]).toBe(0x47);
      // IHDR width and height at bytes 16..23
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      expect(width).toBe(1170);
      expect(height).toBe(1560);
    }
  });

  it('verifies all 6 Usagi voice MP3 files exist in assets/ and are non-empty (>1000 bytes)', () => {
    for (const filename of SOUND_ASSET_FILES) {
      const filePath = path.resolve(__dirname, `../assets/${filename}`);
      expect(fs.existsSync(filePath)).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(1000);
    }
  });

  it('verifies Usagi_Big.png exists in assets/ with valid 736x736 RGBA PNG header', () => {
    const filePath = path.resolve(__dirname, '../assets/Usagi_Big.png');
    expect(fs.existsSync(filePath)).toBe(true);
    const buf = fs.readFileSync(filePath);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBe(736);
    expect(height).toBe(736);
    // Color type at byte 25 should be 6 (RGBA)
    expect(buf[25]).toBe(6);
  });

  it('verifies Usagi_Big2.png exists in assets/ with valid 735x734 RGBA PNG header', () => {
    const filePath = path.resolve(__dirname, '../assets/Usagi_Big2.png');
    expect(fs.existsSync(filePath)).toBe(true);
    const buf = fs.readFileSync(filePath);
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBe(735);
    expect(height).toBe(734);
    expect(buf[25]).toBe(6);
  });

  it('verifies all Usagi costume PNG assets exist with valid RGBA PNG headers', () => {
    const costumes = [
      { name: 'Usagi_Study.png', width: 640, height: 713 },
      { name: 'Usagi_Vest.png', width: 736, height: 736 },
      { name: 'Usagi_Ngau.png', width: 390, height: 390 },
      { name: 'Usagi_Star.png', width: 1200, height: 1022 },
    ];

    for (const costume of costumes) {
      const filePath = path.resolve(__dirname, `../assets/${costume.name}`);
      expect(fs.existsSync(filePath)).toBe(true);
      const buf = fs.readFileSync(filePath);
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf[2]).toBe(0x4e);
      expect(buf[3]).toBe(0x47);
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      expect(width).toBe(costume.width);
      expect(height).toBe(costume.height);
      expect(buf[25]).toBe(6);
    }
  });

  it('verifies Usagi_logo.png exists in assets/ with valid 755x755 RGBA PNG header', () => {
    const filePath = path.resolve(__dirname, '../assets/Usagi_logo.png');
    expect(fs.existsSync(filePath)).toBe(true);
    const buf = fs.readFileSync(filePath);
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBe(755);
    expect(height).toBe(755);
    expect(buf[25]).toBe(6);
  });

  it('verifies desktop sticky reminder note assets exist', () => {
    const htmlPath = path.resolve(__dirname, '../src/sticky/index.html');
    const tsPath = path.resolve(__dirname, '../src/sticky/sticky.ts');
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(tsPath)).toBe(true);

    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    expect(htmlContent).toContain('Usagi Quests');
    expect(htmlContent).toContain('questInput');
    expect(htmlContent).toContain('addQuestBtn');
    expect(htmlContent).toContain('questList');
  });

  it('verifies dashboard contains Usagi Custard anime theme, reminder checklist, and clean wardrobe controls', () => {
    const dashboardHtmlPath = path.resolve(__dirname, '../src/dashboard/index.html');
    expect(fs.existsSync(dashboardHtmlPath)).toBe(true);
    const html = fs.readFileSync(dashboardHtmlPath, 'utf-8');

    // Usagi Custard & Caramel Anime Theme variables (night mode removed)
    expect(html).toContain('data-theme="custard"');
    expect(html).not.toContain("[data-theme='night']");
    expect(html).not.toContain('theme-toggle-btn');
    expect(html).toContain('--bg-color');
    expect(html).toContain('--border-color');

    // Clean 2-tab Dashboard navigation & controls
    expect(html).toContain('dashTabCompanion');
    expect(html).toContain('dashTabConfig');
    expect(html).toContain('toggle-sticky-window-btn');
    expect(html).not.toContain('dashboard-quest-input');
    expect(html).not.toContain('study-schedule-card');

    // Clean Wardrobe Auto-Change button
    expect(html).toContain('fix-appearance-toggle-btn');
    expect(html).toContain('Auto-Change');
    expect(html).not.toContain('🔄 Auto-Change');

    // Cursor Keychain Hug removed
    expect(html).not.toContain('cursor-hug-toggle-btn');
    expect(html).not.toContain('pounce-cursor-btn');
  });

  it('verifies macOS sticky window accepts first mouse and quests use comfy strikethrough line', () => {
    const mainTs = fs.readFileSync(path.resolve(__dirname, '../src/main/index.ts'), 'utf-8');
    expect(mainTs).toContain('acceptFirstMouse: true');
    expect(mainTs).not.toContain("type: process.platform === 'darwin' ? 'desktop' : undefined");

    const stickyHtml = fs.readFileSync(
      path.resolve(__dirname, '../src/sticky/index.html'),
      'utf-8'
    );
    expect(stickyHtml).toContain('.comfy-line');

    const stickyTs = fs.readFileSync(path.resolve(__dirname, '../src/sticky/sticky.ts'), 'utf-8');
    expect(stickyTs).toContain('comfy-line');
    expect(stickyTs).not.toContain("checkbox.type = 'checkbox'");
  });

  it('verifies fixed appearance and hide usagi controls in dashboard and preload API', () => {
    const dashboardHtml = fs.readFileSync(
      path.resolve(__dirname, '../src/dashboard/index.html'),
      'utf-8'
    );
    expect(dashboardHtml).toContain('fix-appearance-toggle-btn');
    expect(dashboardHtml).toContain('hide-usagi-toggle-btn');

    const preloadTs = fs.readFileSync(path.resolve(__dirname, '../src/preload/index.ts'), 'utf-8');
    expect(preloadTs).toContain('toggleFixedAppearance');
    expect(preloadTs).toContain('onFixedAppearanceChanged');
    expect(preloadTs).toContain('toggleUsagiHidden');
    expect(preloadTs).toContain('onUsagiHiddenChanged');
  });

  it('verifies custom themed tray popover window and kawaii SVG icons integration', () => {
    // 1. Core modules exist
    const kawaiiTsPath = path.resolve(__dirname, '../src/core/kawaiiIcons.ts');
    const trayPosPath = path.resolve(__dirname, '../src/core/trayPositioner.ts');
    expect(fs.existsSync(kawaiiTsPath)).toBe(true);
    expect(fs.existsSync(trayPosPath)).toBe(true);

    // 2. Tray window assets exist
    const trayHtmlPath = path.resolve(__dirname, '../src/tray/index.html');
    const trayTsPath = path.resolve(__dirname, '../src/tray/tray.ts');
    expect(fs.existsSync(trayHtmlPath)).toBe(true);
    expect(fs.existsSync(trayTsPath)).toBe(true);

    const trayHtml = fs.readFileSync(trayHtmlPath, 'utf-8');
    expect(trayHtml).toContain('data-theme="custard"');
    expect(trayHtml).not.toContain("[data-theme='night']");
    expect(trayHtml).not.toContain('tray-theme-toggle-btn');
    expect(trayHtml).toContain('--bg-color');
    expect(trayHtml).toContain('--border-color');
    expect(trayHtml).toContain('tray-clock-time');
    expect(trayHtml).toContain('tray-clock-badge');
    expect(trayHtml).toContain('tray-start-pause-btn');
    expect(trayHtml).toContain('tray-reset-btn');
    expect(trayHtml).toContain('tray-open-dashboard-btn');
    expect(trayHtml).toContain('tray-toggle-sticky-btn');
    expect(trayHtml).toContain('tray-toggle-hidden-btn');
    expect(trayHtml).toContain('tray-drop-snack-btn');
    expect(trayHtml).not.toContain('tray-toggle-ghost-btn');
    expect(trayHtml).toContain('tray-quit-btn');
    expect(trayHtml).toContain('chip-25m');
    expect(trayHtml).toContain('chip-52m');
    expect(trayHtml).toContain('chip-90m');
    expect(trayHtml).not.toContain('chip-5m');
    expect(trayHtml).not.toContain('chip-17m');
    expect(trayHtml).not.toContain('chip-1m');
    expect(trayHtml).toContain('height: 410px');

    const trayTs = fs.readFileSync(trayTsPath, 'utf-8');
    expect(trayTs).not.toContain('tray-toggle-ghost-btn');
    expect(trayTs).not.toContain('toggleGhostBtn');
    expect(trayTs).not.toContain('updateGhostUI');

    // 3. Build script copies and bundles tray window
    const buildMjs = fs.readFileSync(path.resolve(__dirname, '../scripts/build.mjs'), 'utf-8');
    expect(buildMjs).toContain('dist/tray');
    expect(buildMjs).toContain('src/tray/index.html');
    expect(buildMjs).toContain('src/tray/tray.ts');

    // 4. Preload exposes tray control methods
    const preloadTs = fs.readFileSync(path.resolve(__dirname, '../src/preload/index.ts'), 'utf-8');
    expect(preloadTs).toContain('openDashboardWindow');
    expect(preloadTs).toContain('quitApp');
    expect(preloadTs).toContain('closeTrayPopover');

    // 5. Dashboard and Sticky HTML include kawaii-svg CSS helpers
    const dashboardHtml = fs.readFileSync(
      path.resolve(__dirname, '../src/dashboard/index.html'),
      'utf-8'
    );
    const stickyHtml = fs.readFileSync(
      path.resolve(__dirname, '../src/sticky/index.html'),
      'utf-8'
    );
    expect(dashboardHtml).toContain('.kawaii-svg');
    expect(stickyHtml).toContain('.kawaii-svg');
    expect(trayHtml).toContain('.kawaii-svg');

    // 6. Sticky window has night mode removed
    expect(stickyHtml).toContain('data-theme="custard"');
    expect(stickyHtml).not.toContain("[data-theme='night']");
    expect(stickyHtml).not.toContain('themeToggleBtn');
  });

  it('verifies UI is distilled (no redundant helper descriptions, footer tips, or stacked preset/tab icons)', () => {
    // 1. Dashboard
    const dashHtml = fs.readFileSync(
      path.resolve(__dirname, '../src/dashboard/index.html'),
      'utf-8'
    );
    const dashTs = fs.readFileSync(
      path.resolve(__dirname, '../src/dashboard/dashboard.ts'),
      'utf-8'
    );
    expect(dashHtml).not.toContain('Custard Anime Companion & Quests');
    expect(dashHtml).not.toContain('app-footer');
    expect(dashHtml).not.toContain('💡 Close this window anytime');
    expect(dashHtml).toContain('id="dashTabCompanion">Companion</button>');
    expect(dashHtml).toContain('id="dashTabConfig">Settings</button>');

    const redundantHelpers = [
      'Your preferred display name',
      'Usagi celebrates your special day!',
      'Calendar public holiday countdowns',
      'Display across quests & calendar',
      'Calendar grid header order',
      'Font scaling on sticky window',
      'Compact / Medium / Large preset',
      'Float above all apps or stay on desktop',
      'Auto-change costume every 30m or fix',
    ];
    for (const helper of redundantHelpers) {
      expect(dashHtml).not.toContain(helper);
    }

    const removedIcons = [
      'sticky-title-icon',
      'pin-title-icon',
      'wand-title-icon',
      'ghost-title-icon',
      'pudding-title-icon',
      'hide-title-icon',
    ];
    for (const iconId of removedIcons) {
      expect(dashHtml).not.toContain(iconId);
      expect(dashTs).not.toContain(iconId);
    }

    expect(dashTs).not.toContain('renderIconLabel');
    expect(dashTs).not.toContain('🖥️ Desktop Widget');
    expect(dashTs).not.toContain('📌 Pinned on Top');
    expect(dashHtml).toContain('costume-icon-classic');
    expect(dashHtml).toContain('.kawaii-svg');

    // 2. Tray
    const trayHtml = fs.readFileSync(path.resolve(__dirname, '../src/tray/index.html'), 'utf-8');
    const trayTs = fs.readFileSync(path.resolve(__dirname, '../src/tray/tray.ts'), 'utf-8');
    const removedTrayChips = [
      'chip-tomato-icon',
      'chip-bolt-icon',
      'chip-wave-icon',
      'chip-coffee-icon-1',
      'chip-coffee-icon-2',
      'chip-test-icon',
    ];
    for (const chipId of removedTrayChips) {
      expect(trayHtml).not.toContain(chipId);
      expect(trayTs).not.toContain(chipId);
    }
    expect(trayHtml).not.toContain('<span>✨</span>');
    expect(trayHtml).not.toContain('<span>↗</span>');

    // 3. Sticky
    const stickyHtml = fs.readFileSync(
      path.resolve(__dirname, '../src/sticky/index.html'),
      'utf-8'
    );
    const stickyTs = fs.readFileSync(path.resolve(__dirname, '../src/sticky/sticky.ts'), 'utf-8');
    expect(stickyHtml).toContain('id="tabBtnQuests">Quests</button>');
    expect(stickyHtml).toContain('id="tabBtnCalendar">Calendar</button>');
    expect(stickyHtml).toContain('id="tabBtnSchedule">Schedule</button>');
    expect(stickyHtml).not.toContain('📝 Quests');
    expect(stickyHtml).not.toContain('📅 Calendar');
    expect(stickyHtml).not.toContain('📚 Schedule');
    expect(stickyHtml).not.toContain('📅 Target Date');
    expect(stickyHtml).not.toContain('📅 Selected Date');
    expect(stickyHtml).not.toContain('⏳ Upcoming');
    expect(stickyHtml).not.toContain('⏳ Loading schedule');
    expect(stickyTs).not.toContain('📅 Selected:');
    expect(stickyTs).not.toContain('📅 Target Date:');
    expect(stickyTs).not.toContain('🟢 Now:');
    expect(stickyTs).not.toContain('⏳ Next:');
    expect(stickyTs).not.toContain('☕ No more classes');

    // 4. Renderer
    const rendererHtml = fs.readFileSync(
      path.resolve(__dirname, '../src/renderer/index.html'),
      'utf-8'
    );
    expect(rendererHtml).not.toContain(
      'Keep Usagi still in one spot while focusing (can drag anytime)'
    );
    expect(rendererHtml).not.toContain('[ Press ESC or click outside to close ]');
    expect(rendererHtml).not.toContain('🎵 Test Sound');
    expect(rendererHtml).not.toContain('🔇 Mute');
    expect(rendererHtml).not.toContain('📌 Pin Still');
    expect(rendererHtml).not.toContain('🍅 25m Pomodoro');
    expect(rendererHtml).not.toContain('⚡ 52m Rule');
    expect(rendererHtml).not.toContain('🌊 90m Ultradian');
    expect(rendererHtml).not.toContain('<span>🔁</span>');
    expect(rendererHtml).not.toContain('<span>⏳</span>');
    expect(rendererHtml).not.toContain('<span>☕</span>');
  });

  it('verifies bundle diet, minification, sourcemap exclusion, and package file deduplication', () => {
    const buildMjs = fs.readFileSync(path.resolve(__dirname, '../scripts/build.mjs'), 'utf-8');
    expect(buildMjs).toContain('minify: true');
    expect(buildMjs).not.toContain('sourcemap: true');
    expect(buildMjs).toContain('sourcemap: false');

    const pkgJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')
    );
    expect(pkgJson.build.files).toContain('dist/**/*');
    expect(pkgJson.build.files).toContain('package.json');
    expect(pkgJson.build.files).not.toContain('assets/**/*');

    expect(buildMjs).toContain('excludedSprites');
    expect(fs.existsSync(path.resolve(__dirname, '../dist/assets/Usagi3.png'))).toBe(true);
    expect(fs.existsSync(path.resolve(__dirname, '../dist/assets/Usagi1.png'))).toBe(false);
  });
});
