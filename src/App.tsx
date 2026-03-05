import { useEffect, useRef } from 'react'
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { DashboardPage } from '@/routes/dashboard'
import { PalettePage } from '@/routes/palette'
import { SettingsPage } from '@/routes/settings'
import { setLastClipboardContent } from '@/lib/clipboard-polling'
import { isTauriRuntime } from '@/lib/tauri'
import { openDashboardWindow, openSettingsWindow } from '@/lib/window-navigation'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  normalizeClipboardEntry,
  useClipboardStore,
  type ClipboardEntryRaw,
} from '@/stores/clipboard-store'
import { useQuicklinkStore } from '@/stores/quicklink-store'
import { useSnippetStore } from '@/stores/snippet-store'
import { useInstalledAppsStore } from '@/stores/installed-apps-store'
import { useSettingsStore } from '@/stores/settings-store'
import { logger } from '@/utils/logger'
import { useTray } from '@/lib/use-tray'

/** Хук: подписка на навигацию из Rust (шорткат Win+J → dashboard и др.) */
function useNavigateFromBackend() {
  const navigate = useNavigate()
  const ref = useRef(navigate)
  ref.current = navigate
  useEffect(() => {
    if (!isTauriRuntime()) return
    const unlistenPromise = listen<string>('navigate-to', (event) => {
      const path = typeof event.payload === 'string' ? event.payload : ''
      if (path === '/settings') {
        void openSettingsWindow()
        return
      }
      if (path === '/dashboard') {
        void openDashboardWindow()
        return
      }
      if (path.startsWith('/')) ref.current(path)
    })
    return () => {
      unlistenPromise.then((fn) => fn())
    }
  }, [])
}

function NavigateFromBackend() {
  useNavigateFromBackend()
  return null
}

const CLIPBOARD_POLL_MS = 500

/** Опрос буфера обмена: при изменении текста сохраняем в историю (Rust SQLite). После программной вставки из палетки вызываем setLastClipboardContent, чтобы не дублировать запись. */
function useClipboardPolling() {
  useEffect(() => {
    if (!isTauriRuntime()) return

    let isCancelled = false
    let isTickRunning = false
    let interval: ReturnType<typeof setInterval> | null = null

    void import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      if (isCancelled) return
      if (getCurrentWindow().label !== 'main') return
      interval = setInterval(() => {
        if (isTickRunning) return
        isTickRunning = true

        void invoke<ClipboardEntryRaw | null>('capture_clipboard_entry')
          .then((rawEntry) => {
            if (!rawEntry) return
            const entry = normalizeClipboardEntry(rawEntry)
            const clipboardSettings = useSettingsStore.getState().clipboard
            if (!clipboardSettings.captureImages && entry.contentType === 'image') return
            if (!clipboardSettings.captureFiles && entry.contentType === 'file') return
            if (entry.contentType === 'text') {
              setLastClipboardContent(entry.content)
            }
            useClipboardStore.getState().upsertEntry(entry)
          })
          .catch((error) => {
            logger.warn('capture_clipboard_entry failed', { error })
          })
          .finally(() => {
            isTickRunning = false
          })
      }, CLIPBOARD_POLL_MS)
    })

    return () => {
      isCancelled = true
      if (interval) clearInterval(interval)
    }
  }, [])
}

/** Предзагрузка данных для поиска (clipboard, snippets, apps) при старте приложения */
function usePreloadSearchData() {
  useEffect(() => {
    if (!isTauriRuntime()) return
    void useClipboardStore.getState().loadFromBackend()
    void useSnippetStore.getState().loadFromBackend()
    void useQuicklinkStore.getState().loadFromBackend()
    void useInstalledAppsStore.getState().loadApps()
  }, [])
}

/** Синхронизирует настройку «запуск с системой» с нативным плагином при старте приложения и при смене значения. */
function useApplyAutostartOnStartup() {
  const launchOnStartup = useSettingsStore((state) => state.general.launchOnStartup)
  useEffect(() => {
    if (!isTauriRuntime()) return
    void import('@tauri-apps/plugin-autostart').then(async (autostart) => {
      try {
        const enabled = await autostart.isEnabled()
        if (launchOnStartup && !enabled) {
          await autostart.enable()
        } else if (!launchOnStartup && enabled) {
          await autostart.disable()
        }
      } catch {
        // capability denied or plugin unavailable
      }
    })
  }, [launchOnStartup])
}

function useSettingsSyncOnWindowFocus() {
  useEffect(() => {
    if (!isTauriRuntime()) return
    let disposed = false
    let unlistenFocus: (() => void) | null = null

    const rehydrate = () => {
      void useSettingsStore.persist.rehydrate()
    }

    rehydrate()
    void import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      if (disposed) return
      const currentWindow = getCurrentWindow()
      const unlistenPromise = currentWindow.onFocusChanged(({ payload }) => {
        if (payload) rehydrate()
      })
      void unlistenPromise.then((fn) => {
        if (disposed) {
          fn()
          return
        }
        unlistenFocus = fn
      })
    })

    return () => {
      disposed = true
      if (unlistenFocus) {
        unlistenFocus()
      }
    }
  }, [])
}

/** Корневой компонент приложения: роутер + глобальные провайдеры */
export function App() {
  const appearance = useSettingsStore((state) => state.appearance)
  useTray()
  useClipboardPolling()
  usePreloadSearchData()
  useApplyAutostartOnStartup()
  useSettingsSyncOnWindowFocus()

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('density-compact', appearance.uiDensity === 'compact')
    root.classList.toggle('reduce-motion-manual', appearance.reduceMotion)
    if (appearance.accentPreset === 'default') {
      delete root.dataset.accent
    } else {
      root.dataset.accent = appearance.accentPreset
    }
  }, [appearance.accentPreset, appearance.reduceMotion, appearance.uiDensity])

  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme={appearance.themeMode}
        enableSystem
        storageKey="kikko-theme"
      >
        <BrowserRouter>
          <NavigateFromBackend />
          <div className="liquid-glass-overlay fixed inset-0 flex h-dvh w-full flex-col">
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
              <Routes>
                <Route path="/" element={<PalettePage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: 'bg-background text-foreground border-border',
          }}
        />
      </ThemeProvider>
    </ErrorBoundary>
  )
}
