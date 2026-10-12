import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { EmailService } from './emails.service';
import { EmailController } from './emails.controller';

@Module({
  imports: [DatabaseModule],
  providers: [EmailService],
  controllers: [EmailController],
  exports: [EmailService],
})
export class EmailsModule {}
