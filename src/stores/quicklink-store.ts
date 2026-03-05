import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export interface Quicklink {
  id: string
  name: string
  url: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface QuicklinkRaw {
  id: string
  name: string
  url: string
  tags: string[]
  created_at: string
  updated_at: string
}

function mapQuicklink(raw: QuicklinkRaw): Quicklink {
  return {
    id: raw.id,
    name: raw.name,
    url: raw.url,
    tags: raw.tags ?? [],
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

interface QuicklinkState {
  quicklinks: Quicklink[]
  isLoading: boolean
  setQuicklinks: (quicklinks: Quicklink[]) => void
  setLoading: (loading: boolean) => void
  loadFromBackend: () => Promise<void>
  createQuicklink: (input: {
    name: string
    url: string
    tags?: string[]
  }) => Promise<Quicklink | null>
  updateQuicklink: (input: {
    id: string
    name: string
    url: string
    tags?: string[]
  }) => Promise<Quicklink | null>
  deleteQuicklink: (id: string) => Promise<void>
}

export const useQuicklinkStore = create<QuicklinkState>((set) => ({
  quicklinks: [],
  isLoading: false,

  setQuicklinks: (quicklinks) => set({ quicklinks }),
  setLoading: (isLoading) => set({ isLoading }),

  loadFromBackend: async () => {
    set({ isLoading: true })
    try {
      const raw = await invoke<QuicklinkRaw[]>('get_quicklinks')
      set({ quicklinks: (raw ?? []).map(mapQuicklink), isLoading: false })
    } catch {
      set({ quicklinks: [], isLoading: false })
    }
  },

  createQuicklink: async (input) => {
    try {
      const raw = await invoke<QuicklinkRaw>('create_quicklink', {
        input: {
          name: input.name,
          url: input.url,
          tags: input.tags ?? [],
        },
      })
      const mapped = mapQuicklink(raw)
      set((state) => ({ quicklinks: [mapped, ...state.quicklinks] }))
      return mapped
    } catch {
      return null
    }
  },

  updateQuicklink: async (input) => {
    try {
      const raw = await invoke<QuicklinkRaw>('update_quicklink', {
        input: {
          id: input.id,
          name: input.name,
          url: input.url,
          tags: input.tags ?? [],
        },
      })
      const mapped = mapQuicklink(raw)
      set((state) => ({
        quicklinks: state.quicklinks.map((q) =>
          q.id === mapped.id ? mapped : q,
        ),
      }))
      return mapped
    } catch {
      return null
    }
  },

  deleteQuicklink: async (id) => {
    try {
      await invoke('delete_quicklink', { id })
      set((state) => ({
        quicklinks: state.quicklinks.filter((q) => q.id !== id),
      }))
    } catch {
      // no-op
    }
  },
}))
