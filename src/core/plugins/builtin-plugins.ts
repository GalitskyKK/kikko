import type { PluginManifest } from '@/core/plugins/plugin-types'

export const builtInPluginManifests: PluginManifest[] = [
  {
    id: 'calculator-history',
    name: 'Calculator History',
    version: '0.1.0',
    description: 'Persistent calculator history for root search.',
    author: 'Kikko',
    commandsCount: 2,
    widgetsCount: 1,
  },
  {
    id: 'uuid-generator',
    name: 'UUID Generator',
    version: '0.1.0',
    description: 'Generate UUID values from palette.',
    author: 'Kikko',
    commandsCount: 1,
    widgetsCount: 0,
  },
  {
    id: 'json-tools',
    name: 'JSON Tools',
    version: '0.1.0',
    description: 'Validate and pretty-print JSON.',
    author: 'Kikko',
    commandsCount: 2,
    widgetsCount: 0,
  },
  {
    id: 'quick-links',
    name: 'Quick Links',
    version: '0.1.0',
    description: 'Open favorite links and folders.',
    author: 'Kikko',
    commandsCount: 3,
    widgetsCount: 1,
  },
  {
    id: 'emoji-picker',
    name: 'Emoji Picker',
    version: '0.1.0',
    description: 'Search emojis and copy to clipboard.',
    author: 'Kikko',
    commandsCount: 1,
    widgetsCount: 0,
  },
]
