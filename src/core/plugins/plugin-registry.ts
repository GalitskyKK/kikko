import { builtInPluginManifests } from '@/core/plugins/builtin-plugins'
import type { PluginManifest } from '@/core/plugins/plugin-types'

class PluginRegistry {
  private manifests: PluginManifest[] = builtInPluginManifests

  getAll(): PluginManifest[] {
    return this.manifests
  }

  getById(id: string): PluginManifest | null {
    return this.manifests.find((manifest) => manifest.id === id) ?? null
  }

  register(manifest: PluginManifest) {
    const existingIndex = this.manifests.findIndex((item) => item.id === manifest.id)
    if (existingIndex >= 0) {
      this.manifests[existingIndex] = manifest
      return
    }
    this.manifests.push(manifest)
  }

  unregister(id: string) {
    this.manifests = this.manifests.filter((manifest) => manifest.id !== id)
  }

  resetToBuiltins() {
    this.manifests = [...builtInPluginManifests]
  }
}

export const pluginRegistry = new PluginRegistry()
