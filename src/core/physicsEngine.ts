export interface Vector2D {
  x: number;
  y: number;
}

export interface ScreenBounds {
  width: number;
  height: number;
}

export interface SnackTarget {
  x: number;
  y: number;
  active: boolean;
  radius: number;
}

export interface UsagiState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  angularVelocity: number;
  frameIndex: number;
  frameTimerMs: number;
  spinBoostTimerMs: number;
  speechBubble: string | null;
  speechTimerMs: number;
  scaleFlipX: 1 | -1;
  snacksEaten: number;
}

export interface PhysicsConfig {
  readonly spriteRadius: number;
  readonly baseSpeed: number;
  readonly maxSpeed: number;
  readonly frameIntervalMs: number;
  readonly bounceRestitution: number;
  readonly spinBoostDurationMs: number;
  readonly spinBoostAngularVelocity: number;
  readonly speechDurationMs: number;
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  spriteRadius: 56,
  baseSpeed: 95,
  maxSpeed: 210,
  frameIntervalMs: 100,
  bounceRestitution: 0.92,
  spinBoostDurationMs: 1200,
  spinBoostAngularVelocity: 12.5,
  speechDurationMs: 1800,
};

export const USAGI_SPEECH_PHRASES = ['Ura!', 'Yaha!', 'Haa?!', 'Una!'] as const;

export function createInitialUsagiState(
  screen: ScreenBounds,
  config?: Partial<PhysicsConfig>
): UsagiState {
  const cfg = { ...DEFAULT_PHYSICS_CONFIG, ...config };
  const r = cfg.spriteRadius;
  const minX = r;
  const maxX = Math.max(r, screen.width - r);
  const minY = r;
  const maxY = Math.max(r, screen.height - r);

  return {
    x: Math.max(minX, Math.min(maxX, screen.width / 2)),
    y: Math.max(minY, Math.min(maxY, screen.height / 2)),
    vx: cfg.baseSpeed * 0.7,
    vy: cfg.baseSpeed * 0.5,
    rotation: 0,
    angularVelocity: 0,
    frameIndex: 0,
    frameTimerMs: 0,
    spinBoostTimerMs: 0,
    speechBubble: null,
    speechTimerMs: 0,
    scaleFlipX: 1,
    snacksEaten: 0,
  };
}

export function triggerUsagiInteraction(
  state: UsagiState,
  phraseIndex?: number,
  config?: Partial<PhysicsConfig>
): UsagiState {
  const cfg = { ...DEFAULT_PHYSICS_CONFIG, ...config };
  const chosenIndex =
    phraseIndex !== undefined
      ? Math.abs(phraseIndex) % USAGI_SPEECH_PHRASES.length
      : Math.floor(Math.random() * USAGI_SPEECH_PHRASES.length);

  return {
    ...state,
    speechBubble: USAGI_SPEECH_PHRASES[chosenIndex],
    speechTimerMs: cfg.speechDurationMs,
    spinBoostTimerMs: cfg.spinBoostDurationMs,
    angularVelocity:
      state.angularVelocity !== 0
        ? Math.sign(state.angularVelocity) * cfg.spinBoostAngularVelocity
        : cfg.spinBoostAngularVelocity,
  };
}

export function stepUsagiPhysics(
  state: UsagiState,
  dtMs: number,
  screen: ScreenBounds,
  snack?: SnackTarget | null,
  config?: Partial<PhysicsConfig>
): { state: UsagiState; snackConsumed: boolean } {
  const cfg = { ...DEFAULT_PHYSICS_CONFIG, ...config };
  // Clamping dtMs to [0, 100] prevents physics tunneling on OS sleep or tab throttle
  const dt = Math.max(0, Math.min(100, dtMs));
  const dtSec = dt / 1000;

  const r = cfg.spriteRadius;
  const minX = r;
  const maxX = Math.max(r, screen.width - r);
  const minY = r;
  const maxY = Math.max(r, screen.height - r);

  let vx = state.vx;
  let vy = state.vy;

  // Steering toward active Pomodoro snack
  if (snack && snack.active) {
    const toSnackX = snack.x - state.x;
    const toSnackY = snack.y - state.y;
    const dist = Math.hypot(toSnackX, toSnackY);
    if (dist > 1e-4) {
      const dirX = toSnackX / dist;
      const dirY = toSnackY / dist;
      const steerFactor = Math.min(1, dtSec * 8);
      vx = vx + (dirX * cfg.maxSpeed - vx) * steerFactor;
      vy = vy + (dirY * cfg.maxSpeed - vy) * steerFactor;
    }
  }

  // Update position
  let x = state.x + vx * dtSec;
  let y = state.y + vy * dtSec;

  // Wall bounce reflection & screen boundary clamping
  if (x >= maxX) {
    x = maxX;
    vx = -Math.abs(vx) * cfg.bounceRestitution;
  } else if (x <= minX) {
    x = minX;
    vx = Math.abs(vx) * cfg.bounceRestitution;
  }

  if (y >= maxY) {
    y = maxY;
    vy = -Math.abs(vy) * cfg.bounceRestitution;
  } else if (y <= minY) {
    y = minY;
    vy = Math.abs(vy) * cfg.bounceRestitution;
  }

  // Orientation flip based on horizontal travel direction
  let scaleFlipX = state.scaleFlipX;
  if (vx > 0.01) {
    scaleFlipX = 1;
  } else if (vx < -0.01) {
    scaleFlipX = -1;
  }

  // Spin boost & rotation
  let spinBoostTimerMs = state.spinBoostTimerMs;
  let angularVelocity = state.angularVelocity;
  let rotation = state.rotation;

  if (spinBoostTimerMs > 0) {
    spinBoostTimerMs = Math.max(0, spinBoostTimerMs - dt);
    rotation += angularVelocity * dtSec;
    if (spinBoostTimerMs === 0) {
      angularVelocity = 0;
    }
  } else {
    if (Math.abs(rotation) > 0.01) {
      rotation = rotation * Math.max(0, 1 - dtSec * 5);
    } else {
      rotation = 0;
    }
    angularVelocity = 0;
  }

  // 6-frame cycle animation (spins faster when boosted)
  const effectiveInterval = spinBoostTimerMs > 0 ? cfg.frameIntervalMs * 0.4 : cfg.frameIntervalMs;
  let frameTimerMs = state.frameTimerMs + dt;
  let frameIndex = state.frameIndex;

  while (frameTimerMs >= effectiveInterval && effectiveInterval > 0) {
    frameIndex = (frameIndex + 1) % 6;
    frameTimerMs -= effectiveInterval;
  }

  // Speech bubble timer
  let speechBubble = state.speechBubble;
  let speechTimerMs = state.speechTimerMs;

  if (speechTimerMs > 0) {
    speechTimerMs = Math.max(0, speechTimerMs - dt);
    if (speechTimerMs === 0) {
      speechBubble = null;
    }
  }

  // Snack consumption check
  let snackConsumed = false;
  let snacksEaten = state.snacksEaten;

  if (snack && snack.active) {
    const distToSnack = Math.hypot(snack.x - x, snack.y - y);
    const consumeDist = snack.radius + cfg.spriteRadius * 0.5;
    if (distToSnack <= consumeDist) {
      snackConsumed = true;
      snacksEaten += 1;
      speechBubble = 'Yaha!';
      speechTimerMs = cfg.speechDurationMs;
    }
  }

  return {
    state: {
      x,
      y,
      vx,
      vy,
      rotation,
      angularVelocity,
      frameIndex,
      frameTimerMs,
      spinBoostTimerMs,
      speechBubble,
      speechTimerMs,
      scaleFlipX,
      snacksEaten,
    },
    snackConsumed,
  };
}
