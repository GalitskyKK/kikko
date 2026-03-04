import { useMemo } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import { useClipboardStore } from '@/stores/clipboard-store'
import { WidgetShell } from '@/widgets/dashboard/widget-shell'

export function FavoritesWidget() {
  const entries = useClipboardStore((state) => state.entries)

  const list = useMemo(
    () => entries.filter((entry) => entry.isFavorite || entry.isPinned).slice(0, 6),
    [entries],
  )

  return (
    <WidgetShell title="Pinned & Favorites" subtitle="Fast access entries">
      <div className="space-y-1.5">
        {list.length === 0 && <p className="text-xs text-muted-foreground">No pinned or favorite entries yet.</p>}
        {list.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
            <p className="truncate text-xs font-medium text-foreground">{entry.preview || entry.content}</p>
            <p className="text-[10px] text-muted-foreground">
              {formatDistanceToNowStrict(new Date(entry.createdAt), { addSuffix: true })}
            </p>
          </article>
        ))}
      </div>
    </WidgetShell>
  )
}
