/**
 * Ad-hoc code signing for macOS builds.
 *
 * The release pipeline builds with `identity: null`, which makes electron-builder
 * skip signing entirely. The resulting .app keeps only the Mach-O linker signature
 * from Electron's prebuilt binaries and has no `Contents/_CodeSignature`, so macOS
 * Gatekeeper kills it on first launch ("Usagi-Float is damaged and can't be opened").
 *
 * Signing every nested bundle/framework/dylib ad-hoc (`codesign --sign -`) produces a
 * valid bundle seal. The app still is not notarized, so users keep the one-time
 * "unidentified developer" approval, but it launches instead of being rejected.
 *
 * Runs for both macOS builds; no-ops everywhere else.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SIGNABLE_SUFFIXES = ['.app', '.framework', '.xpc'];
const MACHO_MAGICS = new Set([0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe]);

function isMachO(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const header = Buffer.alloc(4);
    if (fs.readSync(fd, header, 0, 4, 0) !== 4) return false;
    return MACHO_MAGICS.has(header.readUInt32BE(0));
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function collectSignablePaths(root) {
  const found = [];

  const walk = (dir, depth) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SIGNABLE_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) {
          found.push({ full, depth });
        }
        walk(full, depth + 1);
      } else if (entry.isFile() && isMachO(full)) {
        // Nested helpers such as Electron's chrome_crashpad_handler ship unsigned
        // and block the framework seal, so sign every Mach-O file too.
        found.push({ full, depth });
      }
    }
  };

  walk(root, 0);
  // Deepest first: nested code must be signed before its container.
  return found.sort((a, b) => b.depth - a.depth).map((item) => item.full);
}

function codesign(args) {
  execFileSync('codesign', ['--force', '--sign', '-', '--timestamp=none', ...args], {
    stdio: 'inherit',
  });
}

async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  if (!fs.existsSync(appPath)) {
    throw new Error(`afterPack: expected app bundle not found at ${appPath}`);
  }

  for (const nested of collectSignablePaths(appPath)) {
    codesign([nested]);
  }
  codesign([appPath]);

  // Fail the build on a broken seal instead of shipping an unlaunchable DMG.
  execFileSync('codesign', ['--verify', '--strict', appPath], { stdio: 'inherit' });
  console.log(`afterPack: ad-hoc signed ${appPath}`);
}

module.exports = afterPack;
module.exports.default = afterPack;
