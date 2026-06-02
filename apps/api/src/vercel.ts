import 'reflect-metadata'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApiApp } from './runtime'

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => unknown

let server: RequestHandler | null = null

async function getServer() {
  if (!server) {
    const app = await createApiApp()
    await app.init()
    server = app.getHttpAdapter().getInstance() as RequestHandler
  }

  return server
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const appServer = await getServer()
  return appServer(req, res)
}
