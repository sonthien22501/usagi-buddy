import { describe, expect, it } from 'vitest';
import { computeTrayPopoverPosition, Rect, PopoverSize } from '../src/core/trayPositioner';

describe('Tray Popover Positioner', () => {
  const popoverSize: PopoverSize = { width: 320, height: 490 };

  it('positions popover below tray on macOS top menu bar and centers horizontally', () => {
    const trayBounds: Rect = { x: 800, y: 0, width: 28, height: 24 };
    const workArea: Rect = { x: 0, y: 24, width: 1440, height: 876 };

    const pos = computeTrayPopoverPosition(trayBounds, workArea, popoverSize);

    // tray center x = 800 + 14 = 814. Popover x = 814 - 160 = 654.
    expect(pos.x).toBe(654);
    // top menu bar -> trayBounds.y + trayBounds.height + 6 = 0 + 24 + 6 = 30
    expect(pos.y).toBe(30);
  });

  it('positions popover above tray on Windows bottom taskbar', () => {
    const trayBounds: Rect = { x: 1200, y: 1040, width: 32, height: 40 };
    const workArea: Rect = { x: 0, y: 0, width: 1920, height: 1040 };

    const pos = computeTrayPopoverPosition(trayBounds, workArea, popoverSize);

    // tray center x = 1200 + 16 = 1216. Popover x = 1216 - 160 = 1056.
    expect(pos.x).toBe(1056);
    // bottom taskbar -> trayBounds.y - popoverSize.height - 6 = 1040 - 490 - 6 = 544
    expect(pos.y).toBe(544);
  });

  it('clamps x coordinate to right edge with 8px margin when tray is near right boundary', () => {
    const trayBounds: Rect = { x: 1420, y: 0, width: 20, height: 24 };
    const workArea: Rect = { x: 0, y: 24, width: 1440, height: 876 };

    const pos = computeTrayPopoverPosition(trayBounds, workArea, popoverSize);

    // Right limit = workArea.x + workArea.width - popoverSize.width - 8 = 0 + 1440 - 320 - 8 = 1112
    expect(pos.x).toBe(1112);
  });

  it('clamps x coordinate to left edge with 8px margin when tray is near left boundary', () => {
    const trayBounds: Rect = { x: 10, y: 0, width: 20, height: 24 };
    const workArea: Rect = { x: 0, y: 24, width: 1440, height: 876 };

    const pos = computeTrayPopoverPosition(trayBounds, workArea, popoverSize);

    // Left limit = workArea.x + 8 = 8
    expect(pos.x).toBe(8);
  });

  it('clamps y coordinate when screen work area is very small', () => {
    const trayBounds: Rect = { x: 400, y: 550, width: 24, height: 24 };
    const workArea: Rect = { x: 0, y: 0, width: 1000, height: 500 };

    const pos = computeTrayPopoverPosition(trayBounds, workArea, popoverSize);

    // Max y = workArea.y + workArea.height - popoverSize.height - 8 = 0 + 500 - 490 - 8 = 2
    // Min y = workArea.y + 8 = 8.
    // If workArea.height < popoverSize.height + 16, it clamps within workArea.y + 8
    expect(pos.y).toBeGreaterThanOrEqual(workArea.y);
  });

  it('falls back gracefully to top-right corner when tray bounds are 0x0 at (0, 0)', () => {
    const trayBounds: Rect = { x: 0, y: 0, width: 0, height: 0 };
    const workArea: Rect = { x: 0, y: 24, width: 1440, height: 876 };

    const pos = computeTrayPopoverPosition(trayBounds, workArea, popoverSize);

    // Should position near top-right within margin
    expect(pos.x).toBe(workArea.x + workArea.width - popoverSize.width - 12);
    expect(pos.y).toBe(workArea.y + 12);
  });
});
