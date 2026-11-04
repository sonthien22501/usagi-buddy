import { describe, expect, it } from 'vitest';
import { wrapCanvasLines } from '../src/core/textWrap';

// Fake text metrics: every character is 10px wide.
const measure = (s: string): number => s.length * 10;

describe('wrapCanvasLines', () => {
  it('keeps a short line intact', () => {
    expect(wrapCanvasLines('Una!', 100, measure)).toEqual(['Una!']);
  });

  it('normalizes repeated whitespace before wrapping', () => {
    expect(wrapCanvasLines('  hello   world  ', 200, measure)).toEqual(['hello world']);
  });

  it('wraps at word boundaries', () => {
    // 'hello world' = 110px > 100px, so it splits at the space.
    expect(wrapCanvasLines('hello world foo', 100, measure)).toEqual(['hello', 'world foo']);
  });

  it('character-wraps a single token that is wider than the line', () => {
    expect(wrapCanvasLines('abcdefghij', 30, measure)).toEqual(['abc', 'def', 'ghi', 'j']);
  });

  it('character-wraps CJK text without spaces', () => {
    expect(wrapCanvasLines('水を飲んでください', 40, measure)).toEqual([
      '水を飲ん',
      'でくださ',
      'い',
    ]);
  });

  it('caps the number of lines and appends an ellipsis', () => {
    const lines = wrapCanvasLines('one two three four five six seven', 60, measure, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    expect(measure(lines[1])).toBeLessThanOrEqual(60);
  });

  it('returns no lines for empty or whitespace-only text', () => {
    expect(wrapCanvasLines('', 100, measure)).toEqual([]);
    expect(wrapCanvasLines('   \n\t ', 100, measure)).toEqual([]);
  });

  it('falls back to a single line when the width is unusable', () => {
    expect(wrapCanvasLines('hello world', 0, measure)).toEqual(['hello world']);
    expect(wrapCanvasLines('hello world', Number.NaN, measure)).toEqual(['hello world']);
  });
});
