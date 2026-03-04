import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { logger } from '@/utils/logger'
import { isTauriRuntime } from '@/lib/tauri'

const SETTINGS_WINDOW_LABEL = 'settings-window'
const DASHBOARD_WINDOW_LABEL = 'dashboard-window'

export async function openSettingsWindow(): Promise<void> {
  await openDetachedWindow({
    label: SETTINGS_WINDOW_LABEL,
    path: '/settings',
    title: 'Kikko Settings',
    width: 980,
    height: 760,
  })
}

export async function openDashboardWindow(): Promise<void> {
  await openDetachedWindow({
    label: DASHBOARD_WINDOW_LABEL,
    path: '/dashboard',
    title: 'Kikko Dashboard',
    width: 1180,
    height: 760,
  })
}

async function openDetachedWindow({
  label,
  path,
  title,
  width,
  height,
}: {
  label: string
  path: string
  title: string
  width: number
  height: number
}): Promise<void> {
  if (!isTauriRuntime()) return
  try {
    const currentWindow = getCurrentWindow()
    if (currentWindow.label === 'main') {
      await currentWindow.hide()
    }

    const existingWindow = await WebviewWindow.getByLabel(label)
    if (existingWindow) {
      try {
        await existingWindow.show()
        await existingWindow.setFocus()
      } catch (error) {
        logger.warn('existing detached window focus failed', { error, label })
      }
      return
    }

    const detachedWindow = new WebviewWindow(label, {
      url: path,
      title,
      width,
      height,
      center: true,
      resizable: false,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
    })

    detachedWindow.once('tauri://created', async () => {
      try {
        await detachedWindow.show()
        await detachedWindow.setFocus()
      } catch (error) {
        logger.warn('detached window show/focus failed', { error, label })
      }
    })
    detachedWindow.once('tauri://error', (error) => {
      logger.warn('detached window creation failed', { error, label })
    })
  } catch (error) {
    logger.warn('openDetachedWindow failed', { error, label })
  }
}

export async function closeCurrentWindowIfDetached(): Promise<boolean> {
  if (!isTauriRuntime()) return false
  try {
    const currentWindow = getCurrentWindow()
    if (currentWindow.label !== 'main') {
      await currentWindow.close()
      return true
    }
  } catch (error) {
    logger.warn('closeCurrentWindowIfDetached failed', { error })
  }
  return false
}
