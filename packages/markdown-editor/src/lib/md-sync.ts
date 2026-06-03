import { getApiUrl } from '@mypartner/common'
import type { MarkdownFile } from '../types'

interface ServerFile {
  id: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

export async function pullServerFiles(ownerEmail: string): Promise<MarkdownFile[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return []
  try {
    const res = await fetch(getApiUrl('/api/markdown-files'), {
      headers: { 'x-user-email': ownerEmail },
    })
    if (!res.ok) return []
    const { files } = await res.json() as { files: ServerFile[] }
    return files.map(f => ({
      id: f.id,
      name: f.name,
      content: f.content,
      uploadedAt: f.createdAt,
      updatedAt: f.updatedAt,
      isSystemFile: false,
    }))
  } catch {
    return []
  }
}

export async function pushFileCreate(ownerEmail: string, file: MarkdownFile): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  try {
    await fetch(getApiUrl('/api/markdown-files'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-email': ownerEmail },
      body: JSON.stringify({ id: file.id, name: file.name, content: file.content }),
    })
  } catch { /* best-effort */ }
}

// Uses POST/upsert so it works for both first-push and subsequent updates.
export async function pushFileUpdate(ownerEmail: string, file: MarkdownFile): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  try {
    await fetch(getApiUrl('/api/markdown-files'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-email': ownerEmail },
      body: JSON.stringify({ id: file.id, name: file.name, content: file.content }),
    })
  } catch { /* best-effort */ }
}

export async function pushFileDelete(ownerEmail: string, fileId: string): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  try {
    await fetch(getApiUrl(`/api/markdown-files/${fileId}`), {
      method: 'DELETE',
      headers: { 'x-user-email': ownerEmail },
    })
  } catch { /* best-effort */ }
}
