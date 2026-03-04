import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export interface Snippet {
  id: string
  name: string
  keyword: string
  content: string
  category: string
  useCount: number
  createdAt: string
  updatedAt: string
}

/** Ответ бэкенда (snake_case) */
interface SnippetRaw {
  id: string
  name: string
  keyword: string
  content: string
  category: string | null
  use_count: number
  created_at: string
  updated_at: string
}

function mapSnippet(raw: SnippetRaw): Snippet {
  return {
    id: raw.id,
    name: raw.name,
    keyword: raw.keyword,
    content: raw.content,
    category: raw.category ?? 'general',
    useCount: raw.use_count,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

interface SnippetState {
  snippets: Snippet[]
  isLoading: boolean

  setSnippets: (snippets: Snippet[]) => void
  setLoading: (loading: boolean) => void
  loadFromBackend: () => Promise<void>
  createSnippet: (input: { name: string; keyword: string; content: string; category?: string }) => Promise<Snippet | null>
  updateSnippet: (input: { id: string; name: string; keyword: string; content: string; category?: string }) => Promise<Snippet | null>
  deleteSnippet: (id: string) => Promise<void>
  markSnippetUsed: (id: string) => Promise<void>
}

export const useSnippetStore = create<SnippetState>((set) => ({
  snippets: [],
  isLoading: false,

  setSnippets: (snippets) => set({ snippets }),
  setLoading: (isLoading) => set({ isLoading }),

  loadFromBackend: async () => {
    set({ isLoading: true })
    try {
      const raw = await invoke<SnippetRaw[]>('get_snippets')
      set({ snippets: (raw ?? []).map(mapSnippet), isLoading: false })
    } catch {
      set({ snippets: [], isLoading: false })
    }
  },
  createSnippet: async (input) => {
    try {
      const raw = await invoke<SnippetRaw>('create_snippet', { input })
      const mapped = mapSnippet(raw)
      set((state) => ({ snippets: [mapped, ...state.snippets] }))
      return mapped
    } catch {
      return null
    }
  },
  updateSnippet: async (input) => {
    try {
      const raw = await invoke<SnippetRaw>('update_snippet', { input })
      const mapped = mapSnippet(raw)
      set((state) => ({
        snippets: state.snippets.map((snippet) => (snippet.id === mapped.id ? mapped : snippet)),
      }))
      return mapped
    } catch {
      return null
    }
  },
  deleteSnippet: async (id) => {
    try {
      await invoke('delete_snippet', { id })
      set((state) => ({ snippets: state.snippets.filter((snippet) => snippet.id !== id) }))
    } catch {
      // no-op
    }
  },
  markSnippetUsed: async (id) => {
    try {
      await invoke('mark_snippet_used', { id })
      set((state) => ({
        snippets: state.snippets.map((snippet) => (
          snippet.id === id
            ? {
                ...snippet,
                useCount: snippet.useCount + 1,
                updatedAt: new Date().toISOString(),
              }
            : snippet
        )),
      }))
    } catch {
      // no-op
    }
  },
}))
