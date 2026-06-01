import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Plus, FileText, Pin, PinOff, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Note, NoteColor } from '@backend/notes/model'

interface NotesAppProps {
  ownerEmail: string
}

const STORAGE_KEY = 'markdown-viewer-notes'
const colorOptions: NoteColor[] = ['mint', 'sky', 'coral', 'gold']
const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ')

const accent: Record<NoteColor, string> = {
  mint:  '#36a278',
  sky:   '#3b82f6',
  coral: '#f87171',
  gold:  '#f59e0b',
}

const colorLabel: Record<NoteColor, string> = {
  mint: 'Mint', sky: 'Sky', coral: 'Coral', gold: 'Gold',
}

const createNote = (): Note => {
  const now = new Date().toISOString()
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: '', body: '', color: 'mint', pinned: false,
    createdAt: now, updatedAt: now,
  }
}

const getStorageKey = (ownerEmail: string) => `${STORAGE_KEY}:${ownerEmail.toLowerCase()}`

const readStoredNotes = (ownerEmail: string): Note[] => {
  if (typeof window === 'undefined') return []

  try {
    const value = localStorage.getItem(getStorageKey(ownerEmail))
    if (!value) return []
    const parsed = JSON.parse(value) as Note[]
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    .format(new Date(value))

async function notesRequest<T>(ownerEmail: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-user-email': ownerEmail,
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(payload?.error ?? `Notes request failed with ${response.status}`)
  }

  return response.status === 204 ? undefined as T : await response.json() as T
}

function NotesApp({ ownerEmail }: NotesAppProps) {
  const [notes, setNotes] = useState<Note[]>(() => readStoredNotes(ownerEmail))
  const [activeNoteId, setActiveNoteId] = useState<string | null>(() => readStoredNotes(ownerEmail)[0]?.id ?? null)
  const [query, setQuery] = useState('')
  const [mobilePane, setMobilePane] = useState<'list' | 'editor'>('list')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [remoteEnabled, setRemoteEnabled] = useState(true)
  const pendingPatchRef = useRef(new Map<string, Partial<Pick<Note, 'title' | 'body' | 'color' | 'pinned'>>>())
  const patchTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    let isCurrent = true
    setIsLoading(true)
    setRemoteEnabled(true)

    notesRequest<{ notes: Note[] }>(ownerEmail, '/api/notes')
      .then(({ notes: remoteNotes }) => {
        if (!isCurrent) return
        setNotes(remoteNotes)
        setActiveNoteId(current => current && remoteNotes.some(note => note.id === current)
          ? current
          : remoteNotes[0]?.id ?? null)
        localStorage.setItem(getStorageKey(ownerEmail), JSON.stringify(remoteNotes))
      })
      .catch((error) => {
        if (!isCurrent) return
        console.error('Failed to load notes:', error)
        setRemoteEnabled(false)
        toast.error(error instanceof Error ? error.message : 'Unable to load notes')
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => { isCurrent = false }
  }, [ownerEmail])

  useEffect(() => {
    localStorage.setItem(getStorageKey(ownerEmail), JSON.stringify(notes))
  }, [notes, ownerEmail])

  useEffect(() => {
    const patchTimers = patchTimersRef.current

    return () => {
      patchTimers.forEach(timer => clearTimeout(timer))
      patchTimers.clear()
    }
  }, [])

  // Return to list on mobile when no note is active
  useEffect(() => { if (!activeNoteId) setMobilePane('list') }, [activeNoteId])

  const sortedNotes = useMemo(() =>
    [...notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    }), [notes])

  const filteredNotes = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sortedNotes
    return sortedNotes.filter(n => `${n.title} ${n.body}`.toLowerCase().includes(needle))
  }, [query, sortedNotes])

  const activeNote = notes.find(n => n.id === activeNoteId) ?? null

  const addNote = async () => {
    const temporaryNote = createNote()
    setNotes(curr => [temporaryNote, ...curr])
    setActiveNoteId(temporaryNote.id)
    setMobilePane('editor')

    if (!remoteEnabled) return

    try {
      setIsSaving(true)
      const { note } = await notesRequest<{ note: Note }>(ownerEmail, '/api/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: temporaryNote.title,
          body: temporaryNote.body,
          color: temporaryNote.color,
          pinned: temporaryNote.pinned,
        }),
      })
      setNotes(curr => curr.map(current => current.id === temporaryNote.id ? note : current))
      setActiveNoteId(note.id)
    } catch (error) {
      console.error('Failed to create note:', error)
      setRemoteEnabled(false)
      toast.error(error instanceof Error ? error.message : 'Unable to create note')
    } finally {
      setIsSaving(false)
    }
  }

  const schedulePatch = (noteId: string, updates: Partial<Pick<Note, 'title' | 'body' | 'color' | 'pinned'>>) => {
    if (!remoteEnabled) return

    const existingUpdates = pendingPatchRef.current.get(noteId) ?? {}
    pendingPatchRef.current.set(noteId, { ...existingUpdates, ...updates })

    const existingTimer = patchTimersRef.current.get(noteId)
    if (existingTimer) clearTimeout(existingTimer)

    const timer = setTimeout(() => {
      const nextUpdates = pendingPatchRef.current.get(noteId)
      if (!nextUpdates) return

      pendingPatchRef.current.delete(noteId)
      patchTimersRef.current.delete(noteId)
      setIsSaving(true)

      notesRequest<{ note: Note }>(ownerEmail, `/api/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify(nextUpdates),
      })
        .then(({ note }) => {
          setNotes(curr => curr.map(current => current.id === note.id ? note : current))
        })
        .catch((error) => {
          console.error('Failed to update note:', error)
          setRemoteEnabled(false)
          toast.error(error instanceof Error ? error.message : 'Unable to update note')
        })
        .finally(() => setIsSaving(false))
    }, 500)

    patchTimersRef.current.set(noteId, timer)
  }

  const updateActiveNote = (updates: Partial<Pick<Note, 'title' | 'body' | 'color' | 'pinned'>>) => {
    if (!activeNoteId) return
    setNotes(curr => curr.map(n =>
      n.id === activeNoteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
    ))
    schedulePatch(activeNoteId, updates)
  }

  const deleteActiveNote = async () => {
    if (!activeNoteId) return
    const noteId = activeNoteId
    const previousNotes = notes

    setNotes(curr => {
      const next = curr.filter(n => n.id !== activeNoteId)
      setActiveNoteId(next[0]?.id ?? null)
      return next
    })

    if (!remoteEnabled) return

    try {
      setIsSaving(true)
      await notesRequest<void>(ownerEmail, `/api/notes/${noteId}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Failed to delete note:', error)
      setRemoteEnabled(false)
      toast.error(error instanceof Error ? error.message : 'Unable to delete note')
      setNotes(previousNotes)
      setActiveNoteId(noteId)
    } finally {
      setIsSaving(false)
    }
  }

  const pinnedNotes   = filteredNotes.filter(n => n.pinned)
  const unpinnedNotes = filteredNotes.filter(n => !n.pinned)

  return (
    <main className="flex min-h-0 flex-1 overflow-hidden bg-surface-0 text-ink-1">

      {/* ── Sidebar ── */}
      <aside className={cx(
        'flex-col border-r border-line bg-surface-1 overflow-hidden',
        'w-full md:w-72 md:shrink-0',
        mobilePane === 'editor' ? 'hidden md:flex' : 'flex',
      )}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-ink-1 uppercase tracking-wider">Notes</h1>
            <p className="text-[11px] text-ink-3 mt-0.5">
              {isLoading
                ? 'Loading...'
                : `${notes.length} saved${remoteEnabled ? isSaving ? ' - syncing' : '' : ' - local'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={addNote}
            title="New note"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-forest text-white transition hover:bg-forest-strong active:scale-95 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 shrink-0">
          <label className="flex items-center gap-2 rounded-lg border border-line bg-surface-0 px-3 py-1.5 text-ink-3 transition focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <input
              className="w-full bg-transparent text-xs text-ink-1 outline-none placeholder:text-ink-3"
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search notes…"
            />
          </label>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3 min-h-0">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line p-8 text-center mt-2">
              <FileText className="h-5 w-5 text-ink-3" />
              <span className="text-xs text-ink-3">No notes found</span>
            </div>
          ) : (
            <>
              {pinnedNotes.length > 0 && (
                <>
                  <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-3">Pinned</p>
                  {pinnedNotes.map(note => (
                    <NoteCard key={note.id} note={note} active={note.id === activeNoteId} onClick={() => { setActiveNoteId(note.id); setMobilePane('editor') }} />
                  ))}
                </>
              )}
              {unpinnedNotes.length > 0 && (
                <>
                  {pinnedNotes.length > 0 && (
                    <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-3">All Notes</p>
                  )}
                  {unpinnedNotes.map(note => (
                    <NoteCard key={note.id} note={note} active={note.id === activeNoteId} onClick={() => { setActiveNoteId(note.id); setMobilePane('editor') }} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </aside>

      {/* ── Editor ── */}
      <section className={cx(
        'flex-col overflow-hidden bg-surface-0 flex-1 min-w-0',
        mobilePane === 'list' ? 'hidden md:flex' : 'flex',
      )}>
        {activeNote ? (
          <div className="flex min-h-0 flex-1 flex-col">

            {/* Toolbar — matches markdown editor style */}
            <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-1.5 shrink-0">

              {/* Back button — mobile only */}
              <button
                type="button"
                onClick={() => setMobilePane('list')}
                title="Back to notes"
                className="md:hidden flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-2 hover:bg-surface-0 transition-colors active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <div className="md:hidden h-5 w-px bg-line shrink-0" />

              {/* Color swatches */}
              <div className="flex items-center gap-1.5">
                {colorOptions.map(c => (
                  <button
                    key={c}
                    type="button"
                    title={colorLabel[c]}
                    onClick={() => updateActiveNote({ color: c })}
                    className="h-3.5 w-3.5 rounded-full transition hover:scale-125 active:scale-95 shrink-0"
                    style={{
                      backgroundColor: accent[c],
                      outline: activeNote.color === c ? `2px solid ${accent[c]}` : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>

              <div className="h-5 w-px bg-line shrink-0" />

              {/* Pin toggle */}
              <button
                type="button"
                onClick={() => updateActiveNote({ pinned: !activeNote.pinned })}
                title={activeNote.pinned ? 'Unpin' : 'Pin note'}
                className={cx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded text-forest transition-colors hover:bg-forest/10 active:scale-95',
                  activeNote.pinned ? 'text-forest' : 'text-ink-3 hover:text-forest'
                )}
              >
                {activeNote.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={deleteActiveNote}
                title="Delete note"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-3 transition-colors hover:bg-crimson/10 hover:text-crimson active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <span className="ml-auto text-[11px] text-ink-3 shrink-0">
                {formatDate(activeNote.updatedAt)}
              </span>
            </div>

            {/* Writing surface — same structure as markdown editor */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-1 border-l-2 border-l-forest/20 shadow-[-2px_0_0_0_rgba(0,0,0,0.04)]">

              {/* Title */}
              <input
                className="w-full shrink-0 border-0 bg-transparent px-8 pb-2 pt-6 text-[1.85rem] font-bold leading-tight text-ink-1 outline-none placeholder:text-ink-3"
                value={activeNote.title}
                onChange={e => updateActiveNote({ title: e.target.value })}
                placeholder="Untitled"
                aria-label="Note title"
              />

              <div className="mx-8 h-px shrink-0 bg-line" />

              {/* Body */}
              <textarea
                className="min-h-0 flex-1 resize-none border-0 bg-transparent px-8 py-5 text-base leading-7 text-ink-1 outline-none placeholder:text-ink-3"
                value={activeNote.body}
                onChange={e => updateActiveNote({ body: e.target.value })}
                placeholder="Start writing…"
                aria-label="Note body"
              />

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-between border-t border-line px-8 py-2">
                <span className="text-xs text-ink-3">
                  {activeNote.body.trim().split(/\s+/).filter(Boolean).length} words
                </span>
                <span
                  className="h-2 w-2 rounded-full opacity-70"
                  style={{ backgroundColor: accent[activeNote.color] }}
                  title={colorLabel[activeNote.color]}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="m-auto flex flex-col items-center gap-4 p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-line">
              <FileText className="h-6 w-6 text-ink-3" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink-1">No note selected</h2>
              <p className="mt-1 text-xs text-ink-3">Pick a note or create a new one</p>
            </div>
            <button
              type="button"
              onClick={addNote}
              className="flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-white transition hover:bg-forest-strong active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              New Note
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

function NoteCard({ note, active, onClick }: { note: Note; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'group w-full rounded-lg border px-3 py-2.5 text-left transition mb-0.5',
        active
          ? 'border-forest/25 bg-forest/5 shadow-sm'
          : 'border-transparent hover:border-line hover:bg-surface-2'
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-1.25 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: accent[note.color] }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="flex-1 truncate text-sm font-semibold text-ink-1">
              {note.title.trim() || 'Untitled'}
            </span>
            {note.pinned && <Pin className="h-3 w-3 shrink-0 text-forest" />}
          </div>
          <p className="truncate text-xs text-ink-3 leading-snug">
            {note.body.replace(/\s+/g, ' ').trim() || 'No content'}
          </p>
          <p className="mt-1 text-[10px] text-ink-3">{formatDate(note.updatedAt)}</p>
        </div>
      </div>
    </button>
  )
}

export default NotesApp
