import { useEffect, useRef } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut'
import { isTauriRuntime } from '@/lib/tauri'
import { useSettingsStore } from '@/stores/settings-store'
import { openDashboardWindow, openSettingsWindow } from '@/lib/window-navigation'
import { logger } from '@/utils/logger'

/**
 * Формат в store: "Super+Shift+K", "Alt+Space" и т.д.
 * Плагин (global-hotkey) принимает lowercase: super, alt, shift, ctrl; ключ "," → comma.
 */
function toPluginShortcut(storeShortcut: string): string {
  const trimmed = storeShortcut.trim()
  const parts = trimmed.split('+')
  const normalized = parts.map((p) => (p === ',' ? 'Comma' : p))
  return normalized.join('+').toLowerCase()
}

/** Нормализует event.shortcut для сравнения (плагин может вернуть другой регистр/вариант). */
function normalizeTriggered(shortcut: string): string {
  return shortcut.trim().replace(/\s+/g, '')
}

/**
 * Регистрирует глобальные шорткаты из настроек (палетка, dashboard, настройки).
 * Вызывать только в main-окне. При смене hotkeys в store перерегистрирует шорткаты.
 */
export function useGlobalShortcuts(): void {
  const hotkeys = useSettingsStore((state) => state.hotkeys)
  const registeredRef = useRef<string[]>([])

  useEffect(() => {
    if (!isTauriRuntime()) return
    const win = getCurrentWindow()
    if (win.label !== 'main') return

    const palette = hotkeys.openPalette.trim()
    const dashboard = hotkeys.openDashboard.trim()
    const settings = hotkeys.openSettings.trim()

    const pluginPalette = toPluginShortcut(palette)
    const pluginDashboard = toPluginShortcut(dashboard)
    const pluginSettings = toPluginShortcut(settings)

    const shortcuts = [pluginPalette, pluginDashboard, pluginSettings].filter(Boolean)
    if (shortcuts.length === 0) return

    let cancelled = false

    const run = async () => {
      try {
        await unregisterAll()
      } catch (e) {
        logger.warn('global shortcut unregisterAll failed', { error: e })
      }
      if (cancelled) return
      registeredRef.current = shortcuts

      const triggerNorm = (s: string) => normalizeTriggered(s).toLowerCase()
      const paletteNorm = triggerNorm(pluginPalette)
      const dashboardNorm = triggerNorm(pluginDashboard)
      const settingsNorm = triggerNorm(pluginSettings)

      try {
        await register(shortcuts, (event) => {
          if (event.state !== 'Pressed') return
          const t = triggerNorm(event.shortcut)
          if (t === paletteNorm) {
            void invoke('show_palette_or_toggle')
          } else if (t === dashboardNorm) {
            void openDashboardWindow()
          } else if (t === settingsNorm) {
            void openSettingsWindow()
          }
        })
      } catch (e) {
        logger.error('global shortcut register failed', { error: e })
      }
    }

    void run()
    return () => {
      cancelled = true
      void unregisterAll().catch((e) => logger.warn('global shortcut cleanup unregisterAll failed', { error: e }))
      registeredRef.current = []
    }
  }, [hotkeys.openPalette, hotkeys.openDashboard, hotkeys.openSettings])
}
