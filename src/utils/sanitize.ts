import DOMPurify from 'dompurify'

/** Очищает HTML от XSS. Использовать ВСЕГДА перед dangerouslySetInnerHTML */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre', 'br', 'span'],
    ALLOWED_ATTR: ['class'],
  })
}
