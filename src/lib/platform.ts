export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  const platform = (navigator.platform || '').toLowerCase()
  if (platform.includes('mac')) return true
  const userAgent = (navigator.userAgent || '').toLowerCase()
  return userAgent.includes('mac os') || userAgent.includes('macintosh')
}

