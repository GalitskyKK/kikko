import type { SearchableWithAction } from './search-types'
import { getPluginSearchables } from '@/core/plugins/plugin-searchables'
import { useClipboardStore } from '@/stores/clipboard-store'
import { useInstalledAppsStore } from '@/stores/installed-apps-store'
import { useSnippetStore } from '@/stores/snippet-store'
import { useSettingsStore } from '@/stores/settings-store'
import { isTauriRuntime } from '@/lib/tauri'
import { logger } from '@/utils/logger'

const SYSTEM_COMMANDS: Array<{
  id: string
  title: string
  subtitle: string
  keywords: string[]
  mode: 'system' | 'settings'
  settingsSectionId?: string
  args?: string[]
  fallbackSettingsSectionId?: string
  dangerous?: boolean
}> = [
  { id: 'cmd-lock', title: 'Lock Screen', subtitle: 'System', keywords: ['lock', 'screen', 'block'], mode: 'system' },
  { id: 'cmd-sleep', title: 'Sleep', subtitle: 'System', keywords: ['sleep', 'suspend'], mode: 'system' },
  { id: 'cmd-trash', title: 'Empty Trash', subtitle: 'System', keywords: ['trash', 'empty', 'recycle'], mode: 'system' },
  { id: 'cmd-volume-up', title: 'Volume Up', subtitle: 'System', keywords: ['volume', 'up', 'sound'], mode: 'system', fallbackSettingsSectionId: 'sound' },
  { id: 'cmd-volume-down', title: 'Volume Down', subtitle: 'System', keywords: ['volume', 'down', 'sound'], mode: 'system', fallbackSettingsSectionId: 'sound' },
  { id: 'cmd-volume-mute', title: 'Mute / Unmute Volume', subtitle: 'System', keywords: ['volume', 'mute', 'unmute', 'sound', 'toggle'], mode: 'system', fallbackSettingsSectionId: 'sound' },
  { id: 'cmd-volume-set', title: 'Set Volume 50%', subtitle: 'System', keywords: ['volume', 'set', '50', 'sound', 'preset'], mode: 'system', args: ['50'], fallbackSettingsSectionId: 'sound' },
  { id: 'cmd-volume-set', title: 'Set Volume 75%', subtitle: 'System', keywords: ['volume', 'set', '75', 'sound', 'preset'], mode: 'system', args: ['75'], fallbackSettingsSectionId: 'sound' },
  { id: 'cmd-volume-set', title: 'Set Volume 100%', subtitle: 'System', keywords: ['volume', 'set', '100', 'max', 'sound', 'preset'], mode: 'system', args: ['100'], fallbackSettingsSectionId: 'sound' },
  { id: 'cmd-restart', title: 'Restart Device', subtitle: 'Power', keywords: ['restart', 'reboot'], mode: 'system', dangerous: true },
  { id: 'cmd-shutdown', title: 'Shutdown Device', subtitle: 'Power', keywords: ['shutdown', 'poweroff'], mode: 'system', dangerous: true },
  {
    id: 'settings-display',
    title: 'Open Display Settings',
    subtitle: 'System Preferences',
    keywords: ['display', 'screen', 'settings', 'preferences'],
    mode: 'settings',
    settingsSectionId: 'display',
  },
  {
    id: 'settings-sound',
    title: 'Open Sound Settings',
    subtitle: 'System Preferences',
    keywords: ['sound', 'audio', 'volume', 'settings', 'preferences'],
    mode: 'settings',
    settingsSectionId: 'sound',
  },
  {
    id: 'settings-bluetooth',
    title: 'Open Bluetooth Settings',
    subtitle: 'System Preferences',
    keywords: ['bluetooth', 'wireless', 'settings'],
    mode: 'settings',
    settingsSectionId: 'bluetooth',
  },
  {
    id: 'settings-ethernet',
    title: 'Open Ethernet Settings',
    subtitle: 'Windows Settings',
    keywords: ['ethernet', 'network', 'lan', 'settings'],
    mode: 'settings',
    settingsSectionId: 'network-ethernet',
  },
  {
    id: 'settings-wifi',
    title: 'Open Wi-Fi Settings',
    subtitle: 'Windows Settings',
    keywords: ['wifi', 'wi-fi', 'wireless', 'network', 'settings'],
    mode: 'settings',
    settingsSectionId: 'network-wifi',
  },
  {
    id: 'settings-network',
    title: 'Open Network Settings',
    subtitle: 'System Preferences',
    keywords: ['network', 'internet', 'settings'],
    mode: 'settings',
    settingsSectionId: 'network',
  },
  {
    id: 'settings-apps',
    title: 'Open Installed Apps Settings',
    subtitle: 'System Preferences',
    keywords: ['apps', 'applications', 'installed', 'settings'],
    mode: 'settings',
    settingsSectionId: 'appsfeatures',
  },
]

export function looksLikeMath(query: string): boolean {
  const trimmed = query.trim()
  if (trimmed.startsWith('=')) return true
  return /^[\d\s+\-*/().%\s]+$/.test(trimmed) && trimmed.length > 0
}

export async function getSearchables(
  _query: string,
  options: { navigate: (path: string) => void; hideWindow: () => void },
): Promise<SearchableWithAction[]> {
  const { hideWindow } = options
  const list: SearchableWithAction[] = []
  const settings = useSettingsStore.getState()
  const showAppIcons = settings.appearance.showAppIcons
  const enabledExtensions = settings.extensions ?? {
    clipboard: true,
    snippets: true,
    calculator: true,
    dashboard: true,
  }
  const aliasByTargetId = new Map(settings.aliases.map((rule) => [rule.targetId, rule.alias.trim().toLowerCase()]))
  try {
    if (isTauriRuntime()) {
      const clipboardEntries = useClipboardStore.getState().entries
      if (clipboardEntries.length === 0) {
        await useClipboardStore.getState().loadFromBackend()
      }
    }

    const isWindows = isWindowsRuntime()
    const isMac = isMacRuntime()
    for (const cmd of SYSTEM_COMMANDS) {
      if (cmd.settingsSectionId === 'network-ethernet' && !isWindows) continue
      if (cmd.settingsSectionId === 'network-wifi' && !isWindows) continue
      if (cmd.mode === 'settings' && !isWindows && !isMac) continue
      list.push({
        item: {
          id: cmd.args?.length ? `${cmd.id}-${cmd.args.join('-')}` : cmd.id,
          type: 'command',
          section: cmd.mode === 'settings' ? 'preferences' : 'command',
          title: cmd.title,
          subtitle: cmd.subtitle,
          alias: aliasByTargetId.get(cmd.id),
          keywords: [...cmd.keywords, aliasByTargetId.get(cmd.id) ?? ''].filter(Boolean),
        },
        score: 0.7,
        action: () => {
          if (isTauriRuntime()) {
            void import('@tauri-apps/api/core')
              .then(async ({ invoke }) => {
                if (cmd.mode === 'settings' && cmd.settingsSectionId) {
                  await invoke('open_system_preferences', { sectionId: cmd.settingsSectionId })
                  return
                }
                try {
                  const output = await invoke<{ exit_code: number; supported: boolean; message?: string }>('run_system_command', {
                    input: { command: cmd.id, args: cmd.args ?? [] },
                  })
                  if (output?.message) {
                    logger.info('run_system_command result', { command: cmd.id, message: output.message })
                  }
                  if ((output && (!output.supported || output.exit_code !== 0)) && cmd.fallbackSettingsSectionId) {
                    await invoke('open_system_preferences', { sectionId: cmd.fallbackSettingsSectionId })
                  }
                } catch {
                  if (cmd.fallbackSettingsSectionId) {
                    await invoke('open_system_preferences', { sectionId: cmd.fallbackSettingsSectionId })
                  }
                }
              })
              .catch(() => {})
            hideWindow()
          }
        },
      })
    }
    list.push(...getPluginSearchables({ hideWindow }))

    try {
      if (enabledExtensions.clipboard) {
        const clipboardEntries = useClipboardStore.getState().entries
        for (const e of clipboardEntries.slice(0, 50)) {
          list.push({
            item: {
              id: e.id,
              type: 'clipboard',
              section: 'clipboard',
              title: e.preview || e.content.slice(0, 80),
              subtitle: 'Clipboard',
              keywords: [e.preview, e.content.slice(0, 200)].filter(Boolean),
            },
            score: e.isFavorite || e.isPinned ? 1 : 0.5,
            action: () => {
              if (isTauriRuntime()) {
                void import('@tauri-apps/api/core').then(({ invoke }) => invoke('write_clipboard_entry', { id: e.id }))
                hideWindow()
              }
            },
          })
        }
      }
    } catch (err) {
      logger.warn('clipboard in getSearchables', { error: err })
    }

    try {
      if (enabledExtensions.snippets) {
        const snippets = useSnippetStore.getState().snippets
        for (const s of snippets) {
          list.push({
            item: {
              id: s.id,
              type: 'snippet',
              section: 'snippet',
              title: s.name,
              subtitle: s.keyword,
              alias: aliasByTargetId.get(s.id),
              keywords: [s.keyword, s.content.slice(0, 100), aliasByTargetId.get(s.id) ?? ''].filter(Boolean),
            },
            score: 0.8,
            action: () => {
              if (isTauriRuntime()) {
                void import('@tauri-apps/api/core').then(({ invoke }) => invoke('mark_snippet_used', { id: s.id }))
                void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) => writeText(s.content))
                hideWindow()
              }
            },
          })
        }
      }
    } catch (err) {
      logger.warn('snippets in getSearchables', { error: err })
    }

    if (isTauriRuntime()) {
      let apps = useInstalledAppsStore.getState().apps
      if (apps.length === 0) {
        try {
          const { invoke } = await import('@tauri-apps/api/core')
          const fetched = (await invoke<Array<{ id: string; name: string; path?: string }>>('get_installed_apps')) ?? []
          useInstalledAppsStore.setState({ apps: fetched, loaded: true })
          apps = fetched
        } catch (err) {
          logger.warn('get_installed_apps fallback failed', { error: err })
        }
      }
      for (const app of apps) {
        const nameLower = app.name.toLowerCase()
        list.push({
          item: {
            id: app.id,
            type: 'app',
            section: 'application',
            title: app.name,
            subtitle: 'Application',
            icon: showAppIcons ? app.path : undefined,
            alias: aliasByTargetId.get(app.id),
            keywords: [app.name, nameLower, nameLower.replace(/\s+/g, ''), aliasByTargetId.get(app.id) ?? ''].filter(Boolean),
          },
          score: 0.9,
          action: () => {
            if (app.path) {
              void import('@tauri-apps/api/core').then(({ invoke }) => invoke('open_path', { path: app.path }))
            }
            hideWindow()
          },
        })
      }

    }
  } catch (err) {
    logger.warn('getSearchables error', { error: err })
  }

  return list
}

export async function getFileSearchables(
  query: string,
  options: { hideWindow: () => void },
): Promise<SearchableWithAction[]> {
  const { hideWindow } = options
  if (!isTauriRuntime()) return []
  if (query.trim().length < 2) return []

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const files =
      (await invoke<Array<{ id: string; path: string; name: string }>>('search_files', {
        input: { query, dirs: ['Desktop', 'Documents', 'Downloads'] },
      })) ?? []

    return files.slice(0, 80).map((f) => ({
      item: {
        id: f.id,
        type: 'file',
        section: 'file',
        title: f.name,
        subtitle: f.path,
        icon: f.path,
        keywords: [f.name, f.path],
      },
      score: 0.85,
      action: () => {
        void import('@tauri-apps/api/core').then(({ invoke }) => invoke('open_path', { path: f.path }))
        hideWindow()
      },
    }))
  } catch (err) {
    logger.warn('getFileSearchables failed', { error: err })
    return []
  }
}

function isWindowsRuntime(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.userAgent.toLowerCase().includes('windows')
}

function isMacRuntime(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.userAgent.toLowerCase().includes('mac')
}
