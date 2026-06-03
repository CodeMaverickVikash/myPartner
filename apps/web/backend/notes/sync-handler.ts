import { errorResponse, json, readJsonBody } from '../http'
import { syncNote } from './service'

export async function POST(request: Request) {
  try {
    return json(await syncNote(request.headers.get('x-user-email') ?? undefined, await readJsonBody(request)))
  } catch (error) {
    return errorResponse(error, 'Unable to sync note')
  }
}
