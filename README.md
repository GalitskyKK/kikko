<p align="center">
  <img src="public/kikko-logo.png" alt="Kikkō" width="120" />
</p>

<h1 align="center">Kikkō</h1>
<p align="center">
  <strong>One keystroke. Everything.</strong>
</p>

<p align="center">
  A free, open-source desktop launcher that puts command palette, clipboard history, snippets, and a dashboard in one fast, private app. Built with Tauri 2 and React — runs on Windows, macOS, and Linux.
</p>

---

## Why Kikkō?

- **Single entry point** — One global shortcut opens search, apps, commands, clipboard, and snippets. No switching between tools.
- **Fully local** — Your data stays on your machine. No accounts, no cloud, no telemetry.
- **Cross-platform** — Same experience on Windows, macOS, and Linux. One codebase, one workflow.
- **Extensible** — Plugins are React components. Add custom commands and integrations without leaving the stack you know.
- **Lightweight** — Small binary, low memory use, instant search. No bloat.

---

## Features

| Area | What you get |
|------|----------------|
| **Command palette** | Fuzzy search over apps, system commands, preferences, snippets, and plugins. Grouped results, inline calculator. |
| **Clipboard** | History with text, images, and files. Previews, pin/favorite, filter. Persisted locally (SQLite). |
| **Snippets** | Create and trigger snippets by keyword. Aliases supported. |
| **Dashboard** | Widgets (clipboard, snippets, quick actions). Open in compact or full view. |
| **System** | Volume presets, sleep, lock, empty trash, open system preferences. Cross-platform where possible. |
| **Appearance** | Themes (light/dark), accent colors, optional start suggestions. |
| **Shortcuts** | Configurable global hotkeys; in-palette actions (e.g. Ctrl+K) for quick actions. |

---

## Shortcuts

Default global shortcuts (editable in Settings):

| Action | Windows | macOS / Linux |
|--------|---------|----------------|
| Open launcher (palette) | `Win + Shift + K` | `Super + Shift + K` |
| Open dashboard | `Win + J` | `Super + J` |
| Open settings | `Win + Shift + ,` | `Super + Shift + ,` |

Inside the palette:

| Action | Shortcut |
|--------|----------|
| Actions panel (paste, pin, etc.) | `Ctrl + K` |
| Navigate results | `↑` `↓` |
| Open / run selected | `Enter` |
| Clear query | `Esc` (first press) |
| Back / close | `Esc` (when no query) |

*(On macOS, use `Cmd` where the table shows `Ctrl` for in-palette actions if you rebind; default palette hotkey uses `Super`.)*

---

## Screenshots

*Add screenshots here (e.g. palette, dashboard, settings) by placing images in `docs/` or `public/` and linking them.*

---

## Tech stack

- **Desktop:** [Tauri 2](https://tauri.app/) (Rust)
- **UI:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS, shadcn/ui
- **Command palette:** cmdk
- **Search:** Fuse.js (fuzzy)
- **State:** Zustand

---

## Getting started

### Prerequisites

- **Windows:** [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/). If you see `0xc0000139` when running the app, install the [Evergreen Standalone Installer](https://go.microsoft.com/fwlink/p/?LinkId=2124703) and restart.
- **macOS / Linux:** Standard Tauri requirements (see [Tauri docs](https://tauri.app/start/prerequisites/)).

### Run from source

```bash
npm ci
npm run tauri dev
```

### Install from release

Go to [Releases](https://github.com/GalitskyKK/kikko/releases), pick your platform, and download the installer or binary (e.g. Windows `.msi`, macOS `.dmg`, Linux `.AppImage`).

---

## CI/CD and releases

- **`.github/workflows/ci.yml`** — Lint and build (frontend + `cargo check`). Runs on push/PR.
- **`.github/workflows/release.yml`** — Builds installers when a version tag `v*` is pushed; publishes to GitHub Releases for Windows, macOS, and Linux.

### Publish a new release

1. Ensure the repo is initialized and `main` is pushed to `origin`.
2. Create and push a version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow will build and attach artifacts to the release. Optional: add `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` in GitHub Actions secrets for signed updates.

---

## License

MIT.
