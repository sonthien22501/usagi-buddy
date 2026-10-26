import { describe, expect, it } from 'vitest';
import {
  calculatePlaybackVolume,
  createSoundState,
  resolveSoundAssetUrl,
  selectSoundForEvent,
  SOUND_ASSET_FILES,
  voiceTextForFile,
  NORMAL_CLICK_CLIPS,
  COMBO_CLICK_CLIPS,
  pickRandomClip,
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

  it('randomizes normal click sounds across normal clips without repeating last clip', () => {
    expect(NORMAL_CLICK_CLIPS).toEqual(['una.mp3', 'bryy.mp3', 'huhhhh.mp3']);

    let state = createSoundState(false, 100);
    // Pick first clip using deterministic randomFn () => 0 -> 'una.mp3'
    const r1 = selectSoundForEvent(state, 'click-normal', 0, '../../assets', () => 0);
    expect(r1.file).toBe('una.mp3');
    expect(r1.url).toContain('una.mp3');
    expect(r1.text).toBe('Una!');

    state = r1.state;
    // Next click excludes 'una.mp3', candidates are ['bryy.mp3', 'huhhhh.mp3']
    // Index 0 -> 'bryy.mp3'
    const r2 = selectSoundForEvent(state, 'click-normal', 1000, '../../assets', () => 0);
    expect(r2.file).toBe('bryy.mp3');
    expect(r2.url).toContain('bryy.mp3');
    expect(r2.text).toBe('Bryy!');

    state = r2.state;
    // Next click with index 1 (using () => 0.99) among ['una.mp3', 'huhhhh.mp3'] -> 'huhhhh.mp3'
    const r3 = selectSoundForEvent(state, 'click-normal', 1400, '../../assets', () => 0.99);
    expect(r3.file).toBe('huhhhh.mp3');
    expect(r3.text).toBe('Huhhhh?');
  });

  it('randomizes combo click sounds across combo clips without repeating last clip', () => {
    expect(COMBO_CLICK_CLIPS).toEqual(['urararusk.mp3', 'wuuulaaaa.mp3', 'unayahayahauna.mp3']);

    let state = createSoundState(false, 100);
    const r1 = selectSoundForEvent(state, 'click-combo', 1000, '../../assets', () => 0);
    expect(r1.file).toBe('urararusk.mp3');
    expect(r1.text).toBe('Urararusk!');

    state = r1.state;
    const r2 = selectSoundForEvent(state, 'click-combo', 1200, '../../assets', () => 0);
    expect(r2.file).toBe('wuuulaaaa.mp3');
    expect(r2.text).toBe('Wuuulaaaa!');

    state = r2.state;
    const r3 = selectSoundForEvent(state, 'click-combo', 1400, '../../assets', () => 0.99);
    expect(r3.file).toBe('unayahayahauna.mp3');
    expect(r3.text).toBe('Unayahayahauna!');
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

  it('plays wuuulaaaa.mp3 for timer-complete event for giant alarm takeover', () => {
    const state = createSoundState(false, 100);
    const r = selectSoundForEvent(state, 'timer-complete', 1000);
    expect(r.file).toBe('wuuulaaaa.mp3');
    expect(r.url).toBe('../../assets/wuuulaaaa.mp3');
    expect(r.text).toBe('Wuuulaaaa!');
  });

  it('throttles sound playback during cooldown window and respects mute gate (Review Focus #2)', () => {
    let state = createSoundState(false, 250);
    const r1 = selectSoundForEvent(state, 'click-normal', 1000, '../../assets', () => 0);
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
    const rMuted = selectSoundForEvent(mutedState, 'click-normal', 2000, '../../assets', () => 0);
    expect(rMuted.url).toBeNull();
    expect(rMuted.file).toBe('una.mp3');
    expect(rMuted.text).toBe('Una!');
  });

  it('bypasses cooldown throttle for snack-eaten, wellness-reminder, and timer-complete events', () => {
    let state = createSoundState(false, 300);
    // Click sound plays at t=1000
    const rClick = selectSoundForEvent(state, 'click-normal', 1000);
    expect(rClick.file).not.toBeNull();
    state = rClick.state;

    // Only 50ms later (within 300ms cooldown)
    const rSnack = selectSoundForEvent(state, 'snack-eaten', 1050);
    expect(rSnack.file).toBe('unayahayahauna.mp3');
    expect(rSnack.url).toContain('unayahayahauna.mp3');
    expect(rSnack.text).toBe('Unayahayahauna!');

    // Another 50ms later, wellness-reminder also bypasses cooldown
    const rWater = selectSoundForEvent(rSnack.state, 'wellness-reminder', 1100);
    expect(rWater.file).toBe('huhhhh.mp3');
    expect(rWater.url).toContain('huhhhh.mp3');
    expect(rWater.text).toBe('Huhhhh?');

    // Normal click within cooldown is still throttled
    const rClickThrottled = selectSoundForEvent(rWater.state, 'click-normal', 1150);
    expect(rClickThrottled.file).toBeNull();
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

  it('separates buddy sound volume from giant alarm volume', () => {
    const config = {
      master: 1.0,
      buddy: 0.5,
      alarm: 0.9,
      equalizeLoudness: false,
    };

    const buddyVol = calculatePlaybackVolume(config, 'click-normal', 'una.mp3', false);
    const alarmVol = calculatePlaybackVolume(config, 'timer-complete', 'wuuulaaaa.mp3', false);

    expect(buddyVol).toBeCloseTo(0.5, 2);
    expect(alarmVol).toBeCloseTo(0.9, 2);
  });

  it('equalizes clip loudness so loud screams and speech have normalized load levels', () => {
    const config = {
      master: 1.0,
      buddy: 1.0,
      alarm: 1.0,
      equalizeLoudness: true,
    };

    const unaVol = calculatePlaybackVolume(config, 'click-normal', 'una.mp3', false);
    const wuuulaaaaVol = calculatePlaybackVolume(config, 'timer-complete', 'wuuulaaaa.mp3', false);
    const huhhhhVol = calculatePlaybackVolume(config, 'wellness-reminder', 'huhhhh.mp3', false);
    const unayahaVol = calculatePlaybackVolume(config, 'snack-eaten', 'unayahayahauna.mp3', false);

    expect(unaVol).toBe(1.0);
    // Heavy scream clips and dense speech get attenuated so they match perceived loudness of softer clips
    expect(wuuulaaaaVol).toBeLessThan(unaVol);
    expect(huhhhhVol).toBeLessThan(unaVol);
    expect(unayahaVol).toBeLessThan(unaVol);
    expect(wuuulaaaaVol).toBeGreaterThan(0.7);
  });

  it('returns 0 volume when muted or channel volume is zero', () => {
    const config = {
      master: 1.0,
      buddy: 0.0,
      alarm: 0.8,
      equalizeLoudness: true,
    };

    // Buddy volume muted via channel
    expect(calculatePlaybackVolume(config, 'click-normal', 'una.mp3', false)).toBe(0);
    // Alarm volume still plays
    expect(
      calculatePlaybackVolume(config, 'timer-complete', 'wuuulaaaa.mp3', false)
    ).toBeGreaterThan(0);
    // Global mute mutes both
    expect(calculatePlaybackVolume(config, 'timer-complete', 'wuuulaaaa.mp3', true)).toBe(0);
  });

  it('smoothly scales both buddy and alarm volumes via master volume slider', () => {
    const fullConfig = { master: 1.0, buddy: 0.8, alarm: 0.7, equalizeLoudness: false };
    const halfConfig = { master: 0.5, buddy: 0.8, alarm: 0.7, equalizeLoudness: false };
    const zeroConfig = { master: 0.0, buddy: 0.8, alarm: 0.7, equalizeLoudness: false };

    const fullBuddy = calculatePlaybackVolume(fullConfig, 'click-normal', 'una.mp3', false);
    const halfBuddy = calculatePlaybackVolume(halfConfig, 'click-normal', 'una.mp3', false);
    const zeroBuddy = calculatePlaybackVolume(zeroConfig, 'click-normal', 'una.mp3', false);

    const fullAlarm = calculatePlaybackVolume(fullConfig, 'timer-complete', 'wuuulaaaa.mp3', false);
    const halfAlarm = calculatePlaybackVolume(halfConfig, 'timer-complete', 'wuuulaaaa.mp3', false);
    const zeroAlarm = calculatePlaybackVolume(zeroConfig, 'timer-complete', 'wuuulaaaa.mp3', false);

    expect(halfBuddy).toBeCloseTo(fullBuddy * 0.5, 3);
    expect(halfAlarm).toBeCloseTo(fullAlarm * 0.5, 3);
    expect(zeroBuddy).toBe(0);
    expect(zeroAlarm).toBe(0);
  });

  it('provides a unified single-slider configuration combining buddy and alarm sounds', () => {
    // When buddy and alarm are unified (1.0), master slider controls the entire app volume cleanly
    const unified75 = { master: 0.75, buddy: 1.0, alarm: 1.0, equalizeLoudness: true };
    const unified25 = { master: 0.25, buddy: 1.0, alarm: 1.0, equalizeLoudness: true };

    const buddy75 = calculatePlaybackVolume(unified75, 'click-normal', 'una.mp3', false);
    const alarm75 = calculatePlaybackVolume(unified75, 'timer-complete', 'wuuulaaaa.mp3', false);
    const buddy25 = calculatePlaybackVolume(unified25, 'click-normal', 'una.mp3', false);
    const alarm25 = calculatePlaybackVolume(unified25, 'timer-complete', 'wuuulaaaa.mp3', false);

    expect(buddy75).toBeCloseTo(0.75, 2);
    // wuuulaaaa is balanced by loudness factor (0.80) to avoid ear-piercing scream
    expect(alarm75).toBeCloseTo(0.75 * 0.8, 2);
    expect(buddy25).toBeCloseTo(0.25, 2);
    expect(alarm25).toBeCloseTo(0.25 * 0.8, 2);
  });
});
