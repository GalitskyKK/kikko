/**
 * Иконки палитры в стиле Raycast / iOS: иконка в цветном скруглённом квадрате.
 * Приложения/файлы с path отображаются нативными иконками в том же контейнере.
 */
import type React from 'react'
import type { IconProps } from '@phosphor-icons/react'
import {
  Clipboard,
  Calculator,
  FileText,
  Gear,
  SquaresFour,
  Link,
  Lightning,
  Smiley,
  PuzzlePiece,
  AppWindow,
} from '@phosphor-icons/react'
import { cn } from '@/utils/cn'

const PALETTE_ICON_SIZE = 'h-5 w-5'
const PALETTE_ICON_SIZE_SM = 'h-4 w-4'

export const PALETTE_ICON_WEIGHT = 'fill' as const

export type PaletteIconType =
  | 'app'
  | 'file'
  | 'clipboard'
  | 'snippet'
  | 'calculator'
  | 'plugin'
  | 'command'
  | 'preferences'
  | 'emoji'
  | 'quicklinks'
  | 'settings'
  | 'dashboard'
  | 'uuid'

const ICON_BY_TYPE: Record<PaletteIconType, React.ComponentType<IconProps>> = {
  app: AppWindow,
  file: FileText,
  clipboard: Clipboard,
  snippet: FileText,
  calculator: Calculator,
  plugin: PuzzlePiece,
  command: Lightning,
  preferences: Gear,
  emoji: Smiley,
  quicklinks: Link,
  settings: Gear,
  dashboard: SquaresFour,
  uuid: FileText,
}

const TONE_BY_TYPE: Record<PaletteIconType, string> = {
  app: 'text-muted-foreground',
  file: 'text-muted-foreground',
  clipboard: 'text-sky-500 dark:text-sky-400',
  snippet: 'text-emerald-500 dark:text-emerald-400',
  calculator: 'text-rose-500 dark:text-rose-400',
  plugin: 'text-violet-500 dark:text-violet-400',
  command: 'text-amber-500 dark:text-amber-400',
  preferences: 'text-violet-500 dark:text-violet-400',
  emoji: 'text-amber-500 dark:text-amber-400',
  quicklinks: 'text-blue-500 dark:text-blue-400',
  settings: 'text-violet-500 dark:text-violet-400',
  dashboard: 'text-amber-500 dark:text-amber-400',
  uuid: 'text-violet-500 dark:text-violet-400',
}

/** Фон бейджа по типу (как в Raycast / iOS: цветной квадрат) */
const BADGE_BG_BY_TYPE: Record<PaletteIconType, string> = {
  app: 'bg-neutral-400 dark:bg-neutral-500',
  file: 'bg-neutral-400 dark:bg-neutral-500',
  clipboard: 'bg-sky-500 dark:bg-sky-500',
  snippet: 'bg-emerald-500 dark:bg-emerald-500',
  calculator: 'bg-rose-500 dark:bg-rose-500',
  plugin: 'bg-violet-500 dark:bg-violet-500',
  command: 'bg-amber-500 dark:bg-amber-500',
  preferences: 'bg-violet-500 dark:bg-violet-500',
  emoji: 'bg-amber-500 dark:bg-amber-500',
  quicklinks: 'bg-blue-500 dark:bg-blue-500',
  settings: 'bg-violet-500 dark:bg-violet-500',
  dashboard: 'bg-amber-500 dark:bg-amber-500',
  uuid: 'bg-violet-500 dark:bg-violet-500',
}

export function getResultIconTone(type: string): string {
  const key = type as PaletteIconType
  return TONE_BY_TYPE[key] ?? 'text-muted-foreground'
}

export function getResultIcon(type: string): React.ComponentType<IconProps> {
  const key = (type === 'preferences' ? 'preferences' : type) as PaletteIconType
  return ICON_BY_TYPE[key] ?? Lightning
}

/** Фон бейджа для типа (для иконки в цветном квадрате) */
export function getIconBadgeBg(type: string): string {
  const key = (type === 'preferences' ? 'preferences' : type) as PaletteIconType
  return BADGE_BG_BY_TYPE[key] ?? 'bg-neutral-400 dark:bg-neutral-500'
}

/** Иконка в цветном скруглённом квадрате (стиль Raycast / iOS). */
export function PaletteIconBadge({
  type,
  size = 'md',
  className,
  children,
}: {
  type: string
  size?: 'sm' | 'md'
  className?: string
  /** Если передан (напр. img нативной иконки), рисуется он внутри бейджа; фон бейджа — нейтральный */
  children?: React.ReactNode
}) {
  const bg = children
    ? 'bg-neutral-200 dark:bg-neutral-700'
    : getIconBadgeBg(type)
  const sizeClass = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <span
      className={cn(
        'palette-icon-badge flex shrink-0 items-center justify-center overflow-hidden rounded-[10px]',
        sizeClass,
        bg,
        className,
      )}
      aria-hidden
    >
      {children ?? (
        (() => {
          const Icon = getResultIcon(type)
          return (
            <Icon
              weight={PALETTE_ICON_WEIGHT}
              className={cn(iconSize, 'text-white')}
            />
          )
        })()
      )}
    </span>
  )
}

/** Иконка для результата поиска (без нативного пути). */
export function PaletteResultIcon({
  type,
  className = cn(PALETTE_ICON_SIZE, 'shrink-0'),
}: {
  type: string
  className?: string
}) {
  const Icon = getResultIcon(type)
  const tone = getResultIconTone(type)
  return <Icon weight={PALETTE_ICON_WEIGHT} className={cn(tone, className)} aria-hidden />
}

/** Иконка для пункта suggestions (малый размер). */
export function PaletteSuggestionIcon({
  type,
  className,
}: {
  type: PaletteIconType
  className?: string
}) {
  const Icon = ICON_BY_TYPE[type]
  const tone = TONE_BY_TYPE[type]
  return (
    <Icon
      weight={PALETTE_ICON_WEIGHT}
      className={cn(PALETTE_ICON_SIZE_SM, 'shrink-0', tone, className)}
      aria-hidden
    />
  )
}

export function getSuggestionIconMeta(
  id: string,
  section?: string,
): { type: PaletteIconType; tone: string } {
  const tone = (t: PaletteIconType) => ({ type: t, tone: TONE_BY_TYPE[t] })
  if (id === 'quick-clipboard' || id === 'start-clipboard') return tone('clipboard')
  if (id === 'quick-calc') return tone('calculator')
  if (id.startsWith('quick-snippets') || id.startsWith('start-snippets')) return tone('snippet')
  if (id === 'quick-dashboard' || id === 'start-dashboard') return tone('dashboard')
  if (id === 'quick-settings' || id === 'start-settings') return tone('settings')
  if (id === 'plugin-emoji-picker') return tone('emoji')
  if (id === 'plugin-quicklinks-search' || id === 'plugin-quicklinks-create' || id === 'start-quicklinks') return tone('quicklinks')
  if (id === 'plugin-uuid-generate') return tone('uuid')
  if (section === 'application') return tone('app')
  if (section === 'command') return tone('command')
  if (section === 'file') return tone('file')
  if (section === 'plugin') return tone('quicklinks')
  if (section === 'clipboard') return tone('clipboard')
  if (section === 'snippet') return tone('snippet')
  return tone('plugin')
}

export function getSuggestionIconComponent(
  id: string,
  section?: string,
): React.ComponentType<IconProps> {
  const { type } = getSuggestionIconMeta(id, section)
  return ICON_BY_TYPE[type]
}

export function getSuggestionIconClassName(id: string, section?: string): string {
  const { tone } = getSuggestionIconMeta(id, section)
  return cn(PALETTE_ICON_SIZE_SM, 'shrink-0', tone)
}

/** Фон бейджа для пункта suggestion по id/section */
export function getSuggestionBadgeBg(id: string, section?: string): string {
  const { type } = getSuggestionIconMeta(id, section)
  return BADGE_BG_BY_TYPE[type]
}
