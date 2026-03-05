import type { SearchableWithAction } from '@/core/search/search-types'
import { toast } from '@/components/ui/sonner'
import { isTauriRuntime } from '@/lib/tauri'
import { useClipboardStore } from '@/stores/clipboard-store'
import { usePluginStore } from '@/stores/plugin-store'

interface PluginSearchableOptions {
  hideWindow: () => void
  /** Switch palette to a dedicated mode (emoji, quicklinks). When set, action does not hide window. */
  openPaletteMode?: (mode: 'emoji' | 'quicklinks') => void
}

export function getPluginSearchables(options: PluginSearchableOptions): SearchableWithAction[] {
  const { hideWindow } = options
  const state = usePluginStore.getState()
  const enabledPluginIds = new Set(state.plugins.filter((plugin) => plugin.enabled).map((plugin) => plugin.id))
  const runtimePlugins = state.runtimePlugins
  const list: SearchableWithAction[] = []

  const pluginActionFactories: Record<string, () => SearchableWithAction[]> = {
    'uuid-generator': () => [
      {
        item: {
          id: 'plugin-uuid-generate',
          type: 'plugin',
          section: 'plugin',
          title: 'Generate UUID v4',
          subtitle: 'Plugin: UUID Generator',
          keywords: ['uuid', 'plugin', 'guid'],
        },
        score: 0.9,
        action: () => {
          const value = crypto.randomUUID()
          if (isTauriRuntime()) {
            void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) => writeText(value))
          }
          toast.success('UUID copied to clipboard')
          hideWindow()
        },
      },
    ],
    'emoji-picker': () => [
      {
        item: {
          id: 'plugin-emoji-picker',
          type: 'plugin',
          section: 'plugin',
          title: 'Emoji Picker',
          subtitle: 'Search and copy emojis',
          keywords: ['emoji', 'emoji picker', 'symbols', 'smiley', 'copy emoji'],
        },
        score: 0.9,
        action: () => {
          if (options.openPaletteMode) {
            options.openPaletteMode('emoji')
            return
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kikko:palette-mode', { detail: 'emoji' }))
          }
        },
      },
    ],
    'json-tools': () => [
      {
        item: {
          id: 'plugin-json-format-last',
          type: 'plugin',
          section: 'plugin',
          title: 'Format JSON from last clipboard text',
          subtitle: 'Plugin: JSON Tools',
          keywords: ['json', 'format', 'plugin', 'prettify'],
        },
        score: 0.78,
        action: () => {
          const latestText = useClipboardStore
            .getState()
            .entries.find((entry) => entry.contentType === 'text')
            ?.content?.trim()
          if (!latestText) return
          try {
            const formatted = JSON.stringify(JSON.parse(latestText), null, 2)
            if (isTauriRuntime()) {
              void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) => writeText(formatted))
            }
            toast.success('JSON formatted and copied')
            hideWindow()
          } catch {
            toast.error('Latest clipboard text is not valid JSON')
          }
        },
      },
      {
        item: {
          id: 'plugin-json-validate-last',
          type: 'plugin',
          section: 'plugin',
          title: 'Validate JSON from last clipboard text',
          subtitle: 'Plugin: JSON Tools',
          keywords: ['json', 'validate', 'plugin'],
        },
        score: 0.75,
        action: () => {
          const latestText = useClipboardStore
            .getState()
            .entries.find((entry) => entry.contentType === 'text')
            ?.content?.trim()
          if (!latestText) return
          try {
            JSON.parse(latestText)
            if (isTauriRuntime()) {
              void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) => writeText('JSON is valid'))
            }
            toast.success('JSON is valid')
            hideWindow()
          } catch {
            if (isTauriRuntime()) {
              void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) => writeText('JSON is invalid'))
            }
            toast.error('JSON is invalid')
            hideWindow()
          }
        },
      },
    ],
    'quick-links': () => [
      {
        item: {
          id: 'plugin-quicklinks-search',
          type: 'plugin',
          section: 'plugin',
          title: 'Search Quicklinks',
          subtitle: 'Open saved links',
          keywords: ['quick links', 'quicklinks', 'search', 'links', 'open'],
        },
        score: 0.92,
        action: () => {
          if (options.openPaletteMode) {
            options.openPaletteMode('quicklinks')
            return
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kikko:palette-mode', { detail: 'quicklinks' }))
          }
        },
      },
      {
        item: {
          id: 'plugin-quicklinks-create',
          type: 'plugin',
          section: 'plugin',
          title: 'Create Quicklink',
          subtitle: 'Add new link in Settings',
          keywords: ['quick links', 'quicklinks', 'create', 'add', 'new link'],
        },
        score: 0.88,
        action: () => {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('kikko:settings:focus-section', 'quicklinks')
          }
          if (isTauriRuntime()) {
            void import('@/lib/window-navigation').then(({ openSettingsWindow }) =>
              openSettingsWindow(),
            )
          }
          options.hideWindow()
        },
      },
    ],
    'calculator-history': () => [
      {
        item: {
          id: 'plugin-calc-history-open',
          type: 'plugin',
          section: 'plugin',
          title: 'Calculator History (coming next)',
          subtitle: 'Plugin: Calculator History',
          keywords: ['calculator', 'history', 'plugin', 'math'],
        },
        score: 0.65,
        action: () => {
          toast.message('Calculator history widget is planned next')
          hideWindow()
        },
      },
    ],
  }

  enabledPluginIds.forEach((id) => {
    const factory = pluginActionFactories[id]
    if (factory) {
      list.push(...factory())
    }
  })

  runtimePlugins.forEach((plugin) => {
    if (enabledPluginIds.has(plugin.id)) return
    list.push({
      item: {
        id: `plugin-runtime-${plugin.id}`,
        type: 'plugin',
        section: 'plugin',
        title: plugin.name,
        subtitle: `Plugin: ${plugin.version}`,
        keywords: [plugin.name, plugin.id, 'plugin', 'external'],
      },
      score: 0.6,
      action: () => {
        toast.message('Plugin loaded from filesystem, command bindings are coming next')
      },
    })
  })

  return list
}
