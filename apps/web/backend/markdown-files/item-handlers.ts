import { errorResponse, json, noContent, readJsonBody } from '../http'
import { removeFile, updateFile } from './service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    return json(
      await updateFile(request.headers.get('x-user-email') ?? undefined, id, await readJsonBody(request)),
    )
  } catch (error) {
    return errorResponse(error, 'Unable to update markdown file')
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    await removeFile(request.headers.get('x-user-email') ?? undefined, id)
    return noContent()
  } catch (error) {
    return errorResponse(error, 'Unable to delete markdown file')
  }
}
