import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersService } from './users.service';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { AdminGuard } from './admin.guard';

@Module({
  imports: [DatabaseModule],
  providers: [UsersService, InvitesService, AdminGuard],
  controllers: [InvitesController],
  exports: [UsersService, InvitesService, AdminGuard],
})
export class UsersModule {}
