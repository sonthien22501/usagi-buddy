# 🛡️ Security Policy — Usagi Buddy

## Supported versions

Only the latest published release receives security fixes.

| Version | Supported |
|---|---|
| 0.6.x (latest) | ✅ |
| Older releases | ❌ |

---

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Use GitHub's private reporting flow:

1. Go to the [**Security**](https://github.com/sonthien22501/usagi-buddy/security) tab.
2. Click **Report a vulnerability**.
3. Describe the issue, the version, your OS, and steps to reproduce.

If you cannot use that form, contact the maintainer through their GitHub profile and ask for a
private channel. Please give a reasonable window to ship a fix before any public disclosure.
This is a volunteer fan project, so responses are best-effort — but every report is read.

### Useful reports

- Ways to escape the renderer sandbox or reach Node.js/file system from a window
- Cross-site scripting via task, schedule, nickname, or calendar data
- Unintended outbound network traffic or data exfiltration
- Local privilege escalation, or writes outside the app's own data folder
- Supply-chain issues in the build or release pipeline

### Out of scope

- The holiday lookup to `date.nager.at` (documented in [PRIVACY.md](PRIVACY.md))
- OS warnings about unsigned or unnotarized builds (see below)
- Vulnerabilities that require an attacker who already has code execution or admin rights on
  the machine
- Denial of service against your own local files

---

## Build trust: these binaries are not notarized

Be aware before you install:

- **macOS** builds are **ad-hoc signed only**, not signed with an Apple Developer ID and **not
  notarized**. macOS will warn that the developer cannot be verified.
- **Windows** builds are **unsigned**, so SmartScreen may warn about an unknown publisher.
- There is **no auto-updater**, so the app never downloads or executes code on its own.

**Only download releases from the official page:**
<https://github.com/sonthien22501/usagi-buddy/releases>

If you want full confidence, don't run a binary at all — audit the source and build it yourself
(`npm install && npm run dist`). The build is reproducible from this repository and has no
runtime npm dependencies.

---

## Security design (for reviewers)

A quick map of what protects what:

- **Isolated renderers** — every window runs with `contextIsolation: true`,
  `nodeIntegration: false`, and the Chromium sandbox enabled. No window has Node.js access.
- **Narrow preload bridge** — `window.usagiAPI` exposes a fixed allowlist of named IPC calls.
  There is no `ipcRenderer`, `fs`, `child_process`, or `shell` passthrough.
- **Local content only** — all windows load bundled `file://` HTML. No remote pages, `<iframe>`,
  `<webview>`, or external scripts/fonts/styles.
- **Validated IPC input** — volume, timer duration, dimensions, positions, nickname, birthday,
  country, locale, reminder text, and schedule times are all sanitized or bounded in the main
  process before use.
- **No HTML injection** — user-supplied text is rendered with `textContent`; `innerHTML` is only
  ever used with static templates or translation strings.
- **Contained persistence** — writes are restricted to the app's own data folder using fixed
  filenames, with atomic rename plus a `.bak` recovery copy.
- **Least privilege** — the app runs at normal user level and requests no elevated permissions.

### Known hardening work

Tracked publicly, not secret:

- Upgrading the Electron runtime off the EOL 33.x line
- Adding a Content-Security-Policy to all bundled HTML windows
- Denying unexpected navigation and `window.open` from renderer windows
- Validating the IPC sender origin in the main process

These are defense-in-depth items; none of them currently has a known exploit path in this app,
because it never loads untrusted web content.

---

**Last updated:** 2026-11-04
