import { useEffect, useRef } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isTauriRuntime } from '@/lib/tauri'

/**
 * При закрытии главного окна сворачивает в трей (hide) вместо выхода.
 * Трей создаётся один раз в Rust (main.rs setup) — один значок, иконка из бандла.
 * Вызывать только в главном окне (main).
 */
export function useTray() {
  const unlistenRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!isTauriRuntime()) return
    const window = getCurrentWindow()
    if (window.label !== 'main') return

    window
      .onCloseRequested((event) => {
        event.preventDefault()
        void window.hide()
      })
      .then((fn) => {
        unlistenRef.current = fn
      })

    return () => {
      unlistenRef.current?.()
      unlistenRef.current = null
    }
  }, [])
}
