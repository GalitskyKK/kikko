import { useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ClipboardEntry } from '@/stores/clipboard-store'
import { ClipboardItem } from '@/components/clipboard/clipboard-item'

interface ClipboardListProps {
  entries: ClipboardEntry[]
  selectedId: string | null
  scrollToSelectedSignal?: number
  onSelect: (entry: ClipboardEntry) => void
  onToggleFavorite: (entryId: string) => void
  onTogglePinned: (entryId: string) => void
  onDelete: (entryId: string) => void
}

export function ClipboardList({
  entries,
  selectedId,
  scrollToSelectedSignal = 0,
  onSelect,
  onToggleFavorite,
  onTogglePinned,
  onDelete,
}: ClipboardListProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const items = useMemo(() => entries, [entries])
  const itemsRef = useRef(items)
  const activeDescendant = selectedId ? `clipboard-option-${selectedId}` : undefined

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  })

  useEffect(() => {
    if (!selectedId) return
    const selectedIndex = itemsRef.current.findIndex((entry) => entry.id === selectedId)
    if (selectedIndex < 0) return
    rowVirtualizer.scrollToIndex(selectedIndex, { align: 'auto' })
  }, [rowVirtualizer, scrollToSelectedSignal, selectedId])

  return (
    <div
      ref={parentRef}
      role="listbox"
      aria-label="Clipboard history"
      aria-activedescendant={activeDescendant}
      className="h-full min-h-0 overflow-y-auto"
    >
      <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const entry = items[virtualRow.index]
          if (!entry) return null

          return (
            <div
              key={entry.id}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <ClipboardItem
                optionId={`clipboard-option-${entry.id}`}
                entry={entry}
                selected={selectedId === entry.id}
                onSelect={() => onSelect(entry)}
                onToggleFavorite={() => onToggleFavorite(entry.id)}
                onTogglePinned={() => onTogglePinned(entry.id)}
                onDelete={() => onDelete(entry.id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
