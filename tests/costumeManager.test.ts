import { describe, expect, it } from 'vitest';
import {
  ALL_COSTUME_IDS,
  COSTUME_AUTO_ROTATE_INTERVAL_MS,
  COSTUME_DEFINITIONS,
  GIANT_ALARM_SPRITES,
  WardrobeRotationState,
  createWardrobeRotationState,
  getCostumeDefinition,
  getNextCostume,
  isKnownCostumeId,
  isKnownOutfitSelection,
  normalizeCostumeId,
  pickRandomCostume,
  pickRandomGiantAlarmSprite,
  tickWardrobeRotation,
} from '../src/core/costumeManager';

describe('costumeManager', () => {
  it('defines 5 distinct costumes including classic, study, vest, sigma, star', () => {
    expect(ALL_COSTUME_IDS).toEqual(['classic', 'study', 'vest', 'sigma', 'star']);
    expect(COSTUME_DEFINITIONS.length).toBe(5);
    for (const def of COSTUME_DEFINITIONS) {
      expect(def.id).toBeTruthy();
      expect(def.label).toBeTruthy();
      expect(def.filename).toMatch(/\.png$/);
    }
    const sigmaDef = COSTUME_DEFINITIONS.find((d) => d.id === 'sigma');
    expect(sigmaDef?.label).toBe('Sigma');
    expect(sigmaDef?.filename).toBe('Usagi_Ngau.png');
  });

  it('validates known costume IDs and selections, including ngau alias', () => {
    expect(isKnownCostumeId('study')).toBe(true);
    expect(isKnownCostumeId('vest')).toBe(true);
    expect(isKnownCostumeId('sigma')).toBe(true);
    expect(isKnownCostumeId('star')).toBe(true);
    expect(isKnownCostumeId('classic')).toBe(true);
    expect(isKnownCostumeId('unknown')).toBe(false);

    expect(isKnownOutfitSelection('random')).toBe(true);
    expect(isKnownOutfitSelection('study')).toBe(true);
    expect(isKnownOutfitSelection('sigma')).toBe(true);
    expect(isKnownOutfitSelection('ngau')).toBe(true);
    expect(isKnownOutfitSelection('invalid')).toBe(false);

    expect(normalizeCostumeId('ngau')).toBe('sigma');
    expect(normalizeCostumeId('sigma')).toBe('sigma');
  });

  it('returns valid definition or falls back to classic for invalid id', () => {
    const study = getCostumeDefinition('study');
    expect(study.label).toBe('Study Mode');
    expect(study.filename).toBe('Usagi_Study.png');

    const sigma = getCostumeDefinition('sigma');
    expect(sigma.label).toBe('Sigma');

    // @ts-expect-error test fallback for unknown id
    const fallback = getCostumeDefinition('non-existent');
    expect(fallback.id).toBe('classic');
  });

  it('cycles through costumes sequentially with getNextCostume', () => {
    expect(getNextCostume('classic')).toBe('study');
    expect(getNextCostume('study')).toBe('vest');
    expect(getNextCostume('vest')).toBe('sigma');
    expect(getNextCostume('sigma')).toBe('star');
    expect(getNextCostume('star')).toBe('classic');
  });

  it('picks random costume respecting exclusions', () => {
    const picked = pickRandomCostume('study', () => 0);
    expect(picked).not.toBe('study');
    expect(ALL_COSTUME_IDS).toContain(picked);

    // Constant deterministic randomFn
    const pickedFirst = pickRandomCostume(undefined, () => 0.0);
    expect(pickedFirst).toBe('classic');

    const pickedLast = pickRandomCostume(undefined, () => 0.99);
    expect(pickedLast).toBe('star');
  });

  it('randomizes giant alarm sprites between Usagi_Big and Usagi_Big2 without immediate duplicate', () => {
    expect(GIANT_ALARM_SPRITES).toEqual(['Usagi_Big.png', 'Usagi_Big2.png']);

    const afterBig = pickRandomGiantAlarmSprite('Usagi_Big.png', () => 0);
    expect(afterBig).toBe('Usagi_Big2.png');

    const afterBig2 = pickRandomGiantAlarmSprite('Usagi_Big2.png', () => 0);
    expect(afterBig2).toBe('Usagi_Big.png');
  });

  it('defines 30-minute auto-rotate interval constant as 1,800,000 ms', () => {
    expect(COSTUME_AUTO_ROTATE_INTERVAL_MS).toBe(30 * 60 * 1000);
    expect(COSTUME_AUTO_ROTATE_INTERVAL_MS).toBe(1_800_000);
  });

  it('creates wardrobe rotation state with default fixedAppearance = false and 0 elapsed', () => {
    const sDefault = createWardrobeRotationState();
    expect(sDefault.fixedAppearance).toBe(false);
    expect(sDefault.elapsedMs).toBe(0);

    const sFixed = createWardrobeRotationState(true);
    expect(sFixed.fixedAppearance).toBe(true);
    expect(sFixed.elapsedMs).toBe(0);
  });

  it('rotates costume automatically every 30 minutes when fixedAppearance is false', () => {
    let state = createWardrobeRotationState(false);
    let currentCostume = 'classic' as const;

    // Accumulating 15 minutes (900,000 ms) -> no rotation
    const r1 = tickWardrobeRotation(state, currentCostume, 15 * 60 * 1000);
    state = r1.state;
    expect(r1.nextCostume).toBeNull();
    expect(state.elapsedMs).toBe(15 * 60 * 1000);

    // Another 14 minutes (840,000 ms) -> 29m total, still no rotation
    const r2 = tickWardrobeRotation(state, currentCostume, 14 * 60 * 1000);
    state = r2.state;
    expect(r2.nextCostume).toBeNull();
    expect(state.elapsedMs).toBe(29 * 60 * 1000);

    // Final 1 minute (60,000 ms) -> 30m reached, picks new costume
    const r3 = tickWardrobeRotation(state, currentCostume, 60 * 1000, () => 0);
    state = r3.state;
    expect(r3.nextCostume).not.toBeNull();
    expect(r3.nextCostume).not.toBe('classic');
    expect(state.elapsedMs).toBe(0);

    // Another tick immediately with small dtMs doesn't rotate again
    const r4 = tickWardrobeRotation(state, r3.nextCostume!, 5000);
    expect(r4.nextCostume).toBeNull();
    expect(r4.state.elapsedMs).toBe(5000);
  });

  it('locks appearance and never rotates when fixedAppearance is true', () => {
    let state = createWardrobeRotationState(true);

    // Advance 60 minutes
    const r1 = tickWardrobeRotation(state, 'study', 60 * 60 * 1000);
    expect(r1.nextCostume).toBeNull();
    expect(r1.state.elapsedMs).toBe(0);
    expect(r1.state.fixedAppearance).toBe(true);
  });
});
