# Kikko Cross-Platform Parity Matrix

## Current Status

| Feature | Windows | macOS | Linux | Notes |
| --- | --- | --- | --- | --- |
| Global palette hotkey | Yes | Yes | Yes | Registered through `tauri-plugin-global-shortcut`. |
| Installed apps discovery | Yes | Yes | Yes | Different discovery strategy per OS. |
| Open app/file path | Yes | Yes | Yes | Uses `cmd/open/xdg-open`. |
| Clipboard capture/write | Yes | Yes | Yes | Based on `arboard`; behavior differs by OS internals. |
| Native app/file icon extraction | Yes | Fallback | Fallback | Native extraction is Windows-only now; non-Windows uses UI fallback icons. |
| Detached windows (Settings/Dashboard) | Yes | Yes | Yes | Shared Tauri API flow. |
| Plugin manifest loader (`~/.kikko/plugins`) | Yes | Yes | Yes | Filesystem scan + manifest validation in backend. |

## Planned Follow-ups

- Add macOS icon extraction fallback via `.app` metadata and bundle icons.
- Add Linux `.desktop` icon name resolution.
- Add runtime shortcut rebinding from Settings to backend shortcut registry.
