import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface WidgetShellProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function WidgetShell({ title, subtitle, actions, children, className }: WidgetShellProps) {
  return (
    <section className={cn('panel-glass flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 p-3', className)}>
      <header className="widget-shell-header mb-2 flex shrink-0 cursor-move items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  )
}
