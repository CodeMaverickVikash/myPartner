export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath
}
