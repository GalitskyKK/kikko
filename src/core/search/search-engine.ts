import type { SearchResult } from '@/stores/search-store'
import type { SearchableWithAction } from './search-types'
import { SEARCH_CACHE_MAX_SIZE } from '@/lib/constants'
import { logger } from '@/utils/logger'

interface FuseEntry {
  searchText: string
  data: SearchableWithAction
}

function toSearchText(item: SearchableWithAction['item']): string {
  const parts = [
    item.title,
    item.subtitle ?? '',
    item.alias ?? '',
    ...(Array.isArray(item.keywords) ? item.keywords : []),
  ].filter(Boolean)
  return parts.join(' ').toLowerCase()
}

/**
 * Поиск по подстроке (как в Raycast): любой элемент, в title/keywords/subtitle
 * которого есть запрос, попадает в результаты. Сортировка по релевантности.
 */
export function createSearchEngine() {
  const cache = new Map<string, SearchResult[]>()

  function getCached(query: string, cacheKey?: string): SearchResult[] | undefined {
    const normalized = normalizeKey(query, cacheKey)
    return cache.get(normalized)
  }

  function setCached(query: string, results: SearchResult[], cacheKey?: string) {
    const normalized = normalizeKey(query, cacheKey)
    if (normalized === '') return
    if (cache.size >= SEARCH_CACHE_MAX_SIZE) {
      const firstKey = cache.keys().next().value
      if (firstKey !== undefined) cache.delete(firstKey)
    }
    cache.set(normalized, results)
  }

  function search(
    query: string,
    searchables: SearchableWithAction[],
    options?: { cacheKey?: string; useCache?: boolean },
  ): SearchResult[] {
    const trimmed = query.trim()
    if (trimmed === '') {
      return [...searchables]
        .sort((left, right) => {
          if (right.score !== left.score) return right.score - left.score
          return left.item.title.localeCompare(right.item.title)
        })
        .map((s) => ({
          id: s.item.id,
          type: s.item.type,
          section: s.item.section,
          title: s.item.title,
          subtitle: s.item.subtitle,
          icon: s.item.icon,
          alias: s.item.alias,
          score: s.score,
          action: s.action,
        }))
    }

    const normalized = trimmed.toLowerCase()
    const useCache = options?.useCache !== false
    const cacheKey = options?.cacheKey
    const cached = useCache ? getCached(trimmed, cacheKey) : undefined
    if (cached !== undefined) return cached

    const entries: FuseEntry[] = searchables.map((data) => ({
      searchText: toSearchText(data.item),
      data,
    }))

    const compact = normalized.replace(/\s+/g, '')
    const matched = entries.filter((e) => {
      if (e.searchText.includes(normalized)) return true
      if (compact.length < 2) return false
      return e.searchText.replace(/\s+/g, '').includes(compact)
    })
    const titleLower = (s: string) => s.toLowerCase()

    const results: SearchResult[] = matched
      .map((e) => {
        const { item, action } = e.data
        const t = titleLower(item.title)
        const alias = item.alias?.toLowerCase().trim()
        const baseScore = Math.max(0.1, Math.min(1, e.data.score))
        let score = 0.45 + baseScore * 0.2
        if (alias && alias === normalized) score = 1.08 + baseScore * 0.05
        else if (t === normalized) score = 1 + baseScore * 0.05
        else if (t.startsWith(normalized)) score = 0.95 + baseScore * 0.05
        else if (e.searchText.startsWith(normalized)) score = 0.86 + baseScore * 0.04
        else if (t.includes(normalized)) score = 0.8 + baseScore * 0.04
        else if (e.searchText.replace(/\s+/g, '').includes(compact)) score = 0.74 + baseScore * 0.03
        return {
          id: item.id,
          type: item.type,
          section: item.section,
          title: item.title,
          subtitle: item.subtitle,
          icon: item.icon,
          alias: item.alias,
          score,
          action,
        }
      })
      .sort((a, b) => b.score - a.score)

    if (results.length > 0 && useCache) setCached(trimmed, results, cacheKey)
    logger.debug('search', {
      query: trimmed,
      resultsCount: results.length,
      searchablesCount: searchables.length,
    })
    return results
  }

  function clearCache() {
    cache.clear()
  }

  return { search, getCached, setCached, clearCache }
}

export const searchEngine = createSearchEngine()

function normalizeKey(query: string, cacheKey?: string): string {
  const normalizedQuery = query.trim().toLowerCase()
  if (!cacheKey) return normalizedQuery
  return `${normalizedQuery}::${cacheKey}`
}
