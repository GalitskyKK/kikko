import { useEffect, useRef } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut'
import { isTauriRuntime } from '@/lib/tauri'
import { useSettingsStore } from '@/stores/settings-store'
import { openDashboardWindow, openSettingsWindow } from '@/lib/window-navigation'
import { logger } from '@/utils/logger'
import { toast } from '@/components/ui/sonner'

/** Дефолтные комбинации (как в Rust) — если в store те же, не трогаем регистрацию, работают шорткаты из Rust. */
const DEFAULT_PALETTE = 'Super+Shift+K'
const DEFAULT_DASHBOARD = 'Super+J'
const DEFAULT_SETTINGS = 'Super+Shift+,'

/** Спецключи для плагина: display → code (global-hotkey ожидает KeyX, comma, space). */
const KEY_ALIASES: Record<string, string> = {
  ',': 'comma',
  '.': 'period',
  ' ': 'space',
  Space: 'space',
  Comma: 'comma',
  Period: 'period',
}

const MODIFIERS_LOWER = new Set(['super', 'alt', 'shift', 'ctrl', 'meta'])

/**
 * Формат в store: "Super+Shift+K", "Alt+Space", "Super+Shift+," и т.д.
 * Плагин (global-hotkey) ожидает: модификаторы lowercase; ключ — KeyX для букв (Code enum).
 */
function toPluginShortcut(storeShortcut: string): string {
  const trimmed = storeShortcut.trim()
  const parts = trimmed.split('+')
  const normalized = parts.map((p) => {
    const alias = KEY_ALIASES[p]
    if (alias) return alias.toLowerCase()
    const lower = p.toLowerCase()
    if (MODIFIERS_LOWER.has(lower)) return lower
    if (p.length === 1 && /[A-Za-z]/.test(p)) return `Key${p.toUpperCase()}`
    return p
  })
  return normalized.join('+')
}

function areDefaults(hotkeys: { openPalette: string; openDashboard: string; openSettings: string }): boolean {
  const p = hotkeys.openPalette.trim()
  const d = hotkeys.openDashboard.trim()
  const s = hotkeys.openSettings.trim()
  return p === DEFAULT_PALETTE && d === DEFAULT_DASHBOARD && s === DEFAULT_SETTINGS
}

/** Нормализует event.shortcut для сравнения (плагин может вернуть другой регистр/вариант). */
function normalizeTriggered(shortcut: string): string {
  return shortcut.trim().replace(/\s+/g, '')
}

type ShortcutAction =
  | { type: 'palette' }
  | { type: 'dashboard' }
  | { type: 'settings' }
  | { type: 'custom'; actionId: string }

/**
 * Регистрирует глобальные шорткаты из настроек (палетка, dashboard, настройки + кастомные).
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

    const triggerNorm = (s: string) => normalizeTriggered(s).toLowerCase()

    const useStoreShortcuts = !areDefaults(hotkeys) || hotkeys.customShortcuts.some((c) => c.enabled && c.hotkey.trim())

    let cancelled = false
    let didRegister = false

    const run = async () => {
      if (!useStoreShortcuts) {
        void invoke('set_alt_space_palette_enabled', { enabled: false })
        return
      }

      const platform = await invoke<string>('get_platform').catch(() => '')
      const useAltSpaceHook = platform === 'windows' && palette === 'Alt+Space'

      void invoke('set_alt_space_palette_enabled', { enabled: useAltSpaceHook })

      const shortcutToAction = new Map<string, ShortcutAction>()
      const shortcutsToRegister: string[] = []
      const add = (pluginShortcut: string, action: ShortcutAction) => {
        if (!pluginShortcut) return
        const norm = triggerNorm(pluginShortcut).toLowerCase()
        if (shortcutToAction.has(norm)) return
        shortcutToAction.set(norm, action)
        shortcutsToRegister.push(pluginShortcut)
      }
      if (!useAltSpaceHook) add(pluginPalette, { type: 'palette' })
      add(pluginDashboard, { type: 'dashboard' })
      add(pluginSettings, { type: 'settings' })
      for (const c of hotkeys.customShortcuts) {
        if (!c.enabled || !c.hotkey.trim()) continue
        add(toPluginShortcut(c.hotkey.trim()), { type: 'custom', actionId: c.actionId })
      }

      const shortcuts = shortcutsToRegister
      if (cancelled) return

      try {
        await unregisterAll()
      } catch (e) {
        logger.warn('global shortcut unregisterAll failed', { error: e })
      }
      if (cancelled) return
      if (shortcuts.length === 0) return
      registeredRef.current = shortcuts

      try {
        await register(shortcuts, (event) => {
          if (event.state !== 'Pressed') return
          const t = triggerNorm(event.shortcut)
          const action = shortcutToAction.get(t)
          if (!action) return
          switch (action.type) {
            case 'palette':
              void invoke('show_palette_or_toggle')
              break
            case 'dashboard':
              void openDashboardWindow()
              break
            case 'settings':
              void openSettingsWindow()
              break
            case 'custom':
              void invoke('run_shortcut_action', { actionId: action.actionId })
              break
          }
        })
        didRegister = true
      } catch (e) {
        logger.error('global shortcut register failed', { error: e })
        toast.error(
          'Could not register one or more shortcuts. On Windows, Alt+Space uses a separate hook and works; for other combos check for conflicts.',
          { id: 'global-shortcut-register-failed' },
        )
      }
    }

    void run()
    return () => {
      cancelled = true
      void invoke('set_alt_space_palette_enabled', { enabled: false })
      if (didRegister) {
        void unregisterAll().catch((e) => logger.warn('global shortcut cleanup unregisterAll failed', { error: e }))
      }
      registeredRef.current = []
    }
  }, [
    hotkeys.openPalette,
    hotkeys.openDashboard,
    hotkeys.openSettings,
    hotkeys.customShortcuts,
  ])
}
