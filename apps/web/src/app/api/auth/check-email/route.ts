import { json, readJsonBody } from '@backend/http'
import { checkEmail } from '@backend/auth/check-email'

export async function POST(request: Request) {
  return json(checkEmail(await readJsonBody(request)))
}
