import { evaluate } from 'mathjs'
import { logger } from '@/utils/logger'

export interface CalculatorResult {
  success: true
  expression: string
  value: string
}

export interface CalculatorError {
  success: false
  expression: string
}

export type CalculatorOutput = CalculatorResult | CalculatorError

/**
 * Вычисляет математическое выражение.
 * Безопасно: mathjs не выполняет произвольный код.
 */
export function calculate(expression: string): CalculatorOutput {
  const trimmed = expression.trim().replace(/^=/, '')
  if (trimmed.length === 0) {
    return { success: false, expression: trimmed }
  }
  try {
    const result = evaluate(trimmed)
    const value = typeof result === 'number' ? String(result) : String(result)
    return { success: true, expression: trimmed, value }
  } catch (err) {
    logger.debug('calculator error', { expression: trimmed, error: err })
    return { success: false, expression: trimmed }
  }
}
