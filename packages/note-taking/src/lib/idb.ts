import Dexie, { type Table } from 'dexie'
import type { LocalNote } from '../types'

class NotesDatabase extends Dexie {
  notes!: Table<LocalNote, string>

  constructor() {
    super('mypartner-notes')
    this.version(1).stores({
      notes: 'localId',
    })
    this.version(2).stores({
      notes: 'localId, ownerEmail, serverId, syncStatus, updatedAt, [ownerEmail+syncStatus]',
    })
  }
}

export const notesDb = new NotesDatabase()

/** All notes for user excluding soft-deleted; used by the UI. */
export async function getVisibleNotes(ownerEmail: string): Promise<LocalNote[]> {
  return notesDb.notes
    .where('ownerEmail')
    .equals(ownerEmail)
    .filter(note => !note.deletedAt)
    .toArray()
}

/** All notes including soft-deleted; used by sync to enumerate local records. */
export async function getAllOwnerNotes(ownerEmail: string): Promise<LocalNote[]> {
  return notesDb.notes.where('ownerEmail').equals(ownerEmail).toArray()
}

export async function getNote(localId: string): Promise<LocalNote | undefined> {
  return notesDb.notes.get(localId)
}

/** Notes that need to be pushed to the server. */
export async function getPendingNotes(ownerEmail: string): Promise<LocalNote[]> {
  return notesDb.notes
    .where('ownerEmail')
    .equals(ownerEmail)
    .filter(note => note.syncStatus === 'pending' || note.syncStatus === 'failed')
    .toArray()
}

export async function saveNote(note: LocalNote): Promise<void> {
  await notesDb.notes.put(note)
}

/** Batch upsert in a single IndexedDB transaction. */
export async function saveNotes(notes: LocalNote[]): Promise<void> {
  if (notes.length === 0) return
  await notesDb.transaction('rw', notesDb.notes, async () => {
    await notesDb.notes.bulkPut(notes)
  })
}

export async function deleteNote(localId: string): Promise<void> {
  await notesDb.notes.delete(localId)
}
