import { cropSpriteToAlphaBounds, CroppedSprite } from '../core/alphaCropper';
import {
  createGhostModeState,
  HitTarget,
  shouldIgnoreMouseEvents,
} from '../core/ghostModeController';
import {
  createInitialUsagiState,
  DEFAULT_PHYSICS_CONFIG,
  ScreenBounds,
  SnackTarget,
  stepUsagiPhysics,
  triggerUsagiInteraction,
  UPRIGHT_SPRITE_INDEX,
  UsagiState,
  Vector2D,
} from '../core/physicsEngine';
import {
  createSoundState,
  resolveSoundAssetUrl,
  selectSoundForEvent,
  SoundEvent,
  SoundState,
} from '../core/soundManager';

interface ProcessedFrame {
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;
}

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let screenBounds: ScreenBounds = {
  width: window.innerWidth,
  height: window.innerHeight,
};

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  screenBounds = { width: canvas.width, height: canvas.height };
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let state: UsagiState = createInitialUsagiState(screenBounds);
let ghostState = createGhostModeState(false);
let soundState: SoundState = createSoundState(false, 250);
let playModeEnabled = false;
let activeSnack: SnackTarget | null = null;
let cursorPos: Vector2D | null = null;
const processedFrames: ProcessedFrame[] = [];

function playSound(event: SoundEvent): string | null {
  const now = performance.now();
  const result = selectSoundForEvent(soundState, event, now, '../../assets');
  soundState = result.state;

  if (result.url) {
    try {
      const audio = new Audio(result.url);
      audio.volume = 0.85;
      audio.play().catch(() => {
        if (result.file) {
          const fallbackUrl = resolveSoundAssetUrl(result.file, '../assets');
          const fallbackAudio = new Audio(fallbackUrl);
          fallbackAudio.volume = 0.85;
          fallbackAudio.play().catch(() => {});
        }
      });
    } catch {
      // Audio playback handles errors gracefully
    }
  }

  return result.text;
}

function updateMouseIgnoreState(): void {
  const usagiTarget: HitTarget = {
    x: state.x,
    y: state.y,
    radius: DEFAULT_PHYSICS_CONFIG.spriteRadius * 1.2,
  };

  const snackTarget: HitTarget | null =
    activeSnack && activeSnack.active
      ? { x: activeSnack.x, y: activeSnack.y, radius: activeSnack.radius * 1.25 }
      : null;

  const shouldIgnore = shouldIgnoreMouseEvents(
    ghostState.ghostModeLocked,
    cursorPos,
    usagiTarget,
    snackTarget
  );

  if (shouldIgnore !== ghostState.currentlyIgnoringMouse) {
    ghostState.currentlyIgnoringMouse = shouldIgnore;
    window.usagiAPI?.setIgnoreMouseEvents(shouldIgnore, { forward: true });
  }
}

window.addEventListener('pointermove', (e: MouseEvent) => {
  cursorPos = { x: e.clientX, y: e.clientY };
  updateMouseIgnoreState();
});

window.addEventListener('mouseleave', () => {
  cursorPos = null;
  updateMouseIgnoreState();
});

window.addEventListener('pointerdown', (e: MouseEvent) => {
  if (ghostState.ghostModeLocked) return;

  const distToUsagi = Math.hypot(e.clientX - state.x, e.clientY - state.y);
  if (distToUsagi <= DEFAULT_PHYSICS_CONFIG.spriteRadius * 1.25) {
    const prev = state.speechBubble;
    state = triggerUsagiInteraction(state);
    const soundEvent: SoundEvent = state.comboClicks >= 3 ? 'click-combo' : 'click-normal';
    const text = playSound(soundEvent);
    state.speechBubble = text ?? prev ?? state.speechBubble;
    updateMouseIgnoreState();
  }
});

if (window.usagiAPI) {
  window.usagiAPI.onGhostModeChanged((locked) => {
    ghostState.ghostModeLocked = locked;
    updateMouseIgnoreState();
  });

  window.usagiAPI.onPlayModeChanged((enabled) => {
    playModeEnabled = enabled;
  });

  window.usagiAPI.onSoundMutedChanged((muted) => {
    soundState = { ...soundState, muted };
  });

  window.usagiAPI.onWellnessUpdate((payload) => {
    state = {
      ...state,
      sleeping: payload.mood === 'sleeping',
    };
    if (payload.message) {
      state.speechBubble = payload.message;
      state.speechTimerMs = DEFAULT_PHYSICS_CONFIG.speechDurationMs * 2.2;
    }
    if (payload.soundEvent) {
      const text = playSound(payload.soundEvent);
      if (text) {
        // Reminder keeps the full payload message (already contains the voice word); other events use the returned voice text
        state.speechBubble =
          payload.soundEvent === 'wellness-reminder' && payload.message ? payload.message : text;
      }
    }
  });

  window.usagiAPI.onSnackSpawned((snack) => {
    activeSnack = snack;
  });

  window.usagiAPI.onTriggerInteraction(() => {
    const prev = state.speechBubble;
    state = triggerUsagiInteraction(state);
    const soundEvent: SoundEvent = state.comboClicks >= 3 ? 'click-combo' : 'click-normal';
    const text = playSound(soundEvent);
    state.speechBubble = text ?? prev ?? state.speechBubble;
  });
}

function loadSingleSprite(index: number): Promise<ProcessedFrame> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = `../../assets/Usagi${index}.png`;

    img.onerror = () => {
      img.src = `../assets/Usagi${index}.png`;
    };

    img.onload = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = img.naturalWidth;
      offscreen.height = img.naturalHeight;
      const offCtx = offscreen.getContext('2d')!;
      offCtx.drawImage(img, 0, 0);

      const imgData = offCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
      const cropped: CroppedSprite = cropSpriteToAlphaBounds(`Usagi${index}`, imgData, 10);

      const trimmed = document.createElement('canvas');
      trimmed.width = cropped.bounds.width;
      trimmed.height = cropped.bounds.height;
      const trimmedCtx = trimmed.getContext('2d')!;

      const trimmedData = trimmedCtx.createImageData(cropped.bounds.width, cropped.bounds.height);
      trimmedData.data.set(cropped.trimmedData);
      trimmedCtx.putImageData(trimmedData, 0, 0);

      resolve({
        canvas: trimmed,
        width: cropped.bounds.width,
        height: cropped.bounds.height,
        centerX: cropped.bounds.centerX,
        centerY: cropped.bounds.centerY,
      });
    };
  });
}

async function loadAllSprites(): Promise<void> {
  const promises: Promise<ProcessedFrame>[] = [];
  for (let i = 1; i <= 6; i++) {
    promises.push(loadSingleSprite(i));
  }
  const loaded = await Promise.all(promises);
  processedFrames.push(...loaded);
}

function drawSnack(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.save();
  context.translate(x, y);

  // Pudding plate
  context.beginPath();
  context.ellipse(0, radius * 0.55, radius * 1.15, radius * 0.45, 0, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.fill();
  context.lineWidth = 2.5;
  context.strokeStyle = '#D1D8E0';
  context.stroke();

  // Custard body
  context.beginPath();
  context.moveTo(-radius * 0.7, radius * 0.5);
  context.lineTo(-radius * 0.5, -radius * 0.35);
  context.quadraticCurveTo(0, -radius * 0.5, radius * 0.5, -radius * 0.35);
  context.lineTo(radius * 0.7, radius * 0.5);
  context.closePath();
  context.fillStyle = '#FFEAA7';
  context.fill();
  context.lineWidth = 2.5;
  context.strokeStyle = '#E17055';
  context.stroke();

  // Caramel layer on top
  context.beginPath();
  context.moveTo(-radius * 0.52, -radius * 0.35);
  context.quadraticCurveTo(0, -radius * 0.55, radius * 0.52, -radius * 0.35);
  context.quadraticCurveTo(radius * 0.3, -radius * 0.15, 0, -radius * 0.25);
  context.quadraticCurveTo(-radius * 0.3, -radius * 0.15, -radius * 0.52, -radius * 0.35);
  context.closePath();
  context.fillStyle = '#6C3415';
  context.fill();

  // Strawberry topper
  context.beginPath();
  context.arc(0, -radius * 0.65, radius * 0.32, 0, Math.PI * 2);
  context.fillStyle = '#FF4757';
  context.fill();
  context.lineWidth = 1.5;
  context.strokeStyle = '#B33939';
  context.stroke();

  // Strawberry leaf
  context.beginPath();
  context.ellipse(radius * 0.12, -radius * 0.95, radius * 0.12, radius * 0.2, 0.5, 0, Math.PI * 2);
  context.fillStyle = '#2ED573';
  context.fill();

  context.restore();
}

function drawSpeechBubble(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string
): void {
  context.save();

  context.font = 'bold 18px "Segoe UI", "Comic Sans MS", "Nunito", sans-serif';
  const metrics = context.measureText(text);
  const paddingX = 16;
  const paddingY = 8;
  const bubbleWidth = metrics.width + paddingX * 2;
  const bubbleHeight = 36;
  const bx = x - bubbleWidth / 2;
  const by = y - bubbleHeight;
  const r = 12;

  // Draw rounded rect bubble
  context.beginPath();
  context.moveTo(bx + r, by);
  context.lineTo(bx + bubbleWidth - r, by);
  context.quadraticCurveTo(bx + bubbleWidth, by, bx + bubbleWidth, by + r);
  context.lineTo(bx + bubbleWidth, by + bubbleHeight - r);
  context.quadraticCurveTo(
    bx + bubbleWidth,
    by + bubbleHeight,
    bx + bubbleWidth - r,
    by + bubbleHeight
  );
  // Pointer beak
  context.lineTo(x + 8, by + bubbleHeight);
  context.lineTo(x, by + bubbleHeight + 10);
  context.lineTo(x - 8, by + bubbleHeight);
  context.lineTo(bx + r, by + bubbleHeight);
  context.quadraticCurveTo(bx, by + bubbleHeight, bx, by + bubbleHeight - r);
  context.lineTo(bx, by + r);
  context.quadraticCurveTo(bx, by, bx + r, by);
  context.closePath();

  // Fill with drop shadow
  context.shadowColor = 'rgba(0, 0, 0, 0.15)';
  context.shadowBlur = 8;
  context.shadowOffsetY = 3;
  context.fillStyle = '#FFFFFF';
  context.fill();

  // Border
  context.shadowColor = 'transparent';
  context.lineWidth = 2.5;
  context.strokeStyle = '#2D3436';
  context.stroke();

  // Text
  context.fillStyle = '#D63031';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, x, by + bubbleHeight / 2);

  context.restore();
}

function drawUsagi(
  context: CanvasRenderingContext2D,
  currentState: UsagiState,
  frame: ProcessedFrame
): void {
  context.save();
  context.translate(currentState.x, currentState.y);
  context.rotate(currentState.rotation);

  // 60 FPS organic squash-and-stretch swimming on the upright frame
  const targetDiameter = DEFAULT_PHYSICS_CONFIG.spriteRadius * 2.15;
  const baseScale = targetDiameter / frame.height;
  const sx = currentState.scaleFlipX * baseScale * currentState.scaleX;
  const sy = baseScale * currentState.scaleY;
  context.scale(sx, sy);

  context.drawImage(frame.canvas, -frame.centerX, -frame.centerY);
  context.restore();
}

let lastTime = performance.now();

function animationLoop(now: number): void {
  const dt = now - lastTime;
  lastTime = now;

  const cursorTarget = playModeEnabled && !ghostState.ghostModeLocked ? cursorPos : null;
  const result = stepUsagiPhysics(state, dt, screenBounds, activeSnack, undefined, cursorTarget);
  state = result.state;

  if (result.snackConsumed && activeSnack) {
    activeSnack = null;
    const text = playSound('snack-eaten');
    if (text) {
      state.speechBubble = text;
    }
    window.usagiAPI?.notifySnackConsumed();
  }

  updateMouseIgnoreState();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (activeSnack && activeSnack.active) {
    drawSnack(ctx, activeSnack.x, activeSnack.y, activeSnack.radius);
  }

  // Uses upright sprite frame (Usagi3.png) for 60 FPS continuous swimming
  const uprightFrame = processedFrames[UPRIGHT_SPRITE_INDEX] || processedFrames[0];
  if (uprightFrame) {
    drawUsagi(ctx, state, uprightFrame);
  }

  if (state.speechBubble) {
    drawSpeechBubble(
      ctx,
      state.x,
      state.y - DEFAULT_PHYSICS_CONFIG.spriteRadius - 15,
      state.speechBubble
    );
  }

  requestAnimationFrame(animationLoop);
}

loadAllSprites()
  .then(() => {
    lastTime = performance.now();
    requestAnimationFrame(animationLoop);
  })
  .catch((err) => {
    console.error('Failed to load Usagi sprites:', err);
  });
