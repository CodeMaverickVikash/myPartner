export interface MarkdownFileRow {
  id: string
  owner_email: string
  name: string
  content: string
  created_at: string
  updated_at: string
}

export interface MarkdownFileOut {
  id: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

export function mapRow(row: MarkdownFileRow): MarkdownFileOut {
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function normalizeOwnerEmail(value: string | undefined) {
  const email = value?.trim().toLowerCase() ?? ''
  return email.includes('@') ? email : null
}

export function isUuid(value: unknown) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}
