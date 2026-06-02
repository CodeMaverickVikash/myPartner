import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import {
  isUuid,
  mapNoteRow,
  normalizeIsoDate,
  normalizeNoteColor,
  normalizeOwnerEmail,
  type NoteRow,
} from './model'

const SELECT = 'id, owner_email, title, body, color, pinned, created_at, updated_at'

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

@Injectable()
export class NotesService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(ownerEmailHeader: string | undefined) {
    const ownerEmail = this.getOwnerEmail(ownerEmailHeader)

    try {
      const { data, error } = await this.supabase.admin
        .from('notes')
        .select(SELECT)
        .eq('owner_email', ownerEmail)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false })

      if (error) this.raise(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      return { notes: (data as NoteRow[]).map(mapNoteRow) }
    } catch (error) {
      this.raiseServiceError(error, 'Unable to load notes')
    }
  }

  async create(ownerEmailHeader: string | undefined, body: Record<string, unknown>) {
    const ownerEmail = this.getOwnerEmail(ownerEmailHeader)
    const now = new Date().toISOString()
    const note = {
      ...(isUuid(body.id) ? { id: body.id } : {}),
      owner_email: ownerEmail,
      title: typeof body.title === 'string' ? body.title : '',
      body: typeof body.body === 'string' ? body.body : '',
      color: normalizeNoteColor(body.color),
      pinned: typeof body.pinned === 'boolean' ? body.pinned : false,
      created_at: normalizeIsoDate(body.createdAt, now),
      updated_at: normalizeIsoDate(body.updatedAt, now),
    }

    try {
      const { data, error } = await this.supabase.admin
        .from('notes')
        .upsert(note, { onConflict: 'id' })
        .select(SELECT)
        .single()

      if (error) this.raise(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      return { note: mapNoteRow(data as NoteRow) }
    } catch (error) {
      this.raiseServiceError(error, 'Unable to create note')
    }
  }

  async update(ownerEmailHeader: string | undefined, id: string, body: Record<string, unknown>) {
    const ownerEmail = this.getOwnerEmail(ownerEmailHeader)
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (typeof body.title === 'string') updates.title = body.title
    if (typeof body.body === 'string') updates.body = body.body
    if (typeof body.color === 'string') updates.color = normalizeNoteColor(body.color)
    if (typeof body.pinned === 'boolean') updates.pinned = body.pinned

    try {
      const { data, error } = await this.supabase.admin
        .from('notes')
        .update(updates)
        .eq('id', id)
        .eq('owner_email', ownerEmail)
        .select(SELECT)
        .single()

      if (error) this.raise(error.message, error.code === 'PGRST116' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR)
      return { note: mapNoteRow(data as NoteRow) }
    } catch (error) {
      this.raiseServiceError(error, 'Unable to update note')
    }
  }

  async remove(ownerEmailHeader: string | undefined, id: string) {
    const ownerEmail = this.getOwnerEmail(ownerEmailHeader)

    try {
      const { error } = await this.supabase.admin
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('owner_email', ownerEmail)

      if (error) this.raise(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    } catch (error) {
      this.raiseServiceError(error, 'Unable to delete note')
    }
  }

  async sync(ownerEmailHeader: string | undefined, payload: SyncPayload) {
    const ownerEmail = this.getOwnerEmail(ownerEmailHeader)
    const { localId, serverId, operation } = payload
    const now = new Date().toISOString()
    const supabase = this.supabase.admin

    if (operation === 'delete') {
      if (!serverId || typeof serverId !== 'string') return { success: true }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', serverId)
        .eq('owner_email', ownerEmail)

      if (error) this.raise(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      return { success: true }
    }

    if (operation === 'create') {
      if (!isUuid(localId)) this.raise('Invalid localId', HttpStatus.BAD_REQUEST)

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

      if (error) this.raise(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      return { serverId: (data as NoteRow).id, conflict: false }
    }

    if (operation === 'update') {
      if (!isUuid(serverId)) this.raise('Invalid serverId', HttpStatus.BAD_REQUEST)

      const { data: existing, error: fetchErr } = await supabase
        .from('notes')
        .select(SELECT)
        .eq('id', serverId as string)
        .eq('owner_email', ownerEmail)
        .single()

      if (fetchErr || !existing) this.raise('Note not found', HttpStatus.NOT_FOUND)

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
            updatedAt: serverNote.updatedAt,
          },
        }
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

      if (error) this.raise(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      return { serverId: (data as NoteRow).id, conflict: false }
    }

    this.raise('Invalid operation', HttpStatus.BAD_REQUEST)
  }

  private getOwnerEmail(value: string | undefined) {
    const ownerEmail = normalizeOwnerEmail(value)
    if (!ownerEmail) this.raise('Missing user email', HttpStatus.UNAUTHORIZED)
    return ownerEmail
  }

  private raise(message: string, status: HttpStatus): never {
    throw new HttpException({ error: message }, status)
  }

  private raiseServiceError(error: unknown, fallback: string): never {
    if (error instanceof HttpException) throw error
    const message = error instanceof Error ? error.message : fallback
    this.raise(message, HttpStatus.SERVICE_UNAVAILABLE)
  }
}
