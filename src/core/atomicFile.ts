/**
 * Crash-safe JSON persistence helpers.
 *
 * Writes go to a sibling temp file first, are flushed to disk, and are then
 * atomically renamed over the live file. The previous good copy is kept as a
 * `.bak` so a truncated primary can still be recovered on the next launch.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export function writeJsonFileAtomicSync(filePath: string, data: string): void {
  const tmpPath = `${filePath}.tmp`;
  const backupPath = `${filePath}.bak`;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const fd = fs.openSync(tmpPath, 'w');
  try {
    fs.writeFileSync(fd, data, 'utf-8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  if (fs.existsSync(filePath)) {
    try {
      fs.copyFileSync(filePath, backupPath);
    } catch {
      // Backup is best-effort; the atomic rename below still protects the primary.
    }
  }

  fs.renameSync(tmpPath, filePath);
}

/**
 * Reads a JSON file, falling back to its `.bak` only when the primary exists
 * but is corrupt or truncated. Returns null when the primary is missing.
 */
export function readJsonTextSync(filePath: string): string | null {
  let primaryText: string;
  try {
    primaryText = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }

  try {
    JSON.parse(primaryText);
    return primaryText;
  } catch {
    // Primary is corrupt; try the last known-good copy.
  }

  try {
    const backupText = fs.readFileSync(`${filePath}.bak`, 'utf-8');
    JSON.parse(backupText);
    return backupText;
  } catch {
    return primaryText;
  }
}
