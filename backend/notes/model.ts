export type NoteColor = 'mint' | 'sky' | 'coral' | 'gold'

export interface Note {
  id: string
  title: string
  body: string
  color: NoteColor
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface NoteRow {
  id: string
  owner_email: string
  title: string
  body: string
  color: NoteColor
  pinned: boolean
  created_at: string
  updated_at: string
}

export const noteColors: NoteColor[] = ['mint', 'sky', 'coral', 'gold']

export function mapNoteRow(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    color: row.color,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function normalizeOwnerEmail(value: string | null) {
  const email = value?.trim().toLowerCase() ?? ''
  return email.includes('@') ? email : null
}

export function normalizeNoteColor(value: unknown): NoteColor {
  return noteColors.includes(value as NoteColor) ? value as NoteColor : 'mint'
}

export function isUuid(value: unknown) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function normalizeIsoDate(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const time = Date.parse(value)
  return Number.isNaN(time) ? fallback : new Date(time).toISOString()
}
