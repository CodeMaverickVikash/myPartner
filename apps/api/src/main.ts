import 'reflect-metadata'
import { isStatelessApi } from './env'
import { createApiApp } from './runtime'

async function bootstrap() {
  if (isStatelessApi()) return

  const app = await createApiApp()
  const port = Number(process.env.PORT ?? 3001)
  await app.listen(port)
}

void bootstrap()
