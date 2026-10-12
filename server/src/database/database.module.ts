import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { Email } from './entities/email.entity';
import { Folder } from './entities/folder.entity';
import { Attachment } from './entities/attachment.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'sqlite',
        database: process.env.DATABASE_PATH || 'webmail.db',
        entities: [Account, Email, Folder, Attachment],
        synchronize: true,
        logging: process.env.NODE_ENV !== 'production',
      }),
    }),
    TypeOrmModule.forFeature([Account, Email, Folder, Attachment]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
