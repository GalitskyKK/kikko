/** Максимальное количество записей в clipboard history */
export const MAX_CLIPBOARD_ENTRIES = 500

/** Автоматическое удаление записей старше N дней */
export const CLIPBOARD_RETENTION_DAYS = 30

/** Дебаунс поиска в мс */
export const SEARCH_DEBOUNCE_MS = 150

/** Максимальное количество запросов в кэше поиска */
export const SEARCH_CACHE_MAX_SIZE = 50

/** Максимальное количество результатов поиска в палетке */
export const SEARCH_RESULTS_LIMIT = 30

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
