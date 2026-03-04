import { useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDashboardStore } from '@/stores/dashboard-store'
import { WidgetShell } from '@/widgets/dashboard/widget-shell'

export function QuickNotesWidget() {
  const quickNoteText = useDashboardStore((state) => state.quickNoteText)
  const setQuickNoteText = useDashboardStore((state) => state.setQuickNoteText)

  const handleClear = useCallback(() => setQuickNoteText(''), [setQuickNoteText])

  return (
    <WidgetShell
      title="Quick Notes"
      subtitle="Persistent scratchpad"
      actions={
        <Button
          aria-label="Clear quick notes"
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={handleClear}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      }
    >
      <label className="sr-only" htmlFor="quick-notes-area">
        Quick notes text
      </label>
      <textarea
        id="quick-notes-area"
        value={quickNoteText}
        onChange={(event) => setQuickNoteText(event.target.value)}
        placeholder="Write notes, todos, or temporary snippets..."
        className="h-full min-h-[130px] w-full resize-none rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-sm text-foreground outline-none ring-ring/60 placeholder:text-muted-foreground focus:ring-2"
      />
    </WidgetShell>
  )
}
