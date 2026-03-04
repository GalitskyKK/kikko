declare global {
  interface Window {
    __TAURI__?: unknown
    isTauri?: boolean
  }
}

/** True если приложение запущено внутри Tauri runtime (как @tauri-apps/api + fallback на __TAURI__ при withGlobalTauri). */
export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const g = globalThis as unknown as Window & { isTauri?: boolean }
    if (g.isTauri === true) return true
    if (typeof (window as Window & { __TAURI__?: unknown }).__TAURI__ !== 'undefined') return true
    return false
  } catch {
    return false
  }
}
