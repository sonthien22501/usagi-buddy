import { Vector2D } from './physicsEngine';

export type CursorHugPhase = 'idle' | 'pounce-wiggle' | 'clinging' | 'dizzy-drop' | 'cooldown';

export interface CursorHugState {
  enabled: boolean;
  phase: CursorHugPhase;
  phaseTimerMs: number;
  pendulumAngleRad: number;
  pendulumAngularVel: number;
  shakeReversals: number;
  lastMoveDirX: -1 | 0 | 1;
  lastReversalAtMs: number;
  lastCursorPos: Vector2D | null;
}

export interface StepCursorHugResult {
  hugState: CursorHugState;
  targetPos: Vector2D | null;
  rotationOverride: number | null;
  speechBubbleOverride: string | null;
  soundTrigger?: 'hug-attach' | 'dizzy-drop';
}

export const POUNCE_WIGGLE_DURATION_MS = 550;
export const CLING_AUTO_RELEASE_MS = 9000;
export const DIZZY_DROP_DURATION_MS = 1400;
export const COOLDOWN_DURATION_MS = 4000;
export const CURSOR_OFFSET_Y = 44;
export const MIN_SHAKE_DELTA_X = 18;
export const SHAKE_WINDOW_MS = 600;
export const REQUIRED_SHAKE_REVERSALS = 3;
export const MAX_PENDULUM_ANGLE_RAD = 0.65;

export function createCursorHugState(enabled = true): CursorHugState {
  return {
    enabled,
    phase: 'idle',
    phaseTimerMs: 0,
    pendulumAngleRad: 0,
    pendulumAngularVel: 0,
    shakeReversals: 0,
    lastMoveDirX: 0,
    lastReversalAtMs: 0,
    lastCursorPos: null,
  };
}

export function triggerCursorPounce(state: CursorHugState): CursorHugState {
  return {
    ...state,
    enabled: true,
    phase: 'pounce-wiggle',
    phaseTimerMs: 0,
    shakeReversals: 0,
    lastMoveDirX: 0,
    pendulumAngleRad: 0,
    pendulumAngularVel: 0,
  };
}

export function shouldIgnoreMouseDuringHug(state: CursorHugState): boolean {
  return state.phase === 'clinging';
}

export function stepCursorHug(
  state: CursorHugState,
  usagiPos: Vector2D,
  cursorPos: Vector2D | null,
  dtMs: number,
  nowMs: number,
  blockedByMode = false
): StepCursorHugResult {
  if (blockedByMode || !state.enabled) {
    const nextState: CursorHugState = {
      ...state,
      phase: 'idle',
      phaseTimerMs: 0,
      pendulumAngleRad: 0,
      pendulumAngularVel: 0,
      shakeReversals: 0,
      lastMoveDirX: 0,
      lastReversalAtMs: 0,
      lastCursorPos: cursorPos ? { ...cursorPos } : null,
    };
    return {
      hugState: nextState,
      targetPos: null,
      rotationOverride: null,
      speechBubbleOverride: null,
    };
  }

  const dtSec = Math.max(0.001, Math.min(0.2, dtMs / 1000));

  switch (state.phase) {
    case 'idle': {
      return {
        hugState: {
          ...state,
          lastCursorPos: cursorPos ? { ...cursorPos } : null,
        },
        targetPos: null,
        rotationOverride: null,
        speechBubbleOverride: null,
      };
    }

    case 'pounce-wiggle': {
      const nextTimer = state.phaseTimerMs + dtMs;
      if (nextTimer >= POUNCE_WIGGLE_DURATION_MS) {
        // Transition to clinging
        const nextState: CursorHugState = {
          ...state,
          phase: 'clinging',
          phaseTimerMs: 0,
          pendulumAngleRad: 0,
          pendulumAngularVel: 0,
          shakeReversals: 0,
          lastMoveDirX: 0,
          lastReversalAtMs: nowMs,
          lastCursorPos: cursorPos ? { ...cursorPos } : null,
        };
        const targetPos = cursorPos
          ? { x: cursorPos.x, y: cursorPos.y + CURSOR_OFFSET_Y }
          : { ...usagiPos };
        return {
          hugState: nextState,
          targetPos,
          rotationOverride: 0,
          speechBubbleOverride: 'Kyaa~ ♥',
          soundTrigger: 'hug-attach',
        };
      }

      // Wiggle back and forth
      const wiggleAngle = Math.sin(nextTimer * 0.04) * 0.28;
      return {
        hugState: {
          ...state,
          phaseTimerMs: nextTimer,
          lastCursorPos: cursorPos ? { ...cursorPos } : null,
        },
        targetPos: null,
        rotationOverride: wiggleAngle,
        speechBubbleOverride: '!!',
      };
    }

    case 'clinging': {
      const nextTimer = state.phaseTimerMs + dtMs;

      // Shake detection
      let shakeReversals = state.shakeReversals;
      let lastMoveDirX = state.lastMoveDirX;
      let lastReversalAtMs = state.lastReversalAtMs;

      if (state.lastCursorPos && cursorPos) {
        const dx = cursorPos.x - state.lastCursorPos.x;
        if (Math.abs(dx) >= MIN_SHAKE_DELTA_X) {
          const dirX: -1 | 1 = dx > 0 ? 1 : -1;
          if (lastMoveDirX !== 0 && dirX !== lastMoveDirX) {
            if (nowMs - lastReversalAtMs <= SHAKE_WINDOW_MS) {
              shakeReversals += 1;
            } else {
              shakeReversals = 1;
            }
            lastReversalAtMs = nowMs;
          }
          lastMoveDirX = dirX;
        } else if (nowMs - lastReversalAtMs > SHAKE_WINDOW_MS) {
          shakeReversals = 0;
        }
      }

      // Check dizzy drop trigger
      if (shakeReversals >= REQUIRED_SHAKE_REVERSALS) {
        const nextState: CursorHugState = {
          ...state,
          phase: 'dizzy-drop',
          phaseTimerMs: 0,
          pendulumAngleRad: state.pendulumAngleRad,
          pendulumAngularVel: 0,
          shakeReversals: 0,
          lastMoveDirX: 0,
          lastReversalAtMs: 0,
          lastCursorPos: cursorPos ? { ...cursorPos } : null,
        };
        return {
          hugState: nextState,
          targetPos: cursorPos
            ? { x: cursorPos.x, y: cursorPos.y + CURSOR_OFFSET_Y }
            : { ...usagiPos },
          rotationOverride: 0.4,
          speechBubbleOverride: '@ _ @ Wuuulaaaa!',
          soundTrigger: 'dizzy-drop',
        };
      }

      // Check auto-release
      if (nextTimer >= CLING_AUTO_RELEASE_MS) {
        const nextState: CursorHugState = {
          ...state,
          phase: 'cooldown',
          phaseTimerMs: 0,
          pendulumAngleRad: 0,
          pendulumAngularVel: 0,
          shakeReversals: 0,
          lastMoveDirX: 0,
          lastReversalAtMs: 0,
          lastCursorPos: cursorPos ? { ...cursorPos } : null,
        };
        return {
          hugState: nextState,
          targetPos: null,
          rotationOverride: null,
          speechBubbleOverride: 'Phew~ 🐾',
        };
      }

      // Keychain pendulum physics
      let vx = 0;
      if (state.lastCursorPos && cursorPos && dtSec > 0) {
        vx = (cursorPos.x - state.lastCursorPos.x) / dtSec;
      }

      const targetAngle = Math.max(
        -MAX_PENDULUM_ANGLE_RAD,
        Math.min(MAX_PENDULUM_ANGLE_RAD, -vx * 0.0007)
      );
      const springK = 8.0;
      const damping = 0.85;
      const vel =
        (state.pendulumAngularVel + (targetAngle - state.pendulumAngleRad) * springK * dtSec) *
        damping;
      let angle = state.pendulumAngleRad + vel * dtSec;
      angle = Math.max(-MAX_PENDULUM_ANGLE_RAD, Math.min(MAX_PENDULUM_ANGLE_RAD, angle));

      const targetPos = cursorPos
        ? { x: cursorPos.x, y: cursorPos.y + CURSOR_OFFSET_Y }
        : { ...usagiPos };

      const nextState: CursorHugState = {
        ...state,
        phaseTimerMs: nextTimer,
        pendulumAngleRad: angle,
        pendulumAngularVel: vel,
        shakeReversals,
        lastMoveDirX,
        lastReversalAtMs,
        lastCursorPos: cursorPos ? { ...cursorPos } : null,
      };

      return {
        hugState: nextState,
        targetPos,
        rotationOverride: angle,
        speechBubbleOverride: 'Kyaa~ ♥',
      };
    }

    case 'dizzy-drop': {
      const nextTimer = state.phaseTimerMs + dtMs;
      if (nextTimer >= DIZZY_DROP_DURATION_MS) {
        const nextState: CursorHugState = {
          ...state,
          phase: 'cooldown',
          phaseTimerMs: 0,
          pendulumAngleRad: 0,
          pendulumAngularVel: 0,
          lastCursorPos: cursorPos ? { ...cursorPos } : null,
        };
        return {
          hugState: nextState,
          targetPos: null,
          rotationOverride: null,
          speechBubbleOverride: null,
        };
      }

      const tumbleAngle = state.pendulumAngleRad + (nextTimer / 1000) * 12;
      const dropY = usagiPos.y + 120 * dtSec;

      return {
        hugState: {
          ...state,
          phaseTimerMs: nextTimer,
          lastCursorPos: cursorPos ? { ...cursorPos } : null,
        },
        targetPos: { x: usagiPos.x, y: dropY },
        rotationOverride: tumbleAngle,
        speechBubbleOverride: '@ _ @ Wuuulaaaa!',
      };
    }

    case 'cooldown': {
      const nextTimer = state.phaseTimerMs + dtMs;
      if (nextTimer >= COOLDOWN_DURATION_MS) {
        return {
          hugState: {
            ...state,
            phase: 'idle',
            phaseTimerMs: 0,
            pendulumAngleRad: 0,
            pendulumAngularVel: 0,
            lastCursorPos: cursorPos ? { ...cursorPos } : null,
          },
          targetPos: null,
          rotationOverride: null,
          speechBubbleOverride: null,
        };
      }

      return {
        hugState: {
          ...state,
          phaseTimerMs: nextTimer,
          lastCursorPos: cursorPos ? { ...cursorPos } : null,
        },
        targetPos: null,
        rotationOverride: null,
        speechBubbleOverride: null,
      };
    }
  }
}
