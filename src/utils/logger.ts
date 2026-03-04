type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const IS_DEV = import.meta.env.DEV

type LoggerFn = (message: string, data?: Record<string, unknown>) => void

interface Logger {
  debug: LoggerFn
  info: LoggerFn
  warn: LoggerFn
  error: LoggerFn
}

function logToConsole(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const prefix = `[Kikkō] ${message}`
  const payload = data ?? undefined

  if (level === 'debug') console.debug(prefix, payload)
  if (level === 'info') console.info(prefix, payload)
  if (level === 'warn') console.warn(prefix, payload)
  if (level === 'error') console.error(prefix, payload)
}

/** Логгер приложения. В dev — console, в prod — только warn/error */
export const logger: Logger = {
  debug: (message, data) => {
    if (IS_DEV) logToConsole('debug', message, data)
  },
  info: (message, data) => {
    if (IS_DEV) logToConsole('info', message, data)
  },
  warn: (message, data) => {
    logToConsole('warn', message, data)
  },
  error: (message, data) => {
    logToConsole('error', message, data)
  },
}
