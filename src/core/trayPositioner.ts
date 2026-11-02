export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PopoverSize {
  width: number;
  height: number;
}

export function computeTrayPopoverPosition(
  trayBounds: Rect,
  workArea: Rect,
  popoverSize: PopoverSize
): { x: number; y: number } {
  // Fallback for platforms/systems where tray bounds are not provided (0, 0, 0, 0)
  if (
    trayBounds.width === 0 &&
    trayBounds.height === 0 &&
    trayBounds.x === 0 &&
    trayBounds.y === 0
  ) {
    const fallbackX = workArea.x + workArea.width - popoverSize.width - 12;
    const fallbackY = workArea.y + 12;
    return {
      x: Math.round(fallbackX),
      y: Math.round(fallbackY),
    };
  }

  // Center horizontally on the tray icon
  const trayCenterX = trayBounds.x + trayBounds.width / 2;
  let targetX = trayCenterX - popoverSize.width / 2;

  // Determine vertical placement based on screen position
  const screenCenterY = workArea.y + workArea.height / 2;
  let targetY: number;

  if (trayBounds.y < screenCenterY) {
    // Top half of screen (e.g. macOS menu bar / top panel) -> drop below
    targetY = trayBounds.y + trayBounds.height + 6;
  } else {
    // Bottom half of screen (e.g. Windows taskbar / bottom dock) -> place above
    targetY = trayBounds.y - popoverSize.height - 6;
  }

  // Screen edge boundary clamping: horizontal has 8px margin, vertical stays within workArea
  const minX = workArea.x + 8;
  const maxX = Math.max(minX, workArea.x + workArea.width - popoverSize.width - 8);
  const clampedX = Math.min(Math.max(targetX, minX), maxX);

  const minY = workArea.y;
  const maxY = Math.max(minY, workArea.y + workArea.height - popoverSize.height);
  const clampedY = Math.min(Math.max(targetY, minY), maxY);

  return {
    x: Math.round(clampedX),
    y: Math.round(clampedY),
  };
}
