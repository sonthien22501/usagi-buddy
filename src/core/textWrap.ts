/**
 * Word/character wrapping for canvas-rendered speech bubbles.
 *
 * Canvas has no native wrapping, so bubble text is split here using the same
 * `measureText` function the renderer draws with. CJK text and very long
 * tokens (URLs, unbroken strings) fall back to character wrapping.
 *
 * Pure and dependency-free so it can be unit tested without a DOM.
 */
export function wrapCanvasLines(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
  maxLines: number = 5
): string[] {
  const normalized = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return [];
  }

  // Unusable width: keep the message on one line instead of looping forever.
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
    return [normalized];
  }

  const limit = Math.max(1, Math.floor(maxLines) || 1);
  const lines: string[] = [];
  let current = '';

  const flush = (): void => {
    if (current) {
      lines.push(current);
      current = '';
    }
  };

  for (const token of normalized.split(' ')) {
    const candidate = current ? `${current} ${token}` : token;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }

    flush();

    if (measure(token) <= maxWidth) {
      current = token;
      continue;
    }

    // Token alone is wider than the line: split it by characters.
    let chunk = '';
    for (const char of Array.from(token)) {
      if (chunk && measure(chunk + char) > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    current = chunk;
  }
  flush();

  if (lines.length <= limit) {
    return lines;
  }

  const truncated = lines.slice(0, limit);
  let last = truncated[limit - 1];
  while (last.length > 0 && measure(`${last}…`) > maxWidth) {
    last = last.slice(0, -1);
  }
  truncated[limit - 1] = `${last}…`;
  return truncated;
}
