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
