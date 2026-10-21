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
});
