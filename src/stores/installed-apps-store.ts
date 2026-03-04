import { create } from 'zustand'
import { logger } from '@/utils/logger'
import { searchEngine } from '@/core/search/search-engine'

export interface InstalledApp {
  id: string
  name: string
  path?: string
}

interface InstalledAppsState {
  apps: InstalledApp[]
  loaded: boolean
  loadApps: () => Promise<void>
}

export const useInstalledAppsStore = create<InstalledAppsState>((set, get) => ({
  apps: [],
  loaded: false,

  loadApps: async () => {
    if (get().loaded) return
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const apps = (await invoke<InstalledApp[]>('get_installed_apps')) ?? []
      set({ apps, loaded: true })
      searchEngine.clearCache()
      logger.debug('installed-apps loaded', { count: apps.length })
    } catch (err) {
      logger.warn('get_installed_apps failed', { error: err })
      set({ loaded: true })
    }
  },
}))
