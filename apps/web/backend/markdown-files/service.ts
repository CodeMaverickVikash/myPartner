import { getSupabaseAdmin } from '../supabase/server'
import { ApiError } from '../http'
import { isUuid, mapRow, normalizeOwnerEmail, type MarkdownFileRow } from './model'

const SELECT = 'id, owner_email, name, content, created_at, updated_at'

export async function listFiles(ownerEmailHeader: string | undefined) {
  const ownerEmail = getOwnerEmail(ownerEmailHeader)
  const { data, error } = await getSupabaseAdmin()
    .from('markdown_files')
    .select(SELECT)
    .eq('owner_email', ownerEmail)
    .order('updated_at', { ascending: false })
  if (error) raise(error.message, 500)
  return { files: (data as MarkdownFileRow[]).map(mapRow) }
}

export async function createFile(ownerEmailHeader: string | undefined, body: Record<string, unknown>) {
  const ownerEmail = getOwnerEmail(ownerEmailHeader)
  const now = new Date().toISOString()
  const record = {
    ...(isUuid(body.id) ? { id: body.id } : {}),
    owner_email: ownerEmail,
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled',
    content: typeof body.content === 'string' ? body.content : '',
    created_at: now,
    updated_at: now,
  }
  const { data, error } = await getSupabaseAdmin()
    .from('markdown_files')
    .upsert(record, { onConflict: 'id' })
    .select(SELECT)
    .single()
  if (error) raise(error.message, 500)
  return { file: mapRow(data as MarkdownFileRow) }
}

export async function updateFile(ownerEmailHeader: string | undefined, id: string, body: Record<string, unknown>) {
  const ownerEmail = getOwnerEmail(ownerEmailHeader)
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if (typeof body.content === 'string') updates.content = body.content
  const { data, error } = await getSupabaseAdmin()
    .from('markdown_files')
    .update(updates)
    .eq('id', id)
    .eq('owner_email', ownerEmail)
    .select(SELECT)
    .single()
  if (error) raise(error.message, error.code === 'PGRST116' ? 404 : 500)
  return { file: mapRow(data as MarkdownFileRow) }
}

export async function removeFile(ownerEmailHeader: string | undefined, id: string) {
  const ownerEmail = getOwnerEmail(ownerEmailHeader)
  const { error } = await getSupabaseAdmin()
    .from('markdown_files')
    .delete()
    .eq('id', id)
    .eq('owner_email', ownerEmail)
  if (error) raise(error.message, 500)
}

function getOwnerEmail(value: string | undefined) {
  const email = normalizeOwnerEmail(value)
  if (!email) raise('Missing user email', 401)
  return email
}

function raise(message: string, status: number): never {
  throw new ApiError(message, status)
}
