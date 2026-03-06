import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { Settings2 } from 'lucide-react'
import GridLayout from 'react-grid-layout/legacy'
import { PageShell } from '@/components/shared/page-shell'
import { Button } from '@/components/ui/button'
import { useClipboardStore } from '@/stores/clipboard-store'
import { useDashboardStore } from '@/stores/dashboard-store'
import { usePluginStore } from '@/stores/plugin-store'
import { useSnippetStore } from '@/stores/snippet-store'
import { isTauriRuntime } from '@/lib/tauri'
import { ClipboardStatsWidget } from '@/widgets/dashboard/clipboard-stats-widget'
import { FavoritesWidget } from '@/widgets/dashboard/favorites-widget'
import { PluginsWidget } from '@/widgets/dashboard/plugins-widget'
import { QuickNotesWidget } from '@/widgets/dashboard/quick-notes-widget'
import { SnippetsWidget } from '@/widgets/dashboard/snippets-widget'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

type RglLayout = import('react-grid-layout/legacy').Layout

const widgetRenderMap: Record<string, ComponentType> = {
  'clipboard-stats': ClipboardStatsWidget,
  favorites: FavoritesWidget,
  'quick-notes': QuickNotesWidget,
  snippets: SnippetsWidget,
  plugins: PluginsWidget,
}

const widgetMinHeightMap: Record<string, number> = {
  'clipboard-stats': 4,
  favorites: 4,
  'quick-notes': 4,
  snippets: 4,
  plugins: 4,
}

/** Страница Dashboard (Cmd+J) */
export function DashboardPage() {
  const widgets = useDashboardStore((state) => state.widgets)
  const layout = useDashboardStore((state) => state.layout)
  const setLayout = useDashboardStore((state) => state.setLayout)
  const toggleWidgetVisibility = useDashboardStore((state) => state.toggleWidgetVisibility)

  const loadClipboard = useClipboardStore((state) => state.loadFromBackend)
  const loadSnippets = useSnippetStore((state) => state.loadFromBackend)
  const plugins = usePluginStore((state) => state.plugins)
  const [gridWidth, setGridWidth] = useState(980)
  const gridContainerRef = useRef<HTMLDivElement | null>(null)

  const visibleWidgetIds = useMemo(
    () => widgets.filter((widget) => widget.visible).map((widget) => widget.id),
    [widgets],
  )

  const visibleLayout = useMemo(
    () =>
      layout
        .filter((item) => visibleWidgetIds.includes(item.i))
        .map((item) => ({
          ...item,
          minH: Math.max(item.minH ?? 1, widgetMinHeightMap[item.i] ?? 1),
          h: Math.max(item.h, widgetMinHeightMap[item.i] ?? 1),
        })),
    [layout, visibleWidgetIds],
  )

  const pluginStats = useMemo(() => {
    const enabled = plugins.filter((plugin) => plugin.enabled).length
    return { enabled, total: plugins.length }
  }, [plugins])

  useEffect(() => {
    void loadClipboard()
    void loadSnippets()
  }, [loadClipboard, loadSnippets])

  useEffect(() => {
    if (!isTauriRuntime()) return
    void import('@tauri-apps/api/window').then(({ getCurrentWindow, LogicalSize }) => {
      const currentWindow = getCurrentWindow()
      if (currentWindow.label !== 'dashboard-window') return
      void currentWindow.setSize(new LogicalSize(1180, 760))
      void currentWindow.center()
    })
  }, [])

  useEffect(() => {
    const node = gridContainerRef.current
    if (!node) return
    const updateWidth = () => setGridWidth(Math.max(node.clientWidth, 320))
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <PageShell title="Dashboard" subtitle="Overview, widgets, and plugin runtime">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          <span>{pluginStats.enabled}</span> / <span>{pluginStats.total}</span> plugins enabled
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => void loadClipboard()}>
            Refresh Clipboard
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => void loadSnippets()}>
            Refresh Snippets
          </Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {widgets.map((widget) => (
          <Button
            key={widget.id}
            size="sm"
            variant={widget.visible ? 'muted' : 'ghost'}
            className="h-7 px-2 text-[11px]"
            onClick={() => toggleWidgetVisibility(widget.id)}
            aria-pressed={widget.visible}
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden />
            <span className="ml-1">{widget.title}</span>
          </Button>
        ))}
      </div>

      <div ref={gridContainerRef} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
        <GridLayout
          className="layout"
          width={gridWidth}
          rowHeight={48}
          cols={12}
          layout={visibleLayout}
          margin={[10, 10]}
          containerPadding={[0, 0]}
          compactType={null}
          onLayoutChange={(currentLayout: RglLayout) => setLayout([...currentLayout])}
          draggableHandle=".widget-shell-header"
        >
          {visibleWidgetIds.map((widgetId) => {
            const WidgetComponent = widgetRenderMap[widgetId]
            if (!WidgetComponent) return null
            return (
              <div key={widgetId} className="flex h-full min-h-0 flex-col">
                <WidgetComponent />
              </div>
            )
          })}
        </GridLayout>
      </div>
    </PageShell>
  )
}
