import { describe, expect, it } from 'vitest';
import {
  createSoundState,
  resolveSoundAssetUrl,
  selectSoundForEvent,
  SOUND_ASSET_FILES,
  voiceTextForFile,
} from '../src/core/soundManager';

describe('soundManager', () => {
  it('correctly encodes special characters like spaces or symbols in sound filenames', () => {
    const url = resolveSoundAssetUrl('huhhhh.mp3', '../../assets');
    expect(url).toBe('../../assets/huhhhh.mp3');

    const simpleUrl = resolveSoundAssetUrl('una.mp3', '../../assets');
    expect(simpleUrl).toBe('../../assets/una.mp3');
  });

  it('derives voice text from file names per the v0.3 voice line table', () => {
    expect(voiceTextForFile('una.mp3')).toBe('Una!');
    expect(voiceTextForFile('bryy.mp3')).toBe('Bryy!');
    expect(voiceTextForFile('huhhhh.mp3')).toBe('Huhhhh?');
    expect(voiceTextForFile('urararusk.mp3')).toBe('Urararusk!');
    expect(voiceTextForFile('unayahayahauna.mp3')).toBe('Unayahayahauna!');
    expect(voiceTextForFile('wuuulaaaa.mp3')).toBe('Wuuulaaaa!');
  });

  it('alternates normal click sounds between una.mp3 and bryy.mp3 with matching voice text', () => {
    let state = createSoundState(false, 100);
    const r1 = selectSoundForEvent(state, 'click-normal', 0);
    expect(r1.file).toBe('una.mp3');
    expect(r1.url).toContain('una.mp3');
    expect(r1.text).toBe('Una!');

    state = r1.state;
    const r2 = selectSoundForEvent(state, 'click-normal', 1000);
    expect(r2.file).toBe('bryy.mp3');
    expect(r2.url).toContain('bryy.mp3');
    expect(r2.text).toBe('Bryy!');

    state = r2.state;
    const r3 = selectSoundForEvent(state, 'click-normal', 1400);
    expect(r3.file).toBe('una.mp3');
    expect(r3.text).toBe('Una!');
  });

  it('alternates combo click sounds between urararusk.mp3 and wuuulaaaa.mp3 with matching voice text', () => {
    let state = createSoundState(false, 100);
    const r1 = selectSoundForEvent(state, 'click-combo', 1000);
    expect(r1.file).toBe('urararusk.mp3');
    expect(r1.text).toBe('Urararusk!');

    state = r1.state;
    const r2 = selectSoundForEvent(state, 'click-combo', 1200);
    expect(r2.file).toBe('wuuulaaaa.mp3');
    expect(r2.text).toBe('Wuuulaaaa!');

    state = r2.state;
    const r3 = selectSoundForEvent(state, 'click-combo', 1400);
    expect(r3.file).toBe('urararusk.mp3');
    expect(r3.text).toBe('Urararusk!');
  });

  it('plays unayahayahauna.mp3 for snack-eaten and welcome-back events with the snack voice text', () => {
    let state = createSoundState(false, 100);
    const r1 = selectSoundForEvent(state, 'snack-eaten', 1000);
    expect(r1.file).toBe('unayahayahauna.mp3');
    expect(r1.text).toBe('Unayahayahauna!');

    state = r1.state;
    const r2 = selectSoundForEvent(state, 'welcome-back', 1200);
    expect(r2.file).toBe('unayahayahauna.mp3');
    expect(r2.text).toBe('Unayahayahauna!');
  });

  it('plays huhhhh.mp3 for wellness-reminder event with encoded URL and water voice text', () => {
    const state = createSoundState(false, 100);
    const r = selectSoundForEvent(state, 'wellness-reminder', 1000);
    expect(r.file).toBe('huhhhh.mp3');
    expect(r.url).toBe('../../assets/huhhhh.mp3');
    expect(r.text).toBe('Huhhhh?');
  });

  it('throttles sound playback during cooldown window and respects mute gate (Review Focus #2)', () => {
    let state = createSoundState(false, 250);
    const r1 = selectSoundForEvent(state, 'click-normal', 1000);
    expect(r1.file).toBe('una.mp3');
    expect(r1.text).toBe('Una!');

    state = r1.state;
    // Rapid event within 250ms cooldown window -> null
    const r2 = selectSoundForEvent(state, 'click-normal', 1100);
    expect(r2.file).toBeNull();
    expect(r2.url).toBeNull();
    expect(r2.text).toBeNull();

    // After cooldown window passes -> plays
    const r3 = selectSoundForEvent(state, 'click-normal', 1300);
    expect(r3.file).not.toBeNull();

    // Muted state -> url is null but text is still the selected voice line
    const mutedState = createSoundState(true, 250);
    const rMuted = selectSoundForEvent(mutedState, 'click-normal', 2000);
    expect(rMuted.url).toBeNull();
    expect(rMuted.file).toBe('una.mp3');
    expect(rMuted.text).toBe('Una!');
  });

  it('verifies SOUND_ASSET_FILES lists all 6 expected voice assets', () => {
    expect(SOUND_ASSET_FILES).toEqual([
      'una.mp3',
      'bryy.mp3',
      'huhhhh.mp3',
      'urararusk.mp3',
      'unayahayahauna.mp3',
      'wuuulaaaa.mp3',
    ]);
  });
});
