/** Дебаунс функции. Вызывает callback только после паузы в delay мс */
export function debounce(fn: (value: string) => void, delay: number): (value: string) => void
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
