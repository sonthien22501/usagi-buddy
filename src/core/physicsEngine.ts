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
  swimPhaseRad: number;
  scaleX: number;
  scaleY: number;
  frameIndex: number;
  frameTimerMs: number;
  spinBoostTimerMs: number;
  comboClicks: number;
  speechBubble: string | null;
  speechTimerMs: number;
  scaleFlipX: 1 | -1;
  snacksEaten: number;
  sleeping: boolean;
  stationary: boolean;
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

export const UPRIGHT_SPRITE_INDEX = 2; // Usagi3.png
export const USAGI_SPEECH_PHRASES = ['Una!', 'Bryy!', 'Urararusk!', 'Wuuulaaaa!'] as const;

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
    swimPhaseRad: 0,
    scaleX: 1,
    scaleY: 1,
    frameIndex: UPRIGHT_SPRITE_INDEX,
    frameTimerMs: 0,
    spinBoostTimerMs: 0,
    comboClicks: 0,
    speechBubble: null,
    speechTimerMs: 0,
    scaleFlipX: 1,
    snacksEaten: 0,
    sleeping: false,
    stationary: false,
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

  // Combo clicks detection
  const isSpinning = state.spinBoostTimerMs > 0;
  const comboClicks = isSpinning ? state.comboClicks + 1 : 1;
  const isSuperSpin = comboClicks >= 3;

  const angularVelocity = isSuperSpin
    ? cfg.spinBoostAngularVelocity * 1.65 // ~20.6 rad/s
    : cfg.spinBoostAngularVelocity;

  const spinBoostDurationMs = isSuperSpin ? cfg.spinBoostDurationMs * 1.3 : cfg.spinBoostDurationMs;

  return {
    ...state,
    comboClicks,
    speechBubble: USAGI_SPEECH_PHRASES[chosenIndex],
    speechTimerMs: cfg.speechDurationMs,
    spinBoostTimerMs: spinBoostDurationMs,
    angularVelocity:
      state.angularVelocity !== 0
        ? Math.sign(state.angularVelocity) * angularVelocity
        : angularVelocity,
    sleeping: false, // Wakes up on click
  };
}

export function stepUsagiPhysics(
  state: UsagiState,
  dtMs: number,
  screen: ScreenBounds,
  snack?: SnackTarget | null,
  config?: Partial<PhysicsConfig>,
  cursorTarget?: Vector2D | null
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

  // 60 FPS continuous swim-stroke phase
  const isSleeping = state.sleeping && !(snack && snack.active);
  const swimSpeed = isSleeping ? 1.5 : 4.2;
  const swimPhaseRad = (state.swimPhaseRad + dtSec * swimSpeed) % (Math.PI * 2);

  // Organic jellyfish/otter squash-and-stretch
  const stroke = Math.sin(swimPhaseRad);
  const scaleX = state.stationary ? 1 + stroke * 0.02 : 1 + stroke * 0.055;
  const scaleY = state.stationary ? 1 - stroke * 0.02 : 1 - stroke * 0.055;

  let vx = state.vx;
  let vy = state.vy;

  if (state.stationary) {
    vx = 0;
    vy = 0;
  } else if (snack && snack.active) {
    // Steering toward active Pomodoro snack
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
  } else if (isSleeping) {
    // Drifts lazily when sleeping
    vx = vx * 0.95;
    vy = Math.sin(swimPhaseRad) * 15;
  } else if (cursorTarget) {
    // Play Mode: steer toward cursor
    const toCursorX = cursorTarget.x - state.x;
    const toCursorY = cursorTarget.y - state.y;
    const dist = Math.hypot(toCursorX, toCursorY);
    if (dist > 25) {
      const dirX = toCursorX / dist;
      const dirY = toCursorY / dist;
      const steerFactor = Math.min(1, dtSec * 6);
      vx = vx + (dirX * cfg.baseSpeed * 1.35 - vx) * steerFactor;
      vy = vy + (dirY * cfg.baseSpeed * 1.35 - vy) * steerFactor;
    } else {
      vx = vx * 0.9;
      vy = vy * 0.9;
    }
  } else {
    // Graceful swimming: gentle vertical sine-wave buoyancy arc
    vy += Math.cos(swimPhaseRad) * 18 * dtSec;
    const currentSpeed = Math.hypot(vx, vy);
    if (
      currentSpeed > 1e-4 &&
      (currentSpeed < cfg.baseSpeed * 0.8 || currentSpeed > cfg.baseSpeed * 1.2)
    ) {
      const factor = cfg.baseSpeed / currentSpeed;
      vx += (vx * factor - vx) * Math.min(1, dtSec * 2);
      vy += (vy * factor - vy) * Math.min(1, dtSec * 2);
    }
  }

  // Update position
  let x = state.stationary ? state.x : state.x + vx * dtSec;
  let y = state.stationary ? state.y : state.y + vy * dtSec;

  if (state.stationary) {
    vx = 0;
    vy = 0;
  }

  // Wall bounce reflection & screen boundary clamping
  if (x >= maxX) {
    x = maxX;
    vx = state.stationary ? 0 : -Math.abs(vx) * cfg.bounceRestitution;
  } else if (x <= minX) {
    x = minX;
    vx = state.stationary ? 0 : Math.abs(vx) * cfg.bounceRestitution;
  }

  if (y >= maxY) {
    y = maxY;
    vy = state.stationary ? 0 : -Math.abs(vy) * cfg.bounceRestitution;
  } else if (y <= minY) {
    y = minY;
    vy = state.stationary ? 0 : Math.abs(vy) * cfg.bounceRestitution;
  }

  // Orientation flip based on horizontal travel direction
  let scaleFlipX = state.scaleFlipX;
  if (vx > 0.01) {
    scaleFlipX = 1;
  } else if (vx < -0.01) {
    scaleFlipX = -1;
  }

  // Spin boost & 60 FPS banking tilt rotation
  let spinBoostTimerMs = state.spinBoostTimerMs;
  let angularVelocity = state.angularVelocity;
  let rotation = state.rotation;
  let comboClicks = state.comboClicks;

  if (spinBoostTimerMs > 0) {
    spinBoostTimerMs = Math.max(0, spinBoostTimerMs - dt);
    rotation += angularVelocity * dtSec;
    if (spinBoostTimerMs === 0) {
      angularVelocity = 0;
      comboClicks = 0;
    }
  } else {
    // Gentle banking tilt into movement direction (stays upright, bounded within [-0.28, 0.28])
    const targetTilt = state.stationary
      ? 0
      : Math.max(
          -0.28,
          Math.min(0.28, (vy / cfg.maxSpeed) * 0.22 * scaleFlipX + Math.sin(swimPhaseRad) * 0.05)
        );
    rotation = rotation + (targetTilt - rotation) * Math.min(1, dtSec * 6);
    angularVelocity = 0;
  }

  // Speech bubble & sleeping state
  let speechBubble = state.speechBubble;
  let speechTimerMs = state.speechTimerMs;

  if (isSleeping) {
    speechBubble = 'Zzz...';
  } else if (speechTimerMs > 0) {
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
      speechBubble = 'Unayahayahauna!';
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
      swimPhaseRad,
      scaleX,
      scaleY,
      frameIndex: UPRIGHT_SPRITE_INDEX,
      frameTimerMs: state.frameTimerMs + dt,
      spinBoostTimerMs,
      comboClicks,
      speechBubble,
      speechTimerMs,
      scaleFlipX,
      snacksEaten,
      sleeping: isSleeping,
      stationary: state.stationary,
    },
    snackConsumed,
  };
}
