import { errorResponse, json, noContent, readJsonBody } from '../http'
import { removeNote, updateNote } from './service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    return json(await updateNote(request.headers.get('x-user-email') ?? undefined, id, await readJsonBody(request)))
  } catch (error) {
    return errorResponse(error, 'Unable to update note')
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    await removeNote(request.headers.get('x-user-email') ?? undefined, id)
    return noContent()
  } catch (error) {
    return errorResponse(error, 'Unable to delete note')
  }
}
