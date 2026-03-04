import { Component, type ErrorInfo, type ReactNode } from 'react'
import { STRINGS } from '@/lib/strings'
import { logger } from '@/utils/logger'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/** Глобальный перехватчик ошибок React. Приложение не должно показывать белый экран */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('React ErrorBoundary caught error', {
      error: error.message,
      stack: error.stack ?? 'no stack',
      componentStack: errorInfo.componentStack ?? 'no component stack',
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-foreground">
            <div className="text-4xl">亀甲</div>
            <h1 className="text-lg font-medium">{STRINGS.errors.somethingWentWrong}</h1>
            <p className="max-w-md text-center text-sm text-muted-foreground">
              {this.state.error?.message ?? STRINGS.errors.unexpected}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {STRINGS.errors.tryAgain}
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
