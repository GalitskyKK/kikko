import { ExternalLink, Image, Code2, FileText, Files } from 'lucide-react'
import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { ClipboardEntry } from '@/stores/clipboard-store'
import { cn } from '@/utils/cn'
import { logger } from '@/utils/logger'

interface ClipboardPreviewProps {
  entry: ClipboardEntry
}

interface ClipboardDetailPreviewProps {
  entry: ClipboardEntry | null
}

function getTypeLabel(entry: ClipboardEntry): string {
  if (entry.contentType === 'image') return 'Image'
  if (entry.contentType === 'html') return 'HTML'
  if (entry.contentType === 'code') return 'Code'
  if (entry.contentType === 'file') return 'File'
  return 'Text'
}

export function ClipboardPreview({ entry }: ClipboardPreviewProps) {
  if (entry.contentType === 'image' && entry.assetFilePath) {
    return <ClipboardImagePreview entryId={entry.id} path={entry.assetFilePath} />
  }

  const icon =
    entry.contentType === 'image'
      ? Image
      : entry.contentType === 'code'
        ? Code2
        : entry.contentType === 'file'
          ? Files
          : FileText
  const Icon = icon

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <span className={cn('block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground')}>
          {getTypeLabel(entry)}
        </span>
        {(entry.contentType === 'code' || entry.contentType === 'html' || entry.contentType === 'file') && (
          <span className="block max-w-[120px] truncate text-[10px] text-muted-foreground/80">
            {entry.preview}
          </span>
        )}
      </div>
    </div>
  )
}

export function ClipboardDetailPreview({ entry }: ClipboardDetailPreviewProps) {
  if (!entry) {
    return (
      <div className="h-full min-h-0 rounded-xl border border-border/60 bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground">Select an item to preview details.</p>
      </div>
    )
  }

  const isUrl = isLikelyUrl(entry.content)
  const urlValue = isUrl ? normalizeUrl(entry.content) : null
  const primaryFilePath = entry.contentType === 'file' ? entry.content.split('\n').map((line) => line.trim()).find(Boolean) ?? null : null
  const details = [
    { label: 'Source', value: entry.appSource ?? 'Clipboard' },
    { label: 'Type', value: getTypeLabel(entry) },
    ...(urlValue ? [{ label: 'URL', value: urlValue }] : []),
    ...(primaryFilePath ? [{ label: 'File', value: primaryFilePath }] : []),
    ...(entry.assetFileSize ? [{ label: 'Size', value: formatBytes(entry.assetFileSize) }] : []),
    ...(entry.assetWidth && entry.assetHeight ? [{ label: 'Dimensions', value: `${entry.assetWidth} x ${entry.assetHeight}` }] : []),
  ]

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{getTypeLabel(entry)} preview</p>
        <span className="text-[11px] text-muted-foreground">
          {entry.charCount > 0 ? `${entry.charCount} chars` : 'Binary'}
        </span>
      </div>

      {entry.contentType === 'image' && entry.assetFilePath && (
        <ClipboardImagePreview entryId={entry.id} path={entry.assetFilePath} detailed />
      )}

      {urlValue && (
        <a
          href={urlValue}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 self-start rounded-md border border-border/70 bg-background/60 px-2 py-1 text-xs text-foreground hover:bg-accent/80"
        >
          Open Link
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      )}

      <div className="space-y-1 rounded-md border border-border/50 bg-background/70 p-2">
        {details.map((row) => (
          <div key={row.label} className="grid grid-cols-[78px_minmax(0,1fr)] gap-2 text-[11px]">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="truncate text-foreground">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border/50 bg-background/70 p-2 text-xs leading-relaxed text-foreground">
        <p className="whitespace-pre-wrap wrap-break-word">
          {entry.contentType === 'image' ? entry.preview : entry.content || entry.preview}
        </p>
      </div>
    </aside>
  )
}

function ClipboardImagePreview({ entryId, path, detailed = false }: { entryId: string; path: string; detailed?: boolean }) {
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    let currentObjectUrl: string | null = null

    const loadImage = async () => {
      try {
        const bytes = await invoke<number[]>('get_clipboard_asset_bytes', { id: entryId })
        const blob = new Blob([new Uint8Array(bytes)], { type: guessMimeType(path) })
        currentObjectUrl = URL.createObjectURL(blob)
        if (isMounted) {
          setSource(currentObjectUrl)
        }
      } catch (error) {
        logger.warn('clipboard preview image load failed', { error, path })
        if (isMounted) {
          setSource(null)
        }
      }
    }

    void loadImage()

    return () => {
      isMounted = false
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl)
      }
    }
  }, [entryId, path])

  if (!source) {
    return (
      <div className={cn('overflow-hidden rounded-md border border-border/60 bg-muted/30', detailed ? 'h-40 w-full' : 'h-12 w-16')}>
        <div className="h-full w-full animate-pulse bg-muted/60" />
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-md border border-border/60 bg-muted/30', detailed ? 'h-40 w-full' : 'h-12 w-16')}>
      <img
        src={source}
        alt="Clipboard image preview"
        loading="lazy"
        className={cn('h-full w-full', detailed ? 'object-contain' : 'object-cover')}
      />
    </div>
  )
}

function guessMimeType(path: string): string {
  const lowerPath = path.toLowerCase()
  if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) return 'image/jpeg'
  if (lowerPath.endsWith('.webp')) return 'image/webp'
  if (lowerPath.endsWith('.gif')) return 'image/gif'
  return 'image/png'
}

function isLikelyUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  return /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}
