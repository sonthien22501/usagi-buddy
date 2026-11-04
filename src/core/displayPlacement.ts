export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

function squaredDistanceToRect(point: Point, rect: Rect): number {
  const dx =
    point.x < rect.x
      ? rect.x - point.x
      : point.x > rect.x + rect.width
        ? point.x - (rect.x + rect.width)
        : 0;
  const dy =
    point.y < rect.y
      ? rect.y - point.y
      : point.y > rect.y + rect.height
        ? point.y - (rect.y + rect.height)
        : 0;
  return dx * dx + dy * dy;
}

function nearestWorkArea(point: Point, workAreas: Rect[]): Rect {
  let best = workAreas[0];
  let bestDistance = squaredDistanceToRect(point, best);

  for (let i = 1; i < workAreas.length; i += 1) {
    const distance = squaredDistanceToRect(point, workAreas[i]);
    if (distance < bestDistance) {
      best = workAreas[i];
      bestDistance = distance;
    }
  }

  return best;
}

/**
 * Places the sticky window on the display nearest its saved position, then clamps
 * it into that display's work area. A saved position on a display that has since
 * been disconnected therefore lands on the closest remaining screen instead of
 * staying off-screen.
 */
export function computeStickyWindowPosition(
  savedPosition: Point | null,
  size: WindowSize,
  workAreas: Rect[]
): Point {
  if (workAreas.length === 0) {
    return savedPosition ? { x: savedPosition.x, y: savedPosition.y } : { x: 0, y: 0 };
  }

  if (!savedPosition) {
    const primary = workAreas[0];
    return {
      x: Math.round(Math.max(primary.x, primary.x + primary.width - size.width - 24)),
      y: Math.round(primary.y + 48),
    };
  }

  const area = nearestWorkArea(savedPosition, workAreas);
  const maxX = Math.max(area.x, area.x + area.width - size.width);
  const maxY = Math.max(area.y, area.y + area.height - size.height);

  return {
    x: Math.round(Math.min(Math.max(savedPosition.x, area.x), maxX)),
    y: Math.round(Math.min(Math.max(savedPosition.y, area.y), maxY)),
  };
}
