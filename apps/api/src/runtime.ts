import { NestFactory } from '@nestjs/core'
import type { INestApplication } from '@nestjs/common'
import { AppModule } from './app.module'
import { getCorsOrigins } from './env'

export function configureApiApp(app: INestApplication) {
  app.setGlobalPrefix('api')
  app.enableCors({
    origin: getCorsOrigins(),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-user-email'],
    credentials: true,
  })
}

export async function createApiApp() {
  const app = await NestFactory.create(AppModule)
  configureApiApp(app)
  return app
}
