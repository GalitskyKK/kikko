import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { createJSONStorage, persist } from 'zustand/middleware'
import { pluginRegistry } from '@/core/plugins/plugin-registry'
import { logger } from '@/utils/logger'

export interface BuiltinPlugin {
  id: string
  name: string
  description: string
  version: string
  commandsCount: number
  widgetsCount: number
  enabled: boolean
}

const builtinPlugins: BuiltinPlugin[] = pluginRegistry.getAll().map((manifest) => ({
  id: manifest.id,
  name: manifest.name,
  description: manifest.description,
  version: manifest.version,
  commandsCount: manifest.commandsCount,
  widgetsCount: manifest.widgetsCount,
  enabled: true,
}))

interface PluginState {
  plugins: BuiltinPlugin[]
  runtimePlugins: BuiltinPlugin[]
  runtimeErrors: Array<{ path: string; message: string }>
  isLoadingRuntime: boolean
  togglePlugin: (id: string) => void
  loadRuntimePlugins: () => Promise<void>
}

export const usePluginStore = create<PluginState>()(
  persist(
    (set) => ({
      plugins: builtinPlugins,
      runtimePlugins: [],
      runtimeErrors: [],
      isLoadingRuntime: false,
      togglePlugin: (id) =>
        set((state) => ({
          plugins: state.plugins.map((plugin) =>
            plugin.id === id ? { ...plugin, enabled: !plugin.enabled } : plugin,
          ),
        })),
      loadRuntimePlugins: async () => {
        set({ isLoadingRuntime: true })
        try {
          const payload = await invoke<{
            plugins: Array<{
              id: string
              name: string
              version: string
              description?: string
              commands_count?: number
              widgets_count?: number
            }>
            errors: Array<{ path: string; message: string }>
          }>('load_plugin_manifests')
          pluginRegistry.resetToBuiltins()
          payload.plugins.forEach((plugin) => {
            pluginRegistry.register({
              id: plugin.id,
              name: plugin.name,
              version: plugin.version,
              description: plugin.description ?? 'External plugin',
              author: 'External',
              commandsCount: plugin.commands_count ?? 0,
              widgetsCount: plugin.widgets_count ?? 0,
            })
          })
          set({
            runtimePlugins: payload.plugins.map((plugin) => ({
              id: plugin.id,
              name: plugin.name,
              description: plugin.description ?? 'External plugin',
              version: plugin.version,
              commandsCount: plugin.commands_count ?? 0,
              widgetsCount: plugin.widgets_count ?? 0,
              enabled: true,
            })),
            runtimeErrors: payload.errors ?? [],
            isLoadingRuntime: false,
          })
        } catch (error) {
          logger.warn('load_plugin_manifests failed', { error })
          pluginRegistry.resetToBuiltins()
          set({
            runtimePlugins: [],
            runtimeErrors: [{ path: '~/.kikko/plugins', message: 'Failed to read plugin manifests' }],
            isLoadingRuntime: false,
          })
        }
      },
    }),
    {
      name: 'kikko-plugins',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ plugins: state.plugins }),
    },
  ),
)
