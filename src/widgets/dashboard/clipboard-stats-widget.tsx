import { useMemo, type ComponentType } from 'react'
import { ClipboardList, Files, Image, Pin, Star } from 'lucide-react'
import { useClipboardStore } from '@/stores/clipboard-store'
import { WidgetShell } from '@/widgets/dashboard/widget-shell'

export function ClipboardStatsWidget() {
  const entries = useClipboardStore((state) => state.entries)

  const stats = useMemo(() => {
    const imageCount = entries.filter((entry) => entry.contentType === 'image').length
    const fileCount = entries.filter((entry) => entry.contentType === 'file').length
    const pinnedCount = entries.filter((entry) => entry.isPinned).length
    const favoriteCount = entries.filter((entry) => entry.isFavorite).length
    return { imageCount, fileCount, pinnedCount, favoriteCount }
  }, [entries])

  return (
    <WidgetShell title="Clipboard Stats" subtitle="Live clipboard overview">
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
        <StatCard icon={ClipboardList} label="Items" value={entries.length} />
        <StatCard icon={Image} label="Images" value={stats.imageCount} />
        <StatCard icon={Files} label="Files" value={stats.fileCount} />
        <StatCard icon={Pin} label="Pinned" value={stats.pinnedCount} />
        <StatCard icon={Star} label="Favorites" value={stats.favoriteCount} />
      </div>
    </WidgetShell>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <article className="rounded-xl border border-border/60 bg-muted/30 p-2">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span>{label}</span>
      </div>
      <p className="text-base font-semibold text-foreground">{value}</p>
    </article>
  )
}
