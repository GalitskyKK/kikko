import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface SuggestionUsageEntry {
  count: number
  lastUsed: number
}

export interface FrequentResultMeta {
  id: string
  section: string
  type: string
  title: string
  subtitle?: string
}

const FREQUENT_RESULTS_MAX = 50

interface SuggestionUsageState {
  usage: Record<string, SuggestionUsageEntry>
  /** id -> meta for search results (apps, commands, plugins, etc.) to resolve to action */
  resultMeta: Record<string, FrequentResultMeta>
  recordUsage: (suggestionId: string) => void
  recordResultUsage: (payload: FrequentResultMeta) => void
  getScore: (suggestionId: string) => number
  getFrequentResultIds: (limit: number, excludeIds: Set<string>) => string[]
}

const RECENCY_WEIGHT_DAYS = 14
const NOW = () => Date.now()

/**
 * Score for ranking: frequency + recency.
 * Recency adds up to ~1 "virtual use" per day within RECENCY_WEIGHT_DAYS, then decays.
 */
function computeScore(entry: SuggestionUsageEntry): number {
  const daysSince = (NOW() - entry.lastUsed) / (24 * 60 * 60 * 1000)
  const recencyBonus = daysSince <= RECENCY_WEIGHT_DAYS ? (RECENCY_WEIGHT_DAYS - daysSince) / RECENCY_WEIGHT_DAYS : 0
  return entry.count + recencyBonus
}

export const useSuggestionUsageStore = create<SuggestionUsageState>()(
  persist(
    (set, get) => ({
      usage: {},
      resultMeta: {},
      recordUsage(suggestionId: string) {
        set((state) => {
          const prev = state.usage[suggestionId] ?? { count: 0, lastUsed: 0 }
          return {
            usage: {
              ...state.usage,
              [suggestionId]: {
                count: prev.count + 1,
                lastUsed: NOW(),
              },
            },
          }
        })
      },
      recordResultUsage(payload: FrequentResultMeta) {
        const { id, section, type, title, subtitle } = payload
        set((state) => {
          const prev = state.usage[id] ?? { count: 0, lastUsed: 0 }
          const nextUsage = {
            ...state.usage,
            [id]: { count: prev.count + 1, lastUsed: NOW() },
          }
          const nextMeta = { ...state.resultMeta, [id]: { id, section, type, title, subtitle } }
          let metaIds = Object.keys(nextMeta)
          if (metaIds.length > FREQUENT_RESULTS_MAX) {
            const byScore = metaIds
              .map((sid) => ({ id: sid, score: computeScore(nextUsage[sid] ?? { count: 0, lastUsed: 0 }) }))
              .sort((a, b) => b.score - a.score)
            const keep = new Set(byScore.slice(0, FREQUENT_RESULTS_MAX).map((x) => x.id))
            metaIds = metaIds.filter((sid) => keep.has(sid))
            const trimmedMeta: Record<string, FrequentResultMeta> = {}
            for (const sid of metaIds) {
              const entry = nextMeta[sid]
              if (entry) trimmedMeta[sid] = entry
            }
            return { usage: nextUsage, resultMeta: trimmedMeta }
          }
          return { usage: nextUsage, resultMeta: nextMeta }
        })
      },
      getScore(suggestionId: string) {
        const entry = get().usage[suggestionId]
        return entry ? computeScore(entry) : 0
      },
      getFrequentResultIds(limit: number, excludeIds: Set<string>) {
        const { resultMeta } = get()
        return Object.keys(resultMeta)
          .filter((id) => !excludeIds.has(id))
          .map((id) => ({ id, score: get().getScore(id) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map((x) => x.id)
      },
    }),
    {
      name: 'kikko:suggestion-usage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

/**
 * Sorts suggestions by usage relevance (score desc), then by defaultOrder index (asc).
 */
export function sortSuggestionsByRelevance<T extends { id: string }>(
  suggestions: T[],
  getScore: (id: string) => number,
): T[] {
  const orderByIndex = new Map(suggestions.map((s, i) => [s.id, i]))
  return [...suggestions].sort((a, b) => {
    const scoreA = getScore(a.id)
    const scoreB = getScore(b.id)
    if (scoreB !== scoreA) return scoreB - scoreA
    return (orderByIndex.get(a.id) ?? 0) - (orderByIndex.get(b.id) ?? 0)
  })
}
