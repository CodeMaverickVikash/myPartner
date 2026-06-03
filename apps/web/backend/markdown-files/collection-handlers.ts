import { errorResponse, json, readJsonBody } from '../http'
import { createFile, listFiles } from './service'

export async function GET(request: Request) {
  try {
    return json(await listFiles(request.headers.get('x-user-email') ?? undefined))
  } catch (error) {
    return errorResponse(error, 'Unable to load markdown files')
  }
}

export async function POST(request: Request) {
  try {
    return json(
      await createFile(request.headers.get('x-user-email') ?? undefined, await readJsonBody(request)),
      { status: 201 },
    )
  } catch (error) {
    return errorResponse(error, 'Unable to create markdown file')
  }
}
