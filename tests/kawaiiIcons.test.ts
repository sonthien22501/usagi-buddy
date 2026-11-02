import { describe, expect, it } from 'vitest';
import {
  KAWAII_ICONS,
  getKawaiiIcon,
  renderIconLabel,
  KawaiiIconId,
} from '../src/core/kawaiiIcons';

describe('Kawaii SVG Icon Set', () => {
  const EXPECTED_ICON_IDS: KawaiiIconId[] = [
    'sun',
    'moon',
    'note',
    'volume',
    'volume-low',
    'mute',
    'music',
    'timer',
    'tomato',
    'bolt',
    'wave',
    'coffee',
    'play',
    'pause',
    'reset',
    'wardrobe',
    'usagi',
    'book',
    'tie',
    'shades',
    'star',
    'dice',
    'lock',
    'rotate',
    'gamepad',
    'pin',
    'wand',
    'ghost',
    'pudding',
    'eye-hide',
    'dashboard',
    'door-quit',
    'plus',
    'check',
    'sparkle',
  ];

  it('contains all 35 defined kawaii icon keys in KAWAII_ICONS', () => {
    for (const id of EXPECTED_ICON_IDS) {
      expect(KAWAII_ICONS[id]).toBeDefined();
      expect(typeof KAWAII_ICONS[id]).toBe('string');
      expect(KAWAII_ICONS[id].length).toBeGreaterThan(20);
    }
    expect(Object.keys(KAWAII_ICONS).length).toBe(EXPECTED_ICON_IDS.length);
  });

  it('renders valid SVG with viewBox 0 0 24 24, kawaii-svg class, and round stroke', () => {
    for (const id of EXPECTED_ICON_IDS) {
      const svg = getKawaiiIcon(id);
      expect(svg).toMatch(/^<svg\b/);
      expect(svg).toContain('viewBox="0 0 24 24"');
      expect(svg).toContain('class="kawaii-svg"');
      expect(svg).toContain('stroke="currentColor"');
      expect(svg).toContain('stroke-linecap="round"');
      expect(svg).toContain('stroke-linejoin="round"');
      expect(svg).toContain('width="18"');
      expect(svg).toContain('height="18"');
      expect(svg).toMatch(/<\/svg>$/);
    }
  });

  it('allows overriding size in getKawaiiIcon', () => {
    const custom = getKawaiiIcon('sun', 24);
    expect(custom).toContain('width="24"');
    expect(custom).toContain('height="24"');
  });

  it('renderIconLabel wraps icon and text in accessible span markup', () => {
    const html = renderIconLabel('pudding', 'Drop Snack', 16);
    expect(html).toContain('<span class="kawaii-icon-wrap"');
    expect(html).toContain('width="16"');
    expect(html).toContain('<span>Drop Snack</span>');
    expect(html).toContain('class="kawaii-svg"');
  });

  it('falls back safely for unknown icon id without crashing', () => {
    // @ts-expect-error Testing invalid icon fallback
    const fallback = getKawaiiIcon('unknown-id-xyz');
    expect(fallback).toContain('<svg');
    expect(fallback).toContain('class="kawaii-svg"');
  });
});
