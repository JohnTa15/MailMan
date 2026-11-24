import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { Email } from './entities/email.entity';
import { Folder } from './entities/folder.entity';
import { Attachment } from './entities/attachment.entity';
import { User } from './entities/user.entity';
import { Invite } from './entities/invite.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'sqlite',
        database: process.env.DATABASE_PATH || 'webmail.db',
        entities: [Account, Email, Folder, Attachment, User, Invite],
        synchronize: true,
        logging: process.env.NODE_ENV !== 'production',
      }),
    }),
    TypeOrmModule.forFeature([Account, Email, Folder, Attachment, User, Invite]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
