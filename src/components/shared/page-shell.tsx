import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { IconButton } from '@/components/ui/icon-button'
import { closeCurrentWindowIfDetached } from '@/lib/window-navigation'

interface PageShellProps {
  title: string
  subtitle?: string
  children: ReactNode
}

export function PageShell({ title, subtitle, children }: PageShellProps) {
  const navigate = useNavigate()

  return (
    <div className="flex h-full min-h-dvh w-full flex-col">
      <header className="glass-header flex shrink-0 items-center gap-3 px-4 py-3">
        <IconButton
          aria-label="Back"
          onClick={() => {
            void closeCurrentWindowIfDetached().then((closedDetachedWindow) => {
              if (!closedDetachedWindow) {
                navigate('/')
              }
            })
          }}
          size="md"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </IconButton>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </header>
      <main className="flex flex-1 min-h-0 flex-col p-4">{children}</main>
    </div>
  )
}
