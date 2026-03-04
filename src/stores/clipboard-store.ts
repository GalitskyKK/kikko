import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { logger } from '@/utils/logger'
import { useSettingsStore } from '@/stores/settings-store'

type ClipboardContentType = 'text' | 'image' | 'html' | 'code' | 'file'
type ClipboardAssetMimeType = string

/** Ответ бэкенда (snake_case) */
export interface ClipboardEntryRaw {
  id: string
  content: string
  content_type: string
  encrypted: boolean
  is_favorite: boolean
  is_pinned: boolean
  app_source: string | null
  char_count: number
  preview: string
  asset_file_path?: string | null
  asset_mime_type?: string | null
  asset_file_size?: number | null
  asset_width?: number | null
  asset_height?: number | null
  created_at: string
  updated_at: string
}

export interface ClipboardEntry {
  id: string
  content: string
  contentType: ClipboardContentType
  isFavorite: boolean
  isPinned: boolean
  appSource: string | null
  charCount: number
  preview: string
  assetFilePath: string | null
  assetMimeType: ClipboardAssetMimeType | null
  assetFileSize: number | null
  assetWidth: number | null
  assetHeight: number | null
  createdAt: string
}

export function mapClipboardEntry(raw: ClipboardEntryRaw): ClipboardEntry {
  return {
    id: raw.id,
    content: raw.content,
    contentType: (raw.content_type as ClipboardContentType) || 'text',
    isFavorite: raw.is_favorite,
    isPinned: raw.is_pinned,
    appSource: raw.app_source ?? null,
    charCount: raw.char_count,
    preview: raw.preview,
    assetFilePath: raw.asset_file_path ?? null,
    assetMimeType: raw.asset_mime_type ?? null,
    assetFileSize: raw.asset_file_size ?? null,
    assetWidth: raw.asset_width ?? null,
    assetHeight: raw.asset_height ?? null,
    createdAt: raw.created_at,
  }
}

export function normalizeClipboardEntry(raw: ClipboardEntryRaw | ClipboardEntry): ClipboardEntry {
  if ('contentType' in raw) {
    return raw
  }
  return mapClipboardEntry(raw)
}

function applyClipboardSettings(entries: ClipboardEntry[]): ClipboardEntry[] {
  const { clipboard } = useSettingsStore.getState()
  const now = Date.now()
  const maxAgeMs = Math.max(clipboard.retentionDays, 1) * 24 * 60 * 60 * 1000

  return entries
    .filter((entry) => {
      if (!clipboard.captureImages && entry.contentType === 'image') return false
      if (!clipboard.captureFiles && entry.contentType === 'file') return false
      const createdAt = Date.parse(entry.createdAt)
      if (Number.isNaN(createdAt)) return true
      return now - createdAt <= maxAgeMs
    })
    .slice(0, Math.max(clipboard.maxItems, 1))
}

interface ClipboardState {
  entries: ClipboardEntry[]
  isLoading: boolean

  setEntries: (entries: ClipboardEntry[]) => void
  addEntry: (entry: ClipboardEntry) => void
  upsertEntry: (entry: ClipboardEntry) => void
  setFavorite: (id: string, value: boolean) => void
  setPinned: (id: string, value: boolean) => void
  removeEntry: (id: string) => void
  clearEntries: () => void
  setLoading: (loading: boolean) => void
  loadFromBackend: () => Promise<void>
  toggleFavoriteInBackend: (id: string) => Promise<void>
  togglePinnedInBackend: (id: string) => Promise<void>
  deleteInBackend: (id: string) => Promise<void>
  clearInBackend: () => Promise<void>
  writeInBackend: (id: string) => Promise<void>
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  entries: [],
  isLoading: false,

  setEntries: (entries) => set({ entries }),
  addEntry: (entry) =>
    set((state) => ({
      entries: applyClipboardSettings([entry, ...state.entries]),
    })),
  upsertEntry: (entry) =>
    set((state) => ({
      entries: applyClipboardSettings([entry, ...state.entries.filter((existing) => existing.id !== entry.id)]),
    })),
  setFavorite: (id, value) => set((state) => ({ entries: state.entries.map((entry) => (entry.id === id ? { ...entry, isFavorite: value } : entry)) })),
  setPinned: (id, value) => set((state) => ({ entries: state.entries.map((entry) => (entry.id === id ? { ...entry, isPinned: value } : entry)) })),
  removeEntry: (id) =>
    set((state) => ({
      entries: state.entries.filter((entry) => entry.id !== id),
    })),
  clearEntries: () => set({ entries: [] }),
  setLoading: (isLoading) => set({ isLoading }),

  loadFromBackend: async () => {
    set({ isLoading: true })
    try {
      const raw = await invoke<ClipboardEntryRaw[]>('get_clipboard_history')
      set({ entries: applyClipboardSettings(raw.map(mapClipboardEntry)), isLoading: false })
    } catch (err) {
      logger.warn('get_clipboard_history failed', { error: err })
      set({ entries: [], isLoading: false })
    }
  },
  toggleFavoriteInBackend: async (id) => {
    const target = useClipboardStore.getState().entries.find((entry) => entry.id === id)
    if (!target) return
    const nextValue = !target.isFavorite
    useClipboardStore.getState().setFavorite(id, nextValue)
    try {
      await invoke('toggle_favorite', { id })
    } catch (err) {
      useClipboardStore.getState().setFavorite(id, !nextValue)
      logger.warn('toggle_favorite failed', { error: err, id })
    }
  },
  togglePinnedInBackend: async (id) => {
    const target = useClipboardStore.getState().entries.find((entry) => entry.id === id)
    if (!target) return
    const nextValue = !target.isPinned
    useClipboardStore.getState().setPinned(id, nextValue)
    try {
      await invoke('toggle_pinned', { id })
    } catch (err) {
      useClipboardStore.getState().setPinned(id, !nextValue)
      logger.warn('toggle_pinned failed', { error: err, id })
    }
  },
  deleteInBackend: async (id) => {
    const previous = useClipboardStore.getState().entries
    useClipboardStore.getState().removeEntry(id)
    try {
      await invoke('delete_entry', { id })
    } catch (err) {
      set({ entries: previous })
      logger.warn('delete_entry failed', { error: err, id })
    }
  },
  clearInBackend: async () => {
    const previous = useClipboardStore.getState().entries
    useClipboardStore.getState().clearEntries()
    try {
      await invoke('clear_history')
    } catch (err) {
      set({ entries: previous })
      logger.warn('clear_history failed', { error: err })
    }
  },
  writeInBackend: async (id) => {
    try {
      await invoke('write_clipboard_entry', { id })
    } catch (err) {
      logger.warn('write_clipboard_entry failed', { error: err, id })
    }
  },
}))

export type { ClipboardContentType }
