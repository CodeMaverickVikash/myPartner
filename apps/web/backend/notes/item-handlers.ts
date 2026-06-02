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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ownerEmail = getOwnerEmail(request)
  if (!ownerEmail) return jsonError('Missing user email', 401)

  const { id } = await context.params
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.title === 'string') updates.title = body.title
  if (typeof body.body === 'string') updates.body = body.body
  if (typeof body.color === 'string') updates.color = normalizeNoteColor(body.color)
  if (typeof body.pinned === 'boolean') updates.pinned = body.pinned

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('notes')
      .update(updates)
      .eq('id', id)
      .eq('owner_email', ownerEmail)
      .select(selectColumns)
      .single()

    if (error) return jsonError(error.message, error.code === 'PGRST116' ? 404 : 500)
    return NextResponse.json({ note: mapNoteRow(data as NoteRow) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update note'
    return jsonError(message, 503)
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ownerEmail = getOwnerEmail(request)
  if (!ownerEmail) return jsonError('Missing user email', 401)

  const { id } = await context.params

  try {
    const { error } = await getSupabaseAdmin()
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('owner_email', ownerEmail)

    if (error) return jsonError(error.message, 500)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete note'
    return jsonError(message, 503)
  }
}
