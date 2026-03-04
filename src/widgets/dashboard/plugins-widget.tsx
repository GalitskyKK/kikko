import { Puzzle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePluginStore } from '@/stores/plugin-store'
import { WidgetShell } from '@/widgets/dashboard/widget-shell'

export function PluginsWidget() {
  const plugins = usePluginStore((state) => state.plugins)
  const togglePlugin = usePluginStore((state) => state.togglePlugin)

  return (
    <WidgetShell title="Plugins" subtitle="Built-in extension runtime">
      <div className="space-y-1.5">
        {plugins.map((plugin) => (
          <article key={plugin.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">{plugin.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                v{plugin.version} - {plugin.commandsCount} commands, {plugin.widgetsCount} widgets
              </p>
            </div>
            <Button
              size="sm"
              variant={plugin.enabled ? 'muted' : 'ghost'}
              className="h-7 px-2 text-[11px]"
              onClick={() => togglePlugin(plugin.id)}
            >
              <Puzzle className="h-3.5 w-3.5" aria-hidden />
              <span className="ml-1">{plugin.enabled ? 'Enabled' : 'Disabled'}</span>
            </Button>
          </article>
        ))}
      </div>
    </WidgetShell>
  )
}
