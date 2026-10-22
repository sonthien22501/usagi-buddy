export interface RGBAImageData {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray | Uint8Array;
}

export interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;
}

export interface CroppedSprite {
  readonly id: string;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly bounds: BoundingBox;
  readonly trimmedData: Uint8ClampedArray;
}

function validateImageAndThreshold(image: RGBAImageData, alphaThreshold: number): void {
  if (
    image.width <= 0 ||
    image.height <= 0 ||
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.data.length !== image.width * image.height * 4
  ) {
    throw new RangeError(
      `Invalid image dimensions or buffer length: width=${image.width}, height=${image.height}, bufferLength=${image.data.length}`
    );
  }

  if (alphaThreshold < 0 || alphaThreshold > 255 || Number.isNaN(alphaThreshold)) {
    throw new RangeError(`alphaThreshold must be between 0 and 255, received: ${alphaThreshold}`);
  }
}

export function computeAlphaBounds(
  image: RGBAImageData,
  alphaThreshold: number = 10
): BoundingBox | null {
  validateImageAndThreshold(image, alphaThreshold);

  const { width, height, data } = image;

  // 1. Scan top-down to find minY (first row containing opaque pixel)
  let minY = -1;
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[rowOffset + x * 4 + 3] > alphaThreshold) {
        minY = y;
        break;
      }
    }
    if (minY !== -1) break;
  }

  // Entire image is transparent
  if (minY === -1) {
    return null;
  }

  // 2. Scan bottom-up to find maxY (last row containing opaque pixel)
  let maxY = minY;
  for (let y = height - 1; y >= minY; y--) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[rowOffset + x * 4 + 3] > alphaThreshold) {
        maxY = y;
        break;
      }
    }
    if (maxY !== minY || y === minY) break;
  }

  // 3. Scan between minY and maxY only, shrinking search bounds horizontally
  let minX = width;
  let maxX = -1;

  for (let y = minY; y <= maxY; y++) {
    const rowOffset = y * width * 4;

    // Scan from left to current minX only
    for (let x = 0; x < minX; x++) {
      if (data[rowOffset + x * 4 + 3] > alphaThreshold) {
        minX = x;
        break;
      }
    }

    // Scan from right down to current maxX only
    for (let x = width - 1; x > maxX; x--) {
      if (data[rowOffset + x * 4 + 3] > alphaThreshold) {
        maxX = x;
        break;
      }
    }
  }

  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: boxWidth,
    height: boxHeight,
    centerX: boxWidth / 2,
    centerY: boxHeight / 2,
  };
}

export function cropSpriteToAlphaBounds(
  id: string,
  image: RGBAImageData,
  alphaThreshold: number = 10
): CroppedSprite {
  const bounds = computeAlphaBounds(image, alphaThreshold);

  if (!bounds) {
    return {
      id,
      sourceWidth: image.width,
      sourceHeight: image.height,
      bounds: {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 1,
        height: 1,
        centerX: 0.5,
        centerY: 0.5,
      },
      trimmedData: new Uint8ClampedArray(4),
    };
  }

  const trimmedData = new Uint8ClampedArray(bounds.width * bounds.height * 4);
  const rowBytes = bounds.width * 4;

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    const srcStart = (y * image.width + bounds.minX) * 4;
    const dstStart = (y - bounds.minY) * rowBytes;
    trimmedData.set(image.data.subarray(srcStart, srcStart + rowBytes), dstStart);
  }

  return {
    id,
    sourceWidth: image.width,
    sourceHeight: image.height,
    bounds,
    trimmedData,
  };
}
