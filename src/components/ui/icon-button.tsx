import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'sm' | 'md' | 'lg'
}

const sizeClass: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
}

export function IconButton({ className, size = 'md', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none disabled:opacity-50',
        sizeClass[size],
        className,
      )}
      {...props}
    />
  )
}
