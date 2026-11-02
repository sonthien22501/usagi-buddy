import { describe, expect, it } from 'vitest';
import {
  createDefaultUserSettings,
  parseUserSettingsJson,
  resolveModeTransition,
  serializeUserSettingsJson,
  shouldFollowCursor,
  type ModeFlags,
  type UserSettings,
  type DashboardTabId,
} from '../src/core/settingsStore';
import { DEFAULT_POMODORO_MS } from '../src/core/pomodoroTimer';
import { DEFAULT_VOLUME_CONFIG } from '../src/core/soundManager';

describe('settingsStore', () => {
  describe('createDefaultUserSettings', () => {
    it('returns default configuration values', () => {
      const defaults = createDefaultUserSettings();
      expect(defaults).toEqual({
        costumeSelection: 'classic',
        activeCostume: 'classic',
        fixedAppearance: false,
        timerDurationMs: DEFAULT_POMODORO_MS,
        timerRemainingMs: DEFAULT_POMODORO_MS,
        timerPhase: 'idle',
        volumeConfig: DEFAULT_VOLUME_CONFIG,
        soundMuted: false,
        ghostLocked: false,
        playModeEnabled: false,
        stationaryMode: false,
        usagiHidden: false,
        usagiX: null,
        usagiY: null,
        activeDashboardTab: 'companion',
        locale: defaults.locale,
      });
      expect(['en', 'vi', 'de', 'fr', 'es', 'ja', 'ko', 'zh']).toContain(defaults.locale);
    });
  });

  describe('serializeUserSettingsJson & parseUserSettingsJson', () => {
    it('round-trips full user settings safely', () => {
      const settings: UserSettings = {
        costumeSelection: 'vest',
        activeCostume: 'vest',
        fixedAppearance: true,
        timerDurationMs: 1800000,
        timerRemainingMs: 900000,
        timerPhase: 'paused',
        volumeConfig: {
          master: 0.8,
          buddy: 0.9,
          alarm: 0.7,
          equalizeLoudness: true,
        },
        soundMuted: true,
        ghostLocked: true,
        playModeEnabled: true,
        stationaryMode: false,
        usagiHidden: false,
        usagiX: 450,
        usagiY: 300,
        activeDashboardTab: 'config',
        locale: 'vi',
      };

      const serialized = serializeUserSettingsJson(settings);
      const parsed = parseUserSettingsJson(serialized);
      expect(parsed).toEqual(settings);
    });

    it('persists and validates locale properly', () => {
      const valid = parseUserSettingsJson(JSON.stringify({ locale: 'ja' }));
      expect(valid.locale).toBe('ja');

      const invalid = parseUserSettingsJson(JSON.stringify({ locale: 'unknown' }));
      expect(['en', 'vi', 'de', 'fr', 'es', 'ja', 'ko', 'zh']).toContain(invalid.locale);
    });

    it('falls back to defaults for null, empty, or corrupt json', () => {
      const defaults = createDefaultUserSettings();
      expect(parseUserSettingsJson(null)).toEqual(defaults);
      expect(parseUserSettingsJson(undefined)).toEqual(defaults);
      expect(parseUserSettingsJson('')).toEqual(defaults);
      expect(parseUserSettingsJson('   ')).toEqual(defaults);
      expect(parseUserSettingsJson('{ invalid json')).toEqual(defaults);
      expect(parseUserSettingsJson('12345')).toEqual(defaults);
      expect(parseUserSettingsJson('[]')).toEqual(defaults);
    });

    it('normalizes running timer on disk to paused or idle', () => {
      const runningPartial = JSON.stringify({
        timerDurationMs: 1500000,
        timerRemainingMs: 750000,
        timerPhase: 'running',
      });
      const parsedRunning = parseUserSettingsJson(runningPartial);
      expect(parsedRunning.timerPhase).toBe('paused');
      expect(parsedRunning.timerRemainingMs).toBe(750000);
      expect(parsedRunning.timerDurationMs).toBe(1500000);

      // If remaining time is equal to duration, phase should be idle
      const runningFull = JSON.stringify({
        timerDurationMs: 1500000,
        timerRemainingMs: 1500000,
        timerPhase: 'running',
      });
      expect(parseUserSettingsJson(runningFull).timerPhase).toBe('idle');

      // If remaining time is 0, resets remaining time to duration and idle
      const runningZero = JSON.stringify({
        timerDurationMs: 1500000,
        timerRemainingMs: 0,
        timerPhase: 'running',
      });
      const parsedZero = parseUserSettingsJson(runningZero);
      expect(parsedZero.timerPhase).toBe('idle');
      expect(parsedZero.timerRemainingMs).toBe(1500000);
    });

    it('clamps out-of-range or invalid fields to safe defaults', () => {
      const invalid = JSON.stringify({
        costumeSelection: 'nonexistent-costume',
        activeCostume: 'also-invalid',
        timerDurationMs: -5000,
        timerRemainingMs: -100,
        volumeConfig: {
          master: 15,
          buddy: -2,
          alarm: NaN,
        },
        soundMuted: 'yes',
        ghostLocked: 1,
        playModeEnabled: true,
        stationaryMode: true, // Should resolve mutual exclusion
      });

      const parsed = parseUserSettingsJson(invalid);
      expect(parsed.costumeSelection).toBe('classic');
      expect(parsed.activeCostume).toBe('classic');
      expect(parsed.timerDurationMs).toBe(DEFAULT_POMODORO_MS);
      expect(parsed.timerRemainingMs).toBe(DEFAULT_POMODORO_MS);
      expect(parsed.volumeConfig.master).toBe(1.0);
      expect(parsed.volumeConfig.buddy).toBe(0.0);
      expect(parsed.volumeConfig.alarm).toBe(DEFAULT_VOLUME_CONFIG.alarm);
      expect(parsed.soundMuted).toBe(false);
      expect(parsed.ghostLocked).toBe(false);
      expect(parsed.playModeEnabled).toBe(true);
      expect(parsed.stationaryMode).toBe(false);
      expect(parsed.usagiX).toBeNull();
      expect(parsed.usagiY).toBeNull();
      expect(parsed.activeDashboardTab).toBe('companion');
    });

    it('preserves valid usagi coordinates and dashboard tab, falling back on invalid values', () => {
      const valid = JSON.stringify({
        usagiX: 120.6,
        usagiY: 250.2,
        activeDashboardTab: 'config',
      });
      const parsedValid = parseUserSettingsJson(valid);
      expect(parsedValid.usagiX).toBe(121);
      expect(parsedValid.usagiY).toBe(250);
      expect(parsedValid.activeDashboardTab).toBe('config');

      const invalid = JSON.stringify({
        usagiX: 'invalid',
        usagiY: NaN,
        activeDashboardTab: 'other_tab',
      });
      const parsedInvalid = parseUserSettingsJson(invalid);
      expect(parsedInvalid.usagiX).toBeNull();
      expect(parsedInvalid.usagiY).toBeNull();
      expect(parsedInvalid.activeDashboardTab).toBe('companion');
    });
  });

  describe('resolveModeTransition', () => {
    it('allows ghostLocked and playModeEnabled to be true simultaneously', () => {
      const initial: ModeFlags = {
        ghostLocked: false,
        playModeEnabled: true,
        stationaryMode: false,
        usagiHidden: false,
      };

      const next = resolveModeTransition(initial, { type: 'toggle-ghost' });
      expect(next).toEqual({
        ghostLocked: true,
        playModeEnabled: true,
        stationaryMode: false,
        usagiHidden: false,
      });
    });

    it('enforces mutual exclusion between playModeEnabled and stationaryMode', () => {
      // Enabling play mode unpins stationary mode and un-hides usagi
      const stationary: ModeFlags = {
        ghostLocked: true,
        playModeEnabled: false,
        stationaryMode: true,
        usagiHidden: true,
      };
      const afterPlay = resolveModeTransition(stationary, { type: 'toggle-play' });
      expect(afterPlay).toEqual({
        ghostLocked: true,
        playModeEnabled: true,
        stationaryMode: false,
        usagiHidden: false,
      });

      // Enabling stationary mode disables play mode and un-hides usagi
      const afterStationary = resolveModeTransition(afterPlay, { type: 'toggle-stationary' });
      expect(afterStationary).toEqual({
        ghostLocked: true,
        playModeEnabled: false,
        stationaryMode: true,
        usagiHidden: false,
      });

      // Disabling stationary mode keeps play mode disabled
      const afterStationaryOff = resolveModeTransition(afterStationary, {
        type: 'toggle-stationary',
      });
      expect(afterStationaryOff.stationaryMode).toBe(false);
      expect(afterStationaryOff.playModeEnabled).toBe(false);
    });

    it('toggles hidden state independently without resetting play or stationary', () => {
      const initial: ModeFlags = {
        ghostLocked: false,
        playModeEnabled: true,
        stationaryMode: false,
        usagiHidden: false,
      };

      const hidden = resolveModeTransition(initial, { type: 'toggle-hidden' });
      expect(hidden.usagiHidden).toBe(true);
      expect(hidden.playModeEnabled).toBe(true);

      const unhidden = resolveModeTransition(hidden, { type: 'toggle-hidden' });
      expect(unhidden.usagiHidden).toBe(false);
      expect(unhidden.playModeEnabled).toBe(true);
    });
  });

  describe('shouldFollowCursor', () => {
    it('returns true when playModeEnabled is true even if ghostLocked is true', () => {
      expect(
        shouldFollowCursor({
          ghostLocked: true,
          playModeEnabled: true,
          stationaryMode: false,
          usagiHidden: false,
        })
      ).toBe(true);

      expect(
        shouldFollowCursor({
          ghostLocked: false,
          playModeEnabled: true,
          stationaryMode: false,
          usagiHidden: false,
        })
      ).toBe(true);
    });

    it('returns false when playModeEnabled is false, or stationaryMode is true, or usagiHidden is true', () => {
      expect(
        shouldFollowCursor({
          ghostLocked: false,
          playModeEnabled: false,
          stationaryMode: false,
          usagiHidden: false,
        })
      ).toBe(false);

      expect(
        shouldFollowCursor({
          ghostLocked: false,
          playModeEnabled: true,
          stationaryMode: true,
          usagiHidden: false,
        })
      ).toBe(false);

      expect(
        shouldFollowCursor({
          ghostLocked: false,
          playModeEnabled: true,
          stationaryMode: false,
          usagiHidden: true,
        })
      ).toBe(false);
    });
  });
});
