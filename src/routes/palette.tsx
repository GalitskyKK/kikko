import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Command } from 'cmdk'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  AppWindow,
  ArrowLeft,
  Calculator,
  ClipboardList,
  Cog,
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Pin,
  Trash2,
  Zap,
  Sparkles,
  Link,
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import {
  currentMonitor,
  getCurrentWindow,
  LogicalSize,
  PhysicalPosition,
} from '@tauri-apps/api/window'
import { searchEngine } from '@/core/search/search-engine'
import { getFileSearchables, getSearchables, looksLikeMath } from '@/core/search/search-sources'
import type { SearchableWithAction } from '@/core/search/search-types'
import { calculate } from '@/core/calculator/calculator-engine'
import { ClipboardList as ClipboardEntriesList } from '@/components/clipboard/clipboard-list'
import { ClipboardDetailPreview } from '@/components/clipboard/clipboard-preview'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { IconButton } from '@/components/ui/icon-button'
import { Kbd } from '@/components/ui/kbd'
import {
  PALETTE_HEIGHT_COMPACT_PX,
  PALETTE_HEIGHT_EXPANDED_PX,
  PALETTE_TOP_PADDING_PX,
  PALETTE_WIDTH_PX,
  SECTION_CAPS_EMPTY_QUERY,
  SECTION_CAPS_WITH_QUERY,
  SECTION_ORDER,
  SEARCH_ENGINES,
  SEARCH_RESULTS_LIMIT,
} from '@/lib/constants'
import {
  EMOJI_LIST,
  filterEmojiList,
  getEmojiGridSections,
  getEmojiWithFrequentFirst,
  markEmojiUsed,
} from '@/data/emoji-data'
import { STRINGS } from '@/lib/strings'
import { setLastClipboardContent } from '@/lib/clipboard-polling'
import { isTauriRuntime } from '@/lib/tauri'
import { openDashboardWindow, openSettingsWindow } from '@/lib/window-navigation'
import { isMacPlatform } from '@/lib/platform'
import { useClipboardStore, type ClipboardEntry } from '@/stores/clipboard-store'
import { useInstalledAppsStore } from '@/stores/installed-apps-store'
import { useSearchStore, type SearchResult } from '@/stores/search-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useQuicklinkStore } from '@/stores/quicklink-store'
import { useSnippetStore } from '@/stores/snippet-store'
import { cn } from '@/utils/cn'

type PaletteMode = 'search' | 'clipboard' | 'snippets' | 'calculator' | 'emoji' | 'quicklinks'
type PaletteView = 'results' | 'actions'
type ClipboardTypeFilter = 'all' | 'text' | 'link' | 'image' | 'file' | 'code'
type GroupedResults = Record<
  | 'command'
  | 'application'
  | 'preferences'
  | 'file'
  | 'plugin'
  | 'clipboard'
  | 'snippet'
  | 'calculator',
  SearchResult[]
>
type PaletteAction = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onSelect: () => void
}

const KIKKO_GITHUB_URL = 'https://github.com/GalitskyKK/kikko'

export function PalettePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<PaletteMode>('search')
  const [query, setQuery] = useState('')
  const [selectedClipboardId, setSelectedClipboardId] = useState<string | null>(null)
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null)
  const [selectedEmojiIndex, setSelectedEmojiIndex] = useState(0)
  const [selectedQuicklinkId, setSelectedQuicklinkId] = useState<string | null>(null)
  const [paletteView, setPaletteView] = useState<PaletteView>('results')
  const [clipboardTypeFilter, setClipboardTypeFilter] = useState<ClipboardTypeFilter>('all')
  const [pendingDangerousResult, setPendingDangerousResult] = useState<SearchResult | null>(null)
  const [selectedCommandValue, setSelectedCommandValue] = useState('')
  const [selectedActionIndex, setSelectedActionIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFooterMenuOpen, setIsFooterMenuOpen] = useState(false)
  const [selectedFooterMenuIndex, setSelectedFooterMenuIndex] = useState(0)
  const footerMenuButtonRef = useRef<HTMLButtonElement>(null)
  const footerMenuPanelRef = useRef<HTMLDivElement>(null)
  const footerMenuItemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const searchRequestIdRef = useRef(0)
  const searchablesCacheRef = useRef<SearchableWithAction[] | null>(null)
  const geometryRequestIdRef = useRef(0)
  const clipboardFilteredRef = useRef<ClipboardEntry[]>([])
  const selectedClipboardIdRef = useRef<string | null>(null)
  const quicklinksFilteredRef = useRef<Array<{ id: string }>>([])
  const selectedQuicklinkIdRef = useRef<string | null>(null)
  const snippetsFilteredRef = useRef<Array<{ id: string }>>([])
  const selectedSnippetIdRef = useRef<string | null>(null)

  const { results, setResults, setLoading, isLoading } = useSearchStore()
  const showStartSuggestions = useSettingsStore((state) => state.general.showStartSuggestions)
  const closeOnEscape = useSettingsStore((state) => state.general.closeOnEscape)
  const showAppIcons = useSettingsStore((state) => state.appearance.showAppIcons)
  const enabledExtensions = useSettingsStore(
    (state) =>
      state.extensions ?? {
        clipboard: true,
        snippets: true,
        calculator: true,
        dashboard: true,
      },
  )
  const {
    entries: clipboardEntries,
    loadFromBackend: loadClipboard,
    isLoading: clipboardLoading,
    toggleFavoriteInBackend,
    togglePinnedInBackend,
    deleteInBackend,
    clearInBackend,
    writeInBackend,
  } = useClipboardStore()
  const snippets = useSnippetStore((state) => state.snippets)
  const markSnippetUsed = useSnippetStore((state) => state.markSnippetUsed)
  const quicklinks = useQuicklinkStore((state) => state.quicklinks)

  const hideWindow = useCallback(() => {
    if (!isTauriRuntime()) return
    void getCurrentWindow().hide()
  }, [])

  const actionsShortcutLabel = useMemo(() => (isMacPlatform() ? '⌘ K' : 'Ctrl K'), [])

  const closeFooterMenu = useCallback((options?: { focusButton?: boolean }) => {
    setIsFooterMenuOpen(false)
    setSelectedFooterMenuIndex(0)
    if (options?.focusButton) {
      requestAnimationFrame(() => footerMenuButtonRef.current?.focus())
    }
  }, [])

  const footerMenuActions = useMemo<PaletteAction[]>(
    () => [
      {
        id: 'footer-dashboard',
        label: STRINGS.palette.dashboard,
        icon: LayoutDashboard,
        onSelect: () => {
          void openDashboardWindow()
          hideWindow()
        },
      },
      {
        id: 'footer-settings',
        label: STRINGS.palette.settings,
        icon: Cog,
        onSelect: () => {
          void openSettingsWindow()
          hideWindow()
        },
      },
      {
        id: 'footer-github',
        label: 'Kikko GitHub',
        icon: Link,
        onSelect: () => {
          if (isTauriRuntime()) {
            void import('@tauri-apps/plugin-shell').then(({ open }) => open(KIKKO_GITHUB_URL))
          } else if (typeof window !== 'undefined') {
            window.open(KIKKO_GITHUB_URL, '_blank', 'noopener,noreferrer')
          }
          hideWindow()
        },
      },
    ],
    [hideWindow],
  )

  useEffect(() => {
    if (!isFooterMenuOpen) return
    requestAnimationFrame(() => {
      footerMenuItemRefs.current[0]?.focus()
    })
  }, [isFooterMenuOpen])

  useEffect(() => {
    if (!isFooterMenuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (footerMenuPanelRef.current?.contains(target)) return
      if (footerMenuButtonRef.current?.contains(target)) return
      closeFooterMenu()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [closeFooterMenu, isFooterMenuOpen])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    useSearchStore.getState().reset()
  }, [])

  useEffect(() => {
    if (!isTauriRuntime()) return
    void useInstalledAppsStore.getState().loadApps()
    void loadClipboard()
    void useSnippetStore.getState().loadFromBackend()
    void useQuicklinkStore.getState().loadFromBackend()
  }, [loadClipboard])

  useEffect(() => {
    if (!isTauriRuntime()) return
    let isDisposed = false
    let unlisten: (() => void) | null = null
    void import('@tauri-apps/api/event')
      .then(({ listen }) => {
        return Promise.all([
          listen('kikko:snippets-updated', () => {
            void useSnippetStore.getState().loadFromBackend()
          }),
          listen('kikko:quicklinks-updated', () => {
            void useQuicklinkStore.getState().loadFromBackend()
          }),
        ]).then(([unlistenSnippets, unlistenQuicklinks]) => () => {
          unlistenSnippets()
          unlistenQuicklinks()
        })
      })
      .then((cleanup) => {
        if (isDisposed) {
          cleanup()
          return
        }
        unlisten = cleanup
      })
      .catch(() => {})
    return () => {
      isDisposed = true
      if (unlisten) unlisten()
    }
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<'emoji' | 'quicklinks'>).detail
      if (detail === 'emoji' || detail === 'quicklinks') {
        setQuery('')
        setMode(detail)
      }
    }
    window.addEventListener('kikko:palette-mode', handler)
    return () => window.removeEventListener('kikko:palette-mode', handler)
  }, [])

  useEffect(() => {
    if (mode === 'emoji' || mode === 'quicklinks' || mode === 'snippets') {
      setQuery('')
    }
  }, [mode])

  useEffect(() => {
    if (mode === 'clipboard' && isTauriRuntime()) {
      void loadClipboard()
    }
  }, [mode, loadClipboard])

  useEffect(() => {
    if (mode === 'quicklinks' && isTauriRuntime()) {
      void useQuicklinkStore.getState().loadFromBackend()
    }
  }, [mode])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('mode') === 'clipboard') {
      setQuery('')
      setMode('clipboard')
      return
    }
    if (params.get('mode') === 'search') {
      setMode('search')
    }
  }, [location.search])

  useEffect(() => {
    if (mode !== 'clipboard') {
      setPaletteView('results')
      return
    }
    if (query.trim() !== '') {
      setPaletteView('results')
    }
  }, [mode, query])

  useEffect(() => {
    setSelectedActionIndex(0)
  }, [paletteView])

  useEffect(() => {
    if (mode !== 'search') return
    if (searchablesCacheRef.current !== null) return
    getSearchables('', {
      navigate,
      hideWindow,
      openPaletteMode: (m) => setMode(m),
    })
      .then((searchables) => {
        searchablesCacheRef.current = searchables
        const initial = composeSearchResultsBySection(
          searchEngine.search('', searchables, { cacheKey: 'initial' }),
          '',
          SEARCH_RESULTS_LIMIT,
        )
        setResults(initial)
      })
      .catch(() => {})
  }, [mode, hideWindow, navigate, setMode, setResults])

  const runSearch = useCallback(
    (value: string) => {
      const requestId = ++searchRequestIdRef.current
      const queryLower = value.trim().toLowerCase()
      const searchOptions = {
        navigate,
        hideWindow,
        openPaletteMode: (m: 'emoji' | 'quicklinks') => setMode(m),
      }

      const buildQuickActions = (): Array<{
        id: string
        type: 'clipboard' | 'calculator' | 'snippet' | 'command'
        section: 'clipboard' | 'calculator' | 'snippet' | 'command' | 'preferences'
        title: string
        subtitle: string
        score: number
        action: () => void
      }> => {
        const quickActions: Array<{
          id: string
          type: 'clipboard' | 'calculator' | 'snippet' | 'command'
          section: 'clipboard' | 'calculator' | 'snippet' | 'command' | 'preferences'
          title: string
          subtitle: string
          score: number
          action: () => void
        }> = []
        if (
          enabledExtensions.clipboard &&
          matchesQuick(queryLower, STRINGS.palette.clipboardHistory, [
            'clipboard',
            'clip',
            'history',
          ])
        ) {
          quickActions.push({
            id: 'quick-clipboard',
            type: 'clipboard',
            section: 'clipboard',
            title: STRINGS.palette.clipboardHistory,
            subtitle: 'Kikkō',
            score: 0.95,
            action: () => {
              setQuery('')
              setMode('clipboard')
            },
          })
        }
        if (
          enabledExtensions.calculator &&
          matchesQuick(queryLower, STRINGS.palette.calculator, ['calc', 'calculator'])
        ) {
          quickActions.push({
            id: 'quick-calc',
            type: 'calculator',
            section: 'calculator',
            title: STRINGS.palette.calculator,
            subtitle: 'Kikkō',
            score: 0.95,
            action: () => setMode('calculator'),
          })
        }
        if (enabledExtensions.snippets) {
          if (matchesQuick(queryLower, 'Search Snippets', ['snippets', 'snippet', 'search'])) {
            quickActions.push({
              id: 'quick-snippets-search',
              type: 'snippet',
              section: 'snippet',
              title: 'Search Snippets',
              subtitle: 'Open saved snippets',
              score: 0.95,
              action: () => setMode('snippets'),
            })
          }
          if (
            matchesQuick(queryLower, 'Create Snippet', [
              'snippets',
              'snippet',
              'create',
              'add',
              'new',
            ])
          ) {
            quickActions.push({
              id: 'quick-snippets-create',
              type: 'snippet',
              section: 'snippet',
              title: 'Create Snippet',
              subtitle: 'Add new snippet in Settings',
              score: 0.95,
              action: () => {
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('kikko:settings:focus-section', 'snippets')
                }
                void openSettingsWindow()
                hideWindow()
              },
            })
          }
        }
        if (
          matchesQuick(queryLower, 'Quick Links', [
            'quicklinks',
            'quick links',
            'links',
            'search quicklinks',
          ])
        ) {
          quickActions.push({
            id: 'quick-quicklinks',
            type: 'command',
            section: 'command',
            title: 'Quick Links',
            subtitle: 'Open saved links',
            score: 0.95,
            action: () => setMode('quicklinks'),
          })
        }
        if (
          enabledExtensions.dashboard &&
          matchesQuick(queryLower, STRINGS.palette.dashboard, ['dashboard', 'dash'])
        ) {
          quickActions.push({
            id: 'quick-dashboard',
            type: 'command',
            section: 'command',
            title: STRINGS.palette.dashboard,
            subtitle: 'Kikkō',
            score: 0.95,
            action: () => {
              void openDashboardWindow()
              hideWindow()
            },
          })
        }
        if (matchesQuick(queryLower, STRINGS.palette.settings, ['settings', 'preferences'])) {
          quickActions.push({
            id: 'quick-settings',
            type: 'command',
            section: 'preferences',
            title: STRINGS.palette.settings,
            subtitle: 'Kikkō',
            score: 0.95,
            action: () => {
              void openSettingsWindow()
              hideWindow()
            },
          })
        }
        return quickActions
      }

      const cached = searchablesCacheRef.current
      if (cached !== null && cached.length > 0) {
        const quickActions = buildQuickActions()
        let list = searchEngine.search(value, cached, { cacheKey: 'fast' })
        if (looksLikeMath(value)) {
          const calc = calculate(value)
          if (calc.success) {
            list = [
              {
                id: 'calc-result',
                type: 'calculator' as const,
                section: 'calculator' as const,
                title: `= ${calc.value}`,
                subtitle: calc.expression,
                score: 1,
                action: () => {
                  if (!isTauriRuntime()) return
                  setLastClipboardContent(calc.value)
                  void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) =>
                    writeText(calc.value),
                  )
                  hideWindow()
                },
              },
              ...list,
            ]
          }
        }
        const fastResults = composeSearchResultsBySection(
          [...quickActions, ...list],
          value,
          SEARCH_RESULTS_LIMIT,
        )
        setResults(fastResults)
        setLoading(false)

        void getSearchables(value, searchOptions)
          .then((searchables) => {
            if (requestId !== searchRequestIdRef.current) return
            searchablesCacheRef.current = searchables
            if (value.trim() === '') {
              setResults(
                composeSearchResultsBySection(
                  searchEngine.search('', searchables, { cacheKey: 'initial' }),
                  '',
                  SEARCH_RESULTS_LIMIT,
                ),
              )
              setLoading(false)
              return
            }
            let listBg = searchEngine.search(value, searchables, { cacheKey: 'full' })
            const quickActionsBg = buildQuickActions()
            if (looksLikeMath(value)) {
              const calc = calculate(value)
              if (calc.success) {
                listBg = [
                  {
                    id: 'calc-result',
                    type: 'calculator' as const,
                    section: 'calculator' as const,
                    title: `= ${calc.value}`,
                    subtitle: calc.expression,
                    score: 1,
                    action: () => {
                      if (!isTauriRuntime()) return
                      setLastClipboardContent(calc.value)
                      void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) =>
                        writeText(calc.value),
                      )
                      hideWindow()
                    },
                  },
                  ...listBg,
                ]
              }
            }
            setResults(
              composeSearchResultsBySection(
                [...quickActionsBg, ...listBg],
                value,
                SEARCH_RESULTS_LIMIT,
              ),
            )
            if (value.trim().length < 2) {
              setLoading(false)
              return
            }
            void getFileSearchables(value, { hideWindow })
              .then((fileSearchables) => {
                if (requestId !== searchRequestIdRef.current) return
                if (fileSearchables.length === 0) {
                  setLoading(false)
                  return
                }
                const combined = [...searchables, ...fileSearchables]
                listBg = searchEngine.search(value, combined, { cacheKey: 'full' })
                setResults(
                  composeSearchResultsBySection(
                    [...quickActionsBg, ...listBg],
                    value,
                    SEARCH_RESULTS_LIMIT,
                  ),
                )
                setLoading(false)
              })
              .catch(() => {
                if (requestId !== searchRequestIdRef.current) return
                setLoading(false)
              })
          })
          .catch(() => {
            if (requestId !== searchRequestIdRef.current) return
            setResults([])
            setLoading(false)
          })
        return
      }

      setLoading(true)
      getSearchables(value, searchOptions)
        .then((searchables) => {
          if (requestId !== searchRequestIdRef.current) return
          searchablesCacheRef.current = searchables
          if (value.trim() === '') {
            const initialResults = composeSearchResultsBySection(
              searchEngine.search('', searchables, { cacheKey: 'initial' }),
              '',
              SEARCH_RESULTS_LIMIT,
            )
            setResults(initialResults)
            setLoading(false)
            return
          }
          let list = searchEngine.search(value, searchables, { cacheKey: 'fast' })
          const quickActions = buildQuickActions()
          if (looksLikeMath(value)) {
            const calc = calculate(value)
            if (calc.success) {
              list = [
                {
                  id: 'calc-result',
                  type: 'calculator' as const,
                  section: 'calculator' as const,
                  title: `= ${calc.value}`,
                  subtitle: calc.expression,
                  score: 1,
                  action: () => {
                    if (!isTauriRuntime()) return
                    setLastClipboardContent(calc.value)
                    void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) =>
                      writeText(calc.value),
                    )
                    hideWindow()
                  },
                },
                ...list,
              ]
            }
          }

          const fastResults = composeSearchResultsBySection(
            [...quickActions, ...list],
            value,
            SEARCH_RESULTS_LIMIT,
          )
          setResults(fastResults)
          if (value.trim().length < 2) {
            setLoading(false)
            return
          }

          void getFileSearchables(value, { hideWindow })
            .then((fileSearchables) => {
              if (requestId !== searchRequestIdRef.current) return
              if (fileSearchables.length === 0) {
                setLoading(false)
                return
              }
              const combined = [...searchables, ...fileSearchables]
              list = searchEngine.search(value, combined, { cacheKey: 'full' })
              setResults(
                composeSearchResultsBySection(
                  [...quickActions, ...list],
                  value,
                  SEARCH_RESULTS_LIMIT,
                ),
              )
              setLoading(false)
            })
            .catch(() => {
              if (requestId !== searchRequestIdRef.current) return
              setLoading(false)
            })
        })
        .catch(() => {
          if (requestId !== searchRequestIdRef.current) return
          setResults([])
          setLoading(false)
        })
    },
    [
      enabledExtensions.calculator,
      enabledExtensions.clipboard,
      enabledExtensions.dashboard,
      enabledExtensions.snippets,
      hideWindow,
      navigate,
      setLoading,
      setResults,
    ],
  )

  const handleValueChange = useCallback(
    (value: string) => {
      setQuery(value)
      runSearch(value)
    },
    [runSearch],
  )

  useEffect(() => {
    if (mode !== 'search') return
    if (query.trim() !== '') return
    runSearch('')
  }, [mode, query, runSearch])

  const goBack = useCallback(() => {
    if (mode !== 'search') {
      setMode('search')
      setQuery('')
      return
    }
    hideWindow()
  }, [hideWindow, mode])

  const isClipboardMode = mode === 'clipboard'
  const isSnippetsMode = mode === 'snippets'
  const isEmojiMode = mode === 'emoji'
  const isQuicklinksMode = mode === 'quicklinks'
  const isRootMode = mode === 'search'
  const isEmptyQuery = query.trim() === ''
  const shouldShowStartSuggestions =
    isRootMode && isEmptyQuery && showStartSuggestions && !isLoading
  /** В компактном режиме (без саджестов) при пустом запросе показываем только строку поиска */
  const isCompactEmpty = isRootMode && isEmptyQuery && !showStartSuggestions
  const isActionsView = paletteView === 'actions'

  const applyPaletteGeometry = useCallback(() => {
    if (!isTauriRuntime()) return
    const requestId = ++geometryRequestIdRef.current
    const height = isCompactEmpty ? PALETTE_HEIGHT_COMPACT_PX : PALETTE_HEIGHT_EXPANDED_PX
    const currentWindow = getCurrentWindow()
    void (async () => {
      await currentWindow.setSize(new LogicalSize(PALETTE_WIDTH_PX, height))
      if (requestId !== geometryRequestIdRef.current) return
      const monitor = await currentMonitor()
      if (!monitor) return
      if (requestId !== geometryRequestIdRef.current) return
      const x = Math.max(Math.floor((monitor.size.width - PALETTE_WIDTH_PX) / 2), 0)
      await currentWindow.setPosition(new PhysicalPosition(x, PALETTE_TOP_PADDING_PX))
    })()
  }, [isCompactEmpty])

  useEffect(() => {
    applyPaletteGeometry()
    return () => {
      geometryRequestIdRef.current += 1
    }
  }, [applyPaletteGeometry])

  useEffect(() => {
    if (!isTauriRuntime()) return
    let isDisposed = false
    let unlistenFocus: (() => void) | null = null
    const currentWindow = getCurrentWindow()
    const unlistenPromise = currentWindow.onFocusChanged(({ payload }) => {
      if (!payload) return
      applyPaletteGeometry()
      void useSnippetStore.getState().loadFromBackend()
      void useQuicklinkStore.getState().loadFromBackend()
      if (mode === 'search') {
        runSearch(query)
      }
    })
    void unlistenPromise.then((fn) => {
      if (isDisposed) {
        fn()
        return
      }
      unlistenFocus = fn
    })
    return () => {
      isDisposed = true
      if (unlistenFocus) unlistenFocus()
    }
  }, [applyPaletteGeometry, mode, query, runSearch])

  const clipboardFiltered = useMemo(() => {
    if (!isClipboardMode) return []
    const normalizedQuery = query.trim().toLowerCase()
    const byType = clipboardEntries.filter((entry) =>
      matchesClipboardType(entry, clipboardTypeFilter),
    )
    if (!normalizedQuery) return byType.slice(0, 500)
    return byType
      .filter(
        (entry) =>
          entry.preview.toLowerCase().includes(normalizedQuery) ||
          entry.content.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 500)
  }, [clipboardEntries, clipboardTypeFilter, isClipboardMode, query])

  const snippetsFiltered = useMemo(() => {
    if (!isSnippetsMode) return []
    const normalized = query.trim().toLowerCase()
    if (!normalized) return snippets.slice(0, 300)
    return snippets.filter(
      (snippet) =>
        snippet.name.toLowerCase().includes(normalized) ||
        snippet.keyword.toLowerCase().includes(normalized) ||
        snippet.content.toLowerCase().includes(normalized),
    )
  }, [isSnippetsMode, query, snippets])

  const emojiListWithFrequent = useMemo(() => getEmojiWithFrequentFirst(EMOJI_LIST), [])
  const emojiFiltered = useMemo(() => {
    if (!isEmojiMode) return []
    return filterEmojiList(emojiListWithFrequent, query)
  }, [isEmojiMode, query, emojiListWithFrequent])

  const emojiGridSections = useMemo(() => getEmojiGridSections(emojiFiltered), [emojiFiltered])
  const emojiFlatList = useMemo(
    () => emojiGridSections.flatMap((s) => s.entries),
    [emojiGridSections],
  )

  const quicklinksFiltered = useMemo(() => {
    if (!isQuicklinksMode) return []
    const normalized = query.trim().toLowerCase()
    if (!normalized) return quicklinks.slice(0, 100)
    return quicklinks.filter(
      (q) =>
        q.name.toLowerCase().includes(normalized) ||
        q.url.toLowerCase().includes(normalized) ||
        q.tags.some((t) => t.toLowerCase().includes(normalized)),
    )
  }, [isQuicklinksMode, query, quicklinks])

  useEffect(() => {
    if (!isClipboardMode || clipboardFiltered.length === 0) {
      setSelectedClipboardId(null)
      return
    }
    setSelectedClipboardId((current) => {
      const firstId = clipboardFiltered[0]?.id ?? null
      const stillValid = current && clipboardFiltered.some((e) => e.id === current)
      return stillValid ? current : firstId
    })
  }, [clipboardFiltered, isClipboardMode])

  useEffect(() => {
    clipboardFilteredRef.current = clipboardFiltered
  }, [clipboardFiltered])

  useEffect(() => {
    selectedClipboardIdRef.current = selectedClipboardId
  }, [selectedClipboardId])

  useEffect(() => {
    if (!isClipboardMode) return
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [isClipboardMode])

  useEffect(() => {
    if (!isSnippetsMode || snippetsFiltered.length === 0) {
      setSelectedSnippetId(null)
      return
    }
    setSelectedSnippetId((current) => current ?? snippetsFiltered[0]?.id ?? null)
  }, [isSnippetsMode, snippetsFiltered])

  useEffect(() => {
    if (!isEmojiMode || emojiFlatList.length === 0) {
      setSelectedEmojiIndex(0)
      return
    }
    setSelectedEmojiIndex((current) => (current >= emojiFlatList.length ? 0 : current))
  }, [isEmojiMode, emojiFlatList.length])

  useEffect(() => {
    if (!isEmojiMode || emojiFlatList.length === 0) return
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-emoji-selected="true"]')
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }, [isEmojiMode, selectedEmojiIndex, emojiFlatList.length])

  useEffect(() => {
    if (!isQuicklinksMode || quicklinksFiltered.length === 0) {
      setSelectedQuicklinkId(null)
      return
    }
    setSelectedQuicklinkId((current) => {
      const firstId = quicklinksFiltered[0]?.id ?? null
      const stillValid = current && quicklinksFiltered.some((q) => q.id === current)
      return stillValid ? current : firstId
    })
  }, [isQuicklinksMode, quicklinksFiltered])

  useEffect(() => {
    if (isQuicklinksMode && selectedQuicklinkId) {
      setSelectedCommandValue(`quicklink:${selectedQuicklinkId}`)
    }
  }, [isQuicklinksMode, selectedQuicklinkId])

  useEffect(() => {
    if (isSnippetsMode && selectedSnippetId) {
      setSelectedCommandValue(`snippet-entry:${selectedSnippetId}`)
    }
  }, [isSnippetsMode, selectedSnippetId])

  useEffect(() => {
    if (!isQuicklinksMode || !selectedQuicklinkId || quicklinksFiltered.length === 0) return
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-quicklink-selected="true"]')
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }, [isQuicklinksMode, selectedQuicklinkId, quicklinksFiltered.length])

  useEffect(() => {
    quicklinksFilteredRef.current = quicklinksFiltered
    selectedQuicklinkIdRef.current = selectedQuicklinkId
    snippetsFilteredRef.current = snippetsFiltered
    selectedSnippetIdRef.current = selectedSnippetId
  })

  useEffect(() => {
    const handleDocKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter') return

      const qList = quicklinksFilteredRef.current
      const qId = selectedQuicklinkIdRef.current
      if (isQuicklinksMode && qList.length > 0) {
        event.preventDefault()
        event.stopPropagation()
        const currentIndex = qList.findIndex((q) => q.id === qId)
        if (event.key === 'ArrowDown') {
          const nextIndex = currentIndex >= qList.length - 1 ? 0 : currentIndex + 1
          const nextId = qList[nextIndex]?.id
          if (nextId) setSelectedQuicklinkId(nextId)
          return
        }
        if (event.key === 'ArrowUp') {
          const nextIndex = currentIndex <= 0 ? qList.length - 1 : currentIndex - 1
          const nextId = qList[nextIndex]?.id
          if (nextId) setSelectedQuicklinkId(nextId)
          return
        }
        if (event.key === 'Enter' && qId) {
          const link = qList.find((q) => q.id === qId) as { id: string; url: string } | undefined
          if (link && isTauriRuntime()) {
            void import('@tauri-apps/plugin-shell').then(({ open }) => open(link.url))
            hideWindow()
          }
        }
        return
      }

      const sList = snippetsFilteredRef.current
      const sId = selectedSnippetIdRef.current
      if (isSnippetsMode && sList.length > 0) {
        event.preventDefault()
        event.stopPropagation()
        const currentIndex = sList.findIndex((s) => s.id === sId)
        if (event.key === 'ArrowDown') {
          const nextIndex = currentIndex >= sList.length - 1 ? 0 : currentIndex + 1
          const nextId = sList[nextIndex]?.id
          if (nextId) setSelectedSnippetId(nextId)
          return
        }
        if (event.key === 'ArrowUp') {
          const nextIndex = currentIndex <= 0 ? sList.length - 1 : currentIndex - 1
          const nextId = sList[nextIndex]?.id
          if (nextId) setSelectedSnippetId(nextId)
          return
        }
        if (event.key === 'Enter' && sId) {
          const snippet = sList.find((s) => s.id === sId) as
            | { id: string; content: string }
            | undefined
          if (snippet && isTauriRuntime()) {
            void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) =>
              writeText(snippet.content),
            )
            void markSnippetUsed(snippet.id)
            hideWindow()
          }
        }
      }
    }

    if (!isQuicklinksMode && !isSnippetsMode) return
    document.addEventListener('keydown', handleDocKeyDown, true)
    return () => document.removeEventListener('keydown', handleDocKeyDown, true)
  }, [isQuicklinksMode, isSnippetsMode, hideWindow, markSnippetUsed])

  const copyAndClose = useCallback(
    (entry: ClipboardEntry) => {
      if (!isTauriRuntime()) return
      if (entry.contentType === 'text') {
        setLastClipboardContent(entry.content)
      }
      void writeInBackend(entry.id)
      hideWindow()
    },
    [hideWindow, writeInBackend],
  )

  const selectedClipboardEntry = useMemo(
    () => clipboardFiltered.find((entry) => entry.id === selectedClipboardId) ?? null,
    [clipboardFiltered, selectedClipboardId],
  )
  const selectedSnippetEntry = useMemo(
    () => snippetsFiltered.find((snippet) => snippet.id === selectedSnippetId) ?? null,
    [selectedSnippetId, snippetsFiltered],
  )
  const selectedQuicklinkEntry = useMemo(
    () => quicklinksFiltered.find((q) => q.id === selectedQuicklinkId) ?? null,
    [quicklinksFiltered, selectedQuicklinkId],
  )

  const clipboardActions = useMemo<PaletteAction[]>(() => {
    if (!selectedClipboardEntry) return []
    const actions: PaletteAction[] = [
      {
        id: 'paste',
        label: STRINGS.palette.actionPaste,
        icon: ClipboardList,
        onSelect: () => {
          copyAndClose(selectedClipboardEntry)
          setPaletteView('results')
        },
      },
      {
        id: 'pin',
        label: selectedClipboardEntry.isPinned
          ? STRINGS.palette.actionUnpin
          : STRINGS.palette.actionPin,
        icon: Pin,
        onSelect: () => void togglePinnedInBackend(selectedClipboardEntry.id),
      },
      {
        id: 'favorite',
        label: selectedClipboardEntry.isFavorite
          ? STRINGS.palette.actionUnfavorite
          : STRINGS.palette.actionFavorite,
        icon: Star,
        onSelect: () => void toggleFavoriteInBackend(selectedClipboardEntry.id),
      },
      {
        id: 'delete',
        label: STRINGS.palette.actionDelete,
        icon: Trash2,
        onSelect: () => {
          void deleteInBackend(selectedClipboardEntry.id)
          setPaletteView('results')
        },
      },
      {
        id: 'clear',
        label: STRINGS.palette.actionClearHistory,
        icon: Trash2,
        onSelect: () => {
          void clearInBackend()
          setPaletteView('results')
        },
      },
    ]
    return actions
  }, [
    clearInBackend,
    copyAndClose,
    deleteInBackend,
    selectedClipboardEntry,
    toggleFavoriteInBackend,
    togglePinnedInBackend,
  ])

  const groupedResults = useMemo(() => groupSearchResults(results), [results])

  const calcResult = useMemo(() => {
    const q = query.trim()
    if (!q || !looksLikeMath(q)) return null
    const c = calculate(q)
    return c.success ? c : null
  }, [query])

  const startSuggestions = useMemo(
    () => [
      ...(enabledExtensions.clipboard
        ? [
            {
              id: 'start-clipboard',
              title: STRINGS.palette.clipboardHistory,
              subtitle: 'Kikkō',
              icon: ClipboardList,
              iconClassName: 'text-sky-500 dark:text-sky-400',
              action: () => {
                setQuery('')
                setMode('clipboard')
              },
            },
          ]
        : []),
      {
        id: 'start-settings',
        title: STRINGS.palette.settings,
        subtitle: 'Kikkō',
        icon: Cog,
        iconClassName: 'text-violet-500 dark:text-violet-400',
        action: () => {
          void openSettingsWindow()
          hideWindow()
        },
      },
      ...(enabledExtensions.dashboard
        ? [
            {
              id: 'start-dashboard',
              title: STRINGS.palette.dashboard,
              subtitle: 'Kikkō',
              icon: LayoutDashboard,
              iconClassName: 'text-amber-500 dark:text-amber-400',
              action: () => {
                void openDashboardWindow()
                hideWindow()
              },
            },
          ]
        : []),
      ...(enabledExtensions.snippets
        ? [
            {
              id: 'start-snippets-search',
              title: 'Search Snippets',
              subtitle: 'Kikkō',
              icon: FileText,
              iconClassName: 'text-emerald-500 dark:text-emerald-400',
              action: () => setMode('snippets'),
            },
            {
              id: 'start-snippets-create',
              title: 'Create Snippet',
              subtitle: 'Kikkō',
              icon: FileText,
              iconClassName: 'text-emerald-500 dark:text-emerald-400',
              action: () => {
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('kikko:settings:focus-section', 'snippets')
                }
                void openSettingsWindow()
                hideWindow()
              },
            },
          ]
        : []),
      {
        id: 'start-quicklinks',
        title: 'Quick Links',
        subtitle: 'Kikkō',
        icon: Link,
        iconClassName: 'text-blue-500 dark:text-blue-400',
        action: () => setMode('quicklinks'),
      },
      // Калькулятор не в саджестах — встроен в поиск (достаточно ввести выражение)
    ],
    [
      enabledExtensions.clipboard,
      enabledExtensions.dashboard,
      enabledExtensions.snippets,
      hideWindow,
    ],
  )

  const [selectionScrollSignal, setSelectionScrollSignal] = useState(0)

  const selectedSearchResult = useMemo(() => {
    const selectedResultId = extractCommandEntityId(selectedCommandValue, 'result')
    if (selectedResultId) {
      return results.find((result) => result.id === selectedResultId) ?? null
    }
    return results[0] ?? null
  }, [results, selectedCommandValue])

  const selectedStartSuggestion = useMemo(() => {
    const selectedSuggestionId = extractCommandEntityId(selectedCommandValue, 'suggestion')
    if (selectedSuggestionId) {
      return startSuggestions.find((suggestion) => suggestion.id === selectedSuggestionId) ?? null
    }
    return startSuggestions[0] ?? null
  }, [selectedCommandValue, startSuggestions])

  const copyTextToClipboard = useCallback((value: string) => {
    if (!value.trim()) return
    if (isTauriRuntime()) {
      void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) => writeText(value))
      return
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(value)
    }
  }, [])

  const runResultAction = useCallback((result: SearchResult) => {
    result.action()
    setPaletteView('results')
  }, [])

  const selectSearchResult = useCallback(
    (result: SearchResult) => {
      if (isDangerousCommand(result)) {
        setPendingDangerousResult(result)
        return
      }
      runResultAction(result)
    },
    [runResultAction],
  )

  const searchActions = useMemo<PaletteAction[]>(() => {
    if (selectedSearchResult) {
      const actions: PaletteAction[] = [
        {
          id: 'result-open',
          label: STRINGS.palette.openCommand,
          icon: Zap,
          onSelect: () => {
            selectSearchResult(selectedSearchResult)
          },
        },
        {
          id: 'result-copy-title',
          label: 'Copy title',
          icon: ClipboardList,
          onSelect: () => copyTextToClipboard(selectedSearchResult.title),
        },
      ]
      if (selectedSearchResult.subtitle) {
        actions.push({
          id: 'result-copy-subtitle',
          label: 'Copy details',
          icon: FileText,
          onSelect: () => copyTextToClipboard(selectedSearchResult.subtitle ?? ''),
        })
      }
      return actions
    }

    if (!selectedStartSuggestion) return []
    return [
      {
        id: 'suggestion-open',
        label: STRINGS.palette.openCommand,
        icon: Zap,
        onSelect: () => {
          selectedStartSuggestion.action()
          setPaletteView('results')
        },
      },
      {
        id: 'suggestion-copy-title',
        label: 'Copy title',
        icon: ClipboardList,
        onSelect: () => copyTextToClipboard(selectedStartSuggestion.title),
      },
    ]
  }, [copyTextToClipboard, selectSearchResult, selectedSearchResult, selectedStartSuggestion])

  const snippetActions = useMemo<PaletteAction[]>(() => {
    if (!selectedSnippetEntry) return []
    return [
      {
        id: 'snippet-paste',
        label: STRINGS.palette.actionPaste,
        icon: ClipboardList,
        onSelect: () => {
          if (!isTauriRuntime()) return
          void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) =>
            writeText(selectedSnippetEntry.content),
          )
          void markSnippetUsed(selectedSnippetEntry.id)
          hideWindow()
        },
      },
      {
        id: 'snippet-copy-name',
        label: 'Copy snippet name',
        icon: FileText,
        onSelect: () => copyTextToClipboard(selectedSnippetEntry.name),
      },
    ]
  }, [copyTextToClipboard, hideWindow, markSnippetUsed, selectedSnippetEntry])

  const quicklinkActions = useMemo<PaletteAction[]>(() => {
    if (!selectedQuicklinkEntry) return []
    return [
      {
        id: 'quicklink-open',
        label: STRINGS.palette.openCommand,
        icon: Link,
        onSelect: () => {
          if (!isTauriRuntime()) return
          void import('@tauri-apps/plugin-shell').then(({ open }) =>
            open(selectedQuicklinkEntry.url),
          )
          hideWindow()
        },
      },
      {
        id: 'quicklink-copy-url',
        label: 'Copy URL',
        icon: ClipboardList,
        onSelect: () => copyTextToClipboard(selectedQuicklinkEntry.url),
      },
      {
        id: 'quicklink-copy-name',
        label: 'Copy name',
        icon: FileText,
        onSelect: () => copyTextToClipboard(selectedQuicklinkEntry.name),
      },
    ]
  }, [copyTextToClipboard, hideWindow, selectedQuicklinkEntry])

  const activeActions = isClipboardMode
    ? clipboardActions
    : isSnippetsMode
      ? snippetActions
      : isQuicklinksMode
        ? quicklinkActions
        : searchActions

  const toggleActionsView = useCallback(() => {
    if (activeActions.length === 0) return
    setPaletteView((value) => {
      const next = value === 'actions' ? 'results' : 'actions'
      if (next === 'actions') {
        setSelectedActionIndex(0)
      }
      return next
    })
  }, [activeActions.length])

  useEffect(() => {
    if (mode !== 'search') {
      setSelectedCommandValue('')
      return
    }
    const hasSelectedResult = Boolean(
      extractCommandEntityId(selectedCommandValue, 'result') &&
      results.some(
        (result) => result.id === extractCommandEntityId(selectedCommandValue, 'result'),
      ),
    )
    const hasSelectedSuggestion = Boolean(
      extractCommandEntityId(selectedCommandValue, 'suggestion') &&
      startSuggestions.some(
        (item) => item.id === extractCommandEntityId(selectedCommandValue, 'suggestion'),
      ),
    )
    if (hasSelectedResult || hasSelectedSuggestion) {
      return
    }
    const topResult = results[0]
    if (topResult) {
      setSelectedCommandValue(`result:${topResult.id}`)
      return
    }
    const topSuggestion = startSuggestions[0]
    if (shouldShowStartSuggestions && topSuggestion) {
      setSelectedCommandValue(`suggestion:${topSuggestion.id}`)
      return
    }
    setSelectedCommandValue('')
  }, [mode, results, selectedCommandValue, shouldShowStartSuggestions, startSuggestions])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (isFooterMenuOpen) {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          closeFooterMenu({ focusButton: true })
          return
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          event.stopPropagation()
          setSelectedFooterMenuIndex((current) =>
            current >= footerMenuActions.length - 1 ? 0 : current + 1,
          )
          return
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          event.stopPropagation()
          setSelectedFooterMenuIndex((current) =>
            current <= 0 ? footerMenuActions.length - 1 : current - 1,
          )
          return
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          event.stopPropagation()
          const action = footerMenuActions[selectedFooterMenuIndex]
          if (action) {
            closeFooterMenu({ focusButton: true })
            action.onSelect()
          }
          return
        }
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        if (pendingDangerousResult) {
          setPendingDangerousResult(null)
          return
        }
        if (query.trim() !== '') {
          setQuery('')
          if (mode === 'search') {
            runSearch('')
          }
          return
        }
        if (mode !== 'search' || isActionsView) {
          setPaletteView('results')
          setMode('search')
          return
        }
        if (!closeOnEscape) return
        hideWindow()
        return
      }
      // Layout-independent: works on RU/EN keyboard layouts
      if ((event.ctrlKey || event.metaKey) && (event.code === 'KeyK' || event.key.toLowerCase() === 'k')) {
        event.preventDefault()
        toggleActionsView()
        return
      }
      if (isActionsView) {
        if (activeActions.length === 0) {
          setPaletteView('results')
          return
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSelectedActionIndex((index) => (index + 1) % activeActions.length)
          return
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSelectedActionIndex((index) => (index <= 0 ? activeActions.length - 1 : index - 1))
          return
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          activeActions[selectedActionIndex]?.onSelect()
          setPaletteView('results')
          return
        }
        return
      }
      if (isEmojiMode && emojiFlatList.length > 0) {
        const cols = 8
        const total = emojiFlatList.length
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          setSelectedEmojiIndex((i) => (i >= total - 1 ? 0 : i + 1))
          return
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          setSelectedEmojiIndex((i) => (i <= 0 ? total - 1 : i - 1))
          return
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSelectedEmojiIndex((i) => (i + cols >= total ? i : i + cols))
          return
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSelectedEmojiIndex((i) => (i - cols < 0 ? i : i - cols))
          return
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          const entry = emojiFlatList[selectedEmojiIndex]
          if (entry && isTauriRuntime()) {
            void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) =>
              writeText(entry.emoji),
            )
            markEmojiUsed(entry.emoji)
            toast.success('Emoji copied to clipboard')
            hideWindow()
          }
          return
        }
        return
      }
      if (isSnippetsMode && snippetsFiltered.length > 0) {
        const currentIndex = snippetsFiltered.findIndex(
          (snippet) => snippet.id === selectedSnippetId,
        )
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          const nextIndex = currentIndex >= snippetsFiltered.length - 1 ? 0 : currentIndex + 1
          const nextId = snippetsFiltered[nextIndex]?.id
          if (nextId) setSelectedSnippetId(nextId)
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          const nextIndex = currentIndex <= 0 ? snippetsFiltered.length - 1 : currentIndex - 1
          const nextId = snippetsFiltered[nextIndex]?.id
          if (nextId) setSelectedSnippetId(nextId)
        }
        if (event.key === 'Enter' && selectedSnippetId) {
          event.preventDefault()
          const selectedSnippet = snippetsFiltered.find(
            (snippet) => snippet.id === selectedSnippetId,
          )
          if (selectedSnippet && isTauriRuntime()) {
            void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) =>
              writeText(selectedSnippet.content),
            )
            void markSnippetUsed(selectedSnippet.id)
            hideWindow()
          }
        }
        return
      }
      if (isQuicklinksMode && quicklinksFiltered.length > 0) {
        const currentIndex = quicklinksFiltered.findIndex((q) => q.id === selectedQuicklinkId)
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          const nextIndex = currentIndex >= quicklinksFiltered.length - 1 ? 0 : currentIndex + 1
          const nextId = quicklinksFiltered[nextIndex]?.id
          if (nextId) setSelectedQuicklinkId(nextId)
          return
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          const nextIndex = currentIndex <= 0 ? quicklinksFiltered.length - 1 : currentIndex - 1
          const nextId = quicklinksFiltered[nextIndex]?.id
          if (nextId) setSelectedQuicklinkId(nextId)
          return
        }
        if (event.key === 'Enter' && selectedQuicklinkId) {
          event.preventDefault()
          const link = quicklinksFiltered.find((q) => q.id === selectedQuicklinkId)
          if (link && isTauriRuntime()) {
            void import('@tauri-apps/plugin-shell').then(({ open }) => open(link.url))
            hideWindow()
          }
          return
        }
        return
      }
      if (isClipboardMode) return
    },
    [
      activeActions,
      closeOnEscape,
      emojiFlatList,
      hideWindow,
      isActionsView,
      isClipboardMode,
      isEmojiMode,
      isSnippetsMode,
      isQuicklinksMode,
      markSnippetUsed,
      mode,
      pendingDangerousResult,
      query,
      quicklinksFiltered,
      runSearch,
      closeFooterMenu,
      footerMenuActions,
      isFooterMenuOpen,
      selectedActionIndex,
      selectedEmojiIndex,
      selectedFooterMenuIndex,
      selectedQuicklinkId,
      selectedSnippetId,
      snippetsFiltered,
      toggleActionsView,
    ],
  )

  return (
    <div className="flex h-full min-h-dvh w-full flex-col" onKeyDownCapture={handleKeyDown}>
      <Command
        className={cn(
          'palette-panel relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-none',
        )}
        shouldFilter={false}
        value={selectedCommandValue}
        onValueChange={setSelectedCommandValue}
      >
        <div className="border-border/70 flex shrink-0 items-center gap-2 border-b px-3 py-3">
          {isRootMode ? (
            <img
              src="/kikko-logo.png"
              alt="Kikko"
              className="h-5 w-5 shrink-0 opacity-95"
              onError={(event) => {
                event.currentTarget.src = '/vite.svg'
              }}
            />
          ) : (
            <IconButton size="sm" onClick={goBack} aria-label={STRINGS.palette.back}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </IconButton>
          )}
          {!isRootMode && <Search className="text-muted-foreground h-5 w-5 shrink-0" aria-hidden />}
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={handleValueChange}
            onKeyDownCapture={(event) => {
              if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter')
                return
              if (isActionsView) return

              if (isClipboardMode && clipboardFiltered.length > 0) {
                event.preventDefault()
                event.stopPropagation()
                const currentIndex = clipboardFiltered.findIndex(
                  (entry) => entry.id === selectedClipboardId,
                )
                if (event.key === 'ArrowDown') {
                  const nextIndex =
                    currentIndex >= clipboardFiltered.length - 1 ? 0 : currentIndex + 1
                  const nextId = clipboardFiltered[nextIndex]?.id
                  if (nextId) {
                    setSelectedClipboardId(nextId)
                    setSelectionScrollSignal((value) => value + 1)
                  }
                  return
                }
                if (event.key === 'ArrowUp') {
                  const nextIndex =
                    currentIndex <= 0 ? clipboardFiltered.length - 1 : currentIndex - 1
                  const nextId = clipboardFiltered[nextIndex]?.id
                  if (nextId) {
                    setSelectedClipboardId(nextId)
                    setSelectionScrollSignal((value) => value + 1)
                  }
                  return
                }
                if (event.key === 'Enter' && selectedClipboardId) {
                  const selectedEntry = clipboardFiltered.find(
                    (entry) => entry.id === selectedClipboardId,
                  )
                  if (selectedEntry) copyAndClose(selectedEntry)
                }
                return
              }

              if (isQuicklinksMode && quicklinksFiltered.length > 0) {
                event.preventDefault()
                event.stopPropagation()
                const currentIndex = quicklinksFiltered.findIndex(
                  (q) => q.id === selectedQuicklinkId,
                )
                if (event.key === 'ArrowDown') {
                  const nextIndex =
                    currentIndex >= quicklinksFiltered.length - 1 ? 0 : currentIndex + 1
                  const nextId = quicklinksFiltered[nextIndex]?.id
                  if (nextId) {
                    setSelectedQuicklinkId(nextId)
                    setSelectionScrollSignal((value) => value + 1)
                  }
                  return
                }
                if (event.key === 'ArrowUp') {
                  const nextIndex =
                    currentIndex <= 0 ? quicklinksFiltered.length - 1 : currentIndex - 1
                  const nextId = quicklinksFiltered[nextIndex]?.id
                  if (nextId) {
                    setSelectedQuicklinkId(nextId)
                    setSelectionScrollSignal((value) => value + 1)
                  }
                  return
                }
                if (event.key === 'Enter' && selectedQuicklinkId) {
                  const link = quicklinksFiltered.find((q) => q.id === selectedQuicklinkId)
                  if (link && isTauriRuntime()) {
                    void import('@tauri-apps/plugin-shell').then(({ open }) => open(link.url))
                    hideWindow()
                  }
                }
                return
              }

              if (isSnippetsMode && snippetsFiltered.length > 0) {
                event.preventDefault()
                event.stopPropagation()
                const currentIndex = snippetsFiltered.findIndex((s) => s.id === selectedSnippetId)
                if (event.key === 'ArrowDown') {
                  const nextIndex =
                    currentIndex >= snippetsFiltered.length - 1 ? 0 : currentIndex + 1
                  const nextId = snippetsFiltered[nextIndex]?.id
                  if (nextId) {
                    setSelectedSnippetId(nextId)
                    setSelectionScrollSignal((value) => value + 1)
                  }
                  return
                }
                if (event.key === 'ArrowUp') {
                  const nextIndex =
                    currentIndex <= 0 ? snippetsFiltered.length - 1 : currentIndex - 1
                  const nextId = snippetsFiltered[nextIndex]?.id
                  if (nextId) {
                    setSelectedSnippetId(nextId)
                    setSelectionScrollSignal((value) => value + 1)
                  }
                  return
                }
                if (event.key === 'Enter' && selectedSnippetId) {
                  const selectedSnippet = snippetsFiltered.find((s) => s.id === selectedSnippetId)
                  if (selectedSnippet && isTauriRuntime()) {
                    void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) =>
                      writeText(selectedSnippet.content),
                    )
                    void markSnippetUsed(selectedSnippet.id)
                    hideWindow()
                  }
                }
              }
            }}
            placeholder={
              isClipboardMode
                ? STRINGS.palette.filterPlaceholder
                : isEmojiMode
                  ? 'Search emoji & symbols…'
                  : isQuicklinksMode
                    ? 'Search for Quicklinks…'
                    : isSnippetsMode
                      ? 'Search snippets…'
                      : STRINGS.palette.placeholder
            }
            className="text-foreground placeholder:text-muted-foreground h-10 flex-1 bg-transparent text-[15px] outline-none"
          />
          {isClipboardMode && (
            <label className="border-border/70 bg-background/70 text-foreground/90 inline-flex h-8 items-center gap-2 rounded-md border px-2 text-xs">
              <SlidersHorizontal className="text-muted-foreground h-3.5 w-3.5" aria-hidden />
              <select
                value={clipboardTypeFilter}
                onChange={(event) =>
                  setClipboardTypeFilter(event.target.value as ClipboardTypeFilter)
                }
                className="bg-transparent text-xs outline-none"
              >
                <option value="all">All Types</option>
                <option value="text">Text</option>
                <option value="link">Links</option>
                <option value="image">Images</option>
                <option value="file">Files</option>
                <option value="code">Code</option>
              </select>
            </label>
          )}
        </div>

        {isClipboardMode ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2">
            {pendingDangerousResult && (
              <div className="border-warning/45 bg-warning/10 mb-2 rounded-lg border px-3 py-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-warning mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-xs font-medium">Confirm critical command</p>
                    <p className="text-muted-foreground text-xs">{pendingDangerousResult.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="muted"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => {
                        runResultAction(pendingDangerousResult)
                        setPendingDangerousResult(null)
                      }}
                    >
                      Run
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setPendingDangerousResult(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {clipboardLoading && (
              <div className="text-muted-foreground py-4 text-center text-sm">
                {STRINGS.palette.loading}
              </div>
            )}
            {!clipboardLoading && clipboardFiltered.length === 0 && (
              <div className="text-muted-foreground py-8 text-center text-sm">
                {STRINGS.palette.clipboardEmpty}
              </div>
            )}
            {!clipboardLoading && clipboardFiltered.length > 0 && (
              <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-3 overflow-hidden">
                <ClipboardEntriesList
                  entries={clipboardFiltered}
                  selectedId={selectedClipboardId}
                  scrollToSelectedSignal={selectionScrollSignal}
                  onSelect={(entry) => setSelectedClipboardId(entry.id)}
                  onToggleFavorite={(entryId) => void toggleFavoriteInBackend(entryId)}
                  onTogglePinned={(entryId) => void togglePinnedInBackend(entryId)}
                  onDelete={(entryId) => void deleteInBackend(entryId)}
                />
                <ClipboardDetailPreview entry={selectedClipboardEntry} />
              </div>
            )}
          </div>
        ) : (
          <Command.List
            className={cn(
              'min-h-0 flex-1 overflow-y-auto scroll-auto px-2 py-2 pb-14',
              isCompactEmpty && 'hidden',
            )}
          >
            {pendingDangerousResult && (
              <div className="border-warning/45 bg-warning/10 mb-2 rounded-lg border px-3 py-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-warning mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-xs font-medium">Confirm critical command</p>
                    <p className="text-muted-foreground text-xs">{pendingDangerousResult.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="muted"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => {
                        runResultAction(pendingDangerousResult)
                        setPendingDangerousResult(null)
                      }}
                    >
                      Run
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setPendingDangerousResult(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {isSnippetsMode && (
              <>
                {snippetsFiltered.length === 0 && (
                  <div className="text-muted-foreground flex flex-col items-center gap-3 py-8 text-center text-sm">
                    <p>No snippets found.</p>
                    <Button
                      size="sm"
                      variant="muted"
                      className="gap-2"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.localStorage.setItem('kikko:settings:focus-section', 'snippets')
                        }
                        void openSettingsWindow()
                        hideWindow()
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Create snippet
                    </Button>
                  </div>
                )}
                {snippetsFiltered.length > 0 && (
                  <Command.Group heading={STRINGS.palette.snippets}>
                    {snippetsFiltered.map((snippet) => (
                      <Command.Item
                        key={snippet.id}
                        value={`snippet-entry:${snippet.id}`}
                        data-keyboard-selected={
                          selectedSnippetId === snippet.id ? 'true' : undefined
                        }
                        onSelect={() => {
                          if (!isTauriRuntime()) return
                          void import('@tauri-apps/plugin-clipboard-manager').then(
                            ({ writeText }) => writeText(snippet.content),
                          )
                          void markSnippetUsed(snippet.id)
                          hideWindow()
                        }}
                        className={cn(
                          'text-foreground flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm',
                          selectedSnippetId === snippet.id && 'keyboard-selected',
                        )}
                      >
                        <FileText className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                        <span className="min-w-0 flex-1 truncate">{snippet.name}</span>
                        <span className="text-muted-foreground max-w-[220px] shrink-0 truncate text-xs opacity-80">
                          {snippet.keyword}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </>
            )}

            {isEmojiMode && !isActionsView && (
              <>
                {emojiFlatList.length === 0 && (
                  <div className="text-muted-foreground flex flex-col items-center gap-3 py-8 text-center text-sm">
                    <p>No emojis match your search.</p>
                    <p className="text-xs">
                      Try &quot;smile&quot;, &quot;fire&quot;, &quot;heart&quot;
                    </p>
                  </div>
                )}
                {emojiFlatList.length > 0 && (
                  <div className="flex flex-col gap-4 py-2">
                    {(() => {
                      let flatIndex = 0
                      return emojiGridSections.map((section) => (
                        <div key={section.title} className="flex flex-col gap-1.5">
                          <h3 className="text-muted-foreground px-1 text-xs font-medium">
                            {section.title} {section.count}
                          </h3>
                          <div
                            className="grid gap-0.5 px-1"
                            style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}
                          >
                            {section.entries.map((entry) => {
                              const currentIndex = flatIndex++
                              const isSelected = currentIndex === selectedEmojiIndex
                              return (
                                <button
                                  key={`${entry.emoji}-${currentIndex}`}
                                  type="button"
                                  aria-label={entry.name}
                                  data-emoji-selected={isSelected ? true : undefined}
                                  className={cn(
                                    'flex h-9 w-9 cursor-pointer items-center justify-center rounded text-xl transition-colors',
                                    isSelected
                                      ? 'bg-accent'
                                      : 'hover:bg-muted/60',
                                  )}
                                  onClick={() => {
                                    if (!isTauriRuntime()) return
                                    void import('@tauri-apps/plugin-clipboard-manager').then(
                                      ({ writeText }) => writeText(entry.emoji),
                                    )
                                    markEmojiUsed(entry.emoji)
                                    toast.success('Emoji copied to clipboard')
                                    hideWindow()
                                  }}
                                  onFocus={() => setSelectedEmojiIndex(currentIndex)}
                                >
                                  {entry.emoji}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                )}
              </>
            )}

            {isQuicklinksMode && (
              <>
                {quicklinksFiltered.length === 0 && (
                  <div className="text-muted-foreground flex flex-col items-center gap-3 py-8 text-center text-sm">
                    <p>No quick links yet.</p>
                    <Button
                      size="sm"
                      variant="muted"
                      className="gap-2"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.localStorage.setItem('kikko:settings:focus-section', 'quicklinks')
                        }
                        void openSettingsWindow()
                        hideWindow()
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Create Quicklink
                    </Button>
                  </div>
                )}
                {quicklinksFiltered.length > 0 && (
                  <Command.Group heading="Quick Links">
                    {quicklinksFiltered.map((q) => (
                      <Command.Item
                        key={q.id}
                        value={`quicklink:${q.id}`}
                        data-keyboard-selected={selectedQuicklinkId === q.id ? 'true' : undefined}
                        data-quicklink-selected={selectedQuicklinkId === q.id ? true : undefined}
                        onSelect={() => {
                          if (!isTauriRuntime()) return
                          void import('@tauri-apps/plugin-shell').then(({ open }) => open(q.url))
                          hideWindow()
                        }}
                        className={cn(
                          'text-foreground flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm',
                          selectedQuicklinkId === q.id && 'keyboard-selected',
                        )}
                      >
                        <Link className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{q.name}</span>
                        <span className="text-muted-foreground max-w-[220px] shrink-0 truncate text-xs opacity-80">
                          {q.url}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </>
            )}

            {isRootMode && isLoading && (
              <div className="text-muted-foreground py-4 text-center text-sm">
                {STRINGS.palette.searching}
              </div>
            )}

            {isRootMode && shouldShowStartSuggestions && (
              <Command.Group heading={STRINGS.palette.startSuggestions}>
                {startSuggestions.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`suggestion:${item.id}`}
                    onSelect={item.action}
                    className="text-foreground flex cursor-pointer items-center gap-3 text-sm"
                  >
                    <item.icon className={cn('h-4 w-4 shrink-0', item.iconClassName)} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <span className="text-muted-foreground max-w-[160px] shrink-0 truncate text-xs opacity-80">
                      {item.subtitle}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {isRootMode && !isLoading && (
              <>
                {results.length === 0 && !shouldShowStartSuggestions && !calcResult && (
                  <Command.Empty className="text-muted-foreground py-8 text-center text-sm">
                    {STRINGS.palette.empty}
                  </Command.Empty>
                )}
                {calcResult && (
                  <Command.Group key="calculator-block" heading={STRINGS.palette.calculator}>
                    <div className="bg-muted/40 flex items-stretch gap-4 rounded-lg px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground text-xs font-medium">
                          {STRINGS.palette.calculatorExpression}
                        </p>
                        <p className="text-foreground text-lg font-semibold tracking-tight">
                          {calcResult.expression.replace(/\//g, '÷')}
                        </p>
                      </div>
                      <span className="text-muted-foreground shrink-0 self-center" aria-hidden>
                        →
                      </span>
                      <div className="min-w-0 flex-1 text-right">
                        <p className="text-muted-foreground text-xs font-medium">
                          {STRINGS.palette.calculatorResult}
                        </p>
                        <p className="text-foreground text-lg font-semibold tracking-tight">
                          {calcResult.value}
                        </p>
                      </div>
                    </div>
                    <Command.Item
                      value="calc-copy"
                      onSelect={() => {
                        if (calcResult && isTauriRuntime()) {
                          setLastClipboardContent(calcResult.value)
                          void import('@tauri-apps/plugin-clipboard-manager').then(
                            ({ writeText }) => writeText(calcResult.value),
                          )
                          hideWindow()
                        }
                      }}
                      className="text-foreground flex cursor-pointer items-center gap-3 text-sm"
                    >
                      <ClipboardList
                        className="text-muted-foreground h-5 w-5 shrink-0"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">{STRINGS.palette.copyAnswer}</span>
                    </Command.Item>
                  </Command.Group>
                )}
                {results.length > 0 &&
                  SECTION_ORDER.map((group) => {
                    if (group === 'calculator' && calcResult) return null
                    const items = groupedResults[group]
                    if (items.length === 0) return null
                    return (
                      <Command.Group key={group} heading={getGroupLabel(group)}>
                        {items.map((result) => (
                          <div key={`${group}-${result.id}`}>
                            <Command.Item
                              value={`result:${result.id}`}
                              onSelect={() => selectSearchResult(result)}
                              className="text-foreground flex cursor-pointer items-center gap-3 text-sm"
                            >
                              <ResultIcon result={result} showAppIcons={showAppIcons} />
                              <span className="min-w-0 flex-1 truncate">
                                <span className="inline-flex min-w-0 max-w-full items-baseline gap-2">
                                  <span className="min-w-0 truncate">{result.title}</span>
                                  {result.subtitle &&
                                    !(
                                      result.type === 'app' &&
                                      result.subtitle.toLowerCase() === 'application'
                                    ) && (
                                      <span className="text-muted-foreground min-w-0 truncate text-xs opacity-80">
                                        {result.subtitle}
                                      </span>
                                    )}
                                </span>
                              </span>
                              <span className="bg-muted text-muted-foreground shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase opacity-80">
                                {getCategoryLabel(result.type)}
                              </span>
                            </Command.Item>
                          </div>
                        ))}
                      </Command.Group>
                    )
                  })}
                {!isEmptyQuery && (
                  <Command.Group
                    heading={STRINGS.palette.useQueryWith.replace('{{query}}', query.trim())}
                  >
                    {SEARCH_ENGINES.map((engine) => (
                      <Command.Item
                        key={engine.id}
                        value={`web-search:${engine.id}:${query.trim()}`}
                        onSelect={() => {
                          const url = engine.url.replace('{{q}}', encodeURIComponent(query.trim()))
                          if (isTauriRuntime()) {
                            void import('@tauri-apps/plugin-shell').then(({ open }) => open(url))
                          } else {
                            window.open(url, '_blank', 'noopener')
                          }
                          hideWindow()
                        }}
                        className="text-foreground flex cursor-pointer items-center gap-3 text-sm"
                      >
                        <Search className="text-muted-foreground h-5 w-5 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{engine.name}</span>
                        <span className="text-muted-foreground shrink-0 truncate text-xs">
                          {STRINGS.palette.webSearches}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </>
            )}
          </Command.List>
        )}

        {isActionsView && activeActions.length > 0 && (
          <div className="pointer-events-none absolute right-3 bottom-12 z-20 w-[280px]">
            <div className="border-border/70 bg-background/92 pointer-events-auto rounded-xl border p-1.5 shadow-xl backdrop-blur-md">
              <p className="text-muted-foreground px-2 py-1 text-[10px] font-semibold tracking-wide uppercase">
                {STRINGS.palette.actionPanel}
              </p>
              <div className="mt-1 space-y-1">
                {activeActions.map((action, index) => {
                  const ActionIcon = action.icon
                  const isSelected = index === selectedActionIndex
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onMouseEnter={() => setSelectedActionIndex(index)}
                      onClick={() => {
                        action.onSelect()
                        setPaletteView('results')
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                        isSelected
                          ? 'border-ring/45 bg-accent text-foreground shadow-sm'
                          : 'text-foreground/90 hover:border-ring/35 hover:bg-accent/70 border-transparent',
                      )}
                    >
                      <ActionIcon
                        className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                        aria-hidden
                      />
                      <span className="truncate">{action.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {isFooterMenuOpen && footerMenuActions.length > 0 && (
          <div className="pointer-events-none absolute left-3 bottom-12 z-20 w-[240px]">
            <div
              ref={footerMenuPanelRef}
              className="border-border/70 bg-background/92 pointer-events-auto rounded-xl border p-1.5 shadow-xl backdrop-blur-md"
            >
              <p className="text-muted-foreground px-2 py-1 text-[10px] font-semibold tracking-wide uppercase">
                Menu
              </p>
              <div className="mt-1 space-y-1" role="menu" aria-label="Footer menu">
                {footerMenuActions.map((action, index) => {
                  const ActionIcon = action.icon
                  const isSelected = index === selectedFooterMenuIndex
                  return (
                    <button
                      key={action.id}
                      ref={(element) => {
                        footerMenuItemRefs.current[index] = element
                      }}
                      type="button"
                      role="menuitem"
                      onMouseEnter={() => setSelectedFooterMenuIndex(index)}
                      onFocus={() => setSelectedFooterMenuIndex(index)}
                      onClick={() => {
                        closeFooterMenu({ focusButton: true })
                        action.onSelect()
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors focus-visible:outline-none',
                        isSelected
                          ? 'border-ring/45 bg-accent text-foreground shadow-sm'
                          : 'text-foreground/90 hover:border-ring/35 hover:bg-accent/70 border-transparent',
                      )}
                    >
                      <ActionIcon
                        className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                        aria-hidden
                      />
                      <span className="truncate">{action.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {!isCompactEmpty && (
          <div className="border-border/70 text-muted-foreground flex shrink-0 items-center justify-between border-t px-3 py-2 text-[11px]">
            <div className="flex items-center gap-1">
              <button
                ref={footerMenuButtonRef}
                type="button"
                aria-label="Menu"
                aria-haspopup="menu"
                aria-expanded={isFooterMenuOpen}
                onClick={() => {
                  setIsFooterMenuOpen((current) => !current)
                  setSelectedFooterMenuIndex(0)
                }}
                className={cn(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground cursor-pointer transition-colors duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                  'hover:bg-[hsl(var(--accent))] hover:text-accent-foreground',
                  isFooterMenuOpen && 'bg-[hsl(var(--accent))] text-accent-foreground',
                )}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg px-1 py-0.5 transition-colors hover:bg-[hsl(var(--accent))]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isClipboardMode && selectedClipboardEntry) {
                      copyAndClose(selectedClipboardEntry)
                      return
                    }
                    if (selectedCommandValue === 'calc-copy' && calcResult && isTauriRuntime()) {
                      setLastClipboardContent(calcResult.value)
                      void import('@tauri-apps/plugin-clipboard-manager').then(({ writeText }) =>
                        writeText(calcResult.value),
                      )
                      hideWindow()
                      return
                    }
                    if (selectedSearchResult) {
                      selectSearchResult(selectedSearchResult)
                      return
                    }
                    if (selectedStartSuggestion) {
                      selectedStartSuggestion.action()
                      return
                    }
                    results[0]?.action()
                  }}
                  className="h-7 border border-transparent cursor-pointer bg-transparent px-2 text-[11px] hover:bg-transparent hover:text-foreground"
                >
                  {isClipboardMode
                    ? STRINGS.palette.actionPaste
                    : selectedCommandValue === 'calc-copy' && calcResult
                      ? STRINGS.palette.copyAnswer
                      : STRINGS.palette.openCommand}
                </Button>
                <Kbd>↵</Kbd>
              </div>

              <div
                className={cn(
                  'flex items-center rounded-lg px-1 py-0.5 transition-colors hover:bg-[hsl(var(--accent))]',
                  isActionsView && 'bg-[hsl(var(--accent))] text-accent-foreground',
                )}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={isActionsView}
                  onClick={toggleActionsView}
                  className="h-7 border border-transparent bg-transparent px-2 text-[11px] hover:bg-transparent hover:text-foreground aria-pressed:ring-0 aria-pressed:border-transparent cursor-pointer"
                >
                  {STRINGS.palette.actions}
                </Button>
                <Kbd>{actionsShortcutLabel}</Kbd>
              </div>
            </div>
          </div>
        )}
      </Command>
    </div>
  )
}

function matchesQuick(queryLower: string, title: string, keywords: string[]): boolean {
  const t = title.toLowerCase()
  if (t.includes(queryLower) || queryLower.includes(t)) return true
  return keywords.some((k) => k.includes(queryLower) || queryLower.includes(k))
}

function extractCommandEntityId(value: string, prefix: 'result' | 'suggestion'): string | null {
  if (!value.startsWith(`${prefix}:`)) return null
  return value.slice(prefix.length + 1) || null
}

function groupSearchResults(results: SearchResult[]): GroupedResults {
  const grouped: GroupedResults = {
    command: [],
    application: [],
    preferences: [],
    file: [],
    plugin: [],
    clipboard: [],
    snippet: [],
    calculator: [],
  }
  for (const result of results) {
    const group = normalizeGroup(result)
    grouped[group].push(result)
  }
  return grouped
}

function normalizeGroup(result: SearchResult): keyof GroupedResults {
  if (result.section === 'application') return 'application'
  if (result.section === 'preferences') return 'preferences'
  if (result.section === 'file') return 'file'
  if (result.section === 'plugin') return 'plugin'
  if (result.section === 'clipboard') return 'clipboard'
  if (result.section === 'snippet') return 'snippet'
  if (result.section === 'calculator') return 'calculator'
  if (result.type === 'app') return 'application'
  if (result.type === 'file') return 'file'
  if (result.type === 'plugin') return 'plugin'
  if (result.type === 'clipboard') return 'clipboard'
  if (result.type === 'snippet') return 'snippet'
  if (result.type === 'calculator') return 'calculator'
  return 'command'
}

function getGroupLabel(group: keyof GroupedResults): string {
  switch (group) {
    case 'command':
      return STRINGS.palette.commands
    case 'application':
      return STRINGS.palette.applications
    case 'preferences':
      return STRINGS.palette.preferences
    case 'file':
      return 'Files'
    case 'plugin':
      return 'Plugins'
    case 'clipboard':
      return STRINGS.palette.clipboardHistory
    case 'snippet':
      return STRINGS.palette.snippets
    case 'calculator':
      return STRINGS.palette.calculator
    default:
      return STRINGS.palette.results
  }
}

function getCategoryLabel(type: string): string {
  switch (type) {
    case 'app':
      return STRINGS.palette.categoryApplication
    case 'command':
      return STRINGS.palette.categorySystem
    case 'file':
      return STRINGS.palette.categoryFile
    case 'clipboard':
      return STRINGS.palette.categoryClipboard
    case 'snippet':
      return STRINGS.palette.categorySnippet
    case 'calculator':
      return STRINGS.palette.categoryCalculator
    case 'plugin':
      return 'Plugin'
    default:
      return STRINGS.palette.categoryApplication
  }
}

function matchesClipboardType(entry: ClipboardEntry, filter: ClipboardTypeFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'link') {
    if (entry.contentType !== 'text') return false
    return isLikelyUrl(entry.content)
  }
  if (filter === 'text') return entry.contentType === 'text'
  if (filter === 'image') return entry.contentType === 'image'
  if (filter === 'file') return entry.contentType === 'file'
  if (filter === 'code') return entry.contentType === 'code' || entry.contentType === 'html'
  return true
}

function isLikelyUrl(value: string): boolean {
  const trimmed = value.trim().toLowerCase()
  return (
    trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('www.')
  )
}

function isDangerousCommand(result: SearchResult): boolean {
  if (result.type !== 'command') return false
  return result.id === 'cmd-restart' || result.id === 'cmd-shutdown'
}

function composeSearchResultsBySection(
  results: SearchResult[],
  query: string,
  totalLimit: number,
): SearchResult[] {
  const grouped = groupSearchResults(results)
  const isEmptyQuery = query.trim() === ''
  const sectionCaps = isEmptyQuery ? SECTION_CAPS_EMPTY_QUERY : SECTION_CAPS_WITH_QUERY

  const merged: SearchResult[] = []
  for (const group of SECTION_ORDER) {
    const cap = sectionCaps[group]
    const items = grouped[group]
    if (items.length === 0) continue
    merged.push(...items.slice(0, cap))
  }

  if (merged.length >= totalLimit) {
    return merged.slice(0, totalLimit)
  }

  const selectedIds = new Set(merged.map((item) => item.id))
  for (const group of SECTION_ORDER) {
    for (const item of grouped[group]) {
      if (selectedIds.has(item.id)) continue
      merged.push(item)
      selectedIds.add(item.id)
      if (merged.length >= totalLimit) return merged
    }
  }
  return merged
}

const appIconUrlCache = new Map<string, string>()
const appIconPendingCache = new Set<string>()

function ResultIcon({
  result,
  showAppIcons,
}: {
  result: { type: string; icon?: string }
  showAppIcons: boolean
}) {
  if (showAppIcons && (result.type === 'app' || result.type === 'file') && result.icon) {
    return <AppNativeIcon appPath={result.icon} />
  }
  const type = result.type
  const Icon =
    type === 'app'
      ? AppWindow
      : type === 'file'
        ? FileText
        : type === 'clipboard'
          ? ClipboardList
          : type === 'snippet'
            ? FileText
            : type === 'calculator'
              ? Calculator
              : type === 'plugin'
                ? Sparkles
                : Zap
  return <Icon className={cn('h-5 w-5 shrink-0', getResultIconTone(type))} />
}

function AppNativeIcon({ appPath }: { appPath: string }) {
  const [source, setSource] = useState<string | null>(() => appIconUrlCache.get(appPath) ?? null)

  useEffect(() => {
    const cached = appIconUrlCache.get(appPath)
    if (cached) {
      setSource(cached)
      return
    }
    if (appIconPendingCache.has(appPath)) return

    appIconPendingCache.add(appPath)
    void invoke<number[]>('get_path_icon_png', { path: appPath })
      .then((bytes) => {
        const objectUrl = URL.createObjectURL(
          new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
        )
        appIconUrlCache.set(appPath, objectUrl)
        setSource(objectUrl)
      })
      .catch(() => {
        setSource(null)
      })
      .finally(() => {
        appIconPendingCache.delete(appPath)
      })
  }, [appPath])

  if (!source) {
    return <AppWindow className="text-muted-foreground h-5 w-5 shrink-0" />
  }

  return (
    <img
      src={source}
      alt=""
      className="h-5 w-5 shrink-0 rounded-sm object-contain"
      loading="lazy"
      aria-hidden
    />
  )
}

function getResultIconTone(type: string): string {
  switch (type) {
    case 'clipboard':
      return 'text-sky-500 dark:text-sky-400'
    case 'calculator':
      return 'text-rose-500 dark:text-rose-400'
    case 'snippet':
      return 'text-emerald-500 dark:text-emerald-400'
    case 'plugin':
      return 'text-violet-500 dark:text-violet-400'
    case 'command':
      return 'text-amber-500 dark:text-amber-400'
    default:
      return 'text-muted-foreground'
  }
}
