import { Fragment } from 'react'
import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type KbdProps = HTMLAttributes<HTMLElement>

export function Kbd({ className, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

/** Рендерит строку шортката (например "Super+Shift+K") как ряд клавиш. */
export function ShortcutKeys({
  shortcut,
  className,
}: {
  shortcut: string
  className?: string
}) {
  const trimmed = shortcut.trim()
  if (!trimmed) return null
  const parts = trimmed.split('+').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return null
  return (
    <span
      className={cn('inline-flex flex-wrap items-center gap-1', className)}
      aria-label={shortcut}
    >
      {parts.map((part, i) => (
        <Fragment key={`${i}-${part}`}>
          {i > 0 && (
            <span className="text-muted-foreground/70 text-[10px] font-medium" aria-hidden>
              +
            </span>
          )}
          <Kbd>{part}</Kbd>
        </Fragment>
      ))}
    </span>
  )
}
