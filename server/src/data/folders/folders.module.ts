import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { FolderService } from './folders.service';
import { FolderController } from './folders.controller';

@Module({
  imports: [DatabaseModule],
  providers: [FolderService],
  controllers: [FolderController],
  exports: [FolderService],
})
export class FoldersModule {}
