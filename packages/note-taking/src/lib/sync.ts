import { uuidv4 } from '@markdown-viewer/common/dependencies'
import { getApiUrl } from '@markdown-viewer/common'
import type { LocalNote, NoteColor } from '../types'
import { deleteNote, getAllOwnerNotes, getNote, getPendingNotes, saveNote, saveNotes } from './idb'

interface SyncResult {
  serverId?: string
  conflict?: boolean
  serverNote?: {
    serverId: string
    title: string
    body: string
    color: NoteColor
    pinned: boolean
    updatedAt: string
  }
  success?: boolean
}

async function syncOne(note: LocalNote, ownerEmail: string): Promise<void> {
  try {
    const res = await fetch(getApiUrl('/api/notes/sync'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-email': ownerEmail },
      body: JSON.stringify({
        localId: note.localId,
        serverId: note.serverId,
        operation: note.operation,
        title: note.title,
        body: note.body,
        color: note.color,
        pinned: note.pinned,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        deletedAt: note.deletedAt,
        lastSyncedAt: note.lastSyncedAt,
      }),
    })

    if (!res.ok) {
      await saveNote({ ...note, syncStatus: 'failed' })
      return
    }

    const data: SyncResult = await res.json()

    if (data.conflict && data.serverNote) {
      const now = new Date().toISOString()
      await saveNote({
        ...note,
        serverId: data.serverNote.serverId,
        title: data.serverNote.title,
        body: data.serverNote.body,
        color: data.serverNote.color,
        pinned: data.serverNote.pinned,
        updatedAt: data.serverNote.updatedAt,
        syncStatus: 'synced',
        operation: 'update',
        lastSyncedAt: now,
      })
      await saveNote({
        localId: uuidv4(),
        ownerEmail,
        title: `${note.title || 'Untitled'} (conflict copy)`,
        body: note.body,
        color: note.color,
        pinned: false,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending',
        operation: 'create',
        version: 1,
      })
      return
    }

    if (note.operation === 'delete') {
      await deleteNote(note.localId)
      return
    }

    const syncedAt = new Date().toISOString()
    const current = await getNote(note.localId)
    if (current && (current.version !== note.version || current.updatedAt !== note.updatedAt)) {
      await saveNote({
        ...current,
        serverId: data.serverId ?? current.serverId ?? note.serverId,
        syncStatus: 'pending',
        operation: 'update',
        lastSyncedAt: syncedAt,
      })
      return
    }

    await saveNote({
      ...note,
      serverId: data.serverId ?? note.serverId,
      syncStatus: 'synced',
      operation: 'update',
      lastSyncedAt: syncedAt,
    })
  } catch {
    await saveNote({ ...note, syncStatus: 'failed' })
  }
}

/**
 * Push all pending/failed local notes to the server.
 * Marks each note as syncing before the request so the UI can show progress.
 * Each note syncs independently; a failure on one doesn't block the others.
 */
export async function syncPendingNotes(ownerEmail: string): Promise<void> {
  if (!navigator.onLine) return

  const pending = await getPendingNotes(ownerEmail)
  if (pending.length === 0) return

  await Promise.all(pending.map(note => saveNote({ ...note, syncStatus: 'syncing' })))
  await Promise.allSettled(pending.map(note => syncOne(note, ownerEmail)))
}

/**
 * Pull notes from the server.
 * New notes are added locally; newer server copies update clean synced notes.
 * Local pending changes always stay queued and visible.
 */
export async function pullServerNotes(ownerEmail: string): Promise<void> {
  if (!navigator.onLine) return

  const res = await fetch(getApiUrl('/api/notes'), { headers: { 'x-user-email': ownerEmail } })
  if (!res.ok) return

  const { notes: serverNotes } = await res.json() as {
    notes: Array<{
      id: string
      title: string
      body: string
      color: NoteColor
      pinned: boolean
      createdAt: string
      updatedAt: string
    }>
  }

  const localNotes = await getAllOwnerNotes(ownerEmail)
  const localByServerId = new Map(localNotes.filter(note => note.serverId).map(note => [note.serverId!, note]))
  const now = new Date().toISOString()

  const incoming = serverNotes.flatMap((serverNote): LocalNote[] => {
    const local = localByServerId.get(serverNote.id)

    if (local) {
      if (local.deletedAt || local.syncStatus === 'pending' || local.syncStatus === 'syncing') return []
      if (new Date(serverNote.updatedAt).getTime() <= new Date(local.updatedAt).getTime()) return []

      return [{
        ...local,
        title: serverNote.title,
        body: serverNote.body,
        color: serverNote.color,
        pinned: serverNote.pinned,
        createdAt: serverNote.createdAt,
        updatedAt: serverNote.updatedAt,
        syncStatus: 'synced',
        operation: 'update',
        lastSyncedAt: now,
      }]
    }

    return [{
      localId: serverNote.id,
      serverId: serverNote.id,
      ownerEmail,
      title: serverNote.title,
      body: serverNote.body,
      color: serverNote.color,
      pinned: serverNote.pinned,
      createdAt: serverNote.createdAt,
      updatedAt: serverNote.updatedAt,
      syncStatus: 'synced',
      operation: 'update',
      version: 1,
      lastSyncedAt: now,
    }]
  })

  await saveNotes(incoming)
}
