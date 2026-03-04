import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { isTauriRuntime } from '@/lib/tauri'

type ThemeMode = 'system' | 'dark' | 'light'
type UiDensity = 'comfortable' | 'compact'
type AccentPreset = 'default' | 'blue' | 'violet' | 'emerald' | 'rose'
type AliasTargetType = 'app' | 'command' | 'snippet'

interface AliasRule {
  id: string
  targetId: string
  targetType: AliasTargetType
  targetTitle: string
  alias: string
}

interface ExtensionsSettings {
  clipboard: boolean
  snippets: boolean
  calculator: boolean
  dashboard: boolean
}

interface GeneralSettings {
  launchOnStartup: boolean
  closeOnEscape: boolean
  showStartSuggestions: boolean
}

interface AppearanceSettings {
  themeMode: ThemeMode
  uiDensity: UiDensity
  reduceMotion: boolean
  showAppIcons: boolean
  accentPreset: AccentPreset
}

interface ClipboardSettings {
  retentionDays: number
  maxItems: number
  captureImages: boolean
  captureFiles: boolean
}

interface HotkeysSettings {
  openPalette: string
  openDashboard: string
  openSettings: string
}

interface SettingsState {
  updatedAt: number
  general: GeneralSettings
  appearance: AppearanceSettings
  clipboard: ClipboardSettings
  hotkeys: HotkeysSettings
  extensions: ExtensionsSettings
  aliases: AliasRule[]
  updateGeneral: (patch: Partial<GeneralSettings>) => void
  updateAppearance: (patch: Partial<AppearanceSettings>) => void
  updateClipboard: (patch: Partial<ClipboardSettings>) => void
  updateExtensions: (patch: Partial<ExtensionsSettings>) => void
  updateHotkeys: (patch: Partial<HotkeysSettings>) => void
  upsertAlias: (rule: AliasRule) => void
  removeAlias: (id: string) => void
}

type SettingsSnapshot = Pick<SettingsState, 'updatedAt' | 'general' | 'appearance' | 'clipboard' | 'hotkeys' | 'extensions' | 'aliases'>

interface SettingsSyncPayload {
  source: string
  snapshot: SettingsSnapshot
}

const defaultSettings: Omit<
  SettingsState,
  'updateGeneral' | 'updateAppearance' | 'updateClipboard' | 'updateExtensions' | 'updateHotkeys' | 'upsertAlias' | 'removeAlias'
> = {
  updatedAt: 0,
  general: {
    launchOnStartup: false,
    closeOnEscape: true,
    showStartSuggestions: false,
  },
  appearance: {
    themeMode: 'system',
    uiDensity: 'comfortable',
    reduceMotion: false,
    showAppIcons: true,
    accentPreset: 'default',
  },
  clipboard: {
    retentionDays: 30,
    maxItems: 500,
    captureImages: true,
    captureFiles: true,
  },
  hotkeys: {
    openPalette: 'Super+Shift+K',
    openDashboard: 'Super+J',
    openSettings: 'Super+Shift+,',
  },
  extensions: {
    clipboard: true,
    snippets: true,
    calculator: true,
    dashboard: true,
  },
  aliases: [],
}

const SETTINGS_SYNC_EVENT = 'kikko:settings-sync'
const settingsSyncSource = `settings-${Math.random().toString(36).slice(2, 10)}`
let settingsSyncInitialized = false
let skipSyncBroadcast = false

function buildSnapshot(state: SettingsState): SettingsSnapshot {
  return {
    updatedAt: state.updatedAt,
    general: state.general,
    appearance: state.appearance,
    clipboard: state.clipboard,
    hotkeys: state.hotkeys,
    extensions: state.extensions,
    aliases: state.aliases,
  }
}

function mergeWithDefaults(snapshot: Partial<SettingsSnapshot> | undefined): SettingsSnapshot {
  return {
    updatedAt: snapshot?.updatedAt ?? defaultSettings.updatedAt,
    general: { ...defaultSettings.general, ...(snapshot?.general ?? {}) },
    appearance: { ...defaultSettings.appearance, ...(snapshot?.appearance ?? {}) },
    clipboard: { ...defaultSettings.clipboard, ...(snapshot?.clipboard ?? {}) },
    hotkeys: { ...defaultSettings.hotkeys, ...(snapshot?.hotkeys ?? {}) },
    extensions: { ...defaultSettings.extensions, ...(snapshot?.extensions ?? {}) },
    aliases: Array.isArray(snapshot?.aliases) ? snapshot.aliases : [],
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => {
      if (!settingsSyncInitialized && isTauriRuntime()) {
        settingsSyncInitialized = true
        void import('@tauri-apps/api/event').then(({ listen }) => {
          void listen<SettingsSyncPayload>(SETTINGS_SYNC_EVENT, (event) => {
            const payload = event.payload
            if (!payload || payload.source === settingsSyncSource) return
            const normalized = mergeWithDefaults(payload.snapshot)
            if (normalized.updatedAt <= get().updatedAt) return
            skipSyncBroadcast = true
            set((state) => ({
              ...state,
              ...normalized,
            }))
            skipSyncBroadcast = false
          })
        })
      }

      const broadcast = () => {
        if (skipSyncBroadcast || !isTauriRuntime()) return
        const payload: SettingsSyncPayload = {
          source: settingsSyncSource,
          snapshot: buildSnapshot(get()),
        }
        void import('@tauri-apps/api/event').then(({ emit }) => {
          void emit(SETTINGS_SYNC_EVENT, payload)
        })
      }

      return ({
      ...defaultSettings,
      updateGeneral: (patch) => {
        set((state) => ({
          updatedAt: Date.now(),
          general: { ...state.general, ...patch },
        }))
        broadcast()
      },
      updateAppearance: (patch) => {
        set((state) => ({
          updatedAt: Date.now(),
          appearance: { ...state.appearance, ...patch },
        }))
        broadcast()
      },
      updateClipboard: (patch) => {
        set((state) => ({
          updatedAt: Date.now(),
          clipboard: { ...state.clipboard, ...patch },
        }))
        broadcast()
      },
      updateExtensions: (patch) => {
        set((state) => ({
          updatedAt: Date.now(),
          extensions: { ...state.extensions, ...patch },
        }))
        broadcast()
      },
      updateHotkeys: (patch) => {
        set((state) => ({
          updatedAt: Date.now(),
          hotkeys: { ...state.hotkeys, ...patch },
        }))
        broadcast()
      },
      upsertAlias: (rule) => {
        set((state) => {
          const normalizedAlias = rule.alias.trim().toLowerCase()
          const next = state.aliases.filter((aliasRule) => aliasRule.id !== rule.id)
          next.push({
            ...rule,
            alias: normalizedAlias,
          })
          return {
            updatedAt: Date.now(),
            aliases: next,
          }
        })
        broadcast()
      },
      removeAlias: (id) => {
        set((state) => ({
          updatedAt: Date.now(),
          aliases: state.aliases.filter((rule) => rule.id !== id),
        }))
        broadcast()
      },
      })
    },
    {
      name: 'kikko-settings',
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as Partial<SettingsSnapshot> | undefined
        return mergeWithDefaults(state)
      },
      merge: (persistedState, currentState) => {
        const normalized = mergeWithDefaults(persistedState as Partial<SettingsSnapshot> | undefined)
        return {
          ...currentState,
          ...normalized,
        }
      },
      partialize: (state) => ({
        updatedAt: state.updatedAt,
        general: state.general,
        appearance: state.appearance,
        clipboard: state.clipboard,
        hotkeys: state.hotkeys,
        extensions: state.extensions,
        aliases: state.aliases,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state || !isTauriRuntime()) return
        const payload: SettingsSyncPayload = {
          source: settingsSyncSource,
          snapshot: buildSnapshot(state),
        }
        void import('@tauri-apps/api/event').then(({ emit }) => {
          void emit(SETTINGS_SYNC_EVENT, payload)
        })
      },
    },
  ),
)

export type { AccentPreset, AliasRule, AliasTargetType, ThemeMode, UiDensity }
