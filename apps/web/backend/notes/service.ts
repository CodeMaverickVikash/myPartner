import { randomUUID } from 'node:crypto'
import { getSupabaseAdmin } from '../supabase/server'
import { ApiError } from '../http'
import {
  isUuid,
  mapNoteRow,
  normalizeIsoDate,
  normalizeNoteColor,
  normalizeNoteShareMode,
  normalizeOwnerEmail,
  type NoteShareMode,
  type NoteRow,
} from './model'

const SELECT = 'id, owner_email, title, body, color, pinned, share_mode, share_token, created_at, updated_at'

interface SyncPayload {
  localId?: unknown
  serverId?: unknown
  operation?: unknown
  title?: unknown
  body?: unknown
  color?: unknown
  pinned?: unknown
  createdAt?: unknown
  updatedAt?: unknown
  lastSyncedAt?: unknown
}

export async function listNotes(ownerEmailHeader: string | undefined) {
  const ownerEmail = getOwnerEmail(ownerEmailHeader)
  const { data, error } = await getSupabaseAdmin()
    .from('notes')
    .select(SELECT)
    .eq('owner_email', ownerEmail)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) raise(error.message, 500)
  return { notes: (data as NoteRow[]).map(mapNoteRow) }
}

export async function createNote(ownerEmailHeader: string | undefined, body: Record<string, unknown>) {
  const ownerEmail = getOwnerEmail(ownerEmailHeader)
  const now = new Date().toISOString()
  const note = {
    ...(isUuid(body.id) ? { id: body.id } : {}),
    owner_email: ownerEmail,
    title: typeof body.title === 'string' ? body.title : '',
    body: typeof body.body === 'string' ? body.body : '',
    color: normalizeNoteColor(body.color),
    pinned: typeof body.pinned === 'boolean' ? body.pinned : false,
    share_mode: 'private',
    share_token: null,
    created_at: normalizeIsoDate(body.createdAt, now),
    updated_at: normalizeIsoDate(body.updatedAt, now),
  }

  const { data, error } = await getSupabaseAdmin()
    .from('notes')
    .upsert(note, { onConflict: 'id' })
    .select(SELECT)
    .single()

  if (error) raise(error.message, 500)
  return { note: mapNoteRow(data as NoteRow) }
}

export async function updateNote(ownerEmailHeader: string | undefined, id: string, body: Record<string, unknown>) {
  const ownerEmail = getOwnerEmail(ownerEmailHeader)
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.title === 'string') updates.title = body.title
  if (typeof body.body === 'string') updates.body = body.body
  if (typeof body.color === 'string') updates.color = normalizeNoteColor(body.color)
  if (typeof body.pinned === 'boolean') updates.pinned = body.pinned

  const { data, error } = await getSupabaseAdmin()
    .from('notes')
    .update(updates)
    .eq('id', id)
    .eq('owner_email', ownerEmail)
    .select(SELECT)
    .single()

  if (error) raise(error.message, error.code === 'PGRST116' ? 404 : 500)
  return { note: mapNoteRow(data as NoteRow) }
}

export async function removeNote(ownerEmailHeader: string | undefined, id: string) {
  const ownerEmail = getOwnerEmail(ownerEmailHeader)
  const { error } = await getSupabaseAdmin()
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('owner_email', ownerEmail)

  if (error) raise(error.message, 500)
}

export async function updateNoteShare(ownerEmailHeader: string | undefined, id: string, body: Record<string, unknown>) {
  const ownerEmail = getOwnerEmail(ownerEmailHeader)
  if (!isUuid(id)) raise('Invalid note id', 400)

  const mode = normalizeNoteShareMode(body.mode)
  const updates: { share_mode: NoteShareMode, share_token: string | null } = mode === 'private'
    ? { share_mode: mode, share_token: null }
    : { share_mode: mode, share_token: randomUUID() }

  if (mode !== 'private') {
    const { data: existing, error: fetchError } = await getSupabaseAdmin()
      .from('notes')
      .select('share_token')
      .eq('id', id)
      .eq('owner_email', ownerEmail)
      .single()

    if (fetchError || !existing) raise('Note not found', 404)
    updates.share_token = typeof existing.share_token === 'string' ? existing.share_token : randomUUID()
  }

  const { data, error } = await getSupabaseAdmin()
    .from('notes')
    .update(updates)
    .eq('id', id)
    .eq('owner_email', ownerEmail)
    .select(SELECT)
    .single()

  if (error) raise(error.message, error.code === 'PGRST116' ? 404 : 500)
  const note = mapNoteRow(data as NoteRow)
  return { shareMode: note.shareMode, shareToken: note.shareToken }
}

export async function getSharedNote(token: string) {
  if (!isUuid(token)) raise('Invalid share link', 400)

  const { data, error } = await getSupabaseAdmin()
    .from('notes')
    .select(SELECT)
    .eq('share_token', token)
    .in('share_mode', ['read', 'edit'])
    .single()

  if (error || !data) raise('Shared note not found', 404)
  const note = mapNoteRow(data as NoteRow)
  return { note, canEdit: note.shareMode === 'edit' }
}

export async function updateSharedNote(token: string, body: Record<string, unknown>) {
  if (!isUuid(token)) raise('Invalid share link', 400)

  const { data: existing, error: fetchError } = await getSupabaseAdmin()
    .from('notes')
    .select(SELECT)
    .eq('share_token', token)
    .eq('share_mode', 'edit')
    .single()

  if (fetchError || !existing) raise('This shared note is read-only', 403)

  const existingRow = existing as NoteRow
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title === 'string') updates.title = body.title
  if (typeof body.body === 'string') updates.body = body.body
  if (!('title' in updates) && !('body' in updates)) raise('No editable content provided', 400)

  const { data, error } = await getSupabaseAdmin()
    .from('notes')
    .update(updates)
    .eq('id', existingRow.id)
    .eq('share_token', token)
    .eq('share_mode', 'edit')
    .select(SELECT)
    .single()

  if (error) raise(error.message, 500)
  return { note: mapNoteRow(data as NoteRow), canEdit: true }
}

export async function syncNote(ownerEmailHeader: string | undefined, payload: SyncPayload) {
  const ownerEmail = getOwnerEmail(ownerEmailHeader)
  const { localId, serverId, operation } = payload
  const now = new Date().toISOString()
  const supabase = getSupabaseAdmin()

  if (operation === 'delete') {
    if (!serverId || typeof serverId !== 'string') return { success: true }

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', serverId)
      .eq('owner_email', ownerEmail)

    if (error) raise(error.message, 500)
    return { success: true }
  }

  if (operation === 'create') {
    if (!isUuid(localId)) raise('Invalid localId', 400)

    const { data, error } = await supabase
      .from('notes')
      .upsert(
        {
          id: localId as string,
          owner_email: ownerEmail,
          title: typeof payload.title === 'string' ? payload.title : '',
          body: typeof payload.body === 'string' ? payload.body : '',
          color: normalizeNoteColor(payload.color),
          pinned: typeof payload.pinned === 'boolean' ? payload.pinned : false,
          share_mode: 'private',
          share_token: null,
          created_at: normalizeIsoDate(payload.createdAt, now),
          updated_at: normalizeIsoDate(payload.updatedAt, now),
        },
        { onConflict: 'id' },
      )
      .select(SELECT)
      .single()

    if (error) raise(error.message, 500)
    return { serverId: (data as NoteRow).id, conflict: false }
  }

  if (operation === 'update') {
    if (!isUuid(serverId)) raise('Invalid serverId', 400)

    const { data: existing, error: fetchErr } = await supabase
      .from('notes')
      .select(SELECT)
      .eq('id', serverId as string)
      .eq('owner_email', ownerEmail)
      .single()

    if (fetchErr || !existing) raise('Note not found', 404)

    const existingRow = existing as NoteRow
    const lastSynced = typeof payload.lastSyncedAt === 'string' ? payload.lastSyncedAt : null
    if (lastSynced && new Date(existingRow.updated_at) > new Date(lastSynced)) {
      const serverNote = mapNoteRow(existingRow)
      return {
        conflict: true,
        serverId: serverNote.id,
        serverNote: {
          serverId: serverNote.id,
          title: serverNote.title,
          body: serverNote.body,
          color: serverNote.color,
          pinned: serverNote.pinned,
          shareMode: serverNote.shareMode,
          shareToken: serverNote.shareToken,
          updatedAt: serverNote.updatedAt,
        },
      }
    }

    const { data, error } = await supabase
      .from('notes')
      .update({
        title: typeof payload.title === 'string' ? payload.title : existingRow.title,
        body: typeof payload.body === 'string' ? payload.body : existingRow.body,
        color: normalizeNoteColor(payload.color),
        pinned: typeof payload.pinned === 'boolean' ? payload.pinned : existingRow.pinned,
        updated_at: normalizeIsoDate(payload.updatedAt, now),
      })
      .eq('id', serverId as string)
      .eq('owner_email', ownerEmail)
      .select(SELECT)
      .single()

    if (error) raise(error.message, 500)
    return { serverId: (data as NoteRow).id, conflict: false }
  }

  raise('Invalid operation', 400)
}

function getOwnerEmail(value: string | undefined) {
  const ownerEmail = normalizeOwnerEmail(value)
  if (!ownerEmail) raise('Missing user email', 401)
  return ownerEmail
}

function raise(message: string, status: number): never {
  throw new ApiError(message, status)
}
