import { Vector2D } from './physicsEngine';

export interface HitTarget {
  x: number;
  y: number;
  radius: number;
}

export interface GhostModeState {
  ghostModeLocked: boolean;
  currentlyIgnoringMouse: boolean;
}

export function createGhostModeState(initialLocked: boolean = false): GhostModeState {
  return {
    ghostModeLocked: initialLocked,
    currentlyIgnoringMouse: initialLocked,
  };
}

export function isPointInTarget(px: number, py: number, target: HitTarget): boolean {
  if (
    Number.isNaN(px) ||
    Number.isNaN(py) ||
    !Number.isFinite(px) ||
    !Number.isFinite(py) ||
    !target ||
    Number.isNaN(target.x) ||
    Number.isNaN(target.y) ||
    Number.isNaN(target.radius)
  ) {
    return false;
  }

  const dx = px - target.x;
  const dy = py - target.y;
  return dx * dx + dy * dy <= target.radius * target.radius;
}

export function shouldIgnoreMouseEvents(
  ghostModeLocked: boolean,
  cursor: Vector2D | null,
  usagiTarget: HitTarget,
  snackTarget?: HitTarget | null
): boolean {
  // When Ghost Mode is locked, always pass clicks through to background apps
  if (ghostModeLocked) {
    return true;
  }

  // Null or non-finite cursor safely defaults to click-through
  if (
    !cursor ||
    Number.isNaN(cursor.x) ||
    Number.isNaN(cursor.y) ||
    !Number.isFinite(cursor.x) ||
    !Number.isFinite(cursor.y)
  ) {
    return true;
  }

  // Hovering over Usagi or active Snack allows interaction (do not ignore mouse)
  if (isPointInTarget(cursor.x, cursor.y, usagiTarget)) {
    return false;
  }

  if (snackTarget && isPointInTarget(cursor.x, cursor.y, snackTarget)) {
    return false;
  }

  // Empty transparent desktop forwards mouse events through
  return true;
}

export function toggleGhostMode(state: GhostModeState): GhostModeState {
  const nextLocked = !state.ghostModeLocked;
  return {
    ghostModeLocked: nextLocked,
    currentlyIgnoringMouse: nextLocked,
  };
}
