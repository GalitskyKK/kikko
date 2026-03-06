import {
  Check,
  ClipboardList,
  Cog,
  FileText,
  Keyboard,
  Layers,
  Link,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Plug,
  Plus,
  Sun,
  Tag,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { useTheme } from 'next-themes'
import { PageShell } from '@/components/shared/page-shell'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { isTauriRuntime } from '@/lib/tauri'
import { useInstalledAppsStore } from '@/stores/installed-apps-store'
import { usePluginStore } from '@/stores/plugin-store'
import { useQuicklinkStore } from '@/stores/quicklink-store'
import { useSnippetStore } from '@/stores/snippet-store'
import { useSettingsStore, type AccentPreset, type UiDensity } from '@/stores/settings-store'
import { cn } from '@/utils/cn'

type SettingsSectionId =
  | 'general'
  | 'appearance'
  | 'clipboard'
  | 'shortcuts'
  | 'extensions'
  | 'snippets'
  | 'quicklinks'
  | 'aliases'
  | 'plugins'

const SETTINGS_SECTIONS: Array<{
  id: SettingsSectionId
  label: string
  icon: ComponentType<{ className?: string }>
}> = [
  { id: 'general', label: 'General', icon: Cog },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'clipboard', label: 'Clipboard History', icon: ClipboardList },
  { id: 'extensions', label: 'Extensions', icon: Layers },
  { id: 'snippets', label: 'Snippets', icon: FileText },
  { id: 'quicklinks', label: 'Quick Links', icon: Link },
  { id: 'aliases', label: 'Aliases', icon: Tag },
  { id: 'plugins', label: 'Plugins', icon: Plug },
]

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
  const quicklinks = useQuicklinkStore((state) => state.quicklinks)
  const loadQuicklinks = useQuicklinkStore((state) => state.loadFromBackend)
  const createQuicklink = useQuicklinkStore((state) => state.createQuicklink)
  const updateQuicklink = useQuicklinkStore((state) => state.updateQuicklink)
  const deleteQuicklink = useQuicklinkStore((state) => state.deleteQuicklink)
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
  const [quicklinkEditorId, setQuicklinkEditorId] = useState<string | null>(null)
  const [quicklinkName, setQuicklinkName] = useState('')
  const [quicklinkUrl, setQuicklinkUrl] = useState('')
  const [quicklinkTags, setQuicklinkTags] = useState('')
  const [quicklinkError, setQuicklinkError] = useState('')
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('general')
  const snippetNameInputRef = useRef<HTMLInputElement>(null)
  const quicklinkNameInputRef = useRef<HTMLInputElement>(null)

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
    void loadQuicklinks()
  }, [loadApps, loadSnippets, loadQuicklinks])

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
    const snippetTargets = snippets.map((snippet) => ({
      id: snippet.id,
      title: snippet.name,
      type: 'snippet' as const,
    }))
    return [...commandTargets, ...appTargets, ...snippetTargets].sort((left, right) =>
      left.title.localeCompare(right.title),
    )
  }, [apps, snippets])

  const hotkeysNormalized = useMemo(
    () =>
      [hotkeys.openPalette, hotkeys.openDashboard, hotkeys.openSettings].map((value) =>
        value.trim().toLowerCase(),
      ),
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
    const hasKeywordConflict = snippets.some(
      (snippet) => snippet.keyword === keyword && snippet.id !== snippetEditorId,
    )
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

  const handleQuicklinkEdit = (id: string) => {
    const q = quicklinks.find((item) => item.id === id)
    if (!q) return
    setQuicklinkEditorId(q.id)
    setQuicklinkName(q.name)
    setQuicklinkUrl(q.url)
    setQuicklinkTags(q.tags.join(', '))
    setQuicklinkError('')
  }

  const resetQuicklinkForm = () => {
    setQuicklinkEditorId(null)
    setQuicklinkName('')
    setQuicklinkUrl('')
    setQuicklinkTags('')
    setQuicklinkError('')
  }

  const handleQuicklinkSave = async () => {
    const name = quicklinkName.trim()
    const url = quicklinkUrl.trim()
    if (!name || !url) {
      setQuicklinkError('Name and URL are required.')
      return
    }
    const tags = quicklinkTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    const saved = quicklinkEditorId
      ? await updateQuicklink({ id: quicklinkEditorId, name, url, tags })
      : await createQuicklink({ name, url, tags })
    if (!saved) {
      setQuicklinkError('Failed to save. Check URL (must start with http:// or https://).')
      return
    }
    if (isTauriRuntime()) {
      void import('@tauri-apps/api/event').then(({ emit }) => {
        void emit('kikko:quicklinks-updated')
      })
    }
    resetQuicklinkForm()
  }

  const handleQuicklinkDelete = async (id: string) => {
    await deleteQuicklink(id)
    if (quicklinkEditorId === id) resetQuicklinkForm()
    if (isTauriRuntime()) {
      void import('@tauri-apps/api/event').then(({ emit }) => {
        void emit('kikko:quicklinks-updated')
      })
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const fromPalette = window.localStorage.getItem('kikko:settings:focus-section')
    window.localStorage.removeItem('kikko:settings:focus-section')
    if (fromPalette === 'snippets') {
      setActiveSection('snippets')
      setSnippetEditorId(null)
      setSnippetName('')
      setSnippetKeyword('')
      setSnippetContent('')
      setSnippetCategory('general')
      setSnippetError('')
      requestAnimationFrame(() => snippetNameInputRef.current?.focus())
      return
    }
    if (fromPalette === 'quicklinks') {
      setActiveSection('quicklinks')
      setQuicklinkEditorId(null)
      setQuicklinkName('')
      setQuicklinkUrl('')
      setQuicklinkTags('')
      setQuicklinkError('')
      requestAnimationFrame(() => quicklinkNameInputRef.current?.focus())
    }
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
    <PageShell title="Settings" subtitle="Preferences">
      <div className="flex min-h-0 flex-1 -m-4">
        <aside
          className="border-border/70 flex w-52 shrink-0 flex-col border-r bg-muted/30 py-2"
          aria-label="Settings categories"
        >
          <nav className="flex flex-col gap-0.5 px-2">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-[hsl(var(--accent))] text-accent-foreground'
                      : 'text-foreground/90 hover:bg-[hsl(var(--accent)/0.7)]',
                  )}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <Icon className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{section.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>
        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          {activeSection === 'general' && (
            <Panel className="space-y-4 p-4">
              <div>
                <h2 className="text-foreground text-sm font-semibold">General</h2>
                <p className="text-muted-foreground text-xs">Core behavior and launch options.</p>
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
                description="When on: full panel with suggestions on open. When off: compact — only search bar until you type."
                checked={general.showStartSuggestions}
                onChange={(value) => updateGeneral({ showStartSuggestions: value })}
              />
            </Panel>
          )}

          {activeSection === 'appearance' && (
            <Panel className="space-y-4 p-4">
              <div>
                <h2 className="text-foreground text-sm font-semibold">Appearance</h2>
                <p className="text-muted-foreground text-xs">Theme, density and visual behavior.</p>
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
          <p className="text-muted-foreground text-xs">
            Resolved theme: {resolvedTheme ?? appearance.themeMode}
          </p>

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
          )}

          {activeSection === 'clipboard' && (
            <Panel className="space-y-4 p-4">
              <div>
                <h2 className="text-foreground text-sm font-semibold">Clipboard</h2>
                <p className="text-muted-foreground text-xs">History limits and capture behavior.</p>
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
          )}

          {activeSection === 'shortcuts' && (
            <Panel className="space-y-4 p-4">
              <div>
                <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
                  <Keyboard className="text-muted-foreground h-4 w-4" aria-hidden />
                  Shortcuts
                </h2>
                <p className="text-muted-foreground text-xs">
                  Active shortcuts: Win+Shift+K (palette), Win+J (dashboard), Win+Shift+, (settings).
                  Custom bindings below are saved for display; applying them is planned.
                </p>
              </div>
              <SettingsShortcutRow
                label="Open palette"
                description="Primary launcher. Click Bind, then press the key combination."
                value={hotkeys.openPalette}
                onChange={(value) => updateHotkeys({ openPalette: value })}
              />
              <SettingsShortcutRow
                label="Open dashboard"
                description="Quick dashboard. Click Bind, then press the key combination."
                value={hotkeys.openDashboard}
                onChange={(value) => updateHotkeys({ openDashboard: value })}
              />
              <SettingsShortcutRow
                label="Open settings"
                description="Open settings. Click Bind, then press the key combination."
                value={hotkeys.openSettings}
                onChange={(value) => updateHotkeys({ openSettings: value })}
              />
              <p className="text-muted-foreground text-[11px]">
                Bindings are saved; only the defaults above are active until runtime rebinding is wired.
              </p>
              <div className="border-border/50 bg-muted/20 mt-3 rounded-lg border border-dashed px-3 py-2">
                <p className="text-muted-foreground text-xs">
                  <strong className="text-foreground/90">Per-app shortcuts:</strong> assign a global
                  hotkey to open a specific app or action (e.g. Super+1 for App) — planned; for now use
                  Aliases and type the keyword in the palette.
                </p>
              </div>
            </Panel>
          )}

          {activeSection === 'extensions' && (
            <Panel className="space-y-4 p-4">
              <div>
                <h2 className="text-foreground text-sm font-semibold">Extensions (local)</h2>
                <p className="text-muted-foreground text-xs">Enable or disable built-in modules.</p>
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
          )}

          {activeSection === 'snippets' && (
            <Panel className="space-y-4 p-4" data-settings-section="snippets">
              <div>
                <h2 className="text-foreground text-sm font-semibold">Snippets</h2>
                <p className="text-muted-foreground text-xs">
                  Create, update and remove text snippets.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
            <input
              ref={snippetNameInputRef}
              type="text"
              value={snippetName}
              onChange={(event) => setSnippetName(event.target.value)}
              placeholder="Snippet name"
                  className="border-border/70 bg-background text-foreground h-9 rounded-md border px-2 text-sm outline-none"
            />
            <input
              type="text"
              value={snippetKeyword}
              onChange={(event) => setSnippetKeyword(event.target.value)}
              placeholder="Keyword (e.g. !email)"
                  className="border-border/70 bg-background text-foreground h-9 rounded-md border px-2 text-sm outline-none"
            />
          </div>
          <input
            type="text"
            value={snippetCategory}
            onChange={(event) => setSnippetCategory(event.target.value)}
            placeholder="Category"
                className="border-border/70 bg-background text-foreground h-9 w-full rounded-md border px-2 text-sm outline-none"
          />
          <textarea
            value={snippetContent}
            onChange={(event) => setSnippetContent(event.target.value)}
            placeholder="Snippet content"
                className="border-border/70 bg-background text-foreground min-h-24 w-full rounded-md border px-2 py-2 text-sm outline-none"
          />
          {snippetError && <p className="text-destructive text-xs">{snippetError}</p>}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="muted"
              onClick={() => void handleSnippetSave()}
              className="gap-2"
            >
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
            {snippets.length === 0 && (
              <p className="text-muted-foreground text-xs">No snippets configured.</p>
            )}
            {snippets.map((snippet) => (
              <div
                key={snippet.id}
                className="border-border/70 bg-background/60 rounded-lg border px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-medium">{snippet.name}</p>
                    <p className="text-muted-foreground truncate text-[11px]">{snippet.keyword}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => handleSnippetEdit(snippet.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 h-7 px-2"
                      onClick={() => void handleSnippetDelete(snippet.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
                <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">{snippet.content}</p>
              </div>
            ))}
              </div>
            </Panel>
          )}

          {activeSection === 'quicklinks' && (
            <Panel className="space-y-4 p-4" data-settings-section="quicklinks">
              <div>
                <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
                  <Link className="text-muted-foreground h-4 w-4" aria-hidden />
                  Quick Links
                </h2>
                <p className="text-muted-foreground text-xs">
                  Save links and open them from the palette. Use placeholders like {'{argument}'} in URL
                  for future support.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  ref={quicklinkNameInputRef}
              type="text"
              value={quicklinkName}
              onChange={(e) => setQuicklinkName(e.target.value)}
              placeholder="Quicklink name"
                  className="border-border/70 bg-background text-foreground h-9 rounded-md border px-2 text-sm outline-none"
            />
            <input
              type="text"
              value={quicklinkUrl}
              onChange={(e) => setQuicklinkUrl(e.target.value)}
              placeholder="https://…"
                  className="border-border/70 bg-background text-foreground h-9 rounded-md border px-2 text-sm outline-none"
            />
          </div>
          <input
            type="text"
            value={quicklinkTags}
            onChange={(e) => setQuicklinkTags(e.target.value)}
            placeholder="Tags (comma-separated)"
                className="border-border/70 bg-background text-foreground h-9 w-full rounded-md border px-2 text-sm outline-none"
          />
          {quicklinkError && <p className="text-destructive text-xs">{quicklinkError}</p>}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="muted"
              onClick={() => void handleQuicklinkSave()}
              className="gap-2"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {quicklinkEditorId ? 'Update Quicklink' : 'Create Quicklink'}
            </Button>
            {quicklinkEditorId && (
              <Button size="sm" variant="ghost" onClick={resetQuicklinkForm}>
                Cancel edit
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {quicklinks.length === 0 && (
              <p className="text-muted-foreground text-xs">
                No quick links. Create one to open from the palette.
              </p>
            )}
            {quicklinks.map((q) => (
              <div
                key={q.id}
                className="border-border/70 bg-background/60 rounded-lg border px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-medium">{q.name}</p>
                    <p className="text-muted-foreground truncate text-[11px]">{q.url}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => handleQuicklinkEdit(q.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 h-7 px-2"
                      onClick={() => void handleQuicklinkDelete(q.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
                {q.tags.length > 0 && (
                  <p className="text-muted-foreground mt-2 text-xs">{q.tags.join(', ')}</p>
                )}
              </div>
            ))}
              </div>
            </Panel>
          )}

          {activeSection === 'aliases' && (
            <Panel className="space-y-4 p-4">
              <div>
                <h2 className="text-foreground text-sm font-semibold">Aliases</h2>
                <p className="text-muted-foreground text-xs">
                  Prioritize commands/apps/snippets by custom aliases.
                </p>
              </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
            <select
              value={aliasTargetId}
              onChange={(event) => setAliasTargetId(event.target.value)}
              className="border-border/70 bg-background text-foreground h-9 rounded-md border px-2 text-sm outline-none"
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
              className="border-border/70 bg-background text-foreground h-9 rounded-md border px-2 text-sm outline-none"
            />
            <Button size="sm" variant="muted" onClick={handleAliasSave}>
              Save alias
            </Button>
          </div>
          {aliasError && <p className="text-destructive text-xs">{aliasError}</p>}
          <div className="space-y-2">
            {aliases.length === 0 && (
              <p className="text-muted-foreground text-xs">No aliases configured.</p>
            )}
            {aliases.map((rule) => (
              <div
                key={rule.id}
                className="border-border/70 bg-background/60 flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-foreground truncate text-sm font-medium">{rule.alias}</p>
                  <p className="text-muted-foreground truncate text-[11px]">
                    {rule.targetTitle} ({rule.targetType})
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 h-7 px-2"
                  onClick={() => removeAlias(rule.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
            ))}
              </div>
            </Panel>
          )}

          {activeSection === 'plugins' && (
            <Panel className="space-y-4 p-4">
              <div>
                <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
                  <Plug className="text-muted-foreground h-4 w-4" aria-hidden />
                  Plugins Runtime
                </h2>
            <p className="text-muted-foreground text-xs">
              Built-in plugin state + scanned manifests from ~/.kikko/plugins.
            </p>
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
            <Button
              variant="muted"
              size="sm"
              className="gap-2"
              onClick={() => void loadRuntimePlugins()}
            >
              <Palette className="h-4 w-4" aria-hidden />
              Reload external plugins
            </Button>
          </div>
          {runtimeLoading && (
            <p className="text-muted-foreground text-xs">Loading external plugin manifests...</p>
          )}
          {!runtimeLoading && runtimePlugins.length > 0 && (
            <div className="border-border/60 bg-background/60 space-y-2 rounded-lg border p-3">
              <p className="text-foreground text-xs font-medium">Detected from filesystem</p>
              {runtimePlugins.map((plugin) => (
                <div key={plugin.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-foreground truncate">{plugin.name}</span>
                  <span className="text-muted-foreground">{plugin.version}</span>
                </div>
              ))}
            </div>
          )}
          {!runtimeLoading && runtimeErrors.length > 0 && (
            <div className="border-destructive/40 bg-destructive/10 space-y-2 rounded-lg border p-3">
              <p className="text-destructive text-xs font-medium">Plugin manifest errors</p>
              {runtimeErrors.map((error) => (
                <p
                  key={`${error.path}-${error.message}`}
                  className="text-destructive/90 text-[11px]"
                >
                  {error.path}: {error.message}
                </p>
              ))}
            </div>
          )}
            </Panel>
          )}
        </div>
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
      className={`gap-2 border transition-all ${active ? 'border-ring/70 bg-accent text-foreground shadow-sm' : 'border-border/80 bg-background/60 text-foreground/90 hover:border-ring/70 hover:bg-accent'}`}
      aria-pressed={active}
    >
      {active && <Check className="text-ring h-4 w-4" aria-hidden />}
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
    <div className="border-border/65 bg-background/45 hover:border-ring/35 flex items-start justify-between gap-4 rounded-lg border px-3 py-2.5 transition-colors">
      <div>
        <p className="text-foreground text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-semibold ${checked ? 'text-emerald-500' : 'text-muted-foreground'}`}
        >
          {checked ? 'ON' : 'OFF'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          title={`${label}: ${checked ? 'On' : 'Off'}`}
          className={`relative inline-flex h-7 w-14 items-center rounded-full border p-0.5 transition-all focus-visible:outline-none ${
            checked
              ? 'cursor-pointer border-emerald-300/80 bg-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]'
              : 'border-border/90 hover:border-ring/55 cursor-pointer bg-zinc-500/75 hover:bg-zinc-500/90'
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
      <p className="text-foreground text-sm font-medium">{label}</p>
      <div className="border-border/65 bg-background/45 flex items-center gap-2 rounded-lg border p-2">
        {options.map((option) => (
          <Button
            key={option.id}
            size="sm"
            variant={value === option.id ? 'primary' : 'ghost'}
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
            className={
              value === option.id
                ? 'border-ring/70 bg-accent text-foreground border shadow-sm'
                : 'border-border/80 bg-background/60 text-foreground/90 hover:border-ring/70 hover:bg-accent border'
            }
          >
            {value === option.id && <Check className="text-ring mr-1 h-3.5 w-3.5" aria-hidden />}
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
        <p className="text-foreground text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
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
        className="border-border/70 bg-background text-foreground h-9 w-24 rounded-md border px-2 text-sm outline-none"
      />
    </div>
  )
}

/** Форматирует KeyboardEvent в строку шортката (Super+Shift+K и т.д.). */
function formatShortcutFromEvent(event: KeyboardEvent): string {
  const mods: string[] = []
  if (event.metaKey) mods.push('Super')
  if (event.ctrlKey) mods.push('Ctrl')
  if (event.altKey) mods.push('Alt')
  if (event.shiftKey) mods.push('Shift')
  const key =
    event.key === ' ' ? 'Space' : event.key.length === 1 ? event.key.toUpperCase() : event.key
  if (!key || key === 'Unidentified') return mods.join('+') || ''
  return mods.length ? [...mods, key].join('+') : key
}

/** Строка настройки с кнопкой «Забиндить»: по клику ждём нажатия комбинации и сохраняем. */
function SettingsShortcutRow({
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
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    if (!recording) return
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (['Meta', 'Control', 'Alt', 'Shift'].includes(event.key)) return
      const shortcut = formatShortcutFromEvent(event)
      if (shortcut) {
        onChange(shortcut)
        setRecording(false)
      }
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [recording, onChange])

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-foreground text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="border-border/70 bg-background text-foreground min-w-[120px] rounded-md border px-2 py-1.5 text-center text-sm tabular-nums"
          aria-live="polite"
        >
          {recording ? 'Press keys…' : value || '—'}
        </span>
        <Button
          type="button"
          size="sm"
          variant="muted"
          onClick={() => setRecording((r) => !r)}
          aria-pressed={recording}
        >
          {recording ? 'Cancel' : 'Bind'}
        </Button>
      </div>
    </div>
  )
}
