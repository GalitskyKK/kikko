import { Check, Keyboard, Monitor, Moon, Palette, Pencil, Plug, Plus, Sun, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { useTheme } from 'next-themes'
import { PageShell } from '@/components/shared/page-shell'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { isTauriRuntime } from '@/lib/tauri'
import { useInstalledAppsStore } from '@/stores/installed-apps-store'
import { usePluginStore } from '@/stores/plugin-store'
import { useSnippetStore } from '@/stores/snippet-store'
import { useSettingsStore, type AccentPreset, type UiDensity } from '@/stores/settings-store'

/** Страница настроек */
export function SettingsPage() {
  const { setTheme, resolvedTheme } = useTheme()
  const {
    general,
    appearance,
    clipboard,
    hotkeys,
    extensions,
    aliases,
    updateGeneral,
    updateAppearance,
    updateClipboard,
    updateExtensions,
    updateHotkeys,
    upsertAlias,
    removeAlias,
  } = useSettingsStore()
  const apps = useInstalledAppsStore((state) => state.apps)
  const loadApps = useInstalledAppsStore((state) => state.loadApps)
  const snippets = useSnippetStore((state) => state.snippets)
  const loadSnippets = useSnippetStore((state) => state.loadFromBackend)
  const createSnippet = useSnippetStore((state) => state.createSnippet)
  const updateSnippet = useSnippetStore((state) => state.updateSnippet)
  const deleteSnippet = useSnippetStore((state) => state.deleteSnippet)
  const plugins = usePluginStore((state) => state.plugins)
  const [snippetEditorId, setSnippetEditorId] = useState<string | null>(null)
  const [snippetName, setSnippetName] = useState('')
  const [snippetKeyword, setSnippetKeyword] = useState('')
  const [snippetContent, setSnippetContent] = useState('')
  const [snippetCategory, setSnippetCategory] = useState('general')
  const [snippetError, setSnippetError] = useState('')
  const [aliasTargetId, setAliasTargetId] = useState('')
  const [aliasValue, setAliasValue] = useState('')
  const [aliasError, setAliasError] = useState('')
  const snippetNameInputRef = useRef<HTMLInputElement>(null)

  const runtimePlugins = usePluginStore((state) => state.runtimePlugins)
  const runtimeErrors = usePluginStore((state) => state.runtimeErrors)
  const runtimeLoading = usePluginStore((state) => state.isLoadingRuntime)
  const togglePlugin = usePluginStore((state) => state.togglePlugin)
  const loadRuntimePlugins = usePluginStore((state) => state.loadRuntimePlugins)

  useEffect(() => {
    setTheme(appearance.themeMode)
  }, [appearance.themeMode, setTheme])

  useEffect(() => {
    if (!isTauriRuntime()) return
    void loadRuntimePlugins()
  }, [loadRuntimePlugins])

  useEffect(() => {
    if (!isTauriRuntime()) return
    void loadApps()
    void loadSnippets()
  }, [loadApps, loadSnippets])

  useEffect(() => {
    if (!isTauriRuntime()) return
    void import('@tauri-apps/plugin-autostart').then(async (autostart) => {
      try {
        const enabled = await autostart.isEnabled()
        if (general.launchOnStartup && !enabled) {
          await autostart.enable()
        } else if (!general.launchOnStartup && enabled) {
          await autostart.disable()
        }
      } catch {
        // no-op: keep settings UI responsive even if autostart API is unavailable
      }
    })
  }, [general.launchOnStartup])

  const aliasTargets = useMemo(() => {
    const commandTargets = [
      { id: 'cmd-lock', title: 'Lock Screen', type: 'command' as const },
      { id: 'cmd-sleep', title: 'Sleep', type: 'command' as const },
      { id: 'cmd-trash', title: 'Empty Trash', type: 'command' as const },
    ]
    const appTargets = apps.map((app) => ({ id: app.id, title: app.name, type: 'app' as const }))
    const snippetTargets = snippets.map((snippet) => ({ id: snippet.id, title: snippet.name, type: 'snippet' as const }))
    return [...commandTargets, ...appTargets, ...snippetTargets].sort((left, right) => left.title.localeCompare(right.title))
  }, [apps, snippets])

  const hotkeysNormalized = useMemo(
    () => [hotkeys.openPalette, hotkeys.openDashboard, hotkeys.openSettings].map((value) => value.trim().toLowerCase()),
    [hotkeys.openDashboard, hotkeys.openPalette, hotkeys.openSettings],
  )

  const handleSnippetEdit = (id: string) => {
    const snippet = snippets.find((item) => item.id === id)
    if (!snippet) return
    setSnippetEditorId(snippet.id)
    setSnippetName(snippet.name)
    setSnippetKeyword(snippet.keyword)
    setSnippetContent(snippet.content)
    setSnippetCategory(snippet.category || 'general')
    setSnippetError('')
  }

  const resetSnippetForm = () => {
    setSnippetEditorId(null)
    setSnippetName('')
    setSnippetKeyword('')
    setSnippetContent('')
    setSnippetCategory('general')
    setSnippetError('')
  }

  const handleSnippetSave = async () => {
    const name = snippetName.trim()
    const keyword = snippetKeyword.trim().toLowerCase()
    const content = snippetContent
    if (!name || !keyword || !content.trim()) {
      setSnippetError('Name, keyword and content are required.')
      return
    }
    const hasKeywordConflict = snippets.some((snippet) => snippet.keyword === keyword && snippet.id !== snippetEditorId)
    if (hasKeywordConflict) {
      setSnippetError(`Keyword "${keyword}" already exists.`)
      return
    }
    const payload = { name, keyword, content, category: snippetCategory.trim() || 'general' }
    const saved = snippetEditorId
      ? await updateSnippet({ id: snippetEditorId, ...payload })
      : await createSnippet(payload)
    if (!saved) {
      setSnippetError('Failed to save snippet.')
      return
    }
    if (isTauriRuntime()) {
      void import('@tauri-apps/api/event').then(({ emit }) => {
        void emit('kikko:snippets-updated')
      })
    }
    resetSnippetForm()
  }

  const handleSnippetDelete = async (id: string) => {
    await deleteSnippet(id)
    if (isTauriRuntime()) {
      void import('@tauri-apps/api/event').then(({ emit }) => {
        void emit('kikko:snippets-updated')
      })
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const fromPalette = window.localStorage.getItem('kikko:settings:focus-section')
    if (fromPalette !== 'snippets') return
    window.localStorage.removeItem('kikko:settings:focus-section')
    setSnippetEditorId(null)
    setSnippetName('')
    setSnippetKeyword('')
    setSnippetContent('')
    setSnippetCategory('general')
    setSnippetError('')
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-settings-section="snippets"]')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      snippetNameInputRef.current?.focus()
    })
  }, [])

  const handleAliasSave = () => {
    const aliasNormalized = aliasValue.trim().toLowerCase()
    if (!aliasTargetId || !aliasNormalized) {
      setAliasError('Select target and enter alias.')
      return
    }
    if (hotkeysNormalized.includes(aliasNormalized)) {
      setAliasError(`Alias "${aliasNormalized}" conflicts with a hotkey.`)
      return
    }
    if (aliases.some((rule) => rule.alias === aliasNormalized)) {
      setAliasError(`Alias "${aliasNormalized}" already exists.`)
      return
    }
    const target = aliasTargets.find((item) => item.id === aliasTargetId)
    if (!target) {
      setAliasError('Target not found.')
      return
    }
    upsertAlias({
      id: crypto.randomUUID(),
      alias: aliasNormalized,
      targetId: target.id,
      targetTitle: target.title,
      targetType: target.type,
    })
    setAliasError('')
    setAliasValue('')
  }

  return (
    <PageShell title="Settings" subtitle="Theme and behavior">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto pb-2">
        <Panel className="space-y-4 p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">General</h2>
            <p className="text-xs text-muted-foreground">Core behavior and launch options.</p>
          </div>
          <SettingsToggleRow
            label="Launch on startup"
            description="Open Kikko when system starts."
            checked={general.launchOnStartup}
            onChange={(value) => updateGeneral({ launchOnStartup: value })}
          />
          <SettingsToggleRow
            label="Close on Escape"
            description="Hide window immediately when pressing Escape."
            checked={general.closeOnEscape}
            onChange={(value) => updateGeneral({ closeOnEscape: value })}
          />
          <SettingsToggleRow
            label="Show start suggestions"
            description="Display suggestion list immediately on open instead of search-only view."
            checked={general.showStartSuggestions}
            onChange={(value) => updateGeneral({ showStartSuggestions: value })}
          />
        </Panel>

        <Panel className="space-y-4 p-4" data-settings-section="snippets">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
            <p className="text-xs text-muted-foreground">Theme, density and visual behavior.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeButton
              active={appearance.themeMode === 'system'}
              onClick={() => updateAppearance({ themeMode: 'system' })}
              icon={Monitor}
              label="System"
            />
            <ThemeButton
              active={appearance.themeMode === 'dark'}
              onClick={() => updateAppearance({ themeMode: 'dark' })}
              icon={Moon}
              label="Dark"
            />
            <ThemeButton
              active={appearance.themeMode === 'light'}
              onClick={() => updateAppearance({ themeMode: 'light' })}
              icon={Sun}
              label="Light"
            />
          </div>
          <p className="text-xs text-muted-foreground">Resolved theme: {resolvedTheme ?? appearance.themeMode}</p>

          <SettingsChoiceRow<UiDensity>
            label="UI density"
            value={appearance.uiDensity}
            options={[
              { id: 'comfortable', label: 'Comfortable' },
              { id: 'compact', label: 'Compact' },
            ]}
            onChange={(value) => updateAppearance({ uiDensity: value })}
          />

          <SettingsToggleRow
            label="Reduce motion"
            description="Lower transitions and animation effects."
            checked={appearance.reduceMotion}
            onChange={(value) => updateAppearance({ reduceMotion: value })}
          />

          <SettingsToggleRow
            label="Show app icons"
            description="Display source app icon where available."
            checked={appearance.showAppIcons}
            onChange={(value) => updateAppearance({ showAppIcons: value })}
          />

          <SettingsChoiceRow<AccentPreset>
            label="Accent color"
            value={appearance.accentPreset}
            options={[
              { id: 'default', label: 'Default' },
              { id: 'blue', label: 'Blue' },
              { id: 'violet', label: 'Violet' },
              { id: 'emerald', label: 'Emerald' },
              { id: 'rose', label: 'Rose' },
            ]}
            onChange={(value) => updateAppearance({ accentPreset: value })}
          />
        </Panel>

        <Panel className="space-y-4 p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Clipboard</h2>
            <p className="text-xs text-muted-foreground">History limits and capture behavior.</p>
          </div>

          <SettingsNumberRow
            label="Retention days"
            description="Automatically remove entries older than this."
            value={clipboard.retentionDays}
            min={1}
            max={365}
            onChange={(value) => updateClipboard({ retentionDays: value })}
          />

          <SettingsNumberRow
            label="Max items"
            description="Hard limit for clipboard history size."
            value={clipboard.maxItems}
            min={50}
            max={5000}
            onChange={(value) => updateClipboard({ maxItems: value })}
          />

          <SettingsToggleRow
            label="Capture images"
            description="Save image copies to clipboard history."
            checked={clipboard.captureImages}
            onChange={(value) => updateClipboard({ captureImages: value })}
          />

          <SettingsToggleRow
            label="Capture files"
            description="Save copied file lists in clipboard history."
            checked={clipboard.captureFiles}
            onChange={(value) => updateClipboard({ captureFiles: value })}
          />
        </Panel>

        <Panel className="space-y-4 p-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Keyboard className="h-4 w-4 text-muted-foreground" aria-hidden />
              Shortcuts
            </h2>
            <p className="text-xs text-muted-foreground">Current global shortcuts (editable labels + runtime roadmap).</p>
          </div>
          <SettingsTextRow
            label="Open palette"
            description="Primary launcher shortcut."
            value={hotkeys.openPalette}
            onChange={(value) => updateHotkeys({ openPalette: value })}
          />
          <SettingsTextRow
            label="Open dashboard"
            description="Quick dashboard shortcut."
            value={hotkeys.openDashboard}
            onChange={(value) => updateHotkeys({ openDashboard: value })}
          />
          <SettingsTextRow
            label="Open settings"
            description="Open settings shortcut."
            value={hotkeys.openSettings}
            onChange={(value) => updateHotkeys({ openSettings: value })}
          />
          <p className="text-[11px] text-muted-foreground">
            Runtime rebinding for global shortcuts will be wired in the plugin-loader iteration.
          </p>
        </Panel>

        <Panel className="space-y-4 p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Extensions (local)</h2>
            <p className="text-xs text-muted-foreground">Enable or disable built-in modules.</p>
          </div>
          <SettingsToggleRow
            label="Clipboard"
            description="Clipboard history and actions."
            checked={extensions.clipboard}
            onChange={(value) => updateExtensions({ clipboard: value })}
          />
          <SettingsToggleRow
            label="Snippets"
            description="Snippet search and insertion."
            checked={extensions.snippets}
            onChange={(value) => updateExtensions({ snippets: value })}
          />
          <SettingsToggleRow
            label="Calculator"
            description="Inline calculations in search."
            checked={extensions.calculator}
            onChange={(value) => updateExtensions({ calculator: value })}
          />
          <SettingsToggleRow
            label="Dashboard"
            description="Dashboard route and widgets."
            checked={extensions.dashboard}
            onChange={(value) => updateExtensions({ dashboard: value })}
          />
        </Panel>

        <Panel className="space-y-4 p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Snippets</h2>
            <p className="text-xs text-muted-foreground">Create, update and remove text snippets.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <input
              ref={snippetNameInputRef}
              type="text"
              value={snippetName}
              onChange={(event) => setSnippetName(event.target.value)}
              placeholder="Snippet name"
              className="h-9 rounded-md border border-border/70 bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            />
            <input
              type="text"
              value={snippetKeyword}
              onChange={(event) => setSnippetKeyword(event.target.value)}
              placeholder="Keyword (e.g. !email)"
              className="h-9 rounded-md border border-border/70 bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            />
          </div>
          <input
            type="text"
            value={snippetCategory}
            onChange={(event) => setSnippetCategory(event.target.value)}
            placeholder="Category"
            className="h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          />
          <textarea
            value={snippetContent}
            onChange={(event) => setSnippetContent(event.target.value)}
            placeholder="Snippet content"
            className="min-h-24 w-full rounded-md border border-border/70 bg-background px-2 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          />
          {snippetError && <p className="text-xs text-destructive">{snippetError}</p>}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="muted" onClick={() => void handleSnippetSave()} className="gap-2">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {snippetEditorId ? 'Update snippet' : 'Create snippet'}
            </Button>
            {snippetEditorId && (
              <Button size="sm" variant="ghost" onClick={resetSnippetForm}>
                Cancel edit
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {snippets.length === 0 && <p className="text-xs text-muted-foreground">No snippets configured.</p>}
            {snippets.map((snippet) => (
              <div key={snippet.id} className="rounded-lg border border-border/70 bg-background/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{snippet.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{snippet.keyword}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleSnippetEdit(snippet.id)}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:bg-destructive/10" onClick={() => void handleSnippetDelete(snippet.id)}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{snippet.content}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-4 p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Aliases</h2>
            <p className="text-xs text-muted-foreground">Prioritize commands/apps/snippets by custom aliases.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
            <select
              value={aliasTargetId}
              onChange={(event) => setAliasTargetId(event.target.value)}
              className="h-9 rounded-md border border-border/70 bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <option value="">Select target</option>
              {aliasTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.title} ({target.type})
                </option>
              ))}
            </select>
            <input
              type="text"
              value={aliasValue}
              onChange={(event) => setAliasValue(event.target.value)}
              placeholder="alias"
              className="h-9 rounded-md border border-border/70 bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            />
            <Button size="sm" variant="muted" onClick={handleAliasSave}>
              Save alias
            </Button>
          </div>
          {aliasError && <p className="text-xs text-destructive">{aliasError}</p>}
          <div className="space-y-2">
            {aliases.length === 0 && <p className="text-xs text-muted-foreground">No aliases configured.</p>}
            {aliases.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{rule.alias}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{rule.targetTitle} ({rule.targetType})</p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:bg-destructive/10" onClick={() => removeAlias(rule.id)}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-4 p-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Plug className="h-4 w-4 text-muted-foreground" aria-hidden />
              Plugins Runtime
            </h2>
            <p className="text-xs text-muted-foreground">Built-in plugin state + scanned manifests from ~/.kikko/plugins.</p>
          </div>
          {plugins.map((plugin) => (
            <SettingsToggleRow
              key={plugin.id}
              label={`${plugin.name} (${plugin.version})`}
              description={plugin.description}
              checked={plugin.enabled}
              onChange={() => togglePlugin(plugin.id)}
            />
          ))}
          <div className="pt-1">
            <Button variant="muted" size="sm" className="gap-2" onClick={() => void loadRuntimePlugins()}>
              <Palette className="h-4 w-4" aria-hidden />
              Reload external plugins
            </Button>
          </div>
          {runtimeLoading && <p className="text-xs text-muted-foreground">Loading external plugin manifests...</p>}
          {!runtimeLoading && runtimePlugins.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs font-medium text-foreground">Detected from filesystem</p>
              {runtimePlugins.map((plugin) => (
                <div key={plugin.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-foreground">{plugin.name}</span>
                  <span className="text-muted-foreground">{plugin.version}</span>
                </div>
              ))}
            </div>
          )}
          {!runtimeLoading && runtimeErrors.length > 0 && (
            <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-xs font-medium text-destructive">Plugin manifest errors</p>
              {runtimeErrors.map((error) => (
                <p key={`${error.path}-${error.message}`} className="text-[11px] text-destructive/90">
                  {error.path}: {error.message}
                </p>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </PageShell>
  )
}

function ThemeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <Button
      onClick={onClick}
      variant={active ? 'primary' : 'ghost'}
      size="sm"
      className={`gap-2 border transition-all ${active ? 'border-ring/70 bg-accent text-foreground shadow-sm shadow-ring/35 ring-1 ring-ring/60' : 'border-border/80 bg-background/60 text-foreground/90 hover:border-ring/70 hover:bg-accent'}`}
      aria-pressed={active}
    >
      {active && <Check className="h-4 w-4 text-ring" aria-hidden />}
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  )
}

function SettingsToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/65 bg-background/45 px-3 py-2.5 transition-colors hover:border-ring/35">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold ${checked ? 'text-emerald-500' : 'text-muted-foreground'}`}>
          {checked ? 'ON' : 'OFF'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          title={`${label}: ${checked ? 'On' : 'Off'}`}
          className={`relative inline-flex h-7 w-14 items-center rounded-full border p-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 ${
            checked
              ? 'cursor-pointer border-emerald-300/80 bg-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]'
              : 'cursor-pointer border-border/90 bg-zinc-500/75 hover:border-ring/55 hover:bg-zinc-500/90'
          }`}
        >
          <span
            className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-7' : 'translate-x-0'}`}
          />
        </button>
      </div>
    </div>
  )
}

function SettingsChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-border/65 bg-background/45 p-2">
        {options.map((option) => (
          <Button
            key={option.id}
            size="sm"
            variant={value === option.id ? 'primary' : 'ghost'}
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
            className={value === option.id ? 'border border-ring/70 bg-accent text-foreground shadow-sm shadow-ring/35 ring-1 ring-ring/60' : 'border border-border/80 bg-background/60 text-foreground/90 hover:border-ring/70 hover:bg-accent'}
          >
            {value === option.id && <Check className="mr-1 h-3.5 w-3.5 text-ring" aria-hidden />}
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

function SettingsNumberRow({
  label,
  description,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  description: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10)
          if (Number.isNaN(parsed)) return
          onChange(Math.min(Math.max(parsed, min), max))
        }}
        className="h-9 w-24 rounded-md border border-border/70 bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
      />
    </div>
  )
}

function SettingsTextRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-40 rounded-md border border-border/70 bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
      />
    </div>
  )
}
