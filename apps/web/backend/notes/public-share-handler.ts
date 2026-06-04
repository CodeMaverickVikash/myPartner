import { errorResponse, json, readJsonBody } from '../http'
import { getSharedNote, updateSharedNote } from './service'

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params
    return json(await getSharedNote(token))
  } catch (error) {
    return errorResponse(error, 'Unable to load shared note')
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params
    return json(await updateSharedNote(token, await readJsonBody(request)))
  } catch (error) {
    return errorResponse(error, 'Unable to update shared note')
  }
}
