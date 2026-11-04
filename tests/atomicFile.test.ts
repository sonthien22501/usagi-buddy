import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { readJsonTextSync, writeJsonFileAtomicSync } from '../src/core/atomicFile';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usagi-atomic-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('atomicFile', () => {
  it('writes the payload and leaves no temp file behind', () => {
    const file = path.join(makeTempDir(), 'state.json');

    writeJsonFileAtomicSync(file, '{"version":1}');

    expect(fs.readFileSync(file, 'utf-8')).toBe('{"version":1}');
    expect(fs.existsSync(`${file}.tmp`)).toBe(false);
  });

  it('keeps the previous good copy and recovers from a truncated primary file', () => {
    const file = path.join(makeTempDir(), 'state.json');
    writeJsonFileAtomicSync(file, '{"version":1}');
    writeJsonFileAtomicSync(file, '{"version":2}');
    expect(fs.readFileSync(`${file}.bak`, 'utf-8')).toBe('{"version":1}');

    // Simulate a crash or power loss halfway through an old-style direct write.
    fs.writeFileSync(file, '{"version":2');

    expect(readJsonTextSync(file)).toBe('{"version":1}');
  });

  it('returns null when nothing exists and the primary text when both copies are invalid', () => {
    const file = path.join(makeTempDir(), 'state.json');
    expect(readJsonTextSync(file)).toBeNull();

    fs.writeFileSync(file, 'definitely not json');
    expect(readJsonTextSync(file)).toBe('definitely not json');
  });

  it('does not resurrect a backup when the primary was intentionally removed', () => {
    const file = path.join(makeTempDir(), 'state.json');
    writeJsonFileAtomicSync(file, '{"version":1}');
    writeJsonFileAtomicSync(file, '{"version":2}');
    expect(fs.existsSync(`${file}.bak`)).toBe(true);

    fs.rmSync(file);

    expect(readJsonTextSync(file)).toBeNull();
  });
});
