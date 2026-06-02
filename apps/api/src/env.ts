export function isStatelessApi() {
  const value = process.env.API_STATELESS ?? process.env.STATELESS_API
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase())
}

export function getCorsOrigins() {
  const raw = process.env.CORS_ORIGIN
  if (!raw?.trim()) return true
  return raw.split(',').map(origin => origin.trim()).filter(Boolean)
}
