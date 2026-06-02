import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common'
import { NotesService } from './notes.service'

@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(@Headers('x-user-email') ownerEmail: string | undefined) {
    return this.notes.list(ownerEmail)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Headers('x-user-email') ownerEmail: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.notes.create(ownerEmail, body ?? {})
  }

  @Post('sync')
  sync(
    @Headers('x-user-email') ownerEmail: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.notes.sync(ownerEmail, body ?? {})
  }

  @Patch(':id')
  update(
    @Headers('x-user-email') ownerEmail: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.notes.update(ownerEmail, id, body ?? {})
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Headers('x-user-email') ownerEmail: string | undefined,
    @Param('id') id: string,
  ) {
    return this.notes.remove(ownerEmail, id)
  }
}
