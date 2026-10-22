import { describe, expect, it } from 'vitest';
import {
  ALL_COSTUME_IDS,
  COSTUME_DEFINITIONS,
  GIANT_ALARM_SPRITES,
  getCostumeDefinition,
  getNextCostume,
  isKnownCostumeId,
  isKnownOutfitSelection,
  pickRandomCostume,
  pickRandomGiantAlarmSprite,
} from '../src/core/costumeManager';

describe('costumeManager', () => {
  it('defines 5 distinct costumes including classic, study, vest, ngau, star', () => {
    expect(ALL_COSTUME_IDS).toEqual(['classic', 'study', 'vest', 'ngau', 'star']);
    expect(COSTUME_DEFINITIONS.length).toBe(5);
    for (const def of COSTUME_DEFINITIONS) {
      expect(def.id).toBeTruthy();
      expect(def.label).toBeTruthy();
      expect(def.filename).toMatch(/\.png$/);
    }
  });

  it('validates known costume IDs and selections', () => {
    expect(isKnownCostumeId('study')).toBe(true);
    expect(isKnownCostumeId('vest')).toBe(true);
    expect(isKnownCostumeId('ngau')).toBe(true);
    expect(isKnownCostumeId('star')).toBe(true);
    expect(isKnownCostumeId('classic')).toBe(true);
    expect(isKnownCostumeId('unknown')).toBe(false);

    expect(isKnownOutfitSelection('random')).toBe(true);
    expect(isKnownOutfitSelection('study')).toBe(true);
    expect(isKnownOutfitSelection('invalid')).toBe(false);
  });

  it('returns valid definition or falls back to classic for invalid id', () => {
    const study = getCostumeDefinition('study');
    expect(study.label).toBe('Study Mode');
    expect(study.filename).toBe('Usagi_Study.png');

    // @ts-expect-error test fallback for unknown id
    const fallback = getCostumeDefinition('non-existent');
    expect(fallback.id).toBe('classic');
  });

  it('cycles through costumes sequentially with getNextCostume', () => {
    expect(getNextCostume('classic')).toBe('study');
    expect(getNextCostume('study')).toBe('vest');
    expect(getNextCostume('vest')).toBe('ngau');
    expect(getNextCostume('ngau')).toBe('star');
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
});
