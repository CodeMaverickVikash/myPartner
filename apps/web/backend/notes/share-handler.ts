import { errorResponse, json, readJsonBody } from '../http'
import { updateNoteShare } from './service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    return json(await updateNoteShare(
      request.headers.get('x-user-email') ?? undefined,
      id,
      await readJsonBody(request),
    ))
  } catch (error) {
    return errorResponse(error, 'Unable to update note sharing')
  }
}
