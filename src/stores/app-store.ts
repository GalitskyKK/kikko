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
