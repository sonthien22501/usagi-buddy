export type KawaiiIconId =
  | 'sun'
  | 'moon'
  | 'note'
  | 'volume'
  | 'volume-low'
  | 'mute'
  | 'music'
  | 'timer'
  | 'tomato'
  | 'bolt'
  | 'wave'
  | 'coffee'
  | 'play'
  | 'pause'
  | 'reset'
  | 'wardrobe'
  | 'usagi'
  | 'book'
  | 'tie'
  | 'shades'
  | 'star'
  | 'dice'
  | 'lock'
  | 'rotate'
  | 'gamepad'
  | 'pin'
  | 'wand'
  | 'ghost'
  | 'pudding'
  | 'eye-hide'
  | 'dashboard'
  | 'door-quit'
  | 'plus'
  | 'check'
  | 'sparkle';

export const KAWAII_ICONS: Record<KawaiiIconId, string> = {
  sun: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="4.5" fill="#ffe699" />
  <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.8 1.8M17.27 17.27l1.8 1.8M2 12h2.5M19.5 12H22M4.93 19.07l1.8-1.8M17.27 6.73l1.8-1.8" />
</svg>`,

  moon: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a7 7 0 0 0 10 10z" fill="#ffe699" />
  <circle cx="16" cy="7" r="0.8" fill="currentColor" stroke="none" />
</svg>`,

  note: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#fff0c2" />
  <polyline points="14 2 14 8 20 8" />
  <line x1="8" y1="13" x2="16" y2="13" />
  <line x1="8" y1="17" x2="13" y2="17" />
</svg>`,

  volume: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#ffe699" />
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
</svg>`,

  'volume-low': `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#ffe699" />
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
</svg>`,

  mute: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#ffe699" />
  <line x1="22" y1="9" x2="16" y2="15" />
  <line x1="16" y1="9" x2="22" y2="15" />
</svg>`,

  music: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9 18V5l12-2v13" />
  <circle cx="6" cy="18" r="3" fill="var(--accent-strawberry)" />
  <circle cx="18" cy="16" r="3" fill="var(--accent-strawberry)" />
</svg>`,

  timer: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="13" r="8" fill="#fff0c2" />
  <path d="M12 9v4l2.5 1.5M10 2h4M12 2v3" />
</svg>`,

  tomato: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="13" r="8.5" fill="var(--accent-strawberry)" />
  <path d="M12 4.5V2M9 4c1 .8 2 1 3 1s2-.2 3-1M12 4.5c-1.5-.5-3.5-.2-4.5.5M12 4.5c1.5-.5 3.5-.2 4.5.5" />
  <circle cx="9" cy="12" r="0.75" fill="#ffffff" stroke="none" />
</svg>`,

  bolt: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="13 2 4 14 11 14 11 22 20 10 13 10 13 2" fill="#ffe699" />
</svg>`,

  wave: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2 7c2.5-3 5.5-3 8 0s5.5 3 8 0 4-2.5 4-2.5" fill="none" />
  <path d="M2 13c2.5-3 5.5-3 8 0s5.5 3 8 0 4-2.5 4-2.5" fill="none" />
  <path d="M2 19c2.5-3 5.5-3 8 0s5.5 3 8 0 4-2.5 4-2.5" fill="none" />
</svg>`,

  coffee: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
  <path d="M3 8h15v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8z" fill="#fff0c2" />
  <path d="M6 2v2M10 2v2M14 2v2" />
</svg>`,

  play: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="7 4 20 12 7 20 7 4" fill="var(--accent-strawberry)" />
</svg>`,

  pause: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="6" y="4" width="4" height="16" rx="2" fill="var(--accent-strawberry)" />
  <rect x="14" y="4" width="4" height="16" rx="2" fill="var(--accent-strawberry)" />
</svg>`,

  reset: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 12a9 9 0 1 0 2.64-6.36L2 9" />
  <polyline points="2 3 2 9 8 9" />
</svg>`,

  wardrobe: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 4a2 2 0 0 1 2 2c0 1.2-.8 1.8-2 2.5" />
  <path d="M3 18l9-9 9 9H3z" fill="#ffd1dc" />
  <line x1="3" y1="18" x2="21" y2="18" />
</svg>`,

  usagi: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="8.5" cy="5.5" rx="2" ry="4.5" fill="#ffffff" />
  <ellipse cx="15.5" cy="5.5" rx="2" ry="4.5" fill="#ffffff" />
  <circle cx="12" cy="14" r="7" fill="#ffffff" />
  <circle cx="9.5" cy="13.5" r="0.75" fill="currentColor" stroke="none" />
  <circle cx="14.5" cy="13.5" r="0.75" fill="currentColor" stroke="none" />
  <ellipse cx="7.5" cy="15.5" rx="1.2" ry="0.6" fill="var(--accent-strawberry)" stroke="none" />
  <ellipse cx="16.5" cy="15.5" rx="1.2" ry="0.6" fill="var(--accent-strawberry)" stroke="none" />
  <path d="M11 16c.5.5 1.5.5 2 0" />
</svg>`,

  book: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z" fill="#fff0c2" />
  <path d="M6 2v17.5a2.5 2.5 0 0 0 2.5 2.5H20" />
</svg>`,

  tie: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="10 3 14 3 13 6 11 6 10 3" fill="#a0e7e5" />
  <polygon points="11 6 13 6 15 16 12 21 9 16 11 6" fill="#a0e7e5" />
</svg>`,

  shades: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2 10h20" />
  <path d="M3 10v3a4 4 0 0 0 8 0v-3H3z" fill="#5c3a21" />
  <path d="M13 10v3a4 4 0 0 0 8 0v-3h-8z" fill="#5c3a21" />
  <path d="M3 10l-1-3M21 10l1-3" />
</svg>`,

  star: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#ffe699" />
</svg>`,

  dice: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="4" fill="#ffffff" />
  <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
  <circle cx="12" cy="12" r="1" fill="var(--accent-strawberry)" stroke="none" />
  <circle cx="16" cy="16" r="1" fill="currentColor" stroke="none" />
  <circle cx="16" cy="8" r="1" fill="currentColor" stroke="none" />
  <circle cx="8" cy="16" r="1" fill="currentColor" stroke="none" />
</svg>`,

  lock: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="4" y="11" width="16" height="11" rx="3" fill="#ffe699" />
  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
</svg>`,

  rotate: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21.5 2v6h-6" />
  <path d="M21.34 15.57a9 9 0 1 1-.57-8.38l5.67-5.19" />
</svg>`,

  gamepad: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="6" width="20" height="12" rx="6" fill="#ffd1dc" />
  <line x1="6" y1="12" x2="10" y2="12" />
  <line x1="8" y1="10" x2="8" y2="14" />
  <circle cx="15.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
  <circle cx="18" cy="10" r="0.9" fill="currentColor" stroke="none" />
</svg>`,

  pin: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 17v5M5 7h14M8 7V3h8v4M9 7l1 10h4l1-10" fill="var(--accent-strawberry)" />
</svg>`,

  wand: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M15 4l5 5L7 22H2v-5L15 4z" fill="#ffe699" />
  <path d="M18 2v3M21 5h-3M9 13l2 2" />
</svg>`,

  ghost: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 11a8 8 0 0 1 16 0v10l-2.67-2-2.66 2-2.67-2-2.67 2-2.66-2L4 21V11z" fill="#ffffff" />
  <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
  <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
  <ellipse cx="12" cy="14" rx="1.5" ry="1.8" fill="currentColor" stroke="none" />
</svg>`,

  pudding: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="12" cy="19.5" rx="9" ry="2.5" fill="#ffffff" />
  <path d="M5.5 18L7 11h10l1.5 7z" fill="#ffe699" />
  <path d="M7 11c1 1.2 2.5 1 3.5 0s2 1 3 0 2.5 1 3.5 0v2c-.8.8-1.8.8-2.5 0s-1.8.8-2.5 0-1.8.8-2.5 0-1.7-.2-2.5 0V11z" fill="var(--accent-strawberry)" />
  <circle cx="12" cy="7.5" r="2" fill="var(--accent-strawberry)" />
  <path d="M12 5.5c1-2 3-2.5 4-2" />
</svg>`,

  'eye-hide': `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" fill="#fff0c2" />
  <line x1="1" y1="1" x2="23" y2="23" />
</svg>`,

  dashboard: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="8" height="8" rx="2" fill="#ffd1dc" />
  <rect x="13" y="3" width="8" height="5" rx="2" fill="#fff0c2" />
  <rect x="13" y="11" width="8" height="10" rx="2" fill="#ffd1dc" />
  <rect x="3" y="14" width="8" height="7" rx="2" fill="#ffe699" />
</svg>`,

  'door-quit': `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
  <polyline points="16 17 21 12 16 7" />
  <line x1="21" y1="12" x2="9" y2="12" />
</svg>`,

  plus: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="12" y1="5" x2="12" y2="19" />
  <line x1="5" y1="12" x2="19" y2="12" />
</svg>`,

  check: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12" />
</svg>`,

  sparkle: `<svg class="kawaii-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2c.5 4 4 7.5 8 8-4 .5-7.5 4-8 8-.5-4-4-7.5-8-8 4-.5 7.5-4 8-8z" fill="#ffe699" />
</svg>`,
};

export function getKawaiiIcon(id: KawaiiIconId, size: number = 18): string {
  const template = KAWAII_ICONS[id] || KAWAII_ICONS.sparkle;
  return template.replace(
    '<svg class="kawaii-svg"',
    `<svg class="kawaii-svg" width="${size}" height="${size}"`
  );
}

export function renderIconLabel(id: KawaiiIconId, label: string, size: number = 18): string {
  return `<span class="kawaii-icon-wrap">${getKawaiiIcon(id, size)}</span><span>${label}</span>`;
}
