/** Максимальное количество записей в clipboard history */
export const MAX_CLIPBOARD_ENTRIES = 500

/** Автоматическое удаление записей старше N дней */
export const CLIPBOARD_RETENTION_DAYS = 30

/** Дебаунс поиска в мс */
export const SEARCH_DEBOUNCE_MS = 150

/** Максимальное количество запросов в кэше поиска */
export const SEARCH_CACHE_MAX_SIZE = 50

/** Максимальное количество результатов поиска в палетке */
export const SEARCH_RESULTS_LIMIT = 100

/** Порядок групп в выдаче и лимит на группу (для настройки ранжирования и баланса). */
export const SECTION_ORDER: Array<
  | 'command'
  | 'application'
  | 'preferences'
  | 'file'
  | 'plugin'
  | 'clipboard'
  | 'snippet'
  | 'calculator'
> = [
  'command',
  'application',
  'preferences',
  'file',
  'plugin',
  'clipboard',
  'snippet',
  'calculator',
]

/** Лимиты результатов по секциям (при пустом запросе / при вводе). Можно менять для настройки выдачи. */
export const SECTION_CAPS_EMPTY_QUERY: Record<(typeof SECTION_ORDER)[number], number> = {
  command: 12,
  application: 15,
  preferences: 8,
  file: 5,
  plugin: 10,
  clipboard: 5,
  snippet: 5,
  calculator: 3,
}

export const SECTION_CAPS_WITH_QUERY: Record<(typeof SECTION_ORDER)[number], number> = {
  command: 10,
  application: 12,
  preferences: 6,
  file: 8,
  plugin: 8,
  clipboard: 6,
  snippet: 6,
  calculator: 3,
}

/** Максимальная длина превью clipboard */
export const CLIPBOARD_PREVIEW_MAX_LENGTH = 200

/** Директория плагинов */
export const PLUGINS_DIR = '.kikko/plugins'

/** Версия приложения */
export const APP_VERSION = '0.1.0'

/** Название приложения */
export const APP_NAME = 'Kikkō'

/** Порт sync-сервера по умолчанию */
export const DEFAULT_SYNC_PORT = 4000

/** Интервал reconnect WebSocket (мс) */
export const WS_RECONNECT_INTERVAL_MS = 3000

/** Максимальное количество попыток reconnect */
export const WS_MAX_RECONNECT_ATTEMPTS = 10

/** Ширина окна Command Palette в px */
export const PALETTE_WIDTH_PX = 760

/** Высота окна в компактном режиме (только строка поиска) в px */
export const PALETTE_HEIGHT_COMPACT_PX = 68

/** Высота окна в развёрнутом режиме (список результатов) в px */
export const PALETTE_HEIGHT_EXPANDED_PX = 500

/** Максимальная высота списка результатов Command Palette в px */
export const PALETTE_LIST_MAX_HEIGHT_PX = 420

/** Верхний отступ окна Command Palette в px (Raycast-стиль: компактно от верха) */
export const PALETTE_TOP_PADDING_PX = 86

/** Поисковые системы для блока «Искать в вебе». URL с плейсхолдером {{q}} для запроса. */
export const SEARCH_ENGINES = [
  { id: 'google', name: 'Google Search', url: 'https://www.google.com/search?q={{q}}' },
  { id: 'duckduckgo', name: 'DuckDuckGo Search', url: 'https://duckduckgo.com/?q={{q}}' },
  { id: 'bing', name: 'Bing Search', url: 'https://www.bing.com/search?q={{q}}' },
] as const
