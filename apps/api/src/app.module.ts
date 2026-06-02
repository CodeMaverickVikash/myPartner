import { Module } from '@nestjs/common'
import { AuthController } from './auth/auth.controller'
import { NotesController } from './notes/notes.controller'
import { NotesService } from './notes/notes.service'
import { SupabaseService } from './supabase/supabase.service'

@Module({
  controllers: [AuthController, NotesController],
  providers: [NotesService, SupabaseService],
})
export class AppModule {}
