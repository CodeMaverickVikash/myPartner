import { Body, Controller, Post } from '@nestjs/common'

interface CheckEmailBody {
  email?: unknown
}

@Controller('auth')
export class AuthController {
  @Post('check-email')
  checkEmail(@Body() body: CheckEmailBody) {
    const raw = process.env.ALLOWED_EMAILS ?? ''
    if (!raw.trim()) return { allowed: true }

    const email = typeof body.email === 'string' ? body.email : ''
    const allowed = raw
      .split(',')
      .map(value => value.trim().toLowerCase())
      .includes(email.trim().toLowerCase())

    return { allowed }
  }
}
