# KIKKŌ 亀甲 — DEVELOPMENT BIBLE v3.0 (Final)
# Обновлено: апрель 2026
# Автор: kikko-app
# Лицензия: MIT

---

## ═══════════════════════════════════════════════
## ЧАСТЬ 1 — ЧТО ТАКОЕ KIKKŌ (ОПИСАНИЕ ПРОДУКТА)
## ═══════════════════════════════════════════════

### 1.1 Описание в одном предложении

Kikkō — полностью бесплатный open-source лаунчер (Raycast killer),
который объединяет command palette + clipboard manager + snippets +
dashboard с виджетами + систему React-плагинов + приватный self-hosted
sync между всеми устройствами в одном приложении весом 18 МБ.

### 1.2 Философия

- Одна глобальная клавиша → весь цифровой мир пользователя
- Никаких подписок. Никакого облака. Никаких компромиссов
- Данные пользователя принадлежат только пользователю
- Плагины пишутся за 5 минут любым React-разработчиком
- Красота на уровне премиум-продукта (лучше Raycast визуально)

### 1.3 Целевая аудитория

| Сегмент | Боль | Как Kikkō решает |
|---------|------|------------------|
| Бывшие пользователи Raycast Pro | $8–12/мес за лаунчер | 100% бесплатно навсегда |
| Power users macOS/Windows/Linux | Нет единого кросс-платформенного решения | Один инструмент на все ОС |
| Self-hosted энтузиасты | Sync через облако = потеря контроля | Свой Docker-контейнер |
| React-разработчики | Хотят писать плагины, но Raycast API сложный | Плагин = обычный React-компонент |
| Обычные пользователи | Слишком много разных утилит | Всё в одном окне |

### 1.4 Платформы

| Платформа | Формат | Статус в MVP |
|-----------|--------|-------------|
| Windows 10/11 | .msi + .exe (NSIS) | ✅ День 1 |
| macOS 14+ (Intel + Apple Silicon) | .dmg (notarized) | ✅ День 1 |
| Linux (Ubuntu, Fedora, Arch) | .AppImage + .deb + .rpm | ✅ День 1 |
| Self-hosted sync server | Docker (linux/amd64 + arm64) | ✅ День 7–9 |
| PWA (телефон/планшет) | Web app + service worker | ✅ День 10 |

### 1.5 Конкурентный анализ (апрель 2026)

| Продукт | Звёзды | Платный | Кросс-платформа | Плагины | Self-hosted sync |
|---------|--------|---------|-----------------|---------|-----------------|
| Raycast | closed | $8–12/мес | macOS only | Да (свой API) | Нет |
| Alfred | closed | $59 once | macOS only | Workflows | Нет |
| Loungy | 2.1k | Нет | macOS only | Нет | Нет |
| Flare | 1.8k | Нет | Win/Mac/Lin | Нет | Нет |
| Rustcast | 1.4k | Нет | Win/Mac | Нет | Нет |
| Ulauncher | 3.5k | Нет | Linux only | Python | Нет |
| **Kikkō** | **цель 10k** | **Нет** | **Все ОС + PWA** | **React hot-reload** | **Да (Docker)** |

Kikkō — единственный, у кого есть ВСЕ: кросс-платформа + React-плагины +
self-hosted sync + dashboard. Это главное конкурентное преимущество.

---

## ══════════════════════════════════════════
## ЧАСТЬ 2 — ПРАВИЛА ДЛЯ CURSOR AI (СТРОГО)
## ══════════════════════════════════════════

### 2.1 Общие принципы кода

ВСЕГДА:

    Пиши production-ready код с первой строки
    TypeScript strict mode (strict: true в tsconfig.json)
    Все публичные функции/компоненты — с JSDoc комментариями
    Каждый файл — не больше 200 строк (разбивай на модули)
    Один компонент = один файл
    Именование: camelCase для переменных/функций, PascalCase для компонентов/типов
    Все строки — в константах или i18n (никаких magic strings)
    Все числа — в константах с понятным именем (никаких magic numbers)

НИКОГДА:

    any (только unknown + type guard или дженерик)
    ! non-null assertion (только с комментарием почему это безопасно)
    as unknown as Type (только с комментарием)
    console.log в продакшен-коде (только logger utility)
    Вложенность больше 3 уровней (early return)
    Мутация props или state напрямую
    Index как key в списках (только уникальный id)
    Prop drilling глубже 2 уровней (используй Zustand/Context)
    Default export (только named export, кроме page компонентов)
    Barrel файлы (index.ts с реэкспортами) — они ломают tree-shaking

text


### 2.2 React-компоненты

```typescript
// ✅ ПРАВИЛЬНО — каждый компонент так
/** Отображает один элемент из истории clipboard */
interface ClipboardItemProps {
  /** Уникальный ID записи */
  id: string
  /** Содержимое clipboard */
  content: string
  /** Время копирования (ISO 8601) */
  copiedAt: string
  /** Помечен ли как избранное */
  isFavorite: boolean
  /** Callback при клике на элемент */
  onSelect: (id: string) => void
}

export function ClipboardItem({
  id,
  content,
  copiedAt,
  isFavorite,
  onSelect,
}: ClipboardItemProps) {
  // ... реализация
}

// ❌ ЗАПРЕЩЕНО
export default function ClipboardItem(props: any) { ... }

2.3 Обработка ошибок

TypeScript

// ✅ ПРАВИЛЬНО — все ошибки ловятся и показываются пользователю
import { toast } from '@/components/ui/sonner'
import { logger } from '@/utils/logger'

export async function loadClipboardHistory(): Promise<ClipboardEntry[]> {
  try {
    const entries = await invoke<ClipboardEntry[]>('get_clipboard_history')
    return entries
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Не удалось загрузить историю clipboard'

    logger.error('loadClipboardHistory failed', { error })
    toast.error(message)
    return [] // graceful fallback — UI не ломается
  }
}

// ❌ ЗАПРЕЩЕНО — крашит приложение без объяснения
const entries = await invoke('get_clipboard_history') // без try/catch

2.4 Безопасность

text

ОБЯЗАТЕЛЬНО:
- Никакого eval(), new Function(), Function()
- dangerouslySetInnerHTML только с DOMPurify.sanitize()
- Все пользовательские данные — sanitize перед рендером
- SQL-запросы — только параметризованные (никакой конкатенации строк)
- API ключи sync-сервера — хранятся в OS Keychain (tauri-plugin-keychain)
- Clipboard history — шифруется AES-256-GCM перед записью в SQLite
- WebSocket sync — только wss:// (TLS), никогда ws://
- CSP заголовки — максимально строгие
- Плагины НЕ имеют доступа к файловой системе напрямую
- Плагины НЕ имеют доступа к сети без явного разрешения в manifest.json
- HTTP-запросы плагинов проходят через прокси Kikkō (проверка permissions)
- Обновления приложения — только с подписью (Tauri updater + signing key)

2.5 Производительность

text

ОБЯЗАТЕЛЬНО:
- Первый рендер Command Palette — < 50ms
- Поиск по 10,000 элементов — < 16ms (один кадр)
- Размер бандла — < 2 МБ (JS + CSS, без Tauri binary)
- Запуск приложения — < 500ms до интерактивности
- React.memo() на все элементы списков
- useMemo/useCallback только когда реально нужно (не на каждую функцию)
- Виртуализация списков через @tanstack/react-virtual (clipboard history, поиск)
- Lazy loading для Dashboard виджетов (React.lazy + Suspense)
- Дебаунс на поиск: 150ms
- Throttle на resize/scroll: 16ms (requestAnimationFrame)
- Изображения — WebP, максимум 100KB
- Шрифты — system-ui stack (никаких Google Fonts)

2.6 Стиль кода и форматирование

text

- Prettier: printWidth 100, singleQuote true, semi false, trailingComma all
- ESLint: @typescript-eslint/recommended + react/recommended + react-hooks
- Tailwind: сортировка классов через prettier-plugin-tailwindcss
- Импорты: сначала React, потом библиотеки, потом @/ алиасы, потом ./relative
- Пустая строка между группами импортов
- Файлы: kebab-case (clipboard-item.tsx, use-clipboard.ts)
- Компоненты: PascalCase (ClipboardItem.tsx) — только для React-компонентов
- Хуки: use-camelCase.ts (use-clipboard-history.ts)
- Типы: PascalCase с суффиксом (ClipboardEntry, SyncConfig, PluginManifest)
- Константы: SCREAMING_SNAKE_CASE (MAX_CLIPBOARD_ENTRIES, DEFAULT_THEME)

2.7 Git и коммиты

text

Формат: type(scope): description

Типы:
- feat: новая фича
- fix: баг-фикс
- refactor: рефакторинг без изменения поведения
- style: форматирование, пробелы, точки с запятой
- docs: документация
- test: тесты
- chore: сборка, зависимости, CI
- perf: улучшение производительности
- security: исправление уязвимости

Примеры:
feat(clipboard): add favorite pinning
fix(search): fuzzy match scoring for CJK characters
refactor(plugins): extract manifest validator
security(sync): encrypt clipboard data with AES-256-GCM

Каждый коммит — атомарный (одна логическая единица изменения).
Никаких "fix stuff", "wip", "asdf".

══════════════════════════════════════
ЧАСТЬ 3 — ТЕХНИЧЕСКАЯ АРХИТЕКТУРА
══════════════════════════════════════
3.1 Технологический стек
Слой	Технология	Версия	Почему
Desktop runtime	Tauri 2	2.x stable	Маленький бандл, нативные API, Rust безопасность
Frontend framework	React	19.x	Стандарт индустрии, огромная экосистема
Сборщик	Vite	6.x	Мгновенный HMR, быстрая сборка
Язык	TypeScript	5.x (strict)	Типобезопасность
Роутинг	React Router	7.x	SPA роутинг внутри Tauri
UI библиотека	shadcn/ui	latest	Копируемые компоненты, полный контроль
CSS	Tailwind CSS	4.x	Utility-first, маленький бандл
Command palette	cmdk	1.x	Лучший в мире, от Rauno
Состояние	Zustand	5.x	Минимальный, быстрый, без boilerplate
Поиск	Fuse.js	7.x	Fuzzy search, offline, быстрый
Анимации	Framer Motion	12.x	Плавные, декларативные
Виртуализация	@tanstack/react-virtual	3.x	Списки 10k+ элементов
Dashboard layout	react-grid-layout	1.x	Drag & drop + resize виджетов
Математика	mathjs	13.x	Калькулятор + конвертер единиц
Уведомления	Sonner	2.x	Красивые toast
Иконки	Lucide React	latest	Консистентные, tree-shakeable
Дата/время	date-fns	4.x	Легковесный, immutable
Sanitization	DOMPurify	3.x	XSS-защита
Backend sync	Rust + Axum	0.8.x	WebSocket + HTTP, быстрый
База данных (desktop)	SQLite (tauri-plugin-sql)	—	Локальная, быстрая
База данных (sync)	SQLite + sqlx	—	Простота деплоя
3.2 Архитектура приложения (высокий уровень)

text

┌──────────────────────────────────────────────────────┐
│                    TAURI SHELL                        │
│  ┌──────────────────────────────────────────────┐    │
│  │              RUST BACKEND                     │    │
│  │  ┌──────────┐ ┌───────────┐ ┌─────────────┐ │    │
│  │  │ Hotkeys  │ │ Clipboard │ │  FS Watcher │ │    │
│  │  │ Manager  │ │ Monitor   │ │  (plugins)  │ │    │
│  │  └──────────┘ └───────────┘ └─────────────┘ │    │
│  │  ┌──────────┐ ┌───────────┐ ┌─────────────┐ │    │
│  │  │ SQLite   │ │ Keychain  │ │  App Index  │ │    │
│  │  │ Storage  │ │ (secrets) │ │  (search)   │ │    │
│  │  └──────────┘ └───────────┘ └─────────────┘ │    │
│  └──────────────────────────────────────────────┘    │
│                       ↕ invoke / events               │
│  ┌──────────────────────────────────────────────┐    │
│  │            REACT FRONTEND (Vite)              │    │
│  │  ┌────────────┐ ┌───────────┐ ┌───────────┐ │    │
│  │  │  Command   │ │ Dashboard │ │ Settings  │ │    │
│  │  │  Palette   │ │   Mode    │ │   Panel   │ │    │
│  │  └────────────┘ └───────────┘ └───────────┘ │    │
│  │  ┌────────────┐ ┌───────────┐ ┌───────────┐ │    │
│  │  │  Plugin    │ │  Zustand  │ │   Sync    │ │    │
│  │  │  Renderer  │ │  Stores   │ │  Client   │ │    │
│  │  └────────────┘ └───────────┘ └───────────┘ │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
                          ↕ wss://
┌──────────────────────────────────────────────────────┐
│              SYNC SERVER (Docker)                     │
│  Axum + WebSocket + SQLite                           │
│  API key auth + AES-256-GCM encryption               │
└──────────────────────────────────────────────────────┘

3.3 Структура проекта (финальная)

Bash

kikko/
│
├── src-tauri/                          # Rust backend
│   ├── src/
│   │   ├── main.rs                     # Точка входа Tauri
│   │   ├── commands/                   # Tauri invoke commands
│   │   │   ├── mod.rs
│   │   │   ├── clipboard.rs            # get/set/clear clipboard history
│   │   │   ├── apps.rs                 # список установленных приложений
│   │   │   ├── files.rs                # поиск по файлам
│   │   │   ├── windows.rs              # управление окнами ОС
│   │   │   ├── snippets.rs             # CRUD snippets
│   │   │   ├── plugins.rs              # загрузка/валидация плагинов
│   │   │   └── system.rs               # shutdown, sleep, lock, etc.
│   │   ├── db/
│   │   │   ├── mod.rs
│   │   │   ├── schema.rs               # SQL CREATE TABLE
│   │   │   └── migrations.rs           # миграции SQLite
│   │   ├── crypto.rs                   # AES-256-GCM шифрование
│   │   ├── keychain.rs                 # OS Keychain (API keys, secrets)
│   │   └── tray.rs                     # System tray icon + menu
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   └── icons/                          # Иконки приложения все размеры
│
├── src/                                # React frontend
│   ├── main.tsx                        # React entry point
│   ├── App.tsx                         # Router + global providers
│   │
│   ├── routes/                         # Страницы (React Router)
│   │   ├── palette.tsx                 # Command Palette (главный экран)
│   │   ├── dashboard.tsx               # Dashboard с виджетами
│   │   └── settings.tsx                # Настройки приложения
│   │
│   ├── components/                     # React-компоненты
│   │   ├── ui/                         # shadcn/ui (button, input, dialog...)
│   │   ├── command-palette/
│   │   │   ├── command-palette.tsx      # Основной компонент cmdk
│   │   │   ├── command-item.tsx         # Один элемент результата
│   │   │   ├── command-group.tsx        # Группа результатов
│   │   │   └── command-footer.tsx       # Подсказки горячих клавиш
│   │   ├── clipboard/
│   │   │   ├── clipboard-list.tsx       # Виртуализированный список
│   │   │   ├── clipboard-item.tsx       # Один элемент clipboard
│   │   │   └── clipboard-preview.tsx    # Превью (текст/картинка/код)
│   │   ├── dashboard/
│   │   │   ├── dashboard-grid.tsx       # react-grid-layout обёртка
│   │   │   ├── widget-wrapper.tsx       # Обёртка каждого виджета
│   │   │   └── add-widget-dialog.tsx    # Диалог добавления виджета
│   │   ├── snippets/
│   │   │   ├── snippet-list.tsx
│   │   │   ├── snippet-editor.tsx       # Редактор с подсветкой
│   │   │   └── snippet-variables.tsx    # Шаблонные переменные
│   │   ├── plugins/
│   │   │   ├── plugin-renderer.tsx      # Рендерит React-плагин
│   │   │   ├── plugin-store.tsx         # Встроенный магазин
│   │   │   └── plugin-settings.tsx      # Настройки плагина
│   │   ├── settings/
│   │   │   ├── general-settings.tsx
│   │   │   ├── appearance-settings.tsx
│   │   │   ├── hotkey-settings.tsx
│   │   │   ├── sync-settings.tsx
│   │   │   └── plugin-settings.tsx
│   │   └── shared/
│   │       ├── kbd.tsx                  # Keyboard shortcut badge
│   │       ├── empty-state.tsx
│   │       ├── loading-skeleton.tsx
│   │       └── error-boundary.tsx
│   │
│   ├── core/                           # Бизнес-логика (не UI)
│   │   ├── search/
│   │   │   ├── search-engine.ts         # Fuse.js обёртка + ranking
│   │   │   ├── search-sources.ts        # Регистрация источников поиска
│   │   │   └── search-types.ts
│   │   ├── clipboard/
│   │   │   ├── clipboard-monitor.ts     # Слушает изменения clipboard
│   │   │   ├── clipboard-store.ts       # Zustand store
│   │   │   └── clipboard-types.ts
│   │   ├── hotkeys/
│   │   │   ├── hotkey-manager.ts        # Регистрация горячих клавиш
│   │   │   └── hotkey-map.ts            # Маппинг действий
│   │   ├── plugins/
│   │   │   ├── plugin-loader.ts         # Динамический import
│   │   │   ├── plugin-registry.ts       # Реестр загруженных плагинов
│   │   │   ├── plugin-validator.ts      # Валидация manifest.json
│   │   │   ├── plugin-api.ts            # API, доступный плагинам
│   │   │   └── plugin-types.ts
│   │   ├── sync/
│   │   │   ├── sync-client.ts           # WebSocket client + reconnect
│   │   │   ├── sync-queue.ts            # Offline queue (IndexedDB)
│   │   │   └── sync-types.ts
│   │   ├── calculator/
│   │   │   └── calculator-engine.ts     # mathjs обёртка
│   │   └── snippets/
│   │       ├── snippet-store.ts
│   │       ├── snippet-expander.ts      # Расширение переменных
│   │       └── snippet-types.ts
│   │
│   ├── widgets/                         # Dashboard виджеты
│   │   ├── weather/
│   │   │   ├── weather-widget.tsx
│   │   │   └── weather-api.ts
│   │   ├── pomodoro/
│   │   │   ├── pomodoro-widget.tsx
│   │   │   └── pomodoro-store.ts
│   │   ├── now-playing/
│   │   │   ├── now-playing-widget.tsx
│   │   │   └── now-playing-api.ts
│   │   ├── github/
│   │   │   ├── github-widget.tsx
│   │   │   └── github-api.ts
│   │   ├── crypto/
│   │   │   ├── crypto-widget.tsx
│   │   │   └── crypto-api.ts
│   │   ├── rss/
│   │   │   ├── rss-widget.tsx
│   │   │   └── rss-parser.ts
│   │   ├── todo/
│   │   │   ├── todo-widget.tsx
│   │   │   └── todo-store.ts
│   │   ├── quick-notes/
│   │   │   ├── quick-notes-widget.tsx
│   │   │   └── quick-notes-store.ts
│   │   └── widget-registry.ts           # Реестр всех виджетов
│   │
│   ├── stores/                          # Zustand stores (глобальное состояние)
│   │   ├── app-store.ts                 # Общее состояние приложения
│   │   ├── search-store.ts              # Результаты поиска
│   │   ├── clipboard-store.ts           # История clipboard
│   │   ├── settings-store.ts            # Настройки (persist в SQLite)
│   │   ├── dashboard-store.ts           # Layout виджетов
│   │   ├── snippet-store.ts             # Snippets
│   │   ├── plugin-store.ts              # Установленные плагины
│   │   └── sync-store.ts               # Состояние синхронизации
│   │
│   ├── hooks/                           # Custom React hooks
│   │   ├── use-hotkey.ts                # Подписка на горячую клавишу
│   │   ├── use-clipboard-history.ts
│   │   ├── use-search.ts
│   │   ├── use-tauri-event.ts           # Подписка на Tauri events
│   │   ├── use-sync.ts
│   │   └── use-plugin.ts
│   │
│   ├── lib/                             # Утилиты и обёртки
│   │   ├── tauri.ts                     # Типизированные invoke команды
│   │   ├── db.ts                        # SQLite через tauri-plugin-sql
│   │   ├── keychain.ts                  # OS Keychain обёртка
│   │   └── constants.ts                 # Все константы приложения
│   │
│   ├── themes/                          # Темы
│   │   ├── tokyo-night.css
│   │   ├── catppuccin-mocha.css
│   │   ├── dracula.css
│   │   ├── nord.css
│   │   ├── github-dark.css
│   │   ├── one-dark.css
│   │   ├── rose-pine.css
│   │   └── gruvbox.css
│   │
│   ├── types/                           # Глобальные TypeScript типы
│   │   ├── clipboard.ts
│   │   ├── plugin.ts
│   │   ├── search.ts
│   │   ├── sync.ts
│   │   ├── widget.ts
│   │   └── settings.ts
│   │
│   └── utils/                           # Чистые утилиты
│       ├── cn.ts                        # clsx + tailwind-merge
│       ├── logger.ts                    # Логгер (dev: console, prod: файл)
│       ├── debounce.ts
│       ├── throttle.ts
│       ├── format-date.ts
│       ├── truncate.ts
│       └── sanitize.ts                  # DOMPurify обёртка
│
├── plugins-builtin/                     # Встроенные плагины (примеры)
│   ├── color-picker/
│   │   ├── manifest.json
│   │   └── index.tsx
│   ├── uuid-generator/
│   │   ├── manifest.json
│   │   └── index.tsx
│   ├── base64-encode/
│   │   ├── manifest.json
│   │   └── index.tsx
│   ├── json-formatter/
│   │   ├── manifest.json
│   │   └── index.tsx
│   └── lorem-ipsum/
│       ├── manifest.json
│       └── index.tsx
│
├── public/
│   └── icons/
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                       # Lint + typecheck + test
│   │   └── release.yml                  # Tauri build all platforms
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.yml
│       ├── feature_request.yml
│       └── plugin_request.yml
│
├── .cursor/
│   └── rules/
│       └── kikko-bible.md               # ← ЭТОТ ФАЙЛ
│
├── index.html                           # Vite entry
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── eslint.config.js
├── prettier.config.js
├── package.json
├── LICENSE                              # MIT
└── README.md

3.4 База данных (SQLite — локальная на десктопе)

SQL

-- Clipboard history
CREATE TABLE IF NOT EXISTS clipboard_entries (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'image' | 'html' | 'code'
  encrypted INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  app_source TEXT, -- из какого приложения скопировано
  char_count INTEGER NOT NULL DEFAULT 0,
  preview TEXT, -- первые 200 символов (для быстрого отображения)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_clipboard_created_at ON clipboard_entries(created_at DESC);
CREATE INDEX idx_clipboard_favorite ON clipboard_entries(is_favorite);
CREATE INDEX idx_clipboard_pinned ON clipboard_entries(is_pinned);

-- Snippets
CREATE TABLE IF NOT EXISTS snippets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  keyword TEXT UNIQUE NOT NULL, -- триггер для расширения (например: "!email")
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_snippets_keyword ON snippets(keyword);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dashboard layout
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  widget_type TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}', -- JSON конфигурация виджета
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 2,
  height INTEGER NOT NULL DEFAULT 2,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Plugin data (каждый плагин может хранить свои данные)
CREATE TABLE IF NOT EXISTS plugin_data (
  plugin_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (plugin_id, key)
);

-- Sync metadata
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL, -- 'clipboard' | 'snippet' | 'setting' | 'widget'
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'create' | 'update' | 'delete'
  synced INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sync_unsynced ON sync_log(synced) WHERE synced = 0;

3.5 Система плагинов — детальная архитектура
Что такое плагин Kikkō

Плагин — это папка в ~/.kikko/plugins/ с двумя обязательными файлами:
manifest.json и index.tsx. Плагин — это обычный React-компонент,
который Kikkō рендерит внутри Command Palette или Dashboard.
manifest.json (полная спецификация)

JSON

{
  "$schema": "https://kikko.app/schemas/plugin-manifest-v1.json",
  "id": "author-name/plugin-name",
  "name": "Human Readable Name",
  "description": "Что делает этот плагин (макс 120 символов)",
  "version": "1.0.0",
  "author": {
    "name": "Author Name",
    "url": "https://github.com/author-name"
  },
  "entry": "index.tsx",
  "icon": "icon.svg",
  "keywords": ["keyword1", "keyword2"],
  "category": "productivity",
  "permissions": {
    "http": ["https://api.github.com/*"],
    "clipboard": false,
    "notifications": true,
    "storage": true
  },
  "preferences": [
    {
      "key": "apiToken",
      "title": "API Token",
      "type": "password",
      "required": true,
      "description": "Your GitHub personal access token"
    }
  ],
  "commands": [
    {
      "name": "list-prs",
      "title": "List Pull Requests",
      "subtitle": "GitHub",
      "keywords": ["pr", "pull request", "review"]
    }
  ],
  "minKikkoVersion": "0.1.0"
}

Plugin API (что доступно плагинам)

TypeScript

// Kikkō предоставляет плагинам ограниченный API
// Плагин получает его через props

interface KikkoPluginAPI {
  // Навигация
  push: (view: React.ReactNode) => void       // открыть вложенный view
  pop: () => void                              // вернуться назад

  // UI
  showToast: (options: ToastOptions) => void
  showHUD: (message: string) => void           // краткое сообщение и скрыть окно

  // Данные
  storage: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<void>
    remove: (key: string) => Promise<void>
  }

  // Настройки плагина (из preferences в manifest)
  preferences: Record<string, string>

  // Clipboard
  clipboard: {
    copy: (text: string) => Promise<void>
    paste: () => Promise<void>                 // вставить текущий clipboard
  }

  // HTTP (только разрешённые домены)
  fetch: (url: string, init?: RequestInit) => Promise<Response>

  // Системные
  closeMainWindow: () => void
  openInBrowser: (url: string) => void
  openFile: (path: string) => void
}

// Пример плагина (index.tsx)
interface PluginProps {
  kikko: KikkoPluginAPI
}

export default function MyPlugin({ kikko }: PluginProps) {
  return (
    <div>
      <h1>My Plugin</h1>
      <button onClick={() => kikko.clipboard.copy('hello')}>
        Copy "hello"
      </button>
    </div>
  )
}

3.6 Sync Server — детальная архитектура
Sync протокол

text

1. Клиент запускается → читает sync URL и API key из настроек
2. Подключается к wss://sync.example.com/ws?key=xxx
3. Сервер проверяет API key → авторизация
4. Клиент отправляет все unsynced записи из sync_log
5. Сервер отвечает записями от других устройств
6. Conflict resolution: Last Write Wins (по updated_at)
7. При отключении → записи копятся в offline queue
8. При переподключении → flush queue → sync

Формат сообщений (JSON over WebSocket):

CLIENT → SERVER:
{
  "type": "sync_push",
  "device_id": "uuid",
  "entries": [
    {
      "entity_type": "snippet",
      "entity_id": "uuid",
      "action": "create",
      "data": { ... },      // зашифровано AES-256-GCM если clipboard
      "updated_at": "ISO8601"
    }
  ]
}

SERVER → CLIENT:
{
  "type": "sync_pull",
  "entries": [ ... ]       // записи от других устройств
}

docker-compose.yml (для пользователей)

YAML

version: '3.8'
services:
  kikko-sync:
    image: ghcr.io/kikko-app/kikko-sync:latest
    container_name: kikko-sync
    ports:
      - "4000:4000"
    volumes:
      - kikko-data:/data
    environment:
      - KIKKO_API_KEY=your-secret-key-here  # или авто-генерация
      - KIKKO_MAX_DEVICES=10
      - KIKKO_RETENTION_DAYS=90
    restart: unless-stopped

volumes:
  kikko-data:

══════════════════════════════════════════════
ЧАСТЬ 4 — ДЕТАЛЬНЫЙ ПЛАН РАЗРАБОТКИ (12 ДНЕЙ)
══════════════════════════════════════════════
ДЕНЬ 1 — Инициализация проекта + Окно + Горячие клавиши
Шаг 1.1 — Создание проекта

Bash

# 1. Создать проект Tauri 2 + Vite + React + TypeScript
npm create tauri-app@latest kikko -- --template react-ts

# 2. Зайти в проект
cd kikko

# 3. Установить зависимости frontend
npm install cmdk@latest \
  framer-motion \
  fuse.js \
  zustand \
  @tanstack/react-virtual \
  react-grid-layout \
  mathjs \
  date-fns \
  dompurify \
  sonner \
  lucide-react \
  clsx \
  tailwind-merge \
  next-themes \
  react-router-dom

# 4. Установить dev-зависимости
npm install -D @types/dompurify \
  @types/react-grid-layout \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  prettier \
  prettier-plugin-tailwindcss \
  tailwindcss \
  postcss \
  autoprefixer

# 5. Инициализировать Tailwind
npx tailwindcss init -p

# 6. Установить shadcn/ui
npx shadcn@latest init
# Выбрать: New York style, Zinc color, CSS variables: yes

# 7. Добавить компоненты shadcn
npx shadcn@latest add button input dialog scroll-area separator badge tooltip

# 8. Установить Tauri плагины (в src-tauri/)
cd src-tauri
cargo add tauri-plugin-global-shortcut
cargo add tauri-plugin-clipboard-manager
cargo add tauri-plugin-sql --features sqlite
cargo add tauri-plugin-shell
cargo add tauri-plugin-os
cargo add tauri-plugin-fs
cargo add tauri-plugin-notification
cargo add tauri-plugin-autostart
cargo add tauri-plugin-updater
cargo add tauri-plugin-process
cargo add serde --features derive
cargo add serde_json
cargo add chrono --features serde
cargo add uuid --features v4
cd ..

Шаг 1.2 — Конфигурация TypeScript (tsconfig.json)

JSON

{
  "compilerOptions": {
    "target": "ES2021",
    "useDefineForClassFields": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}

Шаг 1.3 — Конфигурация Tauri (src-tauri/tauri.conf.json)

JSON

{
  "$schema": "https://raw.githubusercontent.com/nicegui/nicegui/main/tauri2/schema.json",
  "productName": "Kikko",
  "version": "0.1.0",
  "identifier": "app.kikko.desktop",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "Kikkō",
        "label": "main",
        "width": 750,
        "height": 500,
        "resizable": false,
        "decorations": false,
        "transparent": true,
        "center": true,
        "alwaysOnTop": true,
        "visible": false,
        "skipTaskbar": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' wss: https:"
    },
    "trayIcon": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "oneClick": false,
        "perMachine": false
      }
    },
    "macOS": {
      "minimumSystemVersion": "14.0"
    }
  },
  "plugins": {
    "sql": {
      "preload": {
        "db": "sqlite:kikko.db"
      }
    },
    "global-shortcut": {},
    "clipboard-manager": {},
    "shell": { "open": true },
    "fs": {
      "scope": {
        "allow": [
          "$HOME/.kikko/**",
          "$APPDATA/**"
        ]
      }
    },
    "notification": { "all": true },
    "autostart": {}
  }
}

Шаг 1.4 — Rust backend (src-tauri/src/main.rs)

Rust

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod db;

use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

fn main() {
    tauri::Builder::default()
        // Плагины
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_process::init())
        // Команды
        .invoke_handler(tauri::generate_handler![
            commands::clipboard::get_clipboard_history,
            commands::clipboard::add_clipboard_entry,
            commands::clipboard::toggle_favorite,
            commands::clipboard::delete_entry,
            commands::clipboard::clear_history,
            commands::apps::get_installed_apps,
            commands::system::run_system_command,
            commands::snippets::get_snippets,
            commands::snippets::create_snippet,
            commands::snippets::update_snippet,
            commands::snippets::delete_snippet,
        ])
        // Настройка при запуске
        .setup(|app| {
            let window = app.get_webview_window("main")
                .expect("Failed to get main window");

            // Глобальная горячая клавиша: Ctrl/Cmd + K → toggle palette
            let toggle_shortcut = Shortcut::new(
                Some(Modifiers::SUPER), // Cmd на macOS, Win на Windows
                Code::KeyK,
            );

            let window_clone = window.clone();
            app.global_shortcut().on_shortcut(toggle_shortcut, move |_app, _shortcut, _event| {
                if window_clone.is_visible().unwrap_or(false) {
                    let _ = window_clone.hide();
                } else {
                    let _ = window_clone.show();
                    let _ = window_clone.set_focus();
                }
            })?;

            // Глобальная горячая клавиша: Ctrl/Cmd + J → toggle dashboard
            let dashboard_shortcut = Shortcut::new(
                Some(Modifiers::SUPER),
                Code::KeyJ,
            );

            let window_clone2 = window.clone();
            app.global_shortcut().on_shortcut(dashboard_shortcut, move |_app, _shortcut, _event| {
                let _ = window_clone2.emit("toggle-dashboard", ());
            })?;

            // Регистрируем шорткаты
            app.global_shortcut().register(toggle_shortcut)?;
            app.global_shortcut().register(dashboard_shortcut)?;

            // Инициализация базы данных
            db::initialize(&app.handle())?;

            // Скрыть из дока на macOS (опционально)
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Error while running Kikkō");
}

Шаг 1.5 — React entry (src/main.tsx)

React

import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './themes/globals.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

Шаг 1.6 — App.tsx (роутер + провайдеры)

React

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { PalettePage } from '@/routes/palette'
import { DashboardPage } from '@/routes/dashboard'
import { SettingsPage } from '@/routes/settings'

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        storageKey="kikko-theme"
      >
        <BrowserRouter>
          <div className="h-screen w-screen bg-transparent">
            <Routes>
              <Route path="/" element={<PalettePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </BrowserRouter>
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: 'bg-background text-foreground border-border',
          }}
        />
      </ThemeProvider>
    </ErrorBoundary>
  )
}

Шаг 1.7 — Command Palette (src/routes/palette.tsx)

React

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { listen } from '@tauri-apps/api/event'
import {
  Search,
  Calculator,
  ClipboardList,
  Settings,
  AppWindow,
  FileText,
  Zap,
  LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSearchStore } from '@/stores/search-store'

/** Режимы отображения Command Palette */
type PaletteMode = 'search' | 'clipboard' | 'snippets' | 'calculator'

/** Главная страница — Command Palette (Cmd+K) */
export function PalettePage() {
  const [mode, setMode] = useState<PaletteMode>('search')
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Фокус на инпут при открытии
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Слушаем Tauri event для toggle dashboard
  useEffect(() => {
    const unlisten = listen('toggle-dashboard', () => {
      window.location.hash = '/dashboard'
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  // Escape → скрыть окно
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        getCurrentWindow().hide()
      })
    }
  }, [])

  return (
    <div
      className="flex h-screen items-start justify-center pt-4"
      onKeyDown={handleKeyDown}
    >
      <Command
        className={cn(
          'w-[720px] rounded-2xl border border-border/50',
          'bg-background/80 backdrop-blur-2xl',
          'shadow-2xl shadow-black/20',
          'overflow-hidden',
        )}
        shouldFilter={true}
      >
        {/* Строка поиска */}
        <div className="flex items-center gap-3 border-b border-border/30 px-4">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder="Search apps, files, clipboard, commands..."
            className={cn(
              'h-14 w-full bg-transparent text-base',
              'placeholder:text-muted-foreground/60',
              'outline-none',
            )}
          />
          <kbd className="hidden shrink-0 rounded-md border border-border/50 bg-muted px-2 py-1 text-xs text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Результаты */}
        <Command.List className="max-h-[420px] overflow-y-auto p-2">
          <Command.Empty className="py-12 text-center text-sm text-muted-foreground">
            No results found. Try a different search.
          </Command.Empty>

          {/* Быстрые действия */}
          <Command.Group heading="Quick Actions">
            <CommandItem icon={ClipboardList} label="Clipboard History" shortcut="⌘+Shift+V" />
            <CommandItem icon={Calculator} label="Calculator" shortcut="=" />
            <CommandItem icon={FileText} label="Snippets" shortcut="⌘+Shift+S" />
            <CommandItem icon={LayoutDashboard} label="Dashboard" shortcut="⌘+J" />
            <CommandItem icon={Settings} label="Settings" shortcut="⌘+," />
          </Command.Group>

          {/* Приложения */}
          <Command.Group heading="Applications">
            <CommandItem icon={AppWindow} label="Open Applications..." />
          </Command.Group>

          {/* Системные команды */}
          <Command.Group heading="System">
            <CommandItem icon={Zap} label="Lock Screen" />
            <CommandItem icon={Zap} label="Sleep" />
            <CommandItem icon={Zap} label="Empty Trash" />
          </Command.Group>
        </Command.List>

        {/* Футер с подсказками */}
        <div className="flex items-center justify-between border-t border-border/30 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>⌘+J Dashboard</span>
          </div>
          <div className="text-xs text-muted-foreground/50">
            Kikkō v0.1.0
          </div>
        </div>
      </Command>
    </div>
  )
}

/** Один элемент в Command Palette */
interface CommandItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortcut?: string
  onSelect?: () => void
}

function CommandItem({ icon: Icon, label, shortcut, onSelect }: CommandItemProps) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5',
        'text-sm text-foreground/90',
        'transition-colors duration-100',
        'aria-selected:bg-accent aria-selected:text-accent-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="shrink-0 rounded-md border border-border/40 bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  )
}

Шаг 1.8 — Глобальные стили (src/themes/globals.css)

CSS

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.75rem;
  }

  .dark {
    /* Tokyo Night цвета */
    --background: 235 21% 11%;
    --foreground: 231 15% 82%;
    --card: 235 21% 13%;
    --card-foreground: 231 15% 82%;
    --popover: 235 21% 11%;
    --popover-foreground: 231 15% 82%;
    --primary: 217 89% 76%;
    --primary-foreground: 235 21% 11%;
    --secondary: 235 17% 18%;
    --secondary-foreground: 231 15% 82%;
    --muted: 235 17% 18%;
    --muted-foreground: 231 10% 50%;
    --accent: 235 17% 20%;
    --accent-foreground: 231 15% 82%;
    --destructive: 352 80% 65%;
    --destructive-foreground: 0 0% 98%;
    --border: 235 15% 20%;
    --input: 235 15% 20%;
    --ring: 217 89% 76%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-transparent text-foreground antialiased;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    /* Запрещаем выделение текста (это лаунчер, не документ) */
    user-select: none;
    -webkit-user-select: none;
    /* Убираем скролл на body */
    overflow: hidden;
  }

  /* Кастомный скроллбар */
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.2);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.4);
  }
}

Шаг 1.9 — Утилиты (src/utils/)

TypeScript

// src/utils/cn.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Объединяет Tailwind классы без конфликтов */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

TypeScript

// src/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const IS_DEV = import.meta.env.DEV

/** Логгер приложения. В dev — console, в prod — тихо */
export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => {
    if (IS_DEV) console.debug(`[Kikkō] ${message}`, data ?? '')
  },
  info: (message: string, data?: Record<string, unknown>) => {
    if (IS_DEV) console.info(`[Kikkō] ${message}`, data ?? '')
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(`[Kikkō] ${message}`, data ?? '')
  },
  error: (message: string, data?: Record<string, unknown>) => {
    console.error(`[Kikkō] ${message}`, data ?? '')
    // TODO: В продакшене отправлять в PostHog/Sentry (опционально)
  },
}

TypeScript

// src/utils/debounce.ts
/** Дебаунс функции. Вызывает callback только после паузы в delay мс */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

TypeScript

// src/utils/sanitize.ts
import DOMPurify from 'dompurify'

/** Очищает HTML от XSS. Использовать ВСЕГДА перед dangerouslySetInnerHTML */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre', 'br', 'span'],
    ALLOWED_ATTR: ['class'],
  })
}

Шаг 1.10 — Error Boundary

React

// src/components/shared/error-boundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from '@/utils/logger'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/** Глобальный перехватчик ошибок React. Приложение НИКОГДА не должно показывать белый экран */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('React ErrorBoundary caught error', {
      error: error.message,
      stack: error.stack ?? 'no stack',
      componentStack: errorInfo.componentStack ?? 'no component stack',
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-foreground">
            <div className="text-4xl">亀甲</div>
            <h1 className="text-lg font-medium">Something went wrong</h1>
            <p className="max-w-md text-center text-sm text-muted-foreground">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}

Шаг 1.11 — Zustand stores (основные)

TypeScript

// src/stores/app-store.ts
import { create } from 'zustand'

type AppView = 'palette' | 'dashboard' | 'settings'

interface AppState {
  /** Текущий активный вид */
  currentView: AppView
  /** Показано ли главное окно */
  isVisible: boolean

  /** Переключить вид */
  setView: (view: AppView) => void
  /** Показать/скрыть окно */
  setVisible: (visible: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'palette',
  isVisible: true,

  setView: (view) => set({ currentView: view }),
  setVisible: (visible) => set({ isVisible: visible }),
}))

TypeScript

// src/stores/search-store.ts
import { create } from 'zustand'

interface SearchResult {
  id: string
  type: 'app' | 'file' | 'clipboard' | 'snippet' | 'command' | 'plugin' | 'calculator'
  title: string
  subtitle?: string
  icon?: string
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

TypeScript

// src/stores/clipboard-store.ts
import { create } from 'zustand'

interface ClipboardEntry {
  id: string
  content: string
  contentType: 'text' | 'image' | 'html' | 'code'
  isFavorite: boolean
  isPinned: boolean
  appSource: string | null
  charCount: number
  preview: string
  createdAt: string
}

interface ClipboardState {
  entries: ClipboardEntry[]
  isLoading: boolean

  setEntries: (entries: ClipboardEntry[]) => void
  addEntry: (entry: ClipboardEntry) => void
  toggleFavorite: (id: string) => void
  removeEntry: (id: string) => void
  setLoading: (loading: boolean) => void
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  entries: [],
  isLoading: false,

  setEntries: (entries) => set({ entries }),
  addEntry: (entry) =>
    set((state) => ({
      entries: [entry, ...state.entries],
    })),
  toggleFavorite: (id) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, isFavorite: !e.isFavorite } : e,
      ),
    })),
  removeEntry: (id) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    })),
  setLoading: (isLoading) => set({ isLoading }),
}))

Шаг 1.12 — Константы

TypeScript

// src/lib/constants.ts

/** Максимальное количество записей в clipboard history */
export const MAX_CLIPBOARD_ENTRIES = 500

/** Автоматическое удаление записей старше N дней */
export const CLIPBOARD_RETENTION_DAYS = 30

/** Дебаунс поиска в мс */
export const SEARCH_DEBOUNCE_MS = 150

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

Шаг 1.13 — ESLint конфигурация

JavaScript

// eslint.config.js
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // TypeScript strict
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',

      // React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-danger': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Безопасность
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',

      // Качество кода
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
    },
  },
]

Шаг 1.14 — Prettier конфигурация

JavaScript

// prettier.config.js
export default {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  plugins: ['prettier-plugin-tailwindcss'],
}

ДЕНЬ 2 — Поисковая машина

text

Задача для Cursor:

1. Создать src/core/search/search-engine.ts
   - Инициализировать Fuse.js с настройками:
     threshold: 0.3, distance: 100, keys с весами
   - Метод search(query: string): SearchResult[]
   - Кэширование результатов последних 50 запросов

2. Создать src/core/search/search-sources.ts
   - Источник "apps": Tauri invoke → список установленных приложений
   - Источник "files": Tauri fs API → индексация ~/Documents, ~/Desktop, ~/Downloads
   - Источник "clipboard": из clipboard store
   - Источник "snippets": из snippet store
   - Источник "commands": статический список системных команд
   - Источник "calculator": если query начинается с = или содержит математику

3. Обновить palette.tsx
   - Подключить search-engine
   - Дебаунс 150ms на input
   - Виртуализация через @tanstack/react-virtual
   - Анимация результатов (framer-motion: layout + fade)

4. Rust commands:
   - commands/apps.rs → get_installed_apps() → Vec<AppInfo>
     macOS: /Applications/*.app (CFBundleName из Info.plist)
     Windows: Start Menu shortcuts + Registry
     Linux: .desktop files из /usr/share/applications
   - commands/files.rs → search_files(query, dirs) → Vec<FileInfo>

ДЕНЬ 3 — Clipboard Manager

text

Задача для Cursor:

1. Rust: commands/clipboard.rs
   - Слушать clipboard изменения каждые 500ms (polling)
   - Записывать новые записи в SQLite
   - Команды: get_clipboard_history, add_clipboard_entry,
     toggle_favorite, delete_entry, clear_history
   - Шифрование AES-256-GCM (опционально, если включено в настройках)

2. React: components/clipboard/
   - clipboard-list.tsx: виртуализированный список с @tanstack/react-virtual
   - clipboard-item.tsx: контент + превью + дата + иконка приложения-источника
   - clipboard-preview.tsx: текст / изображение / HTML / код (с подсветкой)
   - Действия: копировать, удалить, избранное, закрепить
   - Поиск по содержимому clipboard

3. Интеграция в Command Palette:
   - Cmd+Shift+V → режим clipboard
   - Клик по элементу → копирует и скрывает окно

ДЕНЬ 4 — Dashboard Mode

text

Задача для Cursor:

1. React: routes/dashboard.tsx
   - react-grid-layout с сохранением layout в SQLite
   - Кнопка "Add Widget" → диалог с выбором
   - Drag & drop + resize виджетов
   - Анимация появления виджетов

2. Реализовать 8 виджетов:
   - Weather: wttr.in API (без ключа)
   - Pomodoro: 25/5 таймер с уведомлениями
   - Now Playing: определение через системный API
   - GitHub Notifications: GitHub API + PAT
   - Crypto: CoinGecko API (без ключа)
   - RSS: встроенный парсер RSS/Atom
   - Todo: локальный список задач
   - Quick Notes: минимальный текстовый редактор

3. Каждый виджет — в отдельной папке widgets/name/
   - widget.tsx (компонент)
   - api.ts или store.ts (данные)
   - settings (если нужны: API ключ, URL фида и т.д.)

ДЕНЬ 5–6 — Система плагинов

text

Задача для Cursor:

1. core/plugins/plugin-loader.ts
   - Сканировать ~/.kikko/plugins/ при старте
   - Валидировать manifest.json (plugin-validator.ts)
   - Динамический import index.tsx (через new URL + import())
   - Hot-reload: chokidar watch → пересоздать React-компонент

2. core/plugins/plugin-api.ts
   - Создать KikkoPluginAPI объект для каждого плагина
   - Proxy для fetch (проверка permissions из manifest)
   - Storage через plugin_data таблицу SQLite
   - Clipboard: копирование/вставка
   - UI: toast, HUD, push/pop views

3. core/plugins/plugin-registry.ts
   - Регистрировать плагины как источники поиска
   - Регистрировать плагины как виджеты dashboard

4. components/plugins/
   - plugin-renderer.tsx: ErrorBoundary + Suspense обёртка
   - plugin-store.tsx: список плагинов из awesome-kikko (JSON fetch)
   - plugin-settings.tsx: рендер preferences из manifest

5. Создать 5 встроенных плагинов в plugins-builtin/:
   - color-picker: визуальный пикер + hex/rgb/hsl
   - uuid-generator: генератор UUID v4
   - base64-encode: encode/decode base64
   - json-formatter: форматирование и валидация JSON
   - lorem-ipsum: генератор текста-рыбы

ДЕНЬ 7–9 — Self-hosted Sync Server

text

Отдельный репозиторий: kikko-app/kikko-sync

Задача для Cursor:

1. Rust проект: Axum + Tower + SQLite (sqlx)
   - POST /api/auth → проверка API key
   - GET /api/health → статус сервера
   - WebSocket /ws → sync протокол

2. WebSocket handler:
   - Авторизация по API key в query string
   - Принимать sync_push от клиента
   - Отправлять sync_pull с записями от других устройств
   - Last Write Wins конфликт-резолюция
   - Heartbeat каждые 30 сек

3. Docker:
   - Dockerfile (multi-stage: builder + runtime)
   - docker-compose.yml
   - Поддержка linux/amd64 + linux/arm64 (Raspberry Pi)
   - Volume для SQLite файла
   - Переменные среды: KIKKO_API_KEY, KIKKO_PORT, KIKKO_MAX_DEVICES

4. Клиент (src/core/sync/):
   - sync-client.ts: WebSocket с автоматическим reconnect
   - sync-queue.ts: offline queue (IndexedDB через idb)
   - При подключении: отправить все unsynced → принять updates
   - При отключении: копить в queue

ДЕНЬ 10 — PWA версия

text

Задача для Cursor:

1. Создать отдельный Vite конфиг для PWA билда (vite.config.pwa.ts)
   - Тот же React код, но без Tauri API
   - Заглушки для Tauri invoke (заменены на HTTP fetch к sync серверу)

2. PWA manifest + service worker (vite-plugin-pwa)
   - Offline-first
   - Иконки всех размеров
   - Тема и цвета из Tokyo Night

3. Функциональность PWA:
   - Dashboard с виджетами (полный)
   - Clipboard history (из sync сервера)
   - Snippets (из sync сервера)
   - НЕ доступно: запуск приложений, файловый поиск, глобальные хоткеи

ДЕНЬ 11 — Полировка

text

Задача для Cursor:

1. Анимации (framer-motion):
   - Появление окна: scale 0.95 → 1.0 + opacity 0 → 1 (200ms)
   - Элементы списка: stagger 30ms + slide up
   - Переключение видов: crossfade
   - Dashboard виджеты: spring анимация при drag

2. Онбординг:
   - Первый запуск → мини-тур (3 шага): хоткей, поиск, дашборд
   - Хранить флаг onboarding_completed в settings

3. Автообновление:
   - tauri-plugin-updater
   - Проверка обновлений каждые 6 часов
   - Уведомление пользователю (не принудительное)

4. Тестирование:
   - Проверить на Windows 10, Windows 11
   - Проверить на macOS Intel, macOS Apple Silicon
   - Проверить на Ubuntu 22.04, Fedora 39, Arch
   - Проверить 4K и Retina экраны
   - Проверить при 150% масштабировании Windows

ДЕНЬ 12 — Релиз v0.1.0 "Turtle One"

text

Задача:

1. GitHub Actions (.github/workflows/release.yml):
   - Trigger: push tag v*
   - Matrix: windows-latest, macos-latest, ubuntu-22.04
   - Tauri build → GitHub Release с assets
   - macOS: notarize + staple (Apple Developer ID)
   - Подпись обновлений (Tauri updater key)

2. Контент для запуска:
   - README.md (уже готов выше)
   - CHANGELOG.md
   - Видео 25 сек (ScreenStudio или OBS)
   - 5 скриншотов: palette, dashboard, clipboard, plugins, settings
   - GIF для hero image (из видео)

3. Публикация:
   - GitHub Release v0.1.0
   - Twitter/X: "I replaced Raycast with my own open-source launcher"
     + видео + #OpenSource #Tauri #Productivity
   - Reddit: r/selfhosted, r/opensource, r/commandline, r/MacApps, r/windows
   - Hacker News: "Show HN: Kikkō — Open-source Raycast alternative with self-hosted sync"
   - Dev.to: статья "How I built an open-source Raycast alternative in 12 days"

4. Создать 10 issues для сообщества:
   - [Plugin] Obsidian: Quick Capture + Daily Note
   - [Plugin] Notion: Quick Search + Capture
   - [Plugin] ChatGPT / Local LLM command
   - [Theme] Catppuccin (all flavors)
   - [Plugin] Linear: My Issues
   - [Plugin] Tailscale: Status + Quick Connect
   - [Feature] AI-powered command (Ollama)
   - [Plugin] Home Assistant dashboard widget
   - [Feature] Window pinning & virtual workspaces
   - [Plugin] Spotify: Control + Queue

══════════════════════════════════════
ЧАСТЬ 5 — CI/CD И ДЕПЛОЙ
══════════════════════════════════════
5.1 GitHub Actions — CI (каждый push/PR)

YAML

# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit

  rust-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev
      - run: cd src-tauri && cargo check && cargo clippy -- -D warnings

5.2 GitHub Actions — Release (при создании тега)

YAML

# .github/workflows/release.yml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest
            args: '--target aarch64-apple-darwin'
          - platform: macos-latest
            args: '--target x86_64-apple-darwin'
          - platform: ubuntu-22.04
            args: ''
          - platform: windows-latest
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Install Linux deps
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev

      - run: npm ci

      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: v__VERSION__
          releaseName: 'Kikkō v__VERSION__'
          releaseBody: 'See the changelog for details.'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}

══════════════════════════════════════
ЧАСТЬ 6 — ЧЕКЛИСТ ПЕРЕД РЕЛИЗОМ
══════════════════════════════════════

text

Безопасность:
  [ ] CSP заголовки настроены строго
  [ ] Никаких eval / new Function в коде
  [ ] Clipboard шифрование работает (если включено)
  [ ] API key sync хранится в OS Keychain
  [ ] Плагины не могут выйти за пределы своих permissions
  [ ] Обновления подписаны ключом

Производительность:
  [ ] Первый рендер < 50ms
  [ ] Поиск < 16ms на 10k элементов
  [ ] Бандл JS < 2 МБ
  [ ] Установщик < 25 МБ
  [ ] Нет memory leaks (проверить через DevTools)

UI/UX:
  [ ] Работает на 1080p, 1440p, 4K, Retina
  [ ] Работает при 100%, 125%, 150%, 200% масштабировании
  [ ] Все горячие клавиши работают
  [ ] Escape скрывает окно
  [ ] Клик вне окна скрывает окно (опционально)
  [ ] Анимации плавные (60fps)
  [ ] Тёмная тема по умолчанию
  [ ] Скроллбар кастомный

Кросс-платформа:
  [ ] Windows 10 ✓
  [ ] Windows 11 ✓
  [ ] macOS Intel ✓
  [ ] macOS Apple Silicon ✓
  [ ] Ubuntu 22.04 ✓
  [ ] Fedora 39+ ✓
  [ ] Arch Linux ✓

Код:
  [ ] ESLint: 0 ошибок
  [ ] TypeScript: 0 ошибок (strict)
  [ ] Все компоненты с JSDoc
  [ ] Все ошибки обрабатываются (try/catch)
  [ ] ErrorBoundary на верхнем уровне
  [ ] Логгер используется вместо console.log

══════════════════════════════════════
ЧАСТЬ 7 — ПОСЛЕ РЕЛИЗА (ROADMAP)
══════════════════════════════════════
v0.2.0 (через 2 недели после релиза)

    AI команда (Ollama local + OpenAI API)
    Snippet расширение с переменными ({{date}}, {{clipboard}}, {{cursor}})
    Window manager (switch, pin, resize)
    Больше тем (Catppuccin, Dracula, Nord, Gruvbox)

v0.3.0 (через месяц)

    Plugin Store внутри приложения (browse, install, update)
    CLI: kikko install author/plugin
    Кастомные горячие клавиши для всего
    Мульти-язык (i18n: en, ru, ja, zh, de, fr, es)

v0.4.0 (через 2 месяца)

    File preview (Quick Look аналог)
    Workflow automation (цепочки действий)
    Emoji picker
    Window layouts (сохранение и восстановление)

v1.0.0 (через 3 месяца)

    Стабильный Plugin API v1
    100+ плагинов от сообщества
    Полная документация на docs.kikko.app
    Homebrew Cask, winget, AUR, Flathub
    10k+ звёзд
