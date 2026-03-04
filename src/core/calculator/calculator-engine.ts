import { create, all, type FactoryFunctionMap } from 'mathjs'
import {
  formatDuration,
  intervalToDuration,
  differenceInDays,
  addWeeks,
  addDays,
  startOfWeek,
  parseISO,
  isValid,
  format,
} from 'date-fns'
import { logger } from '@/utils/logger'

const math = create(all as FactoryFunctionMap)

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

/** "52% of 900" → (52/100)*900 */
function tryPercentOf(trimmed: string): string | null {
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*%\s*of\s+(.+)$/i)
  if (!match || match[2] === undefined) return null
  const pct = match[1]
  const rest = match[2].trim()
  return `(${pct}/100)*(${rest})`
}

/** "145 mins to timespan" / "90 minutes to timespan" → "2h 25m" */
function tryMinsToTimespan(trimmed: string): string | null {
  const match = trimmed.match(/^(\d+)\s*(?:mins?|minutes?)\s+to\s+timespan$/i)
  if (!match || match[1] === undefined) return null
  const totalMinutes = parseInt(match[1], 10)
  const start = 0
  const end = totalMinutes * 60 * 1000
  const duration = intervalToDuration({ start, end })
  return formatDuration(duration)
}

/** "days until 31 Mar" / "days until 2025-03-31" */
function tryDaysUntil(trimmed: string): string | null {
  const match = trimmed.match(/^days?\s+until\s+(.+)$/i)
  if (!match || match[1] === undefined) return null
  const dateStr = match[1].trim()
  const now = new Date()
  let target: Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    target = parseISO(dateStr)
  } else {
    const parts = dateStr.split(/\s+/)
    const dayStr = parts[0]
    const monthStr = parts[1]
    if (!dayStr || !monthStr) return null
    const monthNames: Record<string, number> = {
      jan: 0, january: 0, feb: 1, march: 2, mar: 2, apr: 3, april: 3,
      may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
      sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
      dec: 11, december: 11,
    }
    const m =
      monthNames[monthStr.toLowerCase().slice(0, 3)] ??
      monthNames[monthStr.toLowerCase()]
    if (m === undefined) return null
    const y = now.getFullYear()
    target = new Date(y, m, parseInt(dayStr, 10))
    if (target < now) target = new Date(y + 1, m, parseInt(dayStr, 10))
  }
  if (!isValid(target)) return null
  const days = differenceInDays(target, now)
  return `${days} day${days !== 1 ? 's' : ''}`
}

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/** "time in tokyo" / "time in London" → current time in that timezone */
function tryTimeInTimezone(trimmed: string): string | null {
  const match = trimmed.match(/^time\s+in\s+(.+)$/i)
  if (!match || match[1] === undefined) return null
  const tz = match[1].trim()
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      timeStyle: 'short',
      hour12: false,
    })
    return formatter.format(new Date())
  } catch {
    return null
  }
}

/** "monday in 3 weeks" → date of that weekday in that week */
function tryWeekdayInWeeks(trimmed: string): string | null {
  const match = trimmed.match(
    /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+in\s+(\d+)\s+weeks?$/i,
  )
  if (!match || match[1] === undefined || match[2] === undefined) return null
  const weekday = match[1].toLowerCase()
  const weeks = parseInt(match[2], 10)
  const base = addWeeks(new Date(), weeks)
  const weekStart = startOfWeek(base, { weekStartsOn: 1 })
  const want = WEEKDAY_NAMES.indexOf(weekday)
  if (want < 0) return null
  const target = addDays(weekStart, want === 0 ? 6 : want - 1)
  return format(target, 'EEE, d MMM yyyy')
}

/** square root of 625, 2 power 10 */
function normalizeMathPhrases(expr: string): string {
  let s = expr
    .replace(/\bsquare\s+root\s+of\s+(\d+(?:\.\d+)?)/gi, 'sqrt($1)')
    .replace(/\b(\d+(?:\.\d+)?)\s+power\s+(\d+)/gi, '$1^$2')
  return s
}

/**
 * Вычисляет выражение: математика, единицы (10 ft in m), % of, даты, timespan.
 */
export function calculate(expression: string): CalculatorOutput {
  let trimmed = expression.trim().replace(/^=/, '')
  if (trimmed.length === 0) {
    return { success: false, expression: trimmed }
  }

  trimmed = normalizeMathPhrases(trimmed)

  const percentExpr = tryPercentOf(trimmed)
  if (percentExpr) {
    try {
      const result = math.evaluate(percentExpr)
      const value = typeof result === 'number' ? String(result) : String(result)
      return { success: true, expression: trimmed, value }
    } catch {
      // fall through
    }
  }

  const timespanResult = tryMinsToTimespan(trimmed)
  if (timespanResult !== null) {
    return { success: true, expression: trimmed, value: timespanResult }
  }

  const daysUntilResult = tryDaysUntil(trimmed)
  if (daysUntilResult !== null) {
    return { success: true, expression: trimmed, value: daysUntilResult }
  }

  const weekdayResult = tryWeekdayInWeeks(trimmed)
  if (weekdayResult !== null) {
    return { success: true, expression: trimmed, value: weekdayResult }
  }

  const timeInTz = tryTimeInTimezone(trimmed)
  if (timeInTz !== null) {
    return { success: true, expression: trimmed, value: timeInTz }
  }

  try {
    const result = math.evaluate(trimmed)
    if (result && typeof result === 'object' && 'toNumber' in result) {
      const value = String((result as { toNumber: () => number }).toNumber())
      return { success: true, expression: trimmed, value }
    }
    const value = typeof result === 'number' ? String(result) : String(result)
    return { success: true, expression: trimmed, value }
  } catch (err) {
    logger.debug('calculator error', { expression: trimmed, error: err })
    return { success: false, expression: trimmed }
  }
}
