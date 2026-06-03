import { errorResponse, json, readJsonBody } from '../http'
import { createNote, listNotes } from './service'

export async function GET(request: Request) {
  try {
    return json(await listNotes(request.headers.get('x-user-email') ?? undefined))
  } catch (error) {
    return errorResponse(error, 'Unable to load notes')
  }
}

export async function POST(request: Request) {
  try {
    return json(
      await createNote(request.headers.get('x-user-email') ?? undefined, await readJsonBody(request)),
      { status: 201 },
    )
  } catch (error) {
    return errorResponse(error, 'Unable to create note')
  }
}
