export function isStatelessApi() {
  const value = process.env.API_STATELESS ?? process.env.STATELESS_API
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase())
}

export function getCorsOrigins(): string | string[] {
  const raw = process.env.CORS_ORIGIN
  if (!raw?.trim()) return '*'
  return raw.split(',').map(origin => origin.trim().replace(/\/+$/, '')).filter(Boolean)
}
