import { useMemo } from 'react'
import { useSnippetStore } from '@/stores/snippet-store'
import { WidgetShell } from '@/widgets/dashboard/widget-shell'

export function SnippetsWidget() {
  const snippets = useSnippetStore((state) => state.snippets)

  const topSnippets = useMemo(
    () => [...snippets].sort((left, right) => right.useCount - left.useCount).slice(0, 6),
    [snippets],
  )

  return (
    <WidgetShell title="Snippets" subtitle="Most used shortcuts">
      <div className="space-y-1.5">
        {topSnippets.length === 0 && <p className="text-xs text-muted-foreground">No snippets found.</p>}
        {topSnippets.map((snippet) => (
          <article key={snippet.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">{snippet.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{snippet.keyword}</p>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">{snippet.useCount} uses</span>
          </article>
        ))}
      </div>
    </WidgetShell>
  )
}
