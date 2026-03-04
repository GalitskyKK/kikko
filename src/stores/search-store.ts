import { create } from 'zustand'

interface SearchResult {
  id: string
  type: 'app' | 'file' | 'clipboard' | 'snippet' | 'command' | 'plugin' | 'calculator'
  section?:
    | 'suggestion'
    | 'command'
    | 'application'
    | 'preferences'
    | 'file'
    | 'plugin'
    | 'clipboard'
    | 'snippet'
    | 'calculator'
  title: string
  subtitle?: string
  icon?: string
  alias?: string
  score: number
  action: () => void
}

interface SearchState {
  query: string
  results: SearchResult[]
  isLoading: boolean
  selectedIndex: number

  setQuery: (query: string) => void
  setResults: (results: SearchResult[]) => void
  setLoading: (loading: boolean) => void
  setSelectedIndex: (index: number) => void
  reset: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  isLoading: false,
  selectedIndex: 0,

  setQuery: (query) => set({ query, selectedIndex: 0 }),
  setResults: (results) => set({ results }),
  setLoading: (isLoading) => set({ isLoading }),
  setSelectedIndex: (selectedIndex) => set({ selectedIndex }),
  reset: () => set({ query: '', results: [], isLoading: false, selectedIndex: 0 }),
}))

export type { SearchResult }
