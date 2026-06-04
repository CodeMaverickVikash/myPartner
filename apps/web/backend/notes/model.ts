export type NoteColor = 'mint' | 'sky' | 'coral' | 'gold'
export type NoteShareMode = 'private' | 'read' | 'edit'

export interface Note {
  id: string
  title: string
  body: string
  color: NoteColor
  pinned: boolean
  shareMode: NoteShareMode
  shareToken: string | null
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
  share_mode: NoteShareMode | null
  share_token: string | null
  created_at: string
  updated_at: string
}

export const noteColors: NoteColor[] = ['mint', 'sky', 'coral', 'gold']
export const noteShareModes: NoteShareMode[] = ['private', 'read', 'edit']

export function mapNoteRow(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    color: row.color,
    pinned: row.pinned,
    shareMode: normalizeNoteShareMode(row.share_mode),
    shareToken: row.share_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function normalizeOwnerEmail(value: string | undefined) {
  const email = value?.trim().toLowerCase() ?? ''
  return email.includes('@') ? email : null
}

export function normalizeNoteColor(value: unknown): NoteColor {
  return noteColors.includes(value as NoteColor) ? value as NoteColor : 'mint'
}

export function normalizeNoteShareMode(value: unknown): NoteShareMode {
  return noteShareModes.includes(value as NoteShareMode) ? value as NoteShareMode : 'private'
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
