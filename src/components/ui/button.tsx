import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-transparent text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [aria-pressed=true]:ring-1 [aria-pressed=true]:ring-ring/80 [aria-pressed=true]:border-ring/60',
  {
    variants: {
      variant: {
        ghost: 'text-foreground/90 hover:border-ring/60 hover:bg-accent hover:text-accent-foreground active:scale-[0.99] active:border-ring/70',
        muted: 'bg-muted/55 text-foreground hover:border-ring/60 hover:bg-muted active:scale-[0.99] active:border-ring/70',
        primary: 'bg-primary text-primary-foreground hover:opacity-90',
        danger: 'bg-destructive text-destructive-foreground hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-9 px-4',
        lg: 'h-10 px-4',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'md',
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button type="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
