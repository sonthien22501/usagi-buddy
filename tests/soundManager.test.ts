import { describe, expect, it } from 'vitest';
import {
  createSoundState,
  resolveSoundAssetUrl,
  selectSoundForEvent,
  SOUND_ASSET_FILES,
} from '../src/core/soundManager';

describe('soundManager', () => {
  it('correctly encodes special characters like ? in sound filenames (Review Focus #1)', () => {
    const url = resolveSoundAssetUrl('huhhhh?.mp3', '../../assets');
    expect(url).toBe('../../assets/huhhhh%3F.mp3');

    const simpleUrl = resolveSoundAssetUrl('una.mp3', '../../assets');
    expect(simpleUrl).toBe('../../assets/una.mp3');
  });

  it('alternates normal click sounds between una.mp3 and bryy.mp3', () => {
    let state = createSoundState(false, 100);
    const r1 = selectSoundForEvent(state, 'click-normal', 1000);
    expect(r1.file).toBe('una.mp3');
    expect(r1.url).toContain('una.mp3');

    state = r1.state;
    const r2 = selectSoundForEvent(state, 'click-normal', 1200);
    expect(r2.file).toBe('bryy.mp3');
    expect(r2.url).toContain('bryy.mp3');

    state = r2.state;
    const r3 = selectSoundForEvent(state, 'click-normal', 1400);
    expect(r3.file).toBe('una.mp3');
  });

  it('alternates combo click sounds between urararusk.mp3 and wuuulaaaa.mp3', () => {
    let state = createSoundState(false, 100);
    const r1 = selectSoundForEvent(state, 'click-combo', 1000);
    expect(r1.file).toBe('urararusk.mp3');

    state = r1.state;
    const r2 = selectSoundForEvent(state, 'click-combo', 1200);
    expect(r2.file).toBe('wuuulaaaa.mp3');

    state = r2.state;
    const r3 = selectSoundForEvent(state, 'click-combo', 1400);
    expect(r3.file).toBe('urararusk.mp3');
  });

  it('plays unayahayahauna.mp3 for snack-eaten and welcome-back events', () => {
    let state = createSoundState(false, 100);
    const r1 = selectSoundForEvent(state, 'snack-eaten', 1000);
    expect(r1.file).toBe('unayahayahauna.mp3');

    state = r1.state;
    const r2 = selectSoundForEvent(state, 'welcome-back', 1200);
    expect(r2.file).toBe('unayahayahauna.mp3');
  });

  it('plays huhhhh?.mp3 for wellness-reminder event with encoded URL', () => {
    const state = createSoundState(false, 100);
    const r = selectSoundForEvent(state, 'wellness-reminder', 1000);
    expect(r.file).toBe('huhhhh?.mp3');
    expect(r.url).toBe('../../assets/huhhhh%3F.mp3');
  });

  it('throttles sound playback during cooldown window and respects mute gate (Review Focus #2)', () => {
    let state = createSoundState(false, 250);
    const r1 = selectSoundForEvent(state, 'click-normal', 1000);
    expect(r1.file).toBe('una.mp3');

    state = r1.state;
    // Rapid event within 250ms cooldown window -> null
    const r2 = selectSoundForEvent(state, 'click-normal', 1100);
    expect(r2.file).toBeNull();
    expect(r2.url).toBeNull();

    // After cooldown window passes -> plays
    const r3 = selectSoundForEvent(state, 'click-normal', 1300);
    expect(r3.file).not.toBeNull();

    // Muted state -> always null
    const mutedState = createSoundState(true, 250);
    const rMuted = selectSoundForEvent(mutedState, 'click-normal', 2000);
    expect(rMuted.file).toBeNull();
    expect(rMuted.url).toBeNull();
  });

  it('verifies SOUND_ASSET_FILES lists all 6 expected voice assets', () => {
    expect(SOUND_ASSET_FILES).toEqual([
      'una.mp3',
      'bryy.mp3',
      'huhhhh?.mp3',
      'urararusk.mp3',
      'unayahayahauna.mp3',
      'wuuulaaaa.mp3',
    ]);
  });
});
