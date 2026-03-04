import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Объединяет Tailwind классы без конфликтов */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
