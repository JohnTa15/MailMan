import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { Email } from './entities/email.entity';
import { Folder } from './entities/folder.entity';
import { Attachment } from './entities/attachment.entity';
import { User } from './entities/user.entity';
import { Invite } from './entities/invite.entity';
import { ApiKey } from './entities/api-key.entity';
import { AiActivity } from './entities/ai-activity.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'sqlite',
        database: process.env.DATABASE_PATH || 'webmail.db',
        entities: [Account, Email, Folder, Attachment, User, Invite, ApiKey, AiActivity],
        synchronize: true,
        logging: process.env.NODE_ENV !== 'production',
      }),
    }),
    TypeOrmModule.forFeature([Account, Email, Folder, Attachment, User, Invite, ApiKey, AiActivity]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
