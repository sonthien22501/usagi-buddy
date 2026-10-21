import { describe, expect, it } from 'vitest';
import {
  computeAlphaBounds,
  cropSpriteToAlphaBounds,
  RGBAImageData,
} from '../src/core/alphaCropper';

function createSyntheticCanvas(
  width: number,
  height: number,
  drawRect?: { x: number; y: number; w: number; h: number; rgba: [number, number, number, number] }
): RGBAImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  if (drawRect) {
    for (let y = drawRect.y; y < drawRect.y + drawRect.h; y++) {
      for (let x = drawRect.x; x < drawRect.x + drawRect.w; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = drawRect.rgba[0];
        data[idx + 1] = drawRect.rgba[1];
        data[idx + 2] = drawRect.rgba[2];
        data[idx + 3] = drawRect.rgba[3];
      }
    }
  }
  return { width, height, data };
}

describe('alphaCropper', () => {
  it('computes exact bounding box and center for offset sprite frames', () => {
    const frame1 = createSyntheticCanvas(100, 120, {
      x: 12,
      y: 80,
      w: 20,
      h: 16,
      rgba: [255, 220, 200, 255],
    });
    const frame2 = createSyntheticCanvas(100, 120, {
      x: 64,
      y: 10,
      w: 20,
      h: 16,
      rgba: [255, 220, 200, 255],
    });

    const b1 = computeAlphaBounds(frame1, 10);
    const b2 = computeAlphaBounds(frame2, 10);

    expect(b1).toEqual({
      minX: 12,
      minY: 80,
      maxX: 31,
      maxY: 95,
      width: 20,
      height: 16,
      centerX: 10,
      centerY: 8,
    });
    expect(b2?.width).toBe(20);
    expect(b2?.height).toBe(16);
    expect(b2?.centerX).toBe(b1?.centerX);
    expect(b2?.centerY).toBe(b1?.centerY);
  });

  it('crops RGBA pixel data tightly to bounding box and ignores sub-threshold alpha noise', () => {
    const img = createSyntheticCanvas(10, 10, {
      x: 3,
      y: 4,
      w: 2,
      h: 3,
      rgba: [250, 180, 190, 240],
    });
    // Add faint alpha noise (alpha = 5) at (0, 0)
    img.data[3] = 5;

    const cropped = cropSpriteToAlphaBounds('Usagi1', img, 10);
    expect(cropped.id).toBe('Usagi1');
    expect(cropped.bounds.width).toBe(2);
    expect(cropped.bounds.height).toBe(3);
    expect(cropped.trimmedData.length).toBe(2 * 3 * 4);
    expect(Array.from(cropped.trimmedData.slice(0, 4))).toEqual([250, 180, 190, 240]);
  });

  it('returns safe 1x1 transparent fallback when canvas is completely transparent (Review Focus #1)', () => {
    const empty = createSyntheticCanvas(30, 30);
    expect(computeAlphaBounds(empty)).toBeNull();

    const cropped = cropSpriteToAlphaBounds('EmptyFrame', empty);
    expect(cropped.bounds).toEqual({
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 1,
      height: 1,
      centerX: 0.5,
      centerY: 0.5,
    });
    expect(cropped.trimmedData.length).toBe(4);
  });

  it('throws RangeError on invalid buffer length or out-of-range alphaThreshold', () => {
    const badBuffer: RGBAImageData = { width: 4, height: 4, data: new Uint8ClampedArray(10) };
    expect(() => computeAlphaBounds(badBuffer)).toThrow(RangeError);

    const valid = createSyntheticCanvas(4, 4);
    expect(() => computeAlphaBounds(valid, -1)).toThrow(RangeError);
    expect(() => computeAlphaBounds(valid, 256)).toThrow(RangeError);
  });
});
