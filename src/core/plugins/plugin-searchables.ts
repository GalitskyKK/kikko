import type { SearchableWithAction } from '@/core/search/search-types'
import { toast } from '@/components/ui/sonner'
import { isTauriRuntime } from '@/lib/tauri'
import { useClipboardStore } from '@/stores/clipboard-store'
import { usePluginStore } from '@/stores/plugin-store'

interface PluginSearchableOptions {
  hideWindow: () => void
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
          id: 'plugin-emoji-fire',
          type: 'plugin',
          section: 'plugin',
          title: 'Copy emoji: Fire',
          subtitle: 'Plugin: Emoji Picker',
          keywords: ['emoji', 'fire', 'plugin'],
        },
        score: 0.72,
        action: () => {
          if (isTauriRuntime()) {
            void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) => writeText('🔥'))
          }
          toast.success('Emoji copied to clipboard')
          hideWindow()
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
          id: 'plugin-quick-link-github',
          type: 'plugin',
          section: 'plugin',
          title: 'Open GitHub',
          subtitle: 'Plugin: Quick Links',
          keywords: ['github', 'quick links', 'plugin', 'open'],
        },
        score: 0.7,
        action: () => {
          if (!isTauriRuntime()) return
          void import('@tauri-apps/plugin-shell').then(({ open }) => open('https://github.com'))
          toast.success('Opening GitHub')
          hideWindow()
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
