import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type PanelProps = HTMLAttributes<HTMLDivElement> & {
  tone?: 'glass' | 'muted'
}

export function Panel({ className, tone = 'glass', ...props }: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-2xl',
        tone === 'glass'
          ? 'panel-glass border border-border/60'
          : 'bg-card/60 border border-border/50',
        className,
      )}
      {...props}
    />
  )
}
