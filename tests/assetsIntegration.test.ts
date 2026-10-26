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

  it('verifies dashboard contains Usagi Custard anime theme, reminder checklist, and cursor hug controls', () => {
    const dashboardHtmlPath = path.resolve(__dirname, '../src/dashboard/index.html');
    expect(fs.existsSync(dashboardHtmlPath)).toBe(true);
    const html = fs.readFileSync(dashboardHtmlPath, 'utf-8');

    // Usagi Custard & Caramel Anime Theme variables & toggle
    expect(html).toContain('data-theme');
    expect(html).toContain('theme-toggle-btn');
    expect(html).toContain('--bg-color');
    expect(html).toContain('--border-color');

    // Desktop Sticky Reminders Card & controls
    expect(html).toContain('sticky-reminders-card');
    expect(html).toContain('toggle-sticky-window-btn');
    expect(html).toContain('dashboard-quest-input');
    expect(html).toContain('dashboard-add-quest-btn');
    expect(html).toContain('dashboard-quest-list');
    expect(html).toContain('dashboard-clear-done-btn');

    // Playful Cursor Hug controls
    expect(html).toContain('cursor-hug-toggle-btn');
    expect(html).toContain('pounce-cursor-btn');
  });

  it('verifies macOS sticky window accepts first mouse and quests use comfy strikethrough line', () => {
    const mainTs = fs.readFileSync(path.resolve(__dirname, '../src/main/index.ts'), 'utf-8');
    expect(mainTs).toContain('acceptFirstMouse: true');
    expect(mainTs).not.toContain("type: process.platform === 'darwin' ? 'desktop' : undefined");

    const stickyHtml = fs.readFileSync(
      path.resolve(__dirname, '../src/sticky/index.html'),
      'utf-8'
    );
    const dashboardHtml = fs.readFileSync(
      path.resolve(__dirname, '../src/dashboard/index.html'),
      'utf-8'
    );
    expect(stickyHtml).toContain('.comfy-line');
    expect(dashboardHtml).toContain('.comfy-line');

    const stickyTs = fs.readFileSync(path.resolve(__dirname, '../src/sticky/sticky.ts'), 'utf-8');
    const dashboardTs = fs.readFileSync(
      path.resolve(__dirname, '../src/dashboard/dashboard.ts'),
      'utf-8'
    );
    expect(stickyTs).toContain('comfy-line');
    expect(stickyTs).not.toContain("checkbox.type = 'checkbox'");
    expect(dashboardTs).toContain('comfy-line');
    expect(dashboardTs).not.toContain("cb.type = 'checkbox'");
  });
});
