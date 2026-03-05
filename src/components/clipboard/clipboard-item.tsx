// import { Pin, Star, Trash2 } from 'lucide-react'
// import { IconButton } from '@/components/ui/icon-button'
import { ClipboardPreview } from '@/components/clipboard/clipboard-preview'
import type { ClipboardEntry } from '@/stores/clipboard-store'
import { cn } from '@/utils/cn'

interface ClipboardItemProps {
  optionId: string
  entry: ClipboardEntry
  selected: boolean
  onSelect: () => void
  onToggleFavorite: () => void
  onTogglePinned: () => void
  onDelete: () => void
}

export function ClipboardItem({
  optionId,
  entry,
  selected,
  onSelect,
  // onToggleFavorite,
  // onTogglePinned,
  // onDelete,
}: ClipboardItemProps) {
  return (
    <div
      id={optionId}
      role="option"
      aria-selected={selected}
      className={cn(
        'group flex min-h-[58px] cursor-pointer items-center gap-3 rounded-xl border px-2.5 py-2 text-sm transition-colors',
        selected
          ? 'border-ring/60 bg-accent text-accent-foreground shadow-[0_0_0_1px_hsl(var(--ring)/0.35)]'
          : 'border-transparent text-foreground hover:bg-accent/70',
      )}
      onMouseDown={(event) => {
        // Не даём инпуту потерять фокус при клике — как в Raycast.
        event.preventDefault()
        onSelect()
      }}
    >
      <ClipboardPreview entry={entry} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.preview || entry.content.slice(0, 100)}</p>
        <p className="truncate text-xs text-muted-foreground">
          {entry.appSource ?? 'Clipboard'}
          {entry.charCount > 0 ? ` • ${entry.charCount} chars` : ''}
        </p>
      </div>
      {/* <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        <IconButton
          size="sm"
          aria-label={entry.isPinned ? 'Unpin entry' : 'Pin entry'}
          onClick={(event) => {
            event.stopPropagation()
            onTogglePinned()
          }}
          className={entry.isPinned ? 'text-[hsl(var(--warning))] hover:text-[hsl(var(--warning))]' : ''}
        >
          <Pin className="h-3.5 w-3.5" aria-hidden />
        </IconButton>
        <IconButton
          size="sm"
          aria-label={entry.isFavorite ? 'Remove favorite' : 'Add favorite'}
          onClick={(event) => {
            event.stopPropagation()
            onToggleFavorite()
          }}
          className={entry.isFavorite ? 'text-[hsl(var(--warning))] hover:text-[hsl(var(--warning))]' : ''}
        >
          <Star className="h-3.5 w-3.5" aria-hidden />
        </IconButton>
        <IconButton
          size="sm"
          aria-label="Delete entry"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </IconButton>
      </div> */}
    </div>
  )
}
