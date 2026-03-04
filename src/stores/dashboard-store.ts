import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
type RglLayout = import('react-grid-layout/legacy').Layout

export interface DashboardWidgetConfig {
  id: string
  title: string
  visible: boolean
}

interface DashboardState {
  layout: RglLayout
  quickNoteText: string
  widgets: DashboardWidgetConfig[]
  setLayout: (layout: RglLayout) => void
  setQuickNoteText: (value: string) => void
  toggleWidgetVisibility: (id: string) => void
}

const defaultLayout: RglLayout = [
  { i: 'clipboard-stats', x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 4 },
  { i: 'favorites', x: 4, y: 0, w: 4, h: 4, minW: 3, minH: 4 },
  { i: 'quick-notes', x: 8, y: 0, w: 4, h: 5, minW: 3, minH: 4 },
  { i: 'snippets', x: 0, y: 4, w: 6, h: 5, minW: 4, minH: 4 },
  { i: 'plugins', x: 6, y: 4, w: 6, h: 5, minW: 4, minH: 4 },
]

const defaultWidgets: DashboardWidgetConfig[] = [
  { id: 'clipboard-stats', title: 'Clipboard Stats', visible: true },
  { id: 'favorites', title: 'Pinned & Favorites', visible: true },
  { id: 'quick-notes', title: 'Quick Notes', visible: true },
  { id: 'snippets', title: 'Snippets', visible: true },
  { id: 'plugins', title: 'Plugins', visible: true },
]

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      layout: defaultLayout,
      quickNoteText: '',
      widgets: defaultWidgets,
      setLayout: (layout) => set({ layout }),
      setQuickNoteText: (value) => set({ quickNoteText: value }),
      toggleWidgetVisibility: (id) =>
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === id ? { ...widget, visible: !widget.visible } : widget,
          ),
        })),
    }),
    {
      name: 'kikko-dashboard',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        layout: state.layout,
        quickNoteText: state.quickNoteText,
        widgets: state.widgets,
      }),
    },
  ),
)
