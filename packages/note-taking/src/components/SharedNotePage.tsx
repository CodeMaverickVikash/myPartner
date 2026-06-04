'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Loader2,
  LockKeyhole,
  Save,
  toast,
} from '@mypartner/common/dependencies'
import { getApiUrl } from '@mypartner/common'
import { MarkdownPreviewEditor } from '@mypartner/markdown-editor'
import type { NoteColor, NoteShareMode } from '../types'

interface SharedNote {
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

interface SharedNoteResponse {
  note: SharedNote
  canEdit: boolean
}

interface SharedNotePageProps {
  token: string
}

const accent: Record<NoteColor, string> = {
  mint: '#36a278',
  sky: '#3b82f6',
  coral: '#f87171',
  gold: '#f59e0b',
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))

export default function SharedNotePage({ token }: SharedNotePageProps) {
  const [note, setNote] = useState<SharedNote | null>(null)
  const [draftBody, setDraftBody] = useState('')
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const title = useMemo(() => {
    const source = draftBody || note?.body || note?.title || ''
    return source.trim().split('\n')[0].replace(/^#+\s*/, '').trim() || 'Shared note'
  }, [draftBody, note])

  const dirty = Boolean(note && draftBody !== note.body)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    fetch(getApiUrl(`/api/shared-notes/${token}`))
      .then(async res => {
        if (!res.ok) throw new Error('Shared note not found')
        return await res.json() as SharedNoteResponse
      })
      .then(data => {
        if (cancelled) return
        setNote(data.note)
        setDraftBody(data.note.body)
        setCanEdit(data.canEdit)
      })
      .catch(error => {
        if (cancelled) return
        setError(error instanceof Error ? error.message : 'Could not load shared note')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [token])

  const saveSharedNote = useCallback(async () => {
    if (!note || !canEdit || !dirty || saving) return

    setSaving(true)
    try {
      const res = await fetch(getApiUrl(`/api/shared-notes/${token}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draftBody }),
      })
      if (!res.ok) throw new Error('Could not save shared note')

      const data = await res.json() as SharedNoteResponse
      setNote(data.note)
      setDraftBody(data.note.body)
      setCanEdit(data.canEdit)
      toast.success('Shared note saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save shared note')
    } finally {
      setSaving(false)
    }
  }, [canEdit, dirty, draftBody, note, saving, token])

  useEffect(() => {
    if (!canEdit) return
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        void saveSharedNote()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [canEdit, saveSharedNote])

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-surface-0 text-ink-1">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface-1 px-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          title="Back"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink-1 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold text-ink-1">{title}</h1>
          <p className="text-xs text-ink-3">
            {note ? formatDate(note.updatedAt) : 'Shared note'}
          </p>
        </div>
        {note && (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent[note.color] }}
          />
        )}
        {note && !canEdit && (
          <span className="flex shrink-0 items-center gap-1 rounded-md border border-line bg-surface-2 px-2 py-1 text-xs font-medium text-ink-3">
            <LockKeyhole className="h-3 w-3" />
            Read-only
          </span>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={saveSharedNote}
            disabled={!dirty || saving}
            title={dirty ? 'Save (Ctrl+S)' : 'No changes'}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-forest px-3 text-xs font-semibold text-white transition hover:bg-forest-strong active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-forest" />
        </div>
      ) : error ? (
        <div className="m-auto flex max-w-sm flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-line">
            <AlertCircle className="h-5 w-5 text-crimson" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink-1">Link unavailable</h2>
            <p className="mt-1 text-xs text-ink-3">{error}</p>
          </div>
        </div>
      ) : note ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <MarkdownPreviewEditor
            key={note.id}
            value={draftBody}
            onChange={canEdit ? setDraftBody : undefined}
          />
        </div>
      ) : (
        <div className="m-auto flex flex-col items-center gap-2 p-8 text-center">
          <FileText className="h-6 w-6 text-ink-3" />
          <span className="text-sm text-ink-3">No shared note found</span>
        </div>
      )}
    </main>
  )
}
