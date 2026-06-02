import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

function getCorsOrigins() {
  const raw = process.env.CORS_ORIGIN
  if (!raw?.trim()) return true
  return raw.split(',').map(origin => origin.trim()).filter(Boolean)
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
  })

  const port = Number(process.env.PORT ?? 3001)
  await app.listen(port)
}

void bootstrap()
