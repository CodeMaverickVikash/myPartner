'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  FileText,
  LayoutGrid,
  LayoutList,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  Wifi,
  WifiOff,
  toast,
  uuidv4,
} from '@mypartner/common/dependencies'
import { cx } from '@mypartner/common'
import { MarkdownPreviewEditor } from '@mypartner/markdown-editor'
import type { LocalNote, NoteColor, SyncStatus } from '../types'
import { deleteNote as idbDelete, getVisibleNotes, saveNote } from '../lib/idb'
import { pullServerNotes, syncPendingNotes } from '../lib/sync'

interface NotesAppProps {
  ownerEmail: string
  onNavigate: (path: string) => void
}

const colorOptions: NoteColor[] = ['mint', 'sky', 'coral', 'gold']

const accent: Record<NoteColor, string> = {
  mint: '#36a278',
  sky: '#3b82f6',
  coral: '#f87171',
  gold: '#f59e0b',
}

const colorLabel: Record<NoteColor, string> = {
  mint: 'Mint', sky: 'Sky', coral: 'Coral', gold: 'Gold',
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

const noteHasContent = (note: Pick<LocalNote, 'title' | 'body'>) =>
  note.title.trim().length > 0 || note.body.trim().length > 0

function SyncBadge({ status }: { status: SyncStatus }) {
  if (status === 'synced') return null
  const config = {
    pending: { icon: <Clock className="h-3 w-3" />, title: 'Pending', className: 'text-ink-3' },
    syncing: { icon: <Loader2 className="h-3 w-3 animate-spin" />, title: 'Syncing', className: 'text-forest' },
    failed: { icon: <AlertCircle className="h-3 w-3" />, title: 'Sync failed', className: 'text-crimson' },
  } as const
  const { icon, title, className } = config[status]
  return (
    <span className={cx('flex items-center shrink-0', className)} title={title}>
      {icon}
    </span>
  )
}

export default function NotesApp({ ownerEmail, onNavigate }: NotesAppProps) {
  const [notes, setNotes] = useState<LocalNote[]>([])
  const [draftNote, setDraftNote] = useState<LocalNote | null>(null)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [mobilePane, setMobilePane] = useState<'list' | 'editor'>('list')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [hideEditor, setHideEditor] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return 288
    const saved = localStorage.getItem('mypartner-notes-sidebar-width')
    return saved ? Math.max(240, Math.min(560, parseInt(saved, 10))) : 288
  })
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartW = useRef(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)

  // Ref so callbacks can read current notes without being recreated on every render
  const notesRef = useRef<LocalNote[]>([])
  notesRef.current = notes
  const draftNoteRef = useRef<LocalNote | null>(null)
  draftNoteRef.current = draftNote

  // Per-note debounce timers for the sync trigger
  const syncTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const refreshFromIdb = useCallback(async () => {
    const fresh = await getVisibleNotes(ownerEmail)
    setNotes(fresh)
    return fresh
  }, [ownerEmail])

  const runSync = useCallback(async () => {
    if (!navigator.onLine) return
    setIsSyncing(true)
    try {
      await pullServerNotes(ownerEmail)
      await syncPendingNotes(ownerEmail)
      await refreshFromIdb()
    } catch {
      // Per-note errors are already saved to IDB by syncPendingNotes
    } finally {
      setIsSyncing(false)
    }
  }, [ownerEmail, refreshFromIdb])

  // Initial load: IDB first for instant offline access, then reconcile with the server.
  useEffect(() => {
    let cancelled = false

    getVisibleNotes(ownerEmail).then(initial => {
      if (cancelled) return
      setNotes(initial)
      setActiveNoteId(initial[0]?.localId ?? null)
    })

    if (navigator.onLine && !cancelled) void runSync()

    return () => { cancelled = true }
  }, [ownerEmail, runSync])

  // Online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      void runSync()
    }
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [runSync])

  // Cleanup debounce timers on unmount
  useEffect(() => {
    const timers = syncTimers.current
    return () => timers.forEach(t => clearTimeout(t))
  }, [])

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartW.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const next = Math.max(240, Math.min(560, dragStartW.current + e.clientX - dragStartX.current))
      setSidebarWidth(next)
    }
    const onUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setSidebarWidth(w => {
        localStorage.setItem('mypartner-notes-sidebar-width', String(w))
        return w
      })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  useEffect(() => {
    if (activeNoteId && notes.some(note => note.localId === activeNoteId)) return
    if (activeNoteId && draftNote?.localId === activeNoteId) return
    setActiveNoteId(notes[0]?.localId ?? null)
  }, [activeNoteId, draftNote, notes])

  useEffect(() => { if (!activeNoteId) setMobilePane('list') }, [activeNoteId])

  const sortedNotes = useMemo(() =>
    [...notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    }), [notes])

  const visibleNotes = useMemo(() => {
    if (!draftNote) return sortedNotes
    return [draftNote, ...sortedNotes.filter(note => note.localId !== draftNote.localId)]
  }, [draftNote, sortedNotes])

  const filteredNotes = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return visibleNotes
    return visibleNotes.filter(n => `${n.title} ${stripHtml(n.body)}`.toLowerCase().includes(needle))
  }, [query, visibleNotes])

  const activeNote = notes.find(n => n.localId === activeNoteId)
    ?? (draftNote?.localId === activeNoteId ? draftNote : null)

  const discardIfEmpty = useCallback((localId: string) => {
    const draft = draftNoteRef.current
    if (draft?.localId === localId) {
      if (!noteHasContent(draft)) {
        draftNoteRef.current = null
        setDraftNote(null)
      }
      return
    }

    const note = notesRef.current.find(n => n.localId === localId)
    if (!note || noteHasContent(note)) return

    notesRef.current = notesRef.current.filter(n => n.localId !== localId)
    setNotes(curr => curr.filter(n => n.localId !== localId))
    const timer = syncTimers.current.get(localId)
    if (timer) clearTimeout(timer)
    syncTimers.current.delete(localId)

    if (!note.serverId) {
      void idbDelete(localId).catch(() => undefined)
      return
    }

    void saveNote({
      ...note,
      deletedAt: new Date().toISOString(),
      syncStatus: 'pending',
      operation: 'delete',
    })
      .then(() => runSync())
      .catch(() => {
        toast.error('Could not remove empty note')
        void refreshFromIdb()
      })
  }, [refreshFromIdb, runSync])

  const selectNote = useCallback((localId: string) => {
    if (activeNoteId && activeNoteId !== localId) discardIfEmpty(activeNoteId)
    setActiveNoteId(localId)
    setMobilePane('editor')
  }, [activeNoteId, discardIfEmpty])

  const addNote = useCallback(() => {
    if (activeNoteId) discardIfEmpty(activeNoteId)
    setQuery('')
    const now = new Date().toISOString()
    const note: LocalNote = {
      localId: uuidv4(),
      ownerEmail,
      title: '',
      body: '',
      color: 'mint',
      pinned: false,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      operation: 'create',
      version: 1,
    }
    setDraftNote(note)
    setActiveNoteId(note.localId)
    setMobilePane('editor')
  }, [activeNoteId, discardIfEmpty, ownerEmail])

  const updateNote = useCallback((
    localId: string,
    updates: Partial<Pick<LocalNote, 'title' | 'body' | 'color' | 'pinned'>>,
  ) => {
    const existing = notesRef.current.find(n => n.localId === localId)
      ?? (draftNoteRef.current?.localId === localId ? draftNoteRef.current : null)
    if (!existing) return

    const updated: LocalNote = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
      // If we already have a serverId, update it; otherwise this is still a create
      operation: existing.serverId ? 'update' : 'create',
      version: existing.version + 1,
    }

    const isDraft = draftNoteRef.current?.localId === localId
    const hasContent = noteHasContent(updated)

    if (!hasContent) {
      if (isDraft) {
        draftNoteRef.current = updated
        setDraftNote(updated)
      } else {
        const nextNotes = notesRef.current.map(n => n.localId === localId ? updated : n)
        notesRef.current = nextNotes
        setNotes(nextNotes)
      }
      const timer = syncTimers.current.get(localId)
      if (timer) clearTimeout(timer)
      syncTimers.current.delete(localId)
      return
    }

    if (isDraft) {
      draftNoteRef.current = null
      notesRef.current = [updated, ...notesRef.current]
      setDraftNote(null)
      setNotes(curr => [updated, ...curr])
    } else {
      notesRef.current = notesRef.current.map(n => n.localId === localId ? updated : n)
      setNotes(curr => curr.map(n => n.localId === localId ? updated : n))
    }

    void saveNote(updated).catch(() => {
      toast.error('Could not save note locally')
      void refreshFromIdb()
    })

    // Debounce the network sync so rapid keystrokes don't flood the server
    const timer = syncTimers.current.get(localId)
    if (timer) clearTimeout(timer)
    syncTimers.current.set(localId, setTimeout(() => {
      syncTimers.current.delete(localId)
      void runSync()
    }, 1500))
  }, [refreshFromIdb, runSync])

  const handleDelete = useCallback(async () => {
    const note = notesRef.current.find(n => n.localId === activeNoteId)
      ?? (draftNoteRef.current?.localId === activeNoteId ? draftNoteRef.current : null)
    if (!note) return

    const localId = note.localId
    if (draftNoteRef.current?.localId === localId) {
      setDraftNote(null)
      setActiveNoteId(notesRef.current[0]?.localId ?? null)
      return
    }

    // Optimistically remove from UI
    setNotes(curr => {
      const next = curr.filter(n => n.localId !== localId)
      setActiveNoteId(next[0]?.localId ?? null)
      return next
    })

    if (!note.serverId) {
      await idbDelete(localId).catch(() => {
        toast.error('Could not delete note locally')
        void refreshFromIdb()
      })
    } else {
      await saveNote({
        ...note,
        deletedAt: new Date().toISOString(),
        syncStatus: 'pending',
        operation: 'delete',
      }).catch(() => {
        toast.error('Could not queue note for deletion')
        void refreshFromIdb()
      })
      void runSync()
    }
  }, [activeNoteId, refreshFromIdb, runSync])

  const pendingCount = notes.filter(n => n.syncStatus === 'pending' || n.syncStatus === 'syncing').length
  const failedCount = notes.filter(n => n.syncStatus === 'failed').length

  const statusLabel = isOffline
    ? 'offline'
    : isSyncing
      ? 'syncing...'
      : failedCount > 0
        ? `${failedCount} failed`
        : pendingCount > 0
          ? `${pendingCount} pending`
          : 'all synced'

  const pinnedNotes = filteredNotes.filter(n => n.pinned)
  const unpinnedNotes = filteredNotes.filter(n => !n.pinned)

  return (
    <main className="flex min-h-0 flex-1 overflow-hidden bg-surface-0 text-ink-1">

      {/* ── Sidebar ── */}
      <aside
        className={cx(
          'notes-sidebar flex-col border-line bg-surface-1 overflow-hidden',
          hideEditor ? 'border-r-0 md:w-full!' : 'border-r',
          mobilePane === 'editor' ? 'hidden md:flex' : 'flex',
          'w-full',
        )}
        style={{ '--notes-sidebar-w': `${sidebarWidth}px` } as React.CSSProperties}
      >

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line shrink-0">
          <button
            type="button"
            onClick={() => {
              if (activeNoteId) discardIfEmpty(activeNoteId)
              onNavigate('/portal/home')
            }}
            title="Back to home"
            className="flex h-7 w-7 items-center justify-center rounded text-ink-3 transition hover:bg-surface-2 hover:text-ink-1 active:scale-95 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-ink-1 uppercase tracking-wider">Notes</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isOffline
                ? <WifiOff className="h-3 w-3 text-ink-3 shrink-0" />
                : <Wifi className="h-3 w-3 text-forest shrink-0" />}
              <p className="text-[11px] text-ink-3">{statusLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
            title={viewMode === 'list' ? 'Thumb view' : 'List view'}
            className="flex h-7 w-7 items-center justify-center rounded text-ink-3 transition hover:bg-surface-2 hover:text-ink-1 active:scale-95 shrink-0 cursor-pointer"
          >
            {viewMode === 'list'
              ? <LayoutGrid className="h-3.5 w-3.5" />
              : <LayoutList className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setHideEditor(v => !v)}
            title={hideEditor ? 'Show editor' : 'Hide editor'}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded text-ink-3 transition hover:bg-surface-2 hover:text-ink-1 active:scale-95 shrink-0"
          >
            {hideEditor
              ? <PanelRightOpen className="h-3.5 w-3.5" />
              : <PanelRightClose className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={addNote}
            title="New note"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-forest text-white transition hover:bg-forest-strong active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 shrink-0">
          <label className="flex items-center gap-2 rounded-lg border border-line bg-surface-0 px-3 py-1.5 text-ink-3 transition focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <input
              className="w-full bg-transparent text-[16px] leading-none text-ink-1 outline-none placeholder:text-ink-3 sm:text-xs"
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
          ) : viewMode === 'grid' ? (
            <div className={cx('grid gap-2 pt-2', hideEditor ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2')}>
              {filteredNotes.map(note => (
                <NoteThumb
                  key={note.localId}
                  note={note}
                  active={note.localId === activeNoteId}
                  onClick={() => selectNote(note.localId)}
                />
              ))}
            </div>
          ) : (
            <>
              {pinnedNotes.length > 0 && (
                <>
                  <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-3">Pinned</p>
                  {pinnedNotes.map(note => (
                    <NoteCard
                      key={note.localId}
                      note={note}
                      active={note.localId === activeNoteId}
                      onClick={() => selectNote(note.localId)}
                    />
                  ))}
                </>
              )}
              {unpinnedNotes.length > 0 && (
                <>
                  {pinnedNotes.length > 0 && (
                    <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-3">All Notes</p>
                  )}
                  {unpinnedNotes.map(note => (
                    <NoteCard
                      key={note.localId}
                      note={note}
                      active={note.localId === activeNoteId}
                      onClick={() => selectNote(note.localId)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Resize handle — desktop only, sits over the sidebar border with zero layout width */}
      {!hideEditor && (
        <div className="hidden md:block relative w-0 shrink-0 z-10">
          <div
            className="group absolute inset-y-0 -left-3 w-6 cursor-col-resize flex items-center justify-center"
            onMouseDown={startResize}
          >
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col gap-0.75 bg-surface-1 rounded-full border border-forest/30 shadow-sm py-2 px-0.75">
              <div className="flex gap-0.75">
                <div className="h-0.75 w-0.75 rounded-full bg-forest/70" />
                <div className="h-0.75 w-0.75 rounded-full bg-forest/70" />
              </div>
              <div className="flex gap-0.75">
                <div className="h-0.75 w-0.75 rounded-full bg-forest/70" />
                <div className="h-0.75 w-0.75 rounded-full bg-forest/70" />
              </div>
              <div className="flex gap-0.75">
                <div className="h-0.75 w-0.75 rounded-full bg-forest/70" />
                <div className="h-0.75 w-0.75 rounded-full bg-forest/70" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Editor ── */}
      <section className={cx(
        'flex-col overflow-hidden bg-surface-0 flex-1 min-w-0',
        mobilePane === 'list' ? 'hidden md:flex' : 'flex',
        hideEditor ? 'md:hidden' : '',
      )}>
        {activeNote ? (
          <div className="flex min-h-0 flex-1 flex-col">

            {/* Toolbar */}
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-1.5 shrink-0">

              {/* Back — mobile only */}
              <button
                type="button"
                onClick={() => setMobilePane('list')}
                title="Back to notes"
                className="md:hidden flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-2 hover:bg-surface-0 transition-colors active:scale-95 cursor-pointer"
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
                    onClick={() => updateNote(activeNote.localId, { color: c })}
                    className="h-3.5 w-3.5 rounded-full transition hover:scale-125 active:scale-95 shrink-0 cursor-pointer"
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
                onClick={() => updateNote(activeNote.localId, { pinned: !activeNote.pinned })}
                title={activeNote.pinned ? 'Unpin' : 'Pin note'}
                className={cx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors hover:bg-forest/10 active:scale-95 cursor-pointer',
                  activeNote.pinned ? 'text-forest' : 'text-ink-3 hover:text-forest',
                )}
              >
                {activeNote.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={handleDelete}
                title="Delete note"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-3 transition-colors hover:bg-crimson/10 hover:text-crimson active:scale-95 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <div className="ml-auto flex items-center gap-2 shrink-0">
                <SyncBadge status={activeNote.syncStatus} />
                <span className="text-[11px] text-ink-3">{formatDate(activeNote.updatedAt)}</span>
              </div>
            </div>

            {/* Writing surface */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <MarkdownPreviewEditor
                key={activeNote.localId}
                value={activeNote.body}
                onChange={md => updateNote(activeNote.localId, { body: md })}
              />
              <div className="flex shrink-0 items-center justify-between border-t border-line px-4 py-2 sm:px-8">
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
              className="flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-white transition hover:bg-forest-strong active:scale-[0.98] cursor-pointer"
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

function NoteThumb({
  note, active, onClick,
}: {
  note: LocalNote
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex flex-col rounded-xl border text-left transition active:scale-[0.97] min-h-32.5 cursor-pointer',
        active
          ? 'border-forest/30 bg-forest/5 shadow-sm'
          : 'border-line bg-surface-1 hover:border-forest/20 hover:shadow-sm',
      )}
    >
      {/* Color strip */}
      <div
        className="h-1.5 w-full rounded-t-xl shrink-0"
        style={{ backgroundColor: accent[note.color] }}
      />
      <div className="flex flex-1 flex-col gap-1 px-3 py-2.5 min-h-0">
        <div className="flex items-start gap-1">
          <span className="flex-1 truncate text-[13px] font-semibold leading-snug text-ink-1">
            {note.body.trim().split('\n')[0].replace(/^#+\s*/, '').trim() || 'Untitled'}
          </span>
          {note.pinned && <Pin className="h-3 w-3 shrink-0 text-forest mt-0.5" />}
        </div>
        <p className="line-clamp-3 text-[11px] leading-relaxed text-ink-3 flex-1">
          {stripHtml(note.body) || 'No content'}
        </p>
        <p className="mt-auto text-[10px] text-ink-3 pt-1">{formatDate(note.updatedAt)}</p>
      </div>
    </button>
  )
}

function NoteCard({
  note, active, onClick,
}: {
  note: LocalNote
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'group w-full rounded-lg border px-3 py-2.5 text-left transition mb-0.5 cursor-pointer',
        active
          ? 'border-forest/25 bg-forest/5 shadow-sm'
          : 'border-transparent hover:border-line hover:bg-surface-2',
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
              {note.body.trim().split('\n')[0].replace(/^#+\s*/, '').trim() || 'Untitled'}
            </span>
            {note.pinned && <Pin className="h-3 w-3 shrink-0 text-forest" />}
            <SyncBadge status={note.syncStatus} />
          </div>
          <p className="truncate text-xs text-ink-3 leading-snug">
            {stripHtml(note.body) || 'No content'}
          </p>
          <p className="mt-1 text-[10px] text-ink-3">{formatDate(note.updatedAt)}</p>
        </div>
      </div>
    </button>
  )
}
