import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@backend/supabase/server'
import {
  isUuid,
  mapNoteRow,
  normalizeIsoDate,
  normalizeNoteColor,
  normalizeOwnerEmail,
  type NoteRow,
} from './model'

const SELECT = 'id, owner_email, title, body, color, pinned, created_at, updated_at'

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

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

export async function handleSync(request: Request): Promise<NextResponse> {
  const ownerEmail = normalizeOwnerEmail(request.headers.get('x-user-email'))
  if (!ownerEmail) return jsonError('Missing user email', 401)

  const payload = await request.json().catch(() => ({})) as SyncPayload
  const { localId, serverId, operation } = payload
  const now = new Date().toISOString()
  const supabase = getSupabaseAdmin()

  if (operation === 'delete') {
    // No serverId means the note never reached the server — nothing to delete
    if (!serverId || typeof serverId !== 'string') {
      return NextResponse.json({ success: true })
    }
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', serverId)
      .eq('owner_email', ownerEmail)
    if (error) return jsonError(error.message, 500)
    return NextResponse.json({ success: true })
  }

  if (operation === 'create') {
    if (!isUuid(localId)) return jsonError('Invalid localId', 400)
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
          created_at: normalizeIsoDate(payload.createdAt, now),
          updated_at: normalizeIsoDate(payload.updatedAt, now),
        },
        { onConflict: 'id' },
      )
      .select(SELECT)
      .single()
    if (error) return jsonError(error.message, 500)
    return NextResponse.json({ serverId: (data as NoteRow).id, conflict: false }, { status: 201 })
  }

  if (operation === 'update') {
    if (!isUuid(serverId)) return jsonError('Invalid serverId', 400)

    const { data: existing, error: fetchErr } = await supabase
      .from('notes')
      .select(SELECT)
      .eq('id', serverId as string)
      .eq('owner_email', ownerEmail)
      .single()

    if (fetchErr || !existing) return jsonError('Note not found', 404)

    // Conflict: server was modified after the client last synced this note
    const lastSynced = typeof payload.lastSyncedAt === 'string' ? payload.lastSyncedAt : null
    if (lastSynced && new Date((existing as NoteRow).updated_at) > new Date(lastSynced)) {
      const serverNote = mapNoteRow(existing as NoteRow)
      return NextResponse.json({
        conflict: true,
        serverId: serverNote.id,
        serverNote: {
          serverId: serverNote.id,
          title: serverNote.title,
          body: serverNote.body,
          color: serverNote.color,
          pinned: serverNote.pinned,
          updatedAt: serverNote.updatedAt,
        },
      })
    }

    const { data, error } = await supabase
      .from('notes')
      .update({
        title: typeof payload.title === 'string' ? payload.title : '',
        body: typeof payload.body === 'string' ? payload.body : '',
        color: normalizeNoteColor(payload.color),
        pinned: typeof payload.pinned === 'boolean' ? payload.pinned : false,
        updated_at: normalizeIsoDate(payload.updatedAt, now),
      })
      .eq('id', serverId as string)
      .eq('owner_email', ownerEmail)
      .select(SELECT)
      .single()

    if (error) return jsonError(error.message, 500)
    return NextResponse.json({ serverId: (data as NoteRow).id, conflict: false })
  }

  return jsonError('Invalid operation', 400)
}
