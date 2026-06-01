import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@backend/supabase/server'
import { mapNoteRow, normalizeNoteColor, normalizeOwnerEmail, type NoteRow } from './model'

const selectColumns = 'id, owner_email, title, body, color, pinned, created_at, updated_at'

function getOwnerEmail(request: Request) {
  return normalizeOwnerEmail(request.headers.get('x-user-email'))
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: Request) {
  const ownerEmail = getOwnerEmail(request)
  if (!ownerEmail) return jsonError('Missing user email', 401)

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('notes')
      .select(selectColumns)
      .eq('owner_email', ownerEmail)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) return jsonError(error.message, 500)
    return NextResponse.json({ notes: (data as NoteRow[]).map(mapNoteRow) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load notes'
    return jsonError(message, 503)
  }
}

export async function POST(request: Request) {
  const ownerEmail = getOwnerEmail(request)
  if (!ownerEmail) return jsonError('Missing user email', 401)

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const now = new Date().toISOString()

    const { data, error } = await getSupabaseAdmin()
      .from('notes')
      .insert({
        owner_email: ownerEmail,
        title: typeof body.title === 'string' ? body.title : '',
        body: typeof body.body === 'string' ? body.body : '',
        color: normalizeNoteColor(body.color),
        pinned: typeof body.pinned === 'boolean' ? body.pinned : false,
        created_at: now,
        updated_at: now,
      })
      .select(selectColumns)
      .single()

    if (error) return jsonError(error.message, 500)
    return NextResponse.json({ note: mapNoteRow(data as NoteRow) }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create note'
    return jsonError(message, 503)
  }
}
