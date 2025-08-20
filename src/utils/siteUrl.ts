export function getSiteURL() {
  const env = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || ''
  if (!env) return ''
  return env.endsWith('/') ? env.slice(0, -1) : env
}
