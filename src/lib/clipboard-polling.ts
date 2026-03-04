/** Хранит последнее известное содержимое буфера для опроса. После программной вставки (writeText) вызываем setLastClipboardContent, чтобы не дублировать запись в историю. */
let lastClipboardContent = ''

export function getLastClipboardContent(): string {
  return lastClipboardContent
}

export function setLastClipboardContent(content: string): void {
  lastClipboardContent = content
}
