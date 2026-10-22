export type CostumeId = 'classic' | 'study' | 'vest' | 'ngau' | 'star';

export type OutfitSelection = CostumeId | 'random';

export interface CostumeDefinition {
  readonly id: CostumeId;
  readonly label: string;
  readonly icon: string;
  readonly filename: string;
  readonly description: string;
}

export const COSTUME_DEFINITIONS: readonly CostumeDefinition[] = [
  {
    id: 'classic',
    label: 'Classic Float',
    icon: '🐰',
    filename: 'Usagi3.png',
    description: 'Original swimming companion',
  },
  {
    id: 'study',
    label: 'Study Mode',
    icon: '📚',
    filename: 'Usagi_Study.png',
    description: 'Focused study session with book & pencil',
  },
  {
    id: 'vest',
    label: 'Work / Vest',
    icon: '👔',
    filename: 'Usagi_Vest.png',
    description: 'Corporate professionalism & deep work',
  },
  {
    id: 'ngau',
    label: 'Ngầu / Cool',
    icon: '🕶️',
    filename: 'Usagi_Ngau.png',
    description: 'Cool shades and chill swagger',
  },
  {
    id: 'star',
    label: 'Star / Sparkle',
    icon: '⭐',
    filename: 'Usagi_Star.png',
    description: 'Magical sparkle star companion',
  },
] as const;

export const GIANT_ALARM_SPRITES: readonly string[] = ['Usagi_Big.png', 'Usagi_Big2.png'] as const;

export const ALL_COSTUME_IDS: readonly CostumeId[] = [
  'classic',
  'study',
  'vest',
  'ngau',
  'star',
] as const;

export function isKnownCostumeId(id: string): id is CostumeId {
  return (ALL_COSTUME_IDS as readonly string[]).includes(id);
}

export function isKnownOutfitSelection(val: string): val is OutfitSelection {
  return val === 'random' || isKnownCostumeId(val);
}

export function getCostumeDefinition(id: CostumeId): CostumeDefinition {
  const found = COSTUME_DEFINITIONS.find((def) => def.id === id);
  if (!found) {
    return COSTUME_DEFINITIONS[0];
  }
  return found;
}

export function getNextCostume(current: CostumeId): CostumeId {
  const idx = ALL_COSTUME_IDS.indexOf(current);
  if (idx === -1) {
    return ALL_COSTUME_IDS[0];
  }
  const nextIdx = (idx + 1) % ALL_COSTUME_IDS.length;
  return ALL_COSTUME_IDS[nextIdx];
}

export function pickRandomCostume(
  exclude?: CostumeId,
  randomFn: () => number = Math.random
): CostumeId {
  const candidates = exclude ? ALL_COSTUME_IDS.filter((id) => id !== exclude) : ALL_COSTUME_IDS;
  const safeCandidates = candidates.length > 0 ? candidates : ALL_COSTUME_IDS;
  const pickedIndex = Math.floor(randomFn() * safeCandidates.length);
  return safeCandidates[pickedIndex];
}

export function pickRandomGiantAlarmSprite(
  previous?: string,
  randomFn: () => number = Math.random
): string {
  const candidates = previous
    ? GIANT_ALARM_SPRITES.filter((file) => file !== previous)
    : GIANT_ALARM_SPRITES;
  const pool = candidates.length > 0 ? candidates : GIANT_ALARM_SPRITES;
  const pickedIndex = Math.floor(randomFn() * pool.length);
  return pool[pickedIndex];
}
