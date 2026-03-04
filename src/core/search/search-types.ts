/** Тип результата поиска (совпадает с search-store) */
export type SearchResultType =
  | 'app'
  | 'file'
  | 'clipboard'
  | 'snippet'
  | 'command'
  | 'plugin'
  | 'calculator'

export type SearchResultSection =
  | 'suggestion'
  | 'command'
  | 'application'
  | 'preferences'
  | 'file'
  | 'plugin'
  | 'clipboard'
  | 'snippet'
  | 'calculator'

/** Элемент, по которому Fuse.js выполняет поиск */
export interface SearchableItem {
  id: string
  type: SearchResultType
  section?: SearchResultSection
  title: string
  subtitle?: string
  icon?: string
  alias?: string
  /** Ключевые слова для fuzzy match (объединяются с title/subtitle) */
  keywords?: string[]
}

/** Элемент с действием при выборе — возвращают источники */
export interface SearchableWithAction {
  item: SearchableItem
  score: number
  action: () => void
}
